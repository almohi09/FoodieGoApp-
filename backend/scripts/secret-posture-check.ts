import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import env from '../src/config/env.js';

const ARTIFACT_DIR = path.resolve(process.cwd(), 'artifacts', 'security');

interface SecretPostureCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  value?: string;
  recommendation?: string;
}

interface SecretPostureResult {
  timestamp: string;
  environment: string;
  checks: SecretPostureCheck[];
  overallStatus: 'PASS' | 'FAIL' | 'WARN';
  recommendations: string[];
}

const checkSecretManagerPosture = async (): Promise<SecretPostureResult> => {
  const timestamp = new Date().toISOString();
  await mkdir(ARTIFACT_DIR, { recursive: true });

  console.log('Analyzing secret management posture...\n');

  const checks: SecretPostureCheck[] = [];
  const recommendations: string[] = [];

  // Check 1: NODE_ENV is production
  const envStatus = env.nodeEnv === 'production' ? 'PASS' : 'WARN';
  checks.push({
    name: 'Environment is production',
    status: envStatus,
    recommendation:
      envStatus === 'WARN'
        ? 'Set NODE_ENV=production for deployment'
        : undefined,
  });

  // Check 2: DATABASE_URL is set
  const dbStatus = env.databaseUrl.length > 0 ? 'PASS' : 'FAIL';
  checks.push({
    name: 'Database URL configured',
    status: dbStatus,
    recommendation:
      dbStatus === 'FAIL' ? 'Set DATABASE_URL from secret manager' : undefined,
  });

  // Check 3: Supabase credentials (if using Supabase)
  if (env.imageStorageProvider === 'supabase') {
    const supabaseStatus =
      env.supabaseServiceRoleKey.length > 0 ? 'PASS' : 'FAIL';
    checks.push({
      name: 'Supabase service role key configured',
      status: supabaseStatus,
      recommendation:
        supabaseStatus === 'FAIL'
          ? 'Set SUPABASE_SERVICE_ROLE_KEY from secret manager'
          : undefined,
    });
  }

  // Check 4: Payment webhook secret
  const webhookStatus =
    env.paymentWebhookSecret.length > 0 &&
    env.paymentWebhookSecret !== 'dev_webhook_secret'
      ? 'PASS'
      : 'WARN';
  checks.push({
    name: 'Payment webhook secret is production value',
    status: webhookStatus,
    recommendation:
      webhookStatus === 'WARN'
        ? 'Set PAYMENT_WEBHOOK_SECRET to production value from secret manager'
        : undefined,
  });

  // Check 5: OTP provider configured
  const otpStatus =
    env.otpProvider !== 'mock' || env.nodeEnv !== 'production'
      ? 'PASS'
      : 'FAIL';
  checks.push({
    name: 'OTP provider is not mock in production',
    status: otpStatus,
    recommendation:
      otpStatus === 'FAIL'
        ? 'Configure OTP_PROVIDER=http or firebase'
        : undefined,
  });

  // Check 6: Monitoring sink configured
  const monitorStatus =
    env.monitoringSinkUrl.length > 0 && env.monitoringSinkAuthToken.length > 0
      ? 'PASS'
      : 'WARN';
  checks.push({
    name: 'Monitoring sink configured',
    status: monitorStatus,
    recommendation:
      monitorStatus === 'WARN'
        ? 'Set MONITORING_SINK_URL and MONITORING_SINK_AUTH_TOKEN from secret manager'
        : undefined,
  });

  // Check 7: Check .env.example doesn't contain real secrets
  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  if (existsSync(envExamplePath)) {
    const envExampleContent = readFileSync(envExamplePath, 'utf8');
    const hasRealSecrets = /^[A-Za-z0-9+/=]{20,}$/m.test(envExampleContent);
    checks.push({
      name: '.env.example contains only placeholder values',
      status: hasRealSecrets ? 'FAIL' : 'PASS',
      recommendation: hasRealSecrets
        ? 'Remove real secret values from .env.example'
        : undefined,
    });
  }

  // Check 8: OTP bypass disabled in production
  const bypassStatus =
    env.otpBypassCode.length === 0 || env.nodeEnv !== 'production'
      ? 'PASS'
      : 'FAIL';
  checks.push({
    name: 'OTP bypass code disabled in production',
    status: bypassStatus,
    recommendation:
      bypassStatus === 'FAIL'
        ? 'Remove OTP_BYPASS_CODE from production environment'
        : undefined,
  });

  // Generate recommendations
  checks
    .filter(c => c.recommendation)
    .forEach(c => {
      if (c.recommendation) recommendations.push(c.recommendation);
    });

  const overallStatus = checks.every(c => c.status !== 'FAIL')
    ? checks.some(c => c.status === 'WARN')
      ? 'WARN'
      : 'PASS'
    : 'FAIL';

  const result: SecretPostureResult = {
    timestamp,
    environment: env.nodeEnv,
    checks,
    overallStatus,
    recommendations,
  };

  const payload = JSON.stringify(result);
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
  const safeTs = timestamp.replace(/:/g, '-');
  const outFile = path.join(ARTIFACT_DIR, `secret-posture-${safeTs}.json`);

  await writeFile(
    outFile,
    JSON.stringify(
      { ...result, checksum: { algorithm: 'sha256', value: sha256 } },
      null,
      2,
    ),
    'utf8',
  );

  console.log('=== Secret Posture Check Results ===\n');
  checks.forEach(c => {
    console.log(`[${c.status}] ${c.name}`);
    if (c.recommendation)
      console.log(`        Recommendation: ${c.recommendation}`);
  });
  console.log(`\nOverall Status: ${overallStatus}`);
  console.log(`Artifact saved to: ${outFile}`);

  return result;
};

void checkSecretManagerPosture().catch(e => {
  console.error('Secret posture check failed:', e);
  process.exit(1);
});
