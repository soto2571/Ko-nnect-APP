import { TEST_OWNER } from './config';
import { TestSuite, api, login, assert, assertEqual } from './helpers';
import { businessId, ownerToken } from './02-business.test';

export let shift1Id = '';
export let shift2Id = '';

export async function run() {
  const suite = new TestSuite('04 Turnos');

  const token = ownerToken || await login(TEST_OWNER.email, TEST_OWNER.password);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  suite.test('#43 Crear turno con titulo, hora inicio y fin', async () => {
    assert(!!businessId, 'Necesita businessId');
    const r = await api('shifts-create', {
      token,
      body: {
        businessId,
        title: 'Turno Manana',
        startTime: `${dateStr}T08:00:00.000Z`,
        endTime: `${dateStr}T17:00:00.000Z`,
      },
    });
    assertEqual(r.status, 201, 'Status debe ser 201');
    assert(!!r.data.shiftId, 'Debe retornar shiftId');
    assertEqual(r.data.title, 'Turno Manana', 'Titulo debe coincidir');
    shift1Id = r.data.shiftId;
  });

  suite.test('#44 Crear turno con break de 30 min', async () => {
    const r = await api('shifts-create', {
      token,
      body: {
        businessId,
        title: 'Turno con Break',
        startTime: `${dateStr}T08:00:00.000Z`,
        endTime: `${dateStr}T17:00:00.000Z`,
        breakDuration: 30,
        breakTime: `${dateStr}T12:00:00.000Z`,
      },
    });
    assertEqual(r.status, 201, 'Status debe ser 201');
    assertEqual(r.data.breakDuration, 30, 'breakDuration debe ser 30');
    shift2Id = r.data.shiftId;
  });

  suite.test('#45 Crear turno sin titulo → error', async () => {
    const r = await api('shifts-create', {
      token,
      body: {
        businessId,
        title: '',
        startTime: `${dateStr}T08:00:00.000Z`,
        endTime: `${dateStr}T17:00:00.000Z`,
      },
    });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#46 Crear turno sin businessId → error', async () => {
    const r = await api('shifts-create', {
      token,
      body: {
        title: 'Test',
        startTime: `${dateStr}T08:00:00.000Z`,
        endTime: `${dateStr}T17:00:00.000Z`,
      },
    });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#47 Asignar turno a empleado', async () => {
    assert(!!shift1Id, 'Necesita shiftId');
    // Get first employee
    const empR = await api('employees-list', { method: 'GET', token, query: { businessId } });
    const empId = empR.data?.[0]?.userId;
    assert(!!empId, 'Necesita al menos un empleado');

    const r = await api(`shifts-assign/${shift1Id}`, {
      method: 'PUT', token,
      body: { employeeId: empId },
    });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.status, 'assigned', 'Status debe ser assigned');
    assertEqual(r.data.employeeId, empId, 'employeeId debe coincidir');
  });

  suite.test('#48 Desasignar turno (employeeId = null)', async () => {
    const r = await api(`shifts-assign/${shift1Id}`, {
      method: 'PUT', token,
      body: { employeeId: null },
    });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.status, 'open', 'Status debe ser open');
  });

  suite.test('#49 Obtener turnos del negocio', async () => {
    const r = await api('shifts-get', { method: 'GET', token, query: { businessId } });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assert(Array.isArray(r.data), 'Debe retornar array');
    assert(r.data.length >= 2, `Debe haber al menos 2 turnos, hay ${r.data.length}`);
  });

  suite.test('#50 Eliminar turno', async () => {
    assert(!!shift2Id, 'Necesita shiftId');
    const r = await api(`shifts-delete/${shift2Id}`, { method: 'DELETE', token });
    assertEqual(r.status, 200, 'Status debe ser 200');

    // Verify it's gone
    const list = await api('shifts-get', { method: 'GET', token, query: { businessId } });
    const found = list.data.find((s: any) => s.shiftId === shift2Id);
    assert(!found, 'Turno eliminado no debe aparecer en la lista');
  });

  return suite.run();
}
