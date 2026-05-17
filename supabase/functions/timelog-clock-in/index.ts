import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';
import { sendPushToOwners, fmtTime } from '../_shared/push.ts';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return err('Unauthorized', 401);

    const userSb = getUserClient(auth);
    const { data: { user }, error: userErr } = await userSb.auth.getUser();
    if (userErr || !user) return err('Unauthorized', 401);

    const { shiftId, businessId, scheduledBreakDuration, breakTime, localDate, lat, lng, overridePin } = await req.json();
    if (!shiftId || !businessId) return err('Missing shiftId or businessId');

    const sb = getServiceClient();

    const { data: existing } = await sb.from('timelogs').select('*')
      .eq('shiftId', shiftId).maybeSingle();
    if (existing && existing.status !== 'clocked_out' && existing.status !== 'missed_punch')
      return err('Already clocked in for this shift', 400);

    const { data: biz } = await sb.from('businesses')
      .select('"geofenceEnabled","geofenceLat","geofenceLng","geofenceRadiusM","geofencePin","notifyClockIn","notifyLate"')
      .eq('businessId', businessId).single();

    let viaPin = false;
    if (biz?.geofenceEnabled) {
      if (overridePin) {
        if (!biz.geofencePin || overridePin !== biz.geofencePin)
          return err('PIN de acceso incorrecto', 403);
        viaPin = true;
      } else {
        if (lat == null || lng == null)
          return err('Se requiere ubicación o PIN para ponchar en esta zona', 403);
        const dist = haversineMeters(biz.geofenceLat, biz.geofenceLng, lat, lng);
        if (dist > biz.geofenceRadiusM)
          return err('Estás fuera de la zona permitida. Acércate al negocio para ponchar.', 403);
      }
    }

    const now = new Date().toISOString();
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
      viaPin,
    }).select().single();
    if (error) return err(error.message, 500);

    // Get employee name for notification
    const { data: emp } = await sb.from('users').select('"firstName","lastName"').eq('userId', user.id).single();
    const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Un empleado';
    const timeStr = fmtTime(now);

    // Check if late (shift start + 5 min grace period)
    const { data: shift } = await sb.from('shifts').select('"startTime"').eq('shiftId', shiftId).single();
    const isLate = shift && (new Date(now).getTime() - new Date(shift.startTime).getTime()) > 5 * 60 * 1000;
    const lateMin = isLate
      ? Math.floor((new Date(now).getTime() - new Date(shift.startTime).getTime()) / 60000)
      : 0;

    if (biz?.notifyClockIn) {
      const body = isLate
        ? `Llego ${lateMin} min tarde — ${timeStr}`
        : `Marque entrada a las ${timeStr}`;
      await sendPushToOwners(sb, businessId, name, body);
    } else if (isLate && biz?.notifyLate) {
      await sendPushToOwners(sb, businessId, `${name} llego tarde`, `Llego ${lateMin} min tarde — ${timeStr}`);
    }

    return cors({ success: true, data }, 201);
  } catch {
    return err('Internal server error', 500);
  }
});
