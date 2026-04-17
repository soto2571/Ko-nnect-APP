import { TEST_OWNER } from './config';
import { TestSuite, api, login, supabaseAdmin, assert, assertEqual } from './helpers';
import { businessId } from './02-business.test';

/**
 * SIMULACION DE 2 SEMANAS DE PAYROLL
 *
 * Insertamos timelogs directamente en la base de datos con timestamps especificos
 * para simular 14 dias de trabajo de 2 empleados. Luego verificamos que los datos
 * son correctos para generar payroll.
 *
 * NO usamos las APIs de clock-in/out porque usan new Date() del servidor.
 * En su lugar, usamos la REST API de Supabase con service role para insertar
 * datos con timestamps exactos.
 */

interface SimDay {
  clockIn: string;    // HH:mm
  clockOut: string;   // HH:mm
  breaks?: { start: string; end: string }[];  // HH:mm pairs
  scheduledBreakDuration?: number;
}

// Calcula los minutos netos esperados
function expectedMinutes(day: SimDay): number {
  const [ciH, ciM] = day.clockIn.split(':').map(Number);
  const [coH, coM] = day.clockOut.split(':').map(Number);
  let totalMin = (coH * 60 + coM) - (ciH * 60 + ciM);

  for (const b of day.breaks ?? []) {
    const [bsH, bsM] = b.start.split(':').map(Number);
    const [beH, beM] = b.end.split(':').map(Number);
    totalMin -= (beH * 60 + beM) - (bsH * 60 + bsM);
  }

  return totalMin;
}

function isOvertime(minutes: number): boolean {
  return minutes > 480; // > 8 hours
}

function isMissedPunch(day: SimDay): boolean {
  return (day.scheduledBreakDuration ?? 0) > 0 &&
    !(day.breaks ?? []).some(b => b.start && b.end);
}

export async function run() {
  const suite = new TestSuite('06 Simulacion Payroll (2 semanas)');

  const token = await login(TEST_OWNER.email, TEST_OWNER.password);

  // ── Setup: Get or create employees for simulation ──

  let empList: any[] = [];
  let mariaUserId = '';
  let carlosUserId = '';

  suite.test('Setup: Crear empleados para simulacion', async () => {
    assert(!!businessId, 'Necesita businessId');

    // Create Maria
    const r1 = await api('employees-add', {
      token,
      body: { businessId, businessName: 'Test Business PR', firstName: 'Maria', lastName: 'Garcia' },
    });
    assertEqual(r1.status, 201, 'Maria creada');
    mariaUserId = r1.data.employee.userId;

    // Create Carlos
    const r2 = await api('employees-add', {
      token,
      body: { businessId, businessName: 'Test Business PR', firstName: 'Carlos', lastName: 'Lopez' },
    });
    assertEqual(r2.status, 201, 'Carlos creado');
    carlosUserId = r2.data.employee.userId;

    assert(!!mariaUserId && !!carlosUserId, 'Ambos empleados creados');
  });

  // ── Define the 2-week schedule ──

  // Start on a Monday, 2 weeks ago
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 14);
  // Roll to Monday
  while (baseDate.getDay() !== 1) baseDate.setDate(baseDate.getDate() - 1);
  baseDate.setHours(0, 0, 0, 0);

  function dayDate(offset: number): string {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  function ts(dateStr: string, time: string): string {
    return `${dateStr}T${time}:00.000Z`;
  }

  // Maria: consistent worker
  const mariaDays: (SimDay | null)[] = [
    // Week 1: Mon-Sat, Sun off
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:45' }], scheduledBreakDuration: 30 },
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
    { clockIn: '08:00', clockOut: '13:00', scheduledBreakDuration: 0 }, // Saturday half day
    null, // Sunday off
    // Week 2: Mon-Sat, Sun off
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 },
    { clockIn: '08:00', clockOut: '13:00', scheduledBreakDuration: 0 }, // Saturday
    null, // Sunday off
  ];

  // Carlos: irregular worker
  const carlosDays: (SimDay | null)[] = [
    // Week 1
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 }, // Mon normal
    { clockIn: '08:15', clockOut: '17:30', scheduledBreakDuration: 30 }, // Tue: missed break, overtime
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '11:30', end: '12:00' }, { start: '15:00', end: '15:15' }], scheduledBreakDuration: 30 }, // Wed: 2 breaks
    null, // Thu: absent
    { clockIn: '08:00', clockOut: '19:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 }, // Fri: overtime
    { clockIn: '08:00', clockOut: '13:00', scheduledBreakDuration: 0 }, // Sat half day
    null, // Sun off
    // Week 2
    { clockIn: '07:45', clockOut: '16:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 }, // Mon early
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 }, // Tue normal
    { clockIn: '08:00', clockOut: '12:00', scheduledBreakDuration: 0 }, // Wed half
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '12:30' }], scheduledBreakDuration: 30 }, // Thu normal
    { clockIn: '08:00', clockOut: '17:00', breaks: [{ start: '12:00', end: '13:00' }], scheduledBreakDuration: 30 }, // Fri 1hr break
    null, // Sat absent
    null, // Sun off
  ];

  // ── Insert timelogs directly into DB ──

  const insertedLogIds: string[] = [];

  // Helper: create a shift and its timelog for one day
  async function insertWorkDay(
    employeeId: string,
    dayIndex: number,
    day: SimDay,
  ) {
    const date = dayDate(dayIndex);
    const clockIn = ts(date, day.clockIn);
    const clockOut = ts(date, day.clockOut);

    // Create a real shift (needed for foreign key)
    const shiftR = await api('shifts-create', {
      token,
      body: {
        businessId,
        title: `Sim D${dayIndex + 1}`,
        startTime: clockIn,
        endTime: clockOut,
        breakDuration: day.scheduledBreakDuration ?? 0,
      },
    });
    const shiftId = shiftR.data.shiftId;
    assert(!!shiftId, `Shift creado para dia ${dayIndex + 1}`);

    // Assign to employee
    await api(`shifts-assign/${shiftId}`, {
      method: 'PUT', token,
      body: { employeeId },
    });

    // Insert timelog directly
    const breaks = (day.breaks ?? []).map(b => ({
      start: ts(date, b.start),
      end: ts(date, b.end),
    }));
    const totalMin = expectedMinutes(day);
    const overtime = isOvertime(totalMin);
    const missed = isMissedPunch(day);

    const rows = await supabaseAdmin('timelogs', {
      method: 'POST',
      body: {
        businessId,
        employeeId,
        shiftId,
        date,
        clockIn,
        clockOut,
        breaks,
        scheduledBreakDuration: day.scheduledBreakDuration ?? 0,
        totalMinutes: totalMin,
        overtimeDay: overtime,
        missedBreakPunch: missed,
        status: missed ? 'missed_punch' : 'clocked_out',
      },
    });
    assert(Array.isArray(rows) && rows.length > 0, `Timelog dia ${dayIndex + 1} insertado`);
    insertedLogIds.push(rows[0].logId);
  }

  suite.test('Setup: Insertar timelogs de Maria (14 dias)', async () => {
    for (let i = 0; i < mariaDays.length; i++) {
      if (!mariaDays[i]) continue;
      await insertWorkDay(mariaUserId, i, mariaDays[i]!);
    }
  });

  suite.test('Setup: Insertar timelogs de Carlos (14 dias)', async () => {
    for (let i = 0; i < carlosDays.length; i++) {
      if (!carlosDays[i]) continue;
      await insertWorkDay(carlosUserId, i, carlosDays[i]!);
    }
  });

  // ── Verify payroll data ──

  const startDate = dayDate(0);
  const endDate = dayDate(13);

  suite.test('#69 Total horas Maria en 2 semanas', async () => {
    const r = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate, endDate, employeeId: mariaUserId },
    });
    const totalMin = r.data.reduce((sum: number, log: any) => sum + (log.totalMinutes ?? 0), 0);
    // Maria expected: see plan — calculate from mariaDays
    const expectedTotal = mariaDays
      .filter((d): d is SimDay => d !== null)
      .reduce((sum, d) => sum + expectedMinutes(d), 0);

    assertEqual(totalMin, expectedTotal, `Total minutos Maria: esperado ${expectedTotal}, obtenido ${totalMin}`);
    console.log(`        Maria: ${totalMin} min = ${(totalMin / 60).toFixed(2)}h`);
  });

  suite.test('#70 Total horas Carlos en 2 semanas', async () => {
    const r = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate, endDate, employeeId: carlosUserId },
    });
    const totalMin = r.data.reduce((sum: number, log: any) => sum + (log.totalMinutes ?? 0), 0);
    const expectedTotal = carlosDays
      .filter((d): d is SimDay => d !== null)
      .reduce((sum, d) => sum + expectedMinutes(d), 0);

    assertEqual(totalMin, expectedTotal, `Total minutos Carlos: esperado ${expectedTotal}, obtenido ${totalMin}`);
    console.log(`        Carlos: ${totalMin} min = ${(totalMin / 60).toFixed(2)}h`);
  });

  suite.test('#71 Dias con overtime Carlos', async () => {
    const r = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate, endDate, employeeId: carlosUserId },
    });
    const overtimeDays = r.data.filter((log: any) => log.overtimeDay === true);
    // Carlos has 6 days >480 min: Mon/Tue/Wed/Fri W1 + Tue/Thu W2
    assertEqual(overtimeDays.length, 6, `Carlos debe tener 6 dias overtime, tiene ${overtimeDays.length}`);
  });

  suite.test('#72 Dias con missed_punch Carlos', async () => {
    const r = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate, endDate, employeeId: carlosUserId },
    });
    const missedDays = r.data.filter((log: any) => log.missedBreakPunch === true);
    assertEqual(missedDays.length, 1, `Carlos debe tener 1 dia missed_punch, tiene ${missedDays.length}`);
  });

  suite.test('#73 Dias trabajados Maria = 12', async () => {
    const r = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate, endDate, employeeId: mariaUserId },
    });
    assertEqual(r.data.length, 12, `Maria debe tener 12 timelogs, tiene ${r.data.length}`);
  });

  suite.test('#74 Dias trabajados Carlos = 10', async () => {
    const r = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate, endDate, employeeId: carlosUserId },
    });
    assertEqual(r.data.length, 10, `Carlos debe tener 10 timelogs, tiene ${r.data.length}`);
  });

  suite.test('#77 Filtrar por employeeId funciona', async () => {
    const rMaria = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate, endDate, employeeId: mariaUserId },
    });
    const rCarlos = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate, endDate, employeeId: carlosUserId },
    });
    // Ensure no overlap
    const mariaIds = new Set(rMaria.data.map((l: any) => l.logId));
    const carlosIds = new Set(rCarlos.data.map((l: any) => l.logId));
    for (const id of carlosIds) {
      assert(!mariaIds.has(id), 'No debe haber overlap entre empleados');
    }
  });

  suite.test('#78 Filtrar por rango de fecha (solo semana 1)', async () => {
    const week1End = dayDate(6); // Sunday of week 1
    const r = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate, endDate: week1End, employeeId: mariaUserId },
    });
    // Maria week 1: Mon-Sat = 6 days
    assertEqual(r.data.length, 6, `Maria semana 1 debe tener 6 timelogs, tiene ${r.data.length}`);
  });

  suite.test('#80 totalMinutes guardado coincide con calculo', async () => {
    const r = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate, endDate },
    });
    let mismatches = 0;
    for (const log of r.data) {
      if (!log.clockIn || !log.clockOut) continue;
      const ciMs = new Date(log.clockIn).getTime();
      const coMs = new Date(log.clockOut).getTime();
      const breakMs = (log.breaks ?? [])
        .filter((b: any) => b.start && b.end)
        .reduce((sum: number, b: any) => sum + (new Date(b.end).getTime() - new Date(b.start).getTime()), 0);
      const recalc = Math.round((coMs - ciMs) / 60000) - Math.round(breakMs / 60000);

      if (recalc !== log.totalMinutes) {
        console.log(`        MISMATCH logId=${log.logId}: guardado=${log.totalMinutes} calculado=${recalc}`);
        mismatches++;
      }
    }
    assertEqual(mismatches, 0, `Hay ${mismatches} timelogs con totalMinutes incorrecto`);
  });

  return suite.run();
}
