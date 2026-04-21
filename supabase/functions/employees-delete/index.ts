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

    // Get employee info before any changes
    const { data: emp } = await sb.from('employees').select('userId')
      .eq('employeeId', employeeId).single();

    // Delete future shifts (anything starting after now)
    const now = new Date().toISOString();
    await sb.from('shifts').delete()
      .eq('employeeId', employeeId)
      .gt('startTime', now);

    // Soft-delete: keep the row so past time_logs retain the employee name
    await sb.from('employees').update({ deletedAt: now })
      .eq('employeeId', employeeId);

    // Revoke auth access so they can no longer log in
    if (emp?.userId) {
      await sb.auth.admin.deleteUser(emp.userId);
    }

    return cors({ success: true, message: 'Employee deleted' });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
