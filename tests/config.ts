// ─── Configuracion de pruebas ────────────────────────────────────────────────
// Cambia estos valores si tu proyecto es diferente.

export const SUPABASE_URL = 'https://izfcsiqucpkroylkgjei.supabase.co';
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Service role key — necesario para limpiar datos de prueba.
// NUNCA subir esto a git. Lo leemos de variable de entorno.
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

// Credenciales de prueba (se crean y borran automaticamente)
export const TEST_OWNER = {
  email: 'testowner@konnecta-tests.app',
  password: 'TestOwner123!',
  firstName: 'Test',
  lastName: 'Owner',
  role: 'owner' as const,
};

export const TEST_BUSINESS = {
  name: 'Test Business PR',
  color: '#4F46E5',
  payPeriodType: 'biweekly' as const,
  payPeriodStartDay: 1, // Monday
};
