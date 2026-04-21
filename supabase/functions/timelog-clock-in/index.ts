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

    const { shiftId, businessId, scheduledBreakDuration, breakTime, localDate } = await req.json();
    if (!shiftId || !businessId) return err('Missing shiftId or businessId');

    const sb = getServiceClient();

    // Check if already clocked in for this shift
    const { data: existing } = await sb.from('timelogs').select('*')
      .eq('shiftId', shiftId).maybeSingle();
    if (existing && existing.status !== 'clocked_out' && existing.status !== 'missed_punch')
      return err('Already clocked in for this shift', 400);

    const now = new Date().toISOString();
    // Use local date from client — avoids UTC midnight rollover bug for timezones behind UTC
    const date = localDate ?? now.split('T')[0];

    const { data, error } = await sb.from('timelogs').insert({
      businessId,
      employeeId: user.id,
      shiftId,
      date,
      clockIn: now,
      breaks: [],
      scheduledBreakDuration: scheduledBreakDuration ?? 0,
      scheduledBreakTime: breakTime ?? null,
      status: 'clocked_in',
      missedBreakPunch: false,
    }).select().single();
    if (error) return err(error.message, 500);

    return cors({ success: true, data }, 201);
  } catch (e) {
    return err('Internal server error', 500);
  }
});
