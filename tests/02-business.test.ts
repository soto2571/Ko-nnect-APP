import { TEST_OWNER, TEST_BUSINESS } from './config';
import { TestSuite, api, login, assert, assertEqual } from './helpers';

// Shared state across tests in this suite
export let businessId = '';
export let ownerToken = '';

export async function run() {
  const suite = new TestSuite('02 Negocio');

  ownerToken = await login(TEST_OWNER.email, TEST_OWNER.password);

  suite.test('#21 Crear negocio con nombre y color', async () => {
    const r = await api('business-create', { token: ownerToken, body: TEST_BUSINESS });
    assertEqual(r.status, 201, 'Status debe ser 201');
    assert(!!r.data.businessId, 'Debe retornar businessId');
    assertEqual(r.data.name, TEST_BUSINESS.name, 'Nombre debe coincidir');
    assertEqual(r.data.color, TEST_BUSINESS.color, 'Color debe coincidir');
    businessId = r.data.businessId;
  });

  suite.test('#22 Crear negocio sin nombre → error', async () => {
    const r = await api('business-create', { token: ownerToken, body: { color: '#000' } });
    assert(r.raw.success === false, 'Debe fallar');
  });

  suite.test('#23 Crear negocio sin autenticacion → error 401', async () => {
    const r = await api('business-create', { body: TEST_BUSINESS });
    assertEqual(r.status, 401, 'Status debe ser 401');
  });

  suite.test('#24 Crear negocio con caracteres especiales "Lee\'s Café & Bar"', async () => {
    const r = await api('business-create', {
      token: ownerToken,
      body: { name: "Lee's Café & Bar", color: '#EF4444' },
    });
    // Puede dar 201 o error si ya tiene negocio — lo importante es que no crashee
    assert(r.status < 500, `No debe dar error de servidor (status: ${r.status})`);
    if (r.status === 201) {
      assertEqual(r.data.name, "Lee's Café & Bar", 'Nombre con caracteres especiales se guarda tal cual');
    }
  });

  suite.test('#25 Obtener negocio existente', async () => {
    assert(!!businessId, 'Necesita businessId del test anterior');
    const r = await api(`business-get/${businessId}`, { method: 'GET', token: ownerToken });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.name, TEST_BUSINESS.name, 'Nombre debe coincidir');
  });

  suite.test('#26 Obtener negocio con ID invalido', async () => {
    const r = await api('business-get/00000000-0000-0000-0000-000000000000', { method: 'GET', token: ownerToken });
    assert(r.status >= 400 || !r.data, 'Debe fallar o retornar vacio');
  });

  suite.test('#27 Actualizar nombre del negocio', async () => {
    assert(!!businessId, 'Necesita businessId');
    const r = await api(`business-update/${businessId}`, {
      method: 'PUT', token: ownerToken,
      body: { name: 'Negocio Actualizado' },
    });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.name, 'Negocio Actualizado', 'Nombre actualizado');

    // Restore original name
    await api(`business-update/${businessId}`, {
      method: 'PUT', token: ownerToken,
      body: { name: TEST_BUSINESS.name },
    });
  });

  suite.test('#28 Actualizar color del negocio', async () => {
    const r = await api(`business-update/${businessId}`, {
      method: 'PUT', token: ownerToken,
      body: { color: '#10B981' },
    });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.color, '#10B981', 'Color actualizado');

    // Restore
    await api(`business-update/${businessId}`, {
      method: 'PUT', token: ownerToken,
      body: { color: TEST_BUSINESS.color },
    });
  });

  suite.test('#29 Actualizar payPeriodType a biweekly', async () => {
    const r = await api(`business-update/${businessId}`, {
      method: 'PUT', token: ownerToken,
      body: { payPeriodType: 'biweekly' },
    });
    assertEqual(r.status, 200, 'Status debe ser 200');
    assertEqual(r.data.payPeriodType, 'biweekly', 'Tipo actualizado');
  });

  suite.test('#30 Actualizar sin autenticacion → error 401', async () => {
    const r = await api(`business-update/${businessId}`, {
      method: 'PUT',
      body: { name: 'Hack' },
    });
    assertEqual(r.status, 401, 'Status debe ser 401');
  });

  return suite.run();
}
