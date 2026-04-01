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
    const shiftId = url.pathname.split('/').pop();
    if (!shiftId) return err('Missing shiftId');

    const body = await req.json();
    const sb = getServiceClient();

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      status: body.employeeId ? 'assigned' : 'open',
      employeeId: body.employeeId ?? null,
    };
    if (body.startTime)      updates.startTime = body.startTime;
    if (body.endTime)        updates.endTime = body.endTime;
    if (body.breakDuration !== undefined) updates.breakDuration = body.breakDuration;
    if (body.breakTime !== undefined)     updates.breakTime = body.breakTime;

    const { data, error } = await sb.from('shifts').update(updates)
      .eq('shiftId', shiftId).select().single();
    if (error) return err(error.message, 500);

    return cors({ success: true, data });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
