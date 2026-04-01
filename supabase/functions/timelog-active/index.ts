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

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const { data, error } = await sb.from('timelogs').select('*')
      .eq('businessId', businessId)
      .in('date', [today, yesterday]);
    if (error) return err(error.message, 500);

    // Per employee keep only the most recent log
    const byEmployee = new Map<string, typeof data[0]>();
    for (const log of (data ?? [])) {
      const existing = byEmployee.get(log.employeeId);
      if (!existing || new Date(log.clockIn) > new Date(existing.clockIn)) {
        byEmployee.set(log.employeeId, log);
      }
    }

    const cutoff = new Date(Date.now() - 86400000);
    const result = Array.from(byEmployee.values()).filter(
      log => log.status === 'clocked_in' || log.status === 'on_break' ||
             new Date(log.clockIn) >= cutoff
    );

    return cors({ success: true, data: result });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
