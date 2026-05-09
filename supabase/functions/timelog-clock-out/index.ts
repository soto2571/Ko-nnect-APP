import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

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

    const { logId, lat, lng, overridePin } = await req.json();
    if (!logId) return err('Missing logId');

    const sb = getServiceClient();
    const { data: log } = await sb.from('timelogs').select('*').eq('logId', logId).single();
    if (!log) return err('Time log not found', 404);
    if (log.status === 'clocked_out') return err('Already clocked out', 400);

    // Geofence validation (same zone required for clock-out)
    const { data: biz } = await sb.from('businesses').select('"geofenceEnabled","geofenceLat","geofenceLng","geofenceRadiusM","geofencePin"').eq('businessId', log.businessId).single();
    let viaPin = log.viaPin ?? false;
    if (biz?.geofenceEnabled) {
      if (overridePin) {
        if (!biz.geofencePin || overridePin !== biz.geofencePin)
          return err('PIN de acceso incorrecto', 403);
        viaPin = true;
      } else {
        if (lat == null || lng == null)
          return err('Se requiere ubicación o PIN para marcar salida en esta zona', 403);
        const dist = haversineMeters(biz.geofenceLat, biz.geofenceLng, lat, lng);
        if (dist > biz.geofenceRadiusM)
          return err('Estás fuera de la zona permitida. Acércate al negocio para ponchar.', 403);
      }
    }

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
      viaPin,
      updatedAt: now,
    }).eq('logId', logId).select().single();
    if (error) return err(error.message, 500);

    return cors({ success: true, data });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
