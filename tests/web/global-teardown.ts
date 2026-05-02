/**
 * global-teardown.ts
 * Runs ONCE after all tests. Deletes the test owner, business, employees,
 * shifts, and timelogs from Supabase.
 */
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '.env.test') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EMAIL        = process.env.TEST_EMAIL ?? 'playwright@konnecta-tests.app';

async function rest(method: string, path: string, body?: object): Promise<any> {
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
  try { return JSON.parse(text); } catch { return null; }
}

export default async function globalTeardown() {
  console.log('\n🧹  Ko-nnecta\' Playwright — Global Teardown\n');

  if (!SERVICE_KEY) { console.log('  ⚠ No SERVICE_ROLE_KEY — skipping cleanup'); return; }

  // Find test user profile
  const profiles: any[] = await rest('GET', `/rest/v1/users?email=eq.${encodeURIComponent(EMAIL)}&select=userId,businessId`) ?? [];
  const profile = profiles[0];

  if (!profile) {
    console.log('  ✓ Test user not found — nothing to clean');
    return;
  }

  const { userId, businessId } = profile;

  // Delete business data (cascades through shifts, timelogs, employees)
  if (businessId) {
    await rest('DELETE', `/rest/v1/timelogs?businessId=eq.${businessId}`);
    await rest('DELETE', `/rest/v1/shifts?businessId=eq.${businessId}`);
    await rest('DELETE', `/rest/v1/employees?businessId=eq.${businessId}`);
    await rest('DELETE', `/rest/v1/businesses?businessId=eq.${businessId}`);
    console.log('  ✓ Business data deleted');
  }

  // Delete user profile
  await rest('DELETE', `/rest/v1/users?email=eq.${encodeURIComponent(EMAIL)}`);

  // Delete auth user
  if (userId) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    });
  }

  console.log('  ✓ Test owner deleted\n');
  console.log('🟢  Teardown complete\n');
}
