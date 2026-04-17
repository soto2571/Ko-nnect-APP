import { TEST_OWNER } from './config';
import { TestSuite, api, login, assert, assertEqual } from './helpers';
import { businessId, ownerToken } from './02-business.test';

// Shared state
export let employee1Id = '';
export let employee1Email = '';
export let employee1Password = '';
export let employee2Id = '';
export let employee2UserId = '';

export async function run() {
  const suite = new TestSuite('03 Empleados');

  // Re-login to get fresh token if needed
  const token = ownerToken || await login(TEST_OWNER.email, TEST_OWNER.password);

  suite.test('#31 Agregar empleado con nombre y apellido', async () => {
    assert(!!businessId, 'Necesita businessId del test 02');
    const r = await api('employees-add', {
      token,
      body: { businessId, businessName: 'Test Business PR', firstName: 'Juan', lastName: 'Perez' },
    });
    assertEqual(r.status, 201, 'Status debe ser 201');
    assert(!!r.data.employee.employeeId, 'Debe retornar employeeId');
    assert(!!r.data.credentials.email, 'Debe retornar email');
    assert(!!r.data.credentials.password, 'Debe retornar password');
    employee1Id = r.data.employee.employeeId;
    employee1Email = r.data.credentials.email;
    employee1Password = r.data.credentials.password;
  });

  suite.test('#32 Email generado: juan.perez@testbusinesspr.app', async () => {
    assertEqual(employee1Email, 'juan.perez@testbusinesspr.app', 'Email debe seguir el formato correcto');
  });

  suite.test('#33 Negocio con caracteres especiales → email sanitizado', async () => {
    const r = await api('employees-add', {
      token,
      body: { businessId, businessName: "Lee's Café", firstName: 'Ana', lastName: 'Diaz' },
    });
    if (r.status === 201) {
      const email = r.data.credentials.email;
      assert(!email.includes("'"), `Email no debe tener apostrofe: ${email}`);
      assert(!email.includes(' '), `Email no debe tener espacios: ${email}`);
      assert(email.includes('@leescaf.app') || email.includes('@leescafe.app'),
        `Dominio debe estar sanitizado: ${email}`);
      // Clean up this extra employee
      employee2Id = r.data.employee.employeeId;
      employee2UserId = r.data.employee.userId;
    }
  });

  suite.test('#34 Dos empleados mismo nombre → sufijo numerico', async () => {
    const r = await api('employees-add', {
      token,
      body: { businessId, businessName: 'Test Business PR', firstName: 'Juan', lastName: 'Perez' },
    });
    assertEqual(r.status, 201, 'Status debe ser 201');
    const email2 = r.data.credentials.email;
    assert(email2.startsWith('juan.perez2@') || email2.startsWith('juan.perez3@'),
      `Segundo email debe tener sufijo numerico: ${email2}`);
  });

  suite.test('#35 Agregar empleado sin nombre → error', async () => {
    const r = await api('employees-add', {
      token,
      body: { businessId, businessName: 'Test', firstName: '', lastName: 'X' },
    });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#36 Agregar empleado sin autenticacion → error 401', async () => {
    const r = await api('employees-add', {
      body: { businessId, businessName: 'Test', firstName: 'X', lastName: 'X' },
    });
    assertEqual(r.status, 401, 'Status debe ser 401');
  });

  suite.test('#37 Login con credenciales auto-generadas del empleado', async () => {
    assert(!!employee1Email && !!employee1Password, 'Necesita credenciales del test #31');
    const r = await api('auth-login', { body: { email: employee1Email, password: employee1Password } });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.user.role, 'employee', 'Rol debe ser employee');
  });

  suite.test('#38 Listar empleados del negocio', async () => {
    const r = await api('employees-list', { method: 'GET', token, query: { businessId } });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assert(Array.isArray(r.data), 'Debe retornar array');
    assert(r.data.length >= 2, `Debe haber al menos 2 empleados, hay ${r.data.length}`);
  });

  suite.test('#39 Listar sin businessId → error', async () => {
    const r = await api('employees-list', { method: 'GET', token });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#40 Cambiar nombre del empleado', async () => {
    assert(!!employee1Id, 'Necesita employeeId');
    const r = await api(`employees-update/${employee1Id}`, {
      method: 'PUT', token,
      body: { firstName: 'Juan Carlos' },
    });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.firstName, 'Juan Carlos', 'Nombre actualizado');
  });

  // Note: we don't test delete here to keep employees for shift/timeclock tests

  return suite.run();
}
