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

    const body = await req.json();
    const { firstName, lastName } = body;
    if (!firstName && !lastName) return err('Nothing to update');

    const sb = getServiceClient();

    // Fetch employee to verify it belongs to the caller's business
    const { data: emp } = await sb.from('employees').select('*').eq('employeeId', employeeId).single();
    if (!emp) return err('Employee not found', 404);

    const updates: Record<string, string> = {};
    if (firstName) updates.firstName = firstName;
    if (lastName)  updates.lastName  = lastName;

    const { data, error } = await sb.from('employees').update(updates)
      .eq('employeeId', employeeId).select().single();
    if (error) return err(error.message, 500);

    // Keep users table in sync
    await sb.from('users').update(updates).eq('userId', emp.userId);

    return cors({ success: true, data });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
