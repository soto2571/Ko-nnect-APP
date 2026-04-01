import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

function generatePassword(firstName: string, lastName: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${firstName.toLowerCase()}${lastName.toLowerCase()}${rand}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return err('Unauthorized', 401);

    const userSb = getUserClient(auth);
    const { data: { user }, error: userErr } = await userSb.auth.getUser();
    if (userErr || !user) return err('Unauthorized', 401);

    const { businessId, businessName, firstName, lastName } = await req.json();
    if (!businessId || !firstName || !lastName) return err('Missing required fields');

    const sb = getServiceClient();
    const tempPassword = generatePassword(firstName, lastName);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}@${businessId.substring(0,8)}.konnect`;

    // Create auth user for employee
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email, password: tempPassword, email_confirm: true,
    });
    if (authErr) return err(authErr.message, 500);

    const empUserId = authData.user.id;

    // Create user profile
    await sb.from('users').insert({
      userId: empUserId,
      email,
      firstName,
      lastName,
      role: 'employee',
      businessId,
    });

    // Create employee record
    const { data: employee, error: empErr } = await sb.from('employees').insert({
      businessId,
      userId: empUserId,
      firstName,
      lastName,
      email,
      tempPassword,
    }).select().single();
    if (empErr) return err(empErr.message, 500);

    return cors({ success: true, data: { employee, credentials: { email, password: tempPassword } } }, 201);
  } catch (e) {
    return err('Internal server error', 500);
  }
});
