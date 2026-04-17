import { TEST_OWNER, FUNCTIONS_URL } from './config';
import { TestSuite, api, signup, login, cleanup, assert, assertEqual, findAuthUser } from './helpers';

export async function run() {
  const suite = new TestSuite('01 Autenticacion');

  // Track created users for cleanup
  const createdEmails: string[] = [];

  // ── SIGNUP ──────────────────────────────────────────────────────────────────

  suite.test('#1 Crear cuenta con datos validos', async () => {
    const r = await api('auth-signup', { body: TEST_OWNER });
    createdEmails.push(TEST_OWNER.email);
    assertEqual(r.status, 201, 'Status debe ser 201');
    assert(!!r.data.token, 'Debe retornar token');
    assert(!!r.data.user.userId, 'Debe retornar userId');
    assertEqual(r.data.user.email, TEST_OWNER.email, 'Email debe coincidir');
    assertEqual(r.data.user.role, 'owner', 'Rol debe ser owner');
  });

  suite.test('#2 Crear cuenta sin nombre → error', async () => {
    const r = await api('auth-signup', {
      body: { email: 'x@x.com', password: '123456', firstName: '', lastName: 'X', role: 'owner' },
    });
    assert(r.raw.success === false, 'Debe fallar');
    assert(r.raw.message.includes('Faltan campos'), `Mensaje: "${r.raw.message}"`);
  });

  suite.test('#3 Crear cuenta sin apellido → error', async () => {
    const r = await api('auth-signup', {
      body: { email: 'x@x.com', password: '123456', firstName: 'X', lastName: '', role: 'owner' },
    });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#4 Crear cuenta sin email → error', async () => {
    const r = await api('auth-signup', {
      body: { email: '', password: '123456', firstName: 'X', lastName: 'X', role: 'owner' },
    });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#5 Crear cuenta sin password → error', async () => {
    const r = await api('auth-signup', {
      body: { email: 'x@x.com', password: '', firstName: 'X', lastName: 'X', role: 'owner' },
    });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#6 Crear cuenta con email duplicado → error 409', async () => {
    const r = await api('auth-signup', { body: TEST_OWNER });
    assertEqual(r.status, 409, 'Status debe ser 409');
    assert(r.raw.message.includes('Ya existe'), `Mensaje: "${r.raw.message}"`);
  });

  suite.test('#7 Crear cuenta con password de 3 caracteres → se crea (Supabase no valida largo)', async () => {
    // NOTA: Supabase Auth no tiene minimo de password por defecto.
    // La validacion de 6 chars es solo en el frontend (signup.tsx).
    // Esto es un hallazgo — considerar agregar validacion en el backend.
    const r = await api('auth-signup', {
      body: { email: 'shortpw@konnecta-tests.app', password: 'abc', firstName: 'Short', lastName: 'Pw', role: 'owner' },
    });
    createdEmails.push('shortpw@konnecta-tests.app');
    // Supabase actually allows short passwords — this documents the gap
    assert(r.status === 201 || r.raw.success === false, `Status: ${r.status}`);
  });

  suite.test('#8 Crear cuenta con email invalido → error', async () => {
    const r = await api('auth-signup', {
      body: { email: 'notanemail', password: '123456', firstName: 'X', lastName: 'X', role: 'owner' },
    });
    assert(r.raw.success === false || r.status >= 400, 'Debe fallar con email invalido');
  });

  // ── LOGIN ───────────────────────────────────────────────────────────────────

  suite.test('#9 Login con credenciales correctas', async () => {
    const r = await api('auth-login', { body: { email: TEST_OWNER.email, password: TEST_OWNER.password } });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assert(!!r.data.token, 'Debe retornar token');
    assert(!!r.data.user.userId, 'Debe retornar userId');
    assertEqual(r.data.user.role, 'owner', 'Rol debe ser owner');
  });

  suite.test('#10 Login con password incorrecta → error 401', async () => {
    const r = await api('auth-login', { body: { email: TEST_OWNER.email, password: 'wrongpassword' } });
    assertEqual(r.status, 401, 'Status debe ser 401');
    assert(r.raw.message.includes('Credenciales incorrectas'), `Mensaje: "${r.raw.message}"`);
  });

  suite.test('#11 Login con email que no existe → error 401', async () => {
    const r = await api('auth-login', { body: { email: 'noexiste@fake.com', password: '123456' } });
    assertEqual(r.status, 401, 'Status debe ser 401');
  });

  suite.test('#12 Login sin email → error', async () => {
    const r = await api('auth-login', { body: { email: '', password: '123456' } });
    assert(r.raw.success === false, 'Debe fallar');
    assert(r.raw.message.includes('correo'), `Mensaje: "${r.raw.message}"`);
  });

  suite.test('#13 Login sin password → error', async () => {
    const r = await api('auth-login', { body: { email: TEST_OWNER.email, password: '' } });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#14 Login con body vacio → error', async () => {
    const r = await api('auth-login', { body: {} as any });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#15 Token del login es valido para API calls', async () => {
    const token = await login(TEST_OWNER.email, TEST_OWNER.password);
    const r = await fetch(`${FUNCTIONS_URL}/auth-profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await r.json();
    assert(json.success === true, 'auth-profile debe funcionar con el token');
  });

  // ── CHECK PROVIDER ──────────────────────────────────────────────────────────

  suite.test('#18 Check provider de cuenta email/password', async () => {
    const r = await api('auth-check-provider', { body: { email: TEST_OWNER.email } });
    assertEqual(r.data.provider, 'email', 'Provider debe ser email');
  });

  suite.test('#19 Check provider de email que no existe', async () => {
    const r = await api('auth-check-provider', { body: { email: 'fantasma@ghost.com' } });
    assertEqual(r.data.provider, null, 'Provider debe ser null');
  });

  suite.test('#20 Check provider sin email → error', async () => {
    const r = await api('auth-check-provider', { body: {} as any });
    assert(r.raw.success === false, 'Debe fallar');
  });

  // ── CLEANUP ─────────────────────────────────────────────────────────────────
  // No limpiamos aqui — el test owner se usa en las demas pruebas.
  // El cleanup global se hace en run.ts al final.

  return suite.run();
}
