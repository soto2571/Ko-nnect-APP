import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';
import { isAdminOrOwner } from '../_shared/auth.ts';

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

    const body = await req.json();
    const { firstName, lastName, roleId } = body;

    const sb = getServiceClient();

    const { data: emp } = await sb.from('employees').select('*').eq('employeeId', employeeId).single();
    if (!emp) return err('Employee not found', 404);

    if (!await isAdminOrOwner(user.id, emp.businessId))
      return err('No autorizado', 403);

    const updates: Record<string, unknown> = {};
    if (firstName) updates.firstName = firstName;
    if (lastName)  updates.lastName  = lastName;
    // roleId can be null (to unassign) or a uuid string (to assign)
    if ('roleId' in body) updates.roleId = roleId ?? null;

    if (Object.keys(updates).length === 0) return err('Nothing to update');

    const { data, error } = await sb.from('employees').update(updates)
      .eq('employeeId', employeeId).select().single();
    if (error) return err(error.message, 500);

    // Keep users table in sync for name changes only
    const nameUpdates: Record<string, string> = {};
    if (firstName) nameUpdates.firstName = firstName;
    if (lastName)  nameUpdates.lastName  = lastName;
    if (Object.keys(nameUpdates).length > 0)
      await sb.from('users').update(nameUpdates).eq('userId', emp.userId);

    return cors({ success: true, data });
  } catch {
    return err('Internal server error', 500);
  }
});
