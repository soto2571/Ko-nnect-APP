import { TEST_OWNER } from './config';
import { TestSuite, api, login, assert, assertEqual } from './helpers';
import { businessId, ownerToken } from './02-business.test';
import { employee1Email, employee1Password } from './03-employees.test';

export async function run() {
  const suite = new TestSuite('05 Reloj / Timeclock');

  const token = ownerToken || await login(TEST_OWNER.email, TEST_OWNER.password);
  let empToken = '';
  let shiftId = '';
  let logId = '';
  let shiftWithBreakId = '';
  let logWithBreakId = '';

  // Setup: login as employee and create test shifts
  suite.test('Setup: Login como empleado y crear turnos de prueba', async () => {
    empToken = await login(employee1Email, employee1Password);
    assert(!!empToken, 'Debe poder hacer login como empleado');

    // Get employee userId
    const empR = await api('employees-list', { method: 'GET', token, query: { businessId } });
    const emp = empR.data.find((e: any) => e.email === employee1Email);
    assert(!!emp, 'Debe encontrar al empleado');

    const today = new Date().toISOString().split('T')[0];

    // Create a shift without break
    const s1 = await api('shifts-create', {
      token,
      body: {
        businessId,
        title: 'Turno Timeclock Test',
        startTime: `${today}T08:00:00.000Z`,
        endTime: `${today}T17:00:00.000Z`,
      },
    });
    shiftId = s1.data.shiftId;

    // Assign to employee
    await api(`shifts-assign/${shiftId}`, {
      method: 'PUT', token,
      body: { employeeId: emp.userId },
    });

    // Create a shift WITH scheduled break
    const s2 = await api('shifts-create', {
      token,
      body: {
        businessId,
        title: 'Turno Break Test',
        startTime: `${today}T08:00:00.000Z`,
        endTime: `${today}T17:00:00.000Z`,
        breakDuration: 30,
        breakTime: `${today}T12:00:00.000Z`,
      },
    });
    shiftWithBreakId = s2.data.shiftId;
    await api(`shifts-assign/${shiftWithBreakId}`, {
      method: 'PUT', token,
      body: { employeeId: emp.userId },
    });

    assert(!!shiftId && !!shiftWithBreakId, 'Turnos creados');
  });

  // ── CLOCK IN ────────────────────────────────────────────────────────────────

  suite.test('#51 Clock in a turno asignado', async () => {
    const r = await api('timelog-clock-in', {
      token: empToken,
      body: { shiftId, businessId },
    });
    assertEqual(r.status, 201, 'Status debe ser 201');
    assertEqual(r.data.status, 'clocked_in', 'Status debe ser clocked_in');
    assert(!!r.data.clockIn, 'Debe tener clockIn');
    assert(!!r.data.logId, 'Debe tener logId');
    logId = r.data.logId;
  });

  suite.test('#52 Clock in duplicado → error', async () => {
    const r = await api('timelog-clock-in', {
      token: empToken,
      body: { shiftId, businessId },
    });
    assertEqual(r.status, 400, 'Status debe ser 400');
    assert(r.raw.message.includes('Already clocked in'), `Mensaje: "${r.raw.message}"`);
  });

  suite.test('#53 Clock in sin shiftId → error', async () => {
    const r = await api('timelog-clock-in', {
      token: empToken,
      body: { businessId },
    });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#54 Clock in sin autenticacion → error 401', async () => {
    const r = await api('timelog-clock-in', {
      body: { shiftId: 'x', businessId },
    });
    assertEqual(r.status, 401, 'Status debe ser 401');
  });

  // ── BREAK START ─────────────────────────────────────────────────────────────

  suite.test('#55 Empezar break cuando esta clocked_in', async () => {
    const r = await api('timelog-break-start', {
      token: empToken,
      body: { logId },
    });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.status, 'on_break', 'Status debe ser on_break');
    assert(r.data.breaks.length === 1, 'Debe tener 1 break');
    assert(!!r.data.breaks[0].start, 'Break debe tener start');
  });

  suite.test('#57 Empezar break cuando ya esta on_break → error', async () => {
    const r = await api('timelog-break-start', {
      token: empToken,
      body: { logId },
    });
    assertEqual(r.status, 400, 'Status debe ser 400');
  });

  // ── BREAK END ───────────────────────────────────────────────────────────────

  suite.test('#58 Terminar break cuando esta on_break', async () => {
    const r = await api('timelog-break-end', {
      token: empToken,
      body: { logId },
    });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.status, 'clocked_in', 'Status debe volver a clocked_in');
    assert(!!r.data.breaks[0].end, 'Break debe tener end');
  });

  suite.test('#59 Terminar break cuando no esta on_break → error', async () => {
    const r = await api('timelog-break-end', {
      token: empToken,
      body: { logId },
    });
    assertEqual(r.status, 400, 'Status debe ser 400');
  });

  // ── MULTIPLE BREAKS ─────────────────────────────────────────────────────────

  suite.test('#65 Tomar segundo break', async () => {
    // Start break 2
    const s = await api('timelog-break-start', { token: empToken, body: { logId } });
    assertEqual(s.data.status, 'on_break', 'Debe estar on_break');
    assertEqual(s.data.breaks.length, 2, 'Debe tener 2 breaks');

    // End break 2
    const e = await api('timelog-break-end', { token: empToken, body: { logId } });
    assertEqual(e.data.status, 'clocked_in', 'Debe volver a clocked_in');
    assert(!!e.data.breaks[1].end, 'Segundo break debe tener end');
  });

  // ── CLOCK OUT ───────────────────────────────────────────────────────────────

  suite.test('#60 Clock out normal', async () => {
    const r = await api('timelog-clock-out', {
      token: empToken,
      body: { logId },
    });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.status, 'clocked_out', 'Status debe ser clocked_out');
    assert(!!r.data.clockOut, 'Debe tener clockOut');
    assert(typeof r.data.totalMinutes === 'number', 'Debe tener totalMinutes');
    assert(r.data.totalMinutes >= 0, `totalMinutes debe ser >= 0 (es ${r.data.totalMinutes})`);
  });

  suite.test('#64 Clock out cuando ya esta clocked_out → error', async () => {
    const r = await api('timelog-clock-out', {
      token: empToken,
      body: { logId },
    });
    assertEqual(r.status, 400, 'Status debe ser 400');
  });

  // ── MISSED BREAK PUNCH ─────────────────────────────────────────────────────

  suite.test('#63 Clock out sin tomar break programado → missed_punch', async () => {
    // Clock in to the shift that has a scheduled break
    const ci = await api('timelog-clock-in', {
      token: empToken,
      body: { shiftId: shiftWithBreakId, businessId, scheduledBreakDuration: 30 },
    });
    logWithBreakId = ci.data.logId;

    // Clock out immediately — never took the break
    const co = await api('timelog-clock-out', {
      token: empToken,
      body: { logId: logWithBreakId },
    });
    assertEqual(co.data.status, 'missed_punch', 'Status debe ser missed_punch (no tomo el break)');
    assertEqual(co.data.missedBreakPunch, true, 'missedBreakPunch debe ser true');
  });

  // ── LIST TIMELOGS ───────────────────────────────────────────────────────────

  suite.test('#67 Listar timelogs por rango de fechas', async () => {
    const today = new Date().toISOString().split('T')[0];
    const r = await api('timelog-list', {
      method: 'GET', token,
      query: { businessId, startDate: today, endDate: today },
    });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assert(Array.isArray(r.data), 'Debe retornar array');
    assert(r.data.length >= 2, `Debe haber al menos 2 timelogs, hay ${r.data.length}`);
  });

  return suite.run();
}
