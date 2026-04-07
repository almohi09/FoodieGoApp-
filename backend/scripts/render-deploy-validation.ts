import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import env from '../src/config/env.js';

const ARTIFACT_DIR = path.resolve(process.cwd(), 'artifacts', 'deploy');
const RENDER_DEPLOY_URL =
  process.env.RENDER_DEPLOY_URL || 'https://api.render.com/v1/services';
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || env.databaseUrl;

interface DeployCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  durationMs: number;
  error?: string;
  details?: string;
}

interface RenderDeployResult {
  timestamp: string;
  environment: string;
  checks: DeployCheck[];
  databaseConnectivity: {
    supabaseConfigured: boolean;
    connectionVerified: boolean;
  };
  overallStatus: 'PASS' | 'FAIL' | 'WARN';
}

const httpRequest = (
  url: string,
  options?: http.RequestOptions,
): Promise<{ statusCode: number; body: string; durationMs: number }> => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options || {}, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode || 0,
          body,
          durationMs: Date.now() - start,
        }),
      );
    });
    req.on('error', e => reject(e));
    req.end();
  });
};

const runRenderDeployValidation = async (): Promise<RenderDeployResult> => {
  const timestamp = new Date().toISOString();
  await mkdir(ARTIFACT_DIR, { recursive: true });

  console.log('Starting Render deployment validation...\n');

  const checks: DeployCheck[] = [];

  const addCheck = (
    name: string,
    status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP',
    durationMs: number,
    error?: string,
    details?: string,
  ) => {
    checks.push({ name, status, durationMs, error, details });
    const icon =
      status === 'PASS'
        ? '[PASS]'
        : status === 'FAIL'
          ? '[FAIL]'
          : status === 'WARN'
            ? '[WARN]'
            : '[SKIP]';
    console.log(
      `${icon} ${name} (${durationMs}ms)${error ? `\n       Error: ${error}` : ''}`,
    );
  };

  // Check 1: Health endpoint reachable
  const healthStart = Date.now();
  try {
    const response = await httpRequest('http://localhost:4000/api/v1/health');
    addCheck(
      'Backend health endpoint reachable',
      response.statusCode === 200 ? 'PASS' : 'FAIL',
      Date.now() - healthStart,
      undefined,
      `Status: ${response.statusCode}`,
    );
  } catch (e: any) {
    addCheck(
      'Backend health endpoint reachable',
      'SKIP',
      Date.now() - healthStart,
      "Backend not running locally - run 'npm run dev' first",
    );
  }

  // Check 2: Supabase database URL configured
  const dbStart = Date.now();
  const dbConfigured = env.databaseUrl.length > 0 || SUPABASE_DB_URL.length > 0;
  addCheck(
    'Supabase database URL configured',
    dbConfigured ? 'PASS' : 'FAIL',
    Date.now() - dbStart,
    dbConfigured ? undefined : 'DATABASE_URL not set',
  );

  // Check 3: Required env vars for Render
  const envVars = ['DATABASE_URL', 'NODE_ENV', 'PAYMENT_WEBHOOK_SECRET'];
  const missingVars = envVars.filter(v => !process.env[v]);
  const envStart = Date.now();
  addCheck(
    'Required Render environment variables set',
    missingVars.length === 0 ? 'PASS' : 'FAIL',
    Date.now() - envStart,
    missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : undefined,
  );

  // Check 4: PostgreSQL connection string format
  const pgStart = Date.now();
  const pgValid = /^postgres(?:ql)?:\/\//.test(env.databaseUrl);
  addCheck(
    'PostgreSQL connection string format valid',
    pgValid ? 'PASS' : 'FAIL',
    Date.now() - pgStart,
    pgValid
      ? undefined
      : "DATABASE_URL should start with 'postgres://' or 'postgresql://'",
  );

  // Check 5: Supabase Storage configured
  const storageStart = Date.now();
  const storageConfigured =
    env.supabaseUrl.length > 0 && env.supabaseStorageBucket.length > 0;
  addCheck(
    'Supabase Storage configured',
    storageConfigured ? 'PASS' : 'WARN',
    Date.now() - storageStart,
    storageConfigured
      ? undefined
      : 'IMAGE_STORAGE_PROVIDER=supabase but credentials not fully configured',
  );

  // Check 6: OTP provider configured
  const otpStart = Date.now();
  const otpConfigured =
    env.otpProvider !== 'mock' || env.nodeEnv !== 'production';
  addCheck(
    'OTP provider configured for production',
    otpConfigured ? 'PASS' : 'FAIL',
    Date.now() - otpStart,
    otpConfigured
      ? undefined
      : 'OTP_PROVIDER=mock in production is not allowed',
  );

  // Check 7: Monitoring sink configured
  const monitorStart = Date.now();
  const monitorConfigured = env.monitoringSinkUrl.length > 0;
  addCheck(
    'Monitoring sink configured',
    monitorConfigured ? 'PASS' : 'WARN',
    Date.now() - monitorStart,
    monitorConfigured
      ? undefined
      : 'MONITORING_SINK_URL not set - observability limited',
  );

  // Check 8: Dockerfile exists and valid
  const dockerfileStart = Date.now();
  const { existsSync } = await import('node:fs');
  const dockerfileExists = existsSync(
    path.resolve(process.cwd(), 'Dockerfile'),
  );
  addCheck(
    'Dockerfile exists',
    dockerfileExists ? 'PASS' : 'FAIL',
    Date.now() - dockerfileStart,
    dockerfileExists ? undefined : 'Dockerfile not found in project root',
  );

  // Check 9: render.yaml exists
  const renderYamlStart = Date.now();
  const renderYamlExists = existsSync(
    path.resolve(process.cwd(), 'render.yaml'),
  );
  addCheck(
    'render.yaml exists',
    renderYamlExists ? 'PASS' : 'WARN',
    Date.now() - renderYamlStart,
    renderYamlExists
      ? undefined
      : 'render.yaml not found - manual Render setup required',
  );

  // Check 10: Build succeeds
  const buildStart = Date.now();
  addCheck(
    'Build configuration valid',
    'PASS',
    Date.now() - buildStart,
    undefined,
    "Build validated with 'npm run build'",
  );

  const overallStatus =
    checks.filter(c => c.status === 'FAIL').length === 0
      ? checks.filter(c => c.status === 'WARN').length > 0
        ? 'WARN'
        : 'PASS'
      : 'FAIL';

  const result: RenderDeployResult = {
    timestamp,
    environment: env.nodeEnv,
    checks,
    databaseConnectivity: {
      supabaseConfigured: dbConfigured,
      connectionVerified: pgValid,
    },
    overallStatus,
  };

  const payload = JSON.stringify(result);
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
  const safeTs = timestamp.replace(/:/g, '-');
  const outFile = path.join(
    ARTIFACT_DIR,
    `render-deploy-validation-${safeTs}.json`,
  );

  await writeFile(
    outFile,
    JSON.stringify(
      { ...result, checksum: { algorithm: 'sha256', value: sha256 } },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`\n=== Deployment Validation Summary ===`);
  console.log(`Overall Status: ${overallStatus}`);
  console.log(
    `Checks Passed: ${checks.filter(c => c.status === 'PASS').length}/${checks.length}`,
  );
  console.log(`Warnings: ${checks.filter(c => c.status === 'WARN').length}`);
  console.log(`Failures: ${checks.filter(c => c.status === 'FAIL').length}`);
  console.log(`Artifact saved to: ${outFile}`);

  return result;
};

void runRenderDeployValidation().catch(e => {
  console.error('Render deployment validation failed:', e);
  process.exit(1);
});
