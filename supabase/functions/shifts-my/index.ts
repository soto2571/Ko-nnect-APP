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
    const startDate = url.searchParams.get('startDate');
    const endDate   = url.searchParams.get('endDate');

    const sb = getServiceClient();
    let query = sb.from('shifts').select('*')
      .eq('employeeId', user.id)
      .order('startTime', { ascending: true });
    if (startDate) query = query.gte('startTime', startDate);
    if (endDate)   query = query.lte('startTime', endDate + 'T23:59:59.999Z');

    const { data, error } = await query;
    if (error) return err(error.message, 500);

    return cors({ success: true, data: data ?? [] });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
