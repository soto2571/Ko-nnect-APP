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

    const { logId } = await req.json();
    if (!logId) return err('Missing logId');

    const sb = getServiceClient();
    const { data: log } = await sb.from('timelogs').select('*').eq('logId', logId).single();
    if (!log) return err('Time log not found', 404);
    if (log.status !== 'on_break') return err('Not on break', 400);

    const now = new Date().toISOString();
    const breaks = [...(log.breaks ?? [])];
    const lastIdx = breaks.length - 1;
    if (lastIdx >= 0 && !breaks[lastIdx].end) {
      breaks[lastIdx] = { ...breaks[lastIdx], end: now };
    }

    const { data, error } = await sb.from('timelogs').update({
      breaks,
      status: 'clocked_in',
      updatedAt: now,
    }).eq('logId', logId).select().single();
    if (error) return err(error.message, 500);

    return cors({ success: true, data });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
