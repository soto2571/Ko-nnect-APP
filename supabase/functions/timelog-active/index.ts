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
    const businessId = url.searchParams.get('businessId');
    if (!businessId) return err('Missing businessId');

    const sb = getServiceClient();

    // Use a 28-hour window on clockIn so any timezone (up to UTC-12) is covered correctly
    const cutoff = new Date(Date.now() - 28 * 3600000).toISOString();

    const { data, error } = await sb.from('timelogs').select('*')
      .eq('businessId', businessId)
      .gte('clockIn', cutoff);
    if (error) return err(error.message, 500);

    // Per employee keep only the most recent log
    const byEmployee = new Map<string, typeof data[0]>();
    for (const log of (data ?? [])) {
      const existing = byEmployee.get(log.employeeId);
      if (!existing || new Date(log.clockIn) > new Date(existing.clockIn)) {
        byEmployee.set(log.employeeId, log);
      }
    }

    const result = Array.from(byEmployee.values());

    return cors({ success: true, data: result });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
