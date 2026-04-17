import { SERVICE_ROLE_KEY } from './config';
import { printReport, cleanup, findAuthUser, supabaseAdmin, SuiteResult } from './helpers';

import * as auth from './01-auth.test';
import * as business from './02-business.test';
import * as employees from './03-employees.test';
import * as shifts from './04-shifts.test';
import * as timeclock from './05-timeclock.test';
import * as payroll from './06-payroll-simulation.test';

// Order matters — each suite depends on the ones before it
const SUITE_ORDER = ['auth', 'business', 'employees', 'shifts', 'timeclock', 'payroll'] as const;
const SUITES: Record<string, { run: () => Promise<SuiteResult> }> = {
  auth,
  business,
  employees,
  shifts,
  timeclock,
  payroll,
};

async function main() {
  // Verify service role key is set
  if (!SERVICE_ROLE_KEY) {
    console.error('\x1b[31mERROR: Falta SUPABASE_SERVICE_ROLE_KEY\x1b[0m');
    console.error('Corre asi:');
    console.error('  SUPABASE_SERVICE_ROLE_KEY="tu-key" npx tsx run.ts\n');
    console.error('Encuentra tu key en: Supabase Dashboard > Settings > API > service_role key');
    process.exit(1);
  }

  const filter = process.argv[2]; // optional: "auth", "business", etc.

  if (filter && !SUITES[filter]) {
    console.error(`\x1b[31mSuite "${filter}" no existe.\x1b[0m`);
    console.error(`Disponibles: ${SUITE_ORDER.join(', ')}`);
    process.exit(1);
  }

  // When running a specific suite, also run all prerequisites
  const filterIdx = filter ? SUITE_ORDER.indexOf(filter as any) : -1;
  const suitesToRun: Record<string, { run: () => Promise<SuiteResult> }> = {};
  for (const name of SUITE_ORDER) {
    if (!filter || SUITE_ORDER.indexOf(name as any) <= filterIdx) {
      suitesToRun[name] = SUITES[name];
    }
  }

  console.log('\x1b[1m\n╔══════════════════════════════════════╗');
  console.log('║     Ko-nnecta\' — Suite de Pruebas    ║');
  console.log('╚══════════════════════════════════════╝\x1b[0m');

  if (filter) {
    console.log(`\nCorriendo solo: ${filter}\n`);
  }

  // ── Cleanup before tests ──
  console.log('\x1b[2mLimpiando datos de pruebas anteriores...\x1b[0m');
  await cleanupTestData();

  // ── Run suites ──
  const results: SuiteResult[] = [];

  for (const [name, suite] of Object.entries(suitesToRun)) {
    try {
      const result = await suite.run();
      results.push(result);
    } catch (e: any) {
      console.error(`\x1b[31mSuite "${name}" crasheo: ${e.message}\x1b[0m`);
      results.push({ name, tests: [{ name: 'CRASH', passed: false, error: e.message }] });
    }
  }

  // ── Report ──
  printReport(results);

  // ── Cleanup after tests ──
  console.log('\x1b[2mLimpiando datos de prueba...\x1b[0m');
  await cleanupTestData();
  console.log('\x1b[2mLimpieza completa.\x1b[0m\n');

  // Exit with failure code if any test failed
  const anyFailed = results.some(s => s.tests.some(t => !t.passed));
  process.exit(anyFailed ? 1 : 0);
}

async function cleanupTestData() {
  try {
    // Find test users
    const testEmails = [
      'testowner@konnecta-tests.app',
      // Employee emails that might have been created
    ];

    // Find the test owner
    const testOwner = await findAuthUser('testowner@konnecta-tests.app');
    if (testOwner) {
      // Find businesses owned by test owner
      const businesses = await supabaseAdmin('businesses', {
        query: `ownerId=eq.${testOwner.id}&select=businessId`,
      });

      if (Array.isArray(businesses)) {
        for (const biz of businesses) {
          // Delete timelogs
          await supabaseAdmin('timelogs', { method: 'DELETE', query: `businessId=eq.${biz.businessId}` });
          // Find employee user IDs before deleting
          const emps = await supabaseAdmin('employees', {
            query: `businessId=eq.${biz.businessId}&select=userId,email`,
          });
          // Delete shifts
          await supabaseAdmin('shifts', { method: 'DELETE', query: `businessId=eq.${biz.businessId}` });
          // Delete employees
          await supabaseAdmin('employees', { method: 'DELETE', query: `businessId=eq.${biz.businessId}` });
          // Delete employee users and auth
          if (Array.isArray(emps)) {
            for (const emp of emps) {
              await supabaseAdmin('users', { method: 'DELETE', query: `userId=eq.${emp.userId}` });
              const { deleteAuthUser } = await import('./helpers');
              await deleteAuthUser(emp.userId);
            }
          }
          // Delete business
          await supabaseAdmin('businesses', { method: 'DELETE', query: `businessId=eq.${biz.businessId}` });
        }
      }

      // Delete test owner profile and auth
      await supabaseAdmin('users', { method: 'DELETE', query: `userId=eq.${testOwner.id}` });
      const { deleteAuthUser } = await import('./helpers');
      await deleteAuthUser(testOwner.id);
    }
  } catch (e: any) {
    console.log(`\x1b[2m  (cleanup warning: ${e.message})\x1b[0m`);
  }
}

main();
