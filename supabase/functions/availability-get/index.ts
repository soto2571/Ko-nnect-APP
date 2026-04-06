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
    const businessId  = url.searchParams.get('businessId');
    const employeeId  = url.searchParams.get('employeeId');
    if (!businessId) return err('Missing businessId');

    const sb = getServiceClient();
    let query = sb.from('employee_availability').select('*').eq('businessId', businessId);
    if (employeeId) query = query.eq('employeeId', employeeId);

    const { data, error } = await query.order('createdAt', { ascending: false });
    if (error) return err(error.message, 500);

    return cors({ success: true, data: data ?? [] });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
