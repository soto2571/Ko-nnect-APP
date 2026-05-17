import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';
import { sendPushToOwners, fmtTime } from '../_shared/push.ts';

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
    if (log.status !== 'clocked_in') return err('Not clocked in', 400);

    const now = new Date().toISOString();
    const breaks = [...(log.breaks ?? []), { start: now }];

    const { data, error } = await sb.from('timelogs').update({
      breaks,
      status: 'on_break',
      updatedAt: now,
    }).eq('logId', logId).select().single();
    if (error) return err(error.message, 500);

    const { data: biz } = await sb.from('businesses')
      .select('"notifyBreak"').eq('businessId', log.businessId).single();

    if (biz?.notifyBreak) {
      const { data: emp } = await sb.from('users').select('"firstName","lastName"').eq('userId', user.id).single();
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Un empleado';
      await sendPushToOwners(sb, log.businessId, name, `Inicio break a las ${fmtTime(now)}`);
    }

    return cors({ success: true, data });
  } catch {
    return err('Internal server error', 500);
  }
});
