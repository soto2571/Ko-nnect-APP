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
    const shiftId = url.searchParams.get('shiftId');

    const sb = getServiceClient();

    if (shiftId) {
      const { data } = await sb.from('timelogs').select('*')
        .eq('shiftId', shiftId).maybeSingle();
      return cors({ success: true, data: data ?? null });
    }

    // 28-hour lookback on clockIn avoids UTC midnight rollover for any timezone
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
