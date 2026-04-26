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
    const shiftId  = url.searchParams.get('shiftId');
    const startUTC = url.searchParams.get('startUTC');
    const endUTC   = url.searchParams.get('endUTC');

    const sb = getServiceClient();

    // Fetch single log by shift
    if (shiftId) {
      const { data } = await sb.from('timelogs').select('*')
        .eq('shiftId', shiftId).maybeSingle();
      return cors({ success: true, data: data ?? null });
    }

    // Fetch all logs for the employee in a date range (for pay period history)
    if (startUTC && endUTC) {
      const { data } = await sb.from('timelogs').select('*')
        .eq('employeeId', user.id)
        .gte('clockIn', startUTC)
        .lte('clockIn', endUTC)
        .order('clockIn', { ascending: false });
      return cors({ success: true, data: data ?? [] });
    }

    // 28-hour lookback — current/recent active log
    const cutoff = new Date(Date.now() - 28 * 3600000).toISOString();
    const { data } = await sb.from('timelogs').select('*')
      .eq('employeeId', user.id)
      .gte('clockIn', cutoff)
      .order('clockIn', { ascending: false })
      .limit(1)
      .maybeSingle();

    return cors({ success: true, data: data ?? null });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
