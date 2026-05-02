/**
 * global-setup.ts
 *
 * Runs ONCE before all tests.
 * 1. Creates test owner account (if not exists)
 * 2. Creates business
 * 3. Creates 3 test employees
 * 4. Creates shifts for the current week
 * 5. Creates timelogs with multiple states (completed, active, overnight)
 * 6. Logs in via the web UI and saves session state
 */
import { chromium, type FullConfig } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { AUTH_STATE } from './playwright.config.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '.env.test') });

const SUPABASE_URL   = process.env.SUPABASE_URL!;
const FUNCTIONS_URL  = `${SUPABASE_URL}/functions/v1`;
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EMAIL          = process.env.TEST_EMAIL    ?? 'playwright@konnecta-tests.app';
const PASSWORD       = process.env.TEST_PASSWORD ?? 'PlaywrightTest123!';
const BASE_URL       = process.env.BASE_URL      ?? 'http://localhost:3000';

// ── Low-level helpers ─────────────────────────────────────────────────────────

async function callFn(fn: string, body: object, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${FUNCTIONS_URL}/${fn}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  if (!res.ok) throw new Error(`${fn} failed (${res.status}): ${text}`);
  return json?.data ?? json;
}

async function adminRequest(method: string, path: string, body?: object): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Prefer': 'return=representation',
  };
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && res.status !== 404) throw new Error(`Admin ${method} ${path} failed: ${text}`);
  try { return JSON.parse(text); } catch { return null; }
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isoDateTime(d: Date) { return d.toISOString(); }

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function atTime(base: Date, h: number, m = 0): Date {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

// ── Main setup ────────────────────────────────────────────────────────────────

export default async function globalSetup(_config: FullConfig) {
  console.log('\n🔧  Ko-nnecta\' Playwright — Global Setup\n');

  if (!SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in .env.test');
  }

  // ── 1. Create or reuse test owner ─────────────────────────────────────────
  let token: string;
  let userId: string;

  console.log('  → Creating test owner…');
  try {
    const signupRes = await callFn('auth-signup', {
      email: EMAIL, password: PASSWORD,
      firstName: 'Playwright', lastName: 'Test',
      role: 'owner',
    });
    token  = signupRes.token;
    userId = signupRes.user?.userId ?? signupRes.user?.id;
    console.log('  ✓ Owner created:', EMAIL);
  } catch (e: any) {
    if (e.message?.includes('already registered') || e.message?.includes('duplicate') || e.message?.includes('409')) {
      const loginRes = await callFn('auth-login', { email: EMAIL, password: PASSWORD });
      token  = loginRes.token;
      const profile = await callFn('auth-profile', {}, token);
      userId = profile?.userId ?? profile?.id;
      console.log('  ✓ Owner already exists, logged in');
    } else {
      throw e;
    }
  }

  // ── 2. Create business ────────────────────────────────────────────────────
  let businessId: string;
  let businessName = 'Playwright Test Business';

  console.log('  → Creating business…');
  try {
    const profile = await callFn('auth-profile', {}, token);
    if (profile?.businessId) {
      businessId = profile.businessId;
      const biz = await callFn('business-get', { businessId }, token);
      businessName = biz?.name ?? businessName;
      console.log('  ✓ Business already exists:', businessName);
    } else {
      const biz = await callFn('business-create', {
        name: businessName,
        color: '#4F46E5',
        payPeriodType: 'biweekly',
        payPeriodStartDay: 1,
        payPeriodAnchorDate: isoDate(addDays(new Date(), -7)),
      }, token);
      businessId = biz.businessId;
      console.log('  ✓ Business created:', businessId);
    }
  } catch (e: any) {
    throw new Error(`Business setup failed: ${e.message}`);
  }

  // ── 3. Create test employees ─────────────────────────────────────────────
  console.log('  → Creating employees…');
  const empDefs = [
    { firstName: 'Ana',   lastName: 'García'    },
    { firstName: 'Pedro', lastName: 'Martínez'  },
    { firstName: 'Luis',  lastName: 'Rodríguez' },
  ];

  const employees: Array<{ id: string; name: string; email: string }> = [];

  for (const def of empDefs) {
    try {
      const res = await callFn('employees-add', {
        businessId, businessName,
        firstName: def.firstName,
        lastName:  def.lastName,
      }, token);
      employees.push({
        id:    res.employee?.employeeId ?? res.employee?.id,
        name:  `${def.firstName} ${def.lastName}`,
        email: res.credentials?.email,
      });
      console.log(`  ✓ Employee created: ${def.firstName} ${def.lastName}`);
    } catch (e: any) {
      // Employee likely exists — fetch existing
      try {
        const list = await callFn('employees-list', { businessId }, token);
        const found = (list?.employees ?? list ?? []).find(
          (e: any) => e.firstName === def.firstName && e.lastName === def.lastName
        );
        if (found) {
          employees.push({ id: found.employeeId ?? found.id, name: `${def.firstName} ${def.lastName}`, email: found.email });
          console.log(`  ✓ Employee already exists: ${def.firstName} ${def.lastName}`);
        }
      } catch { /* ignore */ }
    }
  }

  // ── 4. Create shifts for current week ────────────────────────────────────
  console.log('  → Creating shifts…');
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Shifts: today + next 3 days, various employees
  const shiftDefs = [
    { offset: 0,  emp: 0, start: 9,  end: 17, brk: 30 },  // Ana today
    { offset: 1,  emp: 1, start: 10, end: 18, brk: 0  },  // Pedro tomorrow
    { offset: 1,  emp: 2, start: 14, end: 22, brk: 30 },  // Luis tomorrow
    { offset: 2,  emp: 0, start: 8,  end: 16, brk: 30 },  // Ana +2
    { offset: 3,  emp: 1, start: 9,  end: 13, brk: 0  },  // Pedro +3
  ];

  for (const sd of shiftDefs) {
    if (employees[sd.emp]) {
      const day = addDays(today, sd.offset);
      try {
        const shift = await callFn('shifts-create', {
          businessId,
          date:      isoDate(day),
          startTime: `${String(sd.start).padStart(2,'0')}:00`,
          endTime:   `${String(sd.end).padStart(2,'0')}:00`,
          breakMinutes: sd.brk,
        }, token);
        const shiftId = shift.shiftId ?? shift.id;
        await callFn('shifts-assign', { shiftId, employeeId: employees[sd.emp].id }, token);
      } catch { /* shift may already exist */ }
    }
  }
  console.log('  ✓ Shifts seeded');

  // ── 5. Create timelogs (various states for timeclock tests) ───────────────
  console.log('  → Creating timelogs…');

  // Timelog 1: Ana García — yesterday, completed (8AM–4:30PM, 30 min break)
  if (employees[0]) {
    const yesterday = addDays(today, -1);
    try {
      const r1 = await callFn('timelog-clock-in', {
        businessId,
        employeeId: employees[0].id,
        timestamp:  isoDateTime(atTime(yesterday, 8, 0)),
      }, token);
      const logId1 = r1.timelogId ?? r1.id;
      await callFn('timelog-break-start', { businessId, timelogId: logId1, timestamp: isoDateTime(atTime(yesterday, 12, 0)) }, token);
      await callFn('timelog-break-end',   { businessId, timelogId: logId1, timestamp: isoDateTime(atTime(yesterday, 12, 30)) }, token);
      await callFn('timelog-clock-out', {
        businessId,
        timelogId: logId1,
        timestamp: isoDateTime(atTime(yesterday, 16, 30)),
      }, token);
      console.log('  ✓ Ana García: completed timelog (yesterday)');
    } catch (e: any) { console.log('  ⚠ Ana timelog (may exist):', e.message?.slice(0, 60)); }
  }

  // Timelog 2: Pedro Martínez — 2 days ago, completed (10AM–6PM, no break)
  if (employees[1]) {
    const twoDaysAgo = addDays(today, -2);
    try {
      const r2 = await callFn('timelog-clock-in', {
        businessId,
        employeeId: employees[1].id,
        timestamp:  isoDateTime(atTime(twoDaysAgo, 10, 0)),
      }, token);
      const logId2 = r2.timelogId ?? r2.id;
      await callFn('timelog-clock-out', {
        businessId, timelogId: logId2,
        timestamp: isoDateTime(atTime(twoDaysAgo, 18, 0)),
      }, token);
      console.log('  ✓ Pedro Martínez: completed timelog (2 days ago)');
    } catch (e: any) { console.log('  ⚠ Pedro timelog (may exist):', e.message?.slice(0, 60)); }
  }

  // Timelog 3: Luis Rodríguez — TODAY, currently clocked in (active)
  if (employees[2]) {
    try {
      const activeCheck = await callFn('timelog-active', { businessId, employeeId: employees[2].id }, token);
      if (!activeCheck?.timelogId) {
        await callFn('timelog-clock-in', {
          businessId,
          employeeId: employees[2].id,
          timestamp:  isoDateTime(atTime(today, 8, 0)),
        }, token);
        console.log('  ✓ Luis Rodríguez: active (clocked in today)');
      } else {
        console.log('  ✓ Luis Rodríguez: already active');
      }
    } catch (e: any) { console.log('  ⚠ Luis active timelog (may exist):', e.message?.slice(0, 60)); }
  }

  // Timelog 4: Ana García — 3 days ago, overnight (10PM–6AM next day)
  if (employees[0]) {
    const threeDaysAgo = addDays(today, -3);
    try {
      const r4 = await callFn('timelog-clock-in', {
        businessId,
        employeeId: employees[0].id,
        timestamp:  isoDateTime(atTime(threeDaysAgo, 22, 0)),
      }, token);
      const logId4 = r4.timelogId ?? r4.id;
      await callFn('timelog-clock-out', {
        businessId, timelogId: logId4,
        timestamp: isoDateTime(atTime(addDays(threeDaysAgo, 1), 6, 0)),
      }, token);
      console.log('  ✓ Ana García: overnight timelog');
    } catch (e: any) { console.log('  ⚠ Ana overnight (may exist):', e.message?.slice(0, 60)); }
  }

  // ── 6. Login via browser and save session state ───────────────────────────
  console.log('  → Saving browser session state…');
  const authDir = path.dirname(AUTH_STATE);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  const page    = await browser.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[placeholder*="correo"], input[placeholder*="email" i]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');

  await page.context().storageState({ path: AUTH_STATE });
  await browser.close();
  console.log('  ✓ Session state saved\n');
  console.log('🟢  Setup complete — running tests\n');
}
