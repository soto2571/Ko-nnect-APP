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

    const url = new URL(req.url);
    const employeeId = url.pathname.split('/').pop();
    if (!employeeId) return err('Missing employeeId');

    const sb = getServiceClient();
    const { data: emp } = await sb.from('employees').select('*')
      .eq('employeeId', employeeId).single();
    if (!emp) return err('Employee not found', 404);

    const newPassword = generatePassword(emp.firstName, emp.lastName);

    // Update auth password
    await sb.auth.admin.updateUserById(emp.userId, { password: newPassword });

    // Store new tempPassword
    await sb.from('employees').update({ tempPassword: newPassword })
      .eq('employeeId', employeeId);

    return cors({ success: true, data: { email: emp.email, password: newPassword } });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
