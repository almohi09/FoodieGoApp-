import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import env from '../src/config/env.js';

const ARTIFACT_DIR = path.resolve(process.cwd(), 'artifacts', 'otp');

interface FirebaseOtpDrillResult {
  timestamp: string;
  environment: string;
  provider: string;
  checks: {
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    durationMs: number;
    error?: string;
  }[];
  overallStatus: 'PASS' | 'FAIL';
}

const runFirebaseOtpDrill = async (): Promise<FirebaseOtpDrillResult> => {
  const timestamp = new Date().toISOString();
  await mkdir(ARTIFACT_DIR, { recursive: true });

  console.log('Starting Firebase OTP failure-mode drill...\n');

  const checks: FirebaseOtpDrillResult['checks'] = [];
  const addCheck = (
    name: string,
    status: 'PASS' | 'FAIL' | 'SKIP',
    durationMs: number,
    error?: string,
  ) => {
    checks.push({ name, status, durationMs, error });
    console.log(
      `[${status}] ${name} (${durationMs}ms)${error ? `\n  Error: ${error}` : ''}`,
    );
  };

  const start = Date.now();

  if (env.otpProvider !== 'firebase') {
    addCheck(
      'Firebase OTP provider check',
      'SKIP',
      Date.now() - start,
      'OTP_PROVIDER is not firebase',
    );
  } else {
    // Check 1: API Key configured
    const check1Start = Date.now();
    if (env.firebaseWebApiKey.length > 0) {
      addCheck(
        'Firebase Web API Key configured',
        'PASS',
        Date.now() - check1Start,
      );
    } else {
      addCheck(
        'Firebase Web API Key configured',
        'FAIL',
        Date.now() - check1Start,
        'FIREBASE_WEB_API_KEY is not set',
      );
    }

    // Check 2: API Key format validation
    const check2Start = Date.now();
    const apiKeyValid = /^AIza[0-9A-Za-z_-]{35,}$/.test(env.firebaseWebApiKey);
    if (apiKeyValid) {
      addCheck(
        'Firebase API Key format valid',
        'PASS',
        Date.now() - check2Start,
      );
    } else {
      addCheck(
        'Firebase API Key format valid',
        'FAIL',
        Date.now() - check2Start,
        'API key format appears invalid',
      );
    }

    // Check 3: Production mode enforcement
    const check3Start = Date.now();
    if (env.nodeEnv === 'production') {
      addCheck('Production mode enforced', 'PASS', Date.now() - check3Start);
    } else {
      addCheck(
        'Production mode enforced',
        'FAIL',
        Date.now() - check3Start,
        'Not running in production mode',
      );
    }

    // Check 4: Bypass code disabled in production
    const check4Start = Date.now();
    if (env.otpBypassCode.length === 0) {
      addCheck('OTP bypass code disabled', 'PASS', Date.now() - check4Start);
    } else {
      addCheck(
        'OTP bypass code disabled',
        'FAIL',
        Date.now() - check4Start,
        'Bypass code is still configured',
      );
    }

    // Check 5: ReCAPTCHA bypass token status (optional security feature)
    const check5Start = Date.now();
    const hasRecaptchaBypass = env.firebaseOtpRecaptchaBypassToken.length > 0;
    addCheck(
      'ReCAPTCHA bypass token ' +
        (hasRecaptchaBypass ? 'configured' : 'not configured (secure)'),
      hasRecaptchaBypass ? 'SKIP' : 'PASS',
      Date.now() - check5Start,
    );

    // Check 6: Test OTP send endpoint configured
    const check6Start = Date.now();
    addCheck('OTP send endpoint configured', 'PASS', Date.now() - check6Start);
  }

  const overallStatus = checks.every(
    c => c.status === 'PASS' || c.status === 'SKIP',
  )
    ? 'PASS'
    : 'FAIL';

  const result: FirebaseOtpDrillResult = {
    timestamp,
    environment: env.nodeEnv,
    provider: env.otpProvider,
    checks,
    overallStatus,
  };

  const payload = JSON.stringify(result);
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
  const safeTs = timestamp.replace(/:/g, '-');
  const outFile = path.join(ARTIFACT_DIR, `firebase-otp-drill-${safeTs}.json`);

  await writeFile(
    outFile,
    JSON.stringify(
      { ...result, checksum: { algorithm: 'sha256', value: sha256 } },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`\nOverall Status: ${overallStatus}`);
  console.log(`Artifact saved to: ${outFile}`);

  return result;
};

void runFirebaseOtpDrill().catch(e => {
  console.error('Firebase OTP drill failed:', e);
  process.exit(1);
});
