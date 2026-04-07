import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MIGRATION_DIR = path.resolve(process.cwd(), 'prisma', 'migrations');

interface MigrationRollbackResult {
  startedAt: string;
  completedAt: string;
  environment: string;
  migrationDir: string;
  migrations: string[];
  steps: {
    step: string;
    status: 'success' | 'failure';
    durationMs: number;
    error?: string;
  }[];
  baselineCreated: boolean;
  rollbackExecuted: boolean;
  restoredToBaseline: boolean;
  healthCheckPassed: boolean;
  overallStatus: 'PASS' | 'FAIL';
}

const runMigrationRollbackDrill =
  async (): Promise<MigrationRollbackResult> => {
    const startedAt = new Date().toISOString();
    const artifactPath = path.resolve(process.cwd(), 'artifacts', 'drills');
    await mkdir(artifactPath, { recursive: true });

    console.log('Starting migration rollback drill...\n');

    const migrations = execSync('dir /b /a-d /o-n prisma\\migrations', {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
      .split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => !line.startsWith('.'));

    if (migrations.length === 0) {
      throw new Error('No migrations found in prisma/migrations directory');
    }

    const steps: MigrationRollbackResult['steps'] = [];
    const addStep = (
      step: string,
      status: 'success' | 'failure',
      durationMs: number,
      error?: string,
    ) => {
      steps.push({ step, status, durationMs, error });
      console.log(
        `[${status.toUpperCase()}] ${step} (${durationMs}ms)${error ? `\n  Error: ${error}` : ''}`,
      );
    };

    const startTime = Date.now();
    let baselineCreated = false;
    let rollbackExecuted = false;
    let restoredToBaseline = false;
    let healthCheckPassed = false;

    try {
      const baselineStart = Date.now();
      try {
        execSync('npx prisma migrate status', {
          encoding: 'utf8',
          stdio: 'pipe',
        });
        addStep(
          'Capture current migration baseline',
          'success',
          Date.now() - baselineStart,
        );
        baselineCreated = true;
      } catch (e: any) {
        addStep(
          'Capture current migration baseline',
          'failure',
          Date.now() - baselineStart,
          e.message,
        );
      }

      if (baselineCreated) {
        const rollbackStart = Date.now();
        try {
          execSync(
            "npx prisma migrate resolve --rolled_back $(npx prisma migrate status --quiet | grep -oP '\\d{14}_\\w+' | tail -1)",
            {
              encoding: 'utf8',
              stdio: 'pipe',
              shell: 'cmd.exe',
            },
          );
          addStep(
            'Execute rollback (migrate resolve --rolled_back)',
            'success',
            Date.now() - rollbackStart,
          );
          rollbackExecuted = true;
        } catch (e: any) {
          addStep(
            'Execute rollback (migrate resolve --rolled_back)',
            'failure',
            Date.now() - rollbackStart,
            e.message,
          );
        }
      }

      if (rollbackExecuted) {
        const restoreStart = Date.now();
        try {
          execSync('npx prisma migrate deploy', {
            encoding: 'utf8',
            stdio: 'pipe',
          });
          addStep(
            'Restore to baseline (migrate deploy)',
            'success',
            Date.now() - restoreStart,
          );
          restoredToBaseline = true;
        } catch (e: any) {
          addStep(
            'Restore to baseline (migrate deploy)',
            'failure',
            Date.now() - restoreStart,
            e.message,
          );
        }
      }

      if (restoredToBaseline) {
        const healthStart = Date.now();
        try {
          execSync('npx prisma migrate status', {
            encoding: 'utf8',
            stdio: 'pipe',
          });
          addStep(
            'Post-rollback health check (migrate status)',
            'success',
            Date.now() - healthStart,
          );
          healthCheckPassed = true;
        } catch (e: any) {
          addStep(
            'Post-rollback health check (migrate status)',
            'failure',
            Date.now() - healthStart,
            e.message,
          );
        }
      }
    } catch (e: any) {
      console.error('Drill error:', e.message);
    }

    const completedAt = new Date().toISOString();
    const overallStatus: 'PASS' | 'FAIL' =
      baselineCreated &&
      rollbackExecuted &&
      restoredToBaseline &&
      healthCheckPassed
        ? 'PASS'
        : 'FAIL';

    const result: MigrationRollbackResult = {
      startedAt,
      completedAt,
      environment: process.env.NODE_ENV || 'development',
      migrationDir: MIGRATION_DIR,
      migrations: migrations.slice(0, 5),
      steps,
      baselineCreated,
      rollbackExecuted,
      restoredToBaseline,
      healthCheckPassed,
      overallStatus,
    };

    const payload = JSON.stringify(result);
    const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
    const safeTs = new Date().toISOString().replace(/:/g, '-');
    const outFile = path.join(
      artifactPath,
      `migration-rollback-drill-${safeTs}.json`,
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

    console.log(`\nOverall Status: ${overallStatus}`);
    console.log(`Artifact saved to: ${outFile}`);
    console.log(`Checksum: ${sha256}`);

    return result;
  };

void runMigrationRollbackDrill().catch(e => {
  console.error('Migration rollback drill failed:', e);
  process.exit(1);
});
