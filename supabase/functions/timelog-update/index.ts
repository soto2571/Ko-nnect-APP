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

    const url = new URL(req.url);
    const logId = url.pathname.split('/').pop();
    if (!logId) return err('Missing logId');

    const body = await req.json();
    const { clockIn, clockOut, breaks } = body;

    if (!clockIn) return err('Missing clockIn');

    const sb = getServiceClient();
    const { data: existing } = await sb.from('timelogs').select('*').eq('logId', logId).single();
    if (!existing) return err('Time log not found', 404);

    const now = new Date().toISOString();
    const updatedBreaks = breaks ?? existing.breaks ?? [];

    let totalMinutes = 0;
    let status = existing.status;

    if (clockOut) {
      const breakMs = completedBreakMs(updatedBreaks);
      totalMinutes = Math.round(
        (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000
      ) - Math.round(breakMs / 60000);
      const hasCompletedBreak = updatedBreaks.some((b: { start: string; end?: string }) => b.start && b.end);
      const missedBreakPunch = (existing.scheduledBreakDuration ?? 0) > 0 && !hasCompletedBreak;
      status = missedBreakPunch ? 'missed_punch' : 'clocked_out';

      const { data, error } = await sb.from('timelogs').update({
        clockIn,
        clockOut,
        breaks: updatedBreaks,
        totalMinutes,
        overtimeDay: totalMinutes > 480,
        missedBreakPunch,
        status,
        updatedAt: now,
      }).eq('logId', logId).select().single();
      if (error) return err(error.message, 500);
      return cors({ success: true, data });
    }

    // No clockOut — update clockIn and breaks only
    const { data, error } = await sb.from('timelogs').update({
      clockIn,
      breaks: updatedBreaks,
      updatedAt: now,
    }).eq('logId', logId).select().single();
    if (error) return err(error.message, 500);

    return cors({ success: true, data });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
