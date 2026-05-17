import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { sendPushToOwners, fmtTime } from '../_shared/push.ts';

// Called by pg_cron every 5 minutes via a SQL: SELECT net.http_post(...)
// Also callable manually for testing

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Validate cron secret so this can't be called publicly
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) return err('Unauthorized', 401);

  try {
    const sb = getServiceClient();
    const now = new Date();

    // Find shifts that started more than 15 min ago with no clock-in and not yet notified
    const cutoff = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

    const { data: lateShifts } = await sb
      .from('shifts')
      .select('"shiftId","businessId","employeeId","startTime","noShowNotified"')
      .lt('startTime', cutoff)
      .gte('startTime', todayStart.toISOString())
      .eq('noShowNotified', false)
      .not('employeeId', 'is', null);

    if (!lateShifts?.length) return cors({ success: true, checked: 0 });

    let notified = 0;
    for (const shift of lateShifts) {
      // Check if employee already clocked in
      const { data: log } = await sb
        .from('timelogs')
        .select('"logId","status"')
        .eq('shiftId', shift.shiftId)
        .maybeSingle();

      if (log) {
        // Already has a timelog — mark shift as notified to stop rechecking
        await sb.from('shifts').update({ noShowNotified: true }).eq('shiftId', shift.shiftId);
        continue;
      }

      // Check if business has no-show notifications enabled
      const { data: biz } = await sb
        .from('businesses')
        .select('"notifyNoShow"')
        .eq('businessId', shift.businessId)
        .single();

      if (!biz?.notifyNoShow) {
        await sb.from('shifts').update({ noShowNotified: true }).eq('shiftId', shift.shiftId);
        continue;
      }

      const { data: emp } = await sb
        .from('users')
        .select('"firstName","lastName"')
        .eq('userId', shift.employeeId)
        .single();

      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Un empleado';
      const lateMin = Math.floor((now.getTime() - new Date(shift.startTime).getTime()) / 60000);

      await sendPushToOwners(
        sb, shift.businessId,
        `${name} no ha marcado entrada`,
        `Su turno comenzo hace ${lateMin} min (${fmtTime(shift.startTime)})`,
      );

      await sb.from('shifts').update({ noShowNotified: true }).eq('shiftId', shift.shiftId);
      notified++;
    }

    return cors({ success: true, checked: lateShifts.length, notified });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
