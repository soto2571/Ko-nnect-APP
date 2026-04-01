import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

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

    // Get the employee to find their userId for auth deletion
    const { data: emp } = await sb.from('employees').select('userId')
      .eq('employeeId', employeeId).single();

    await sb.from('employees').delete().eq('employeeId', employeeId);

    // Delete their auth account too
    if (emp?.userId) {
      await sb.auth.admin.deleteUser(emp.userId);
    }

    return cors({ success: true, message: 'Employee deleted' });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
