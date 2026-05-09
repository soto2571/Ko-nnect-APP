// ─── Configuracion de pruebas ────────────────────────────────────────────────
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env') });

export const SUPABASE_URL  = process.env.SUPABASE_URL  ?? '';
export const FUNCTIONS_URL = process.env.SUPABASE_FUNCTIONS_URL ?? `${SUPABASE_URL}/functions/v1`;
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const ANON_KEY         = process.env.SUPABASE_ANON_KEY ?? '';

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
