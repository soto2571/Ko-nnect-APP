/**
 * One-time fix: patch existing seeded employees (Ana, Luis) to have businessId
 * in their users table row so they see the business color when they log in.
 *
 * Run: SUPABASE_SERVICE_ROLE_KEY="..." npx tsx fix-employee-businessid.ts
 */

const SUPABASE_URL = 'https://izfcsiqucpkroylkgjei.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BUSINESS_ID = '825c2d81-c8a3-481b-b165-7ebca1bc6fb2';

if (!SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

async function rest(table: string, opts: { method?: string; query?: string; body?: any } = {}) {
  const { method = 'GET', query = '', body } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`, {
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
  return text ? JSON.parse(text) : null;
}

(async () => {
  // Find employees of this business whose users row has no businessId
  const emps = await rest('employees', { query: `businessId=eq.${BUSINESS_ID}&select=userId,firstName,lastName` });
  console.log(`Found ${emps.length} employees in business`);

  for (const emp of emps) {
    const users = await rest('users', { query: `userId=eq.${emp.userId}&select=userId,businessId` });
    if (!users[0]) { console.log(`  ⚠ No user row for ${emp.firstName} ${emp.lastName}`); continue; }
    if (users[0].businessId === BUSINESS_ID) { console.log(`  ✓ ${emp.firstName} ${emp.lastName} already has businessId`); continue; }

    await rest(`users?userId=eq.${emp.userId}`, { method: 'PATCH', body: { businessId: BUSINESS_ID } });
    console.log(`  ✓ Fixed ${emp.firstName} ${emp.lastName}`);
  }

  console.log('Done.');
})();
