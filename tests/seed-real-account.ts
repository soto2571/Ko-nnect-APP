/**
 * SEED - Simulacion de 2 semanas para cuenta real de Sebastian
 *
 * Crea 2 empleados en el negocio de Sebastian y simula 14 dias de trabajo:
 *   - Ana Martinez: Full time, Lun-Vie 8am-5pm
 *   - Luis Rivera:  Part time, horas variables
 *
 * Para correr:
 *   SUPABASE_SERVICE_ROLE_KEY="..." npx tsx seed-real-account.ts
 */

const SUPABASE_URL = 'https://izfcsiqucpkroylkgjei.supabase.co';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const BUSINESS_ID = '825c2d81-c8a3-481b-b165-7ebca1bc6fb2';
const BUSINESS_NAME = 'Mi negocio';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function rest(table: string, opts: { method?: string; query?: string; body?: any } = {}) {
  const { method = 'GET', query = '', body } = opts;
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`REST ${method} ${table} (${res.status}): ${text}`);
  if (method === 'DELETE' || !text) return null;
  return JSON.parse(text);
}

async function adminPost(path: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Admin POST ${path} (${res.status}): ${text}`);
  return JSON.parse(text);
}


function log(msg: string) { console.log(`  ${msg}`); }
function ok(msg: string)  { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function err(msg: string) { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }

// ─── Date helpers ─────────────────────────────────────────────────────────────

// Start on April 7, 2026 (Monday — start of current biweekly pay period)
const baseDate = new Date('2026-04-07T00:00:00');
baseDate.setHours(0, 0, 0, 0);

function dayDate(offset: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

// Returns UTC timestamp. Times given as "HH:MM" are treated as local PR time (UTC-4)
function ts(dateStr: string, time: string): string {
  // Puerto Rico is UTC-4 (AST, no daylight saving)
  const [h, m] = time.split(':').map(Number);
  const utcH = h + 4; // convert PR time to UTC
  return `${dateStr}T${String(utcH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
}

function netMinutes(clockIn: string, clockOut: string, breaks: { start: string; end: string }[]): number {
  const gross = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000;
  const breakMin = breaks.reduce((s, b) => s + (new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000, 0);
  return Math.round(gross - breakMin);
}

// ─── Create employee directly ─────────────────────────────────────────────────

async function createEmployee(firstName: string, lastName: string): Promise<{ userId: string; email: string; password: string }> {
  // Sanitize business name for email domain
  const domain = BUSINESS_NAME.toLowerCase().replace(/[^a-z0-9]/g, '') || 'business';
  const baseEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}.app`;

  // Check if email exists, add suffix if needed
  let email = baseEmail;
  let suffix = 2;
  while (true) {
    const existing = await rest('employees', { query: `email=eq.${email}&select=userId` });
    if (!Array.isArray(existing) || existing.length === 0) break;
    email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@${domain}.app`;
    suffix++;
  }

  const password = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;

  // Create auth user
  const authUser = await adminPost('users', {
    email,
    password,
    email_confirm: true,
    user_metadata: { firstName, lastName, role: 'employee' },
  });
  const userId = authUser.id;

  // Insert into users table
  await rest('users', {
    method: 'POST',
    body: { userId, email, firstName, lastName, role: 'employee' },
  });

  // Insert into employees table
  await rest('employees', {
    method: 'POST',
    body: {
      businessId: BUSINESS_ID,
      userId,
      firstName,
      lastName,
      email,
      tempPassword: password,
    },
  });

  return { userId, email, password };
}

// ─── Insert one work day ───────────────────────────────────────────────────────

async function insertWorkDay(opts: {
  employeeId: string;
  label: string;
  dayIndex: number;
  clockIn: string;   // "HH:MM" PR time
  clockOut: string;  // "HH:MM" PR time
  breaks?: { start: string; end: string }[];  // "HH:MM" pairs PR time
  scheduledBreakDuration?: number;
}) {
  const { employeeId, label, dayIndex, clockIn, clockOut, breaks = [], scheduledBreakDuration = 0 } = opts;
  const date = dayDate(dayIndex);
  const ciTs = ts(date, clockIn);
  const coTs = ts(date, clockOut);
  const breaksTs = breaks.map(b => ({ start: ts(date, b.start), end: ts(date, b.end) }));

  // Create shift directly in DB
  const shiftId = await createShiftDirect({
    title: label,
    startTime: ciTs,
    endTime: coTs,
    breakDuration: scheduledBreakDuration,
    employeeId,
  });

  // Compute totals
  const totalMin = netMinutes(ciTs, coTs, breaksTs);
  const overtime = totalMin > 480;
  const missedBreak = scheduledBreakDuration > 0 && breaks.length === 0;

  // Insert timelog directly
  const rows = await rest('timelogs', {
    method: 'POST',
    body: {
      businessId: BUSINESS_ID,
      employeeId,
      shiftId,
      date,
      clockIn: ciTs,
      clockOut: coTs,
      breaks: breaksTs,
      scheduledBreakDuration,
      totalMinutes: totalMin,
      overtimeDay: overtime,
      missedBreakPunch: missedBreak,
      status: missedBreak ? 'missed_punch' : 'clocked_out',
    },
  });
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Timelog insert failed');
  return { totalMin, overtime, missedBreak };
}

// ─── Insert shift directly into DB (no token needed) ─────────────────────────

const SEBASTIAN_USER_ID = 'c357f0ca-69f4-4428-9c53-5d569f5b1ab7';

async function createShiftDirect(opts: {
  title: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  employeeId: string;
}): Promise<string> {
  const { title, startTime, endTime, breakDuration, employeeId } = opts;
  const rows = await rest('shifts', {
    method: 'POST',
    body: {
      businessId: BUSINESS_ID,
      title,
      startTime,
      endTime,
      breakDuration,
      breakTime: null,
      status: 'assigned',
      createdBy: SEBASTIAN_USER_ID,
      employeeId,
    },
  });
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Shift insert failed');
  return rows[0].shiftId;
}

// ─── Schedule definitions ─────────────────────────────────────────────────────

// Ana: Full time Mon-Fri, 8am-5pm with 30min lunch
// Uses index 0-13 (Mon W1 = 0, ... Sun W2 = 13)
interface WorkDay {
  label: string;
  clockIn: string;
  clockOut: string;
  breaks?: { start: string; end: string }[];
  scheduledBreakDuration?: number;
}

const anaDays: (WorkDay | null)[] = [
  // Week 1
  { label: 'Turno Ana L1',  clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
  { label: 'Turno Ana M1',  clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
  { label: 'Turno Ana X1',  clockIn: '08:05', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 }, // llegó 5 min tarde
  { label: 'Turno Ana J1',  clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
  { label: 'Turno Ana V1',  clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
  null, // Sab libre
  null, // Dom libre
  // Week 2
  { label: 'Turno Ana L2',  clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
  { label: 'Turno Ana M2',  clockIn: '08:00', clockOut: '17:30', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 }, // 30 min overtime
  { label: 'Turno Ana X2',  clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
  { label: 'Turno Ana J2',  clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
  { label: 'Turno Ana V2',  clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
  null,
  null,
];

// Luis: Part time, horas variables
const luisDays: (WorkDay | null)[] = [
  // Week 1
  { label: 'Turno Luis L1', clockIn: '09:00', clockOut: '13:00', scheduledBreakDuration: 0 },               // 4h mañana
  null,                                                                                                        // Martes libre
  { label: 'Turno Luis X1', clockIn: '12:00', clockOut: '18:00', scheduledBreakDuration: 0 },               // 6h tarde
  { label: 'Turno Luis J1', clockIn: '09:00', clockOut: '14:00', scheduledBreakDuration: 0 },               // 5h
  null,                                                                                                        // Viernes libre
  { label: 'Turno Luis S1', clockIn: '08:00', clockOut: '13:00', scheduledBreakDuration: 0 },               // Sab 5h
  null,
  // Week 2
  { label: 'Turno Luis L2', clockIn: '09:00', clockOut: '13:00', scheduledBreakDuration: 0 },               // 4h
  { label: 'Turno Luis M2', clockIn: '13:00', clockOut: '18:00', scheduledBreakDuration: 0 },               // 5h tarde
  null,
  { label: 'Turno Luis J2', clockIn: '09:00', clockOut: '15:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 }, // 5.5h con break
  { label: 'Turno Luis V2', clockIn: '10:00', clockOut: '16:00', scheduledBreakDuration: 0 },               // 6h
  { label: 'Turno Luis S2', clockIn: '08:00', clockOut: '12:00', scheduledBreakDuration: 0 },               // Sab 4h
  null,
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n\x1b[1m╔══════════════════════════════════════╗');
  console.log('║   Seed — Cuenta Real de Sebastian    ║');
  console.log('╚══════════════════════════════════════╝\x1b[0m\n');

  if (!SERVICE_ROLE_KEY) {
    console.error('\x1b[31mFalta SUPABASE_SERVICE_ROLE_KEY\x1b[0m');
    process.exit(1);
  }

  // 1. Use existing employees (already created)
  console.log('\n\x1b[1m1. Usando empleados existentes...\x1b[0m');
  const anaId  = '636e51d4-b435-4b8f-afea-d0ff9088649b'; // Ana Martinez
  const luisId = 'd5acca14-5d2c-49f9-80cb-9b8bcabe1b03'; // Luis Rivera
  ok('Ana Martinez  — ana.martinez@minegocio.app');
  ok('Luis Rivera   — luis.rivera@minegocio.app');

  // 2. Insert timelogs
  console.log('\n\x1b[1m2. Simulando 2 semanas de timelogs...\x1b[0m');

  let anaTotalMin = 0;
  let anaOvertimeDays = 0;
  let anaDaysWorked = 0;

  console.log('\n  \x1b[36mAna Martinez (Full Time):\x1b[0m');
  for (let i = 0; i < anaDays.length; i++) {
    const day = anaDays[i];
    if (!day) continue;
    try {
      const result = await insertWorkDay({ employeeId: anaId, dayIndex: i, ...day });
      anaTotalMin += result.totalMin;
      if (result.overtime) anaOvertimeDays++;
      anaDaysWorked++;
      const h = Math.floor(result.totalMin / 60);
      const m = result.totalMin % 60;
      ok(`Dia ${i + 1} (${dayDate(i)}): ${h}h${m > 0 ? m + 'm' : ''}${result.overtime ? ' \x1b[33m[OVERTIME]\x1b[0m' : ''}`);
    } catch (e: any) {
      err(`Dia ${i + 1}: ${e.message}`);
    }
  }

  let luisTotalMin = 0;
  let luisOvertimeDays = 0;
  let luisDaysWorked = 0;

  console.log('\n  \x1b[36mLuis Rivera (Part Time):\x1b[0m');
  for (let i = 0; i < luisDays.length; i++) {
    const day = luisDays[i];
    if (!day) continue;
    try {
      const result = await insertWorkDay({ employeeId: luisId, dayIndex: i, ...day });
      luisTotalMin += result.totalMin;
      if (result.overtime) luisOvertimeDays++;
      luisDaysWorked++;
      const h = Math.floor(result.totalMin / 60);
      const m = result.totalMin % 60;
      ok(`Dia ${i + 1} (${dayDate(i)}): ${h}h${m > 0 ? m + 'm' : ''}`);
    } catch (e: any) {
      err(`Dia ${i + 1}: ${e.message}`);
    }
  }

  // 3. Summary
  console.log('\n\x1b[1m══════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m  RESUMEN\x1b[0m');
  console.log('\x1b[1m══════════════════════════════════════\x1b[0m');

  console.log(`\n  \x1b[36mAna Martinez (Full Time)\x1b[0m`);
  console.log(`    Dias trabajados:  ${anaDaysWorked}`);
  console.log(`    Total horas:      ${(anaTotalMin / 60).toFixed(2)}h (${anaTotalMin} min)`);
  console.log(`    Dias overtime:    ${anaOvertimeDays}`);

  console.log(`\n  \x1b[36mLuis Rivera (Part Time)\x1b[0m`);
  console.log(`    Dias trabajados:  ${luisDaysWorked}`);
  console.log(`    Total horas:      ${(luisTotalMin / 60).toFixed(2)}h (${luisTotalMin} min)`);
  console.log(`    Dias overtime:    ${luisOvertimeDays}`);

  console.log(`\n  \x1b[32mListo. Abre la app para ver los timelogs.\x1b[0m\n`);
}

main().catch(e => { console.error('\x1b[31m' + e.message + '\x1b[0m'); process.exit(1); });
