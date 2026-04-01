import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

function completedBreakMs(breaks: { start: string; end?: string }[]): number {
  return breaks
    .filter(b => b.start && b.end)
    .reduce((sum, b) => sum + (new Date(b.end!).getTime() - new Date(b.start).getTime()), 0);
}

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
    if (log.status === 'clocked_out') return err('Already clocked out', 400);

    const now = new Date().toISOString();
    const breaks = log.breaks ?? [];
    const breakMs = completedBreakMs(breaks);
    const totalMinutes = Math.round(
      (new Date(now).getTime() - new Date(log.clockIn).getTime()) / 60000
    ) - Math.round(breakMs / 60000);
    const overtimeDay = totalMinutes > 480;
    const hasCompletedBreak = breaks.some((b: { start: string; end?: string }) => b.start && b.end);
    const missedBreakPunch = (log.scheduledBreakDuration ?? 0) > 0 && !hasCompletedBreak;
    const status = missedBreakPunch ? 'missed_punch' : 'clocked_out';

    const { data, error } = await sb.from('timelogs').update({
      clockOut: now,
      status,
      totalMinutes,
      overtimeDay,
      missedBreakPunch,
      updatedAt: now,
    }).eq('logId', logId).select().single();
    if (error) return err(error.message, 500);

    return cors({ success: true, data });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
