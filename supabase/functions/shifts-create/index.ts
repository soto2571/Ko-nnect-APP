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

    const body = await req.json();
    if (!body.businessId || !body.title || !body.startTime || !body.endTime)
      return err('Missing required fields');

    const sb = getServiceClient();
    const { data, error } = await sb.from('shifts').insert({
      businessId: body.businessId,
      title: body.title,
      startTime: body.startTime,
      endTime: body.endTime,
      breakDuration: body.breakDuration ?? 0,
      breakTime: body.breakTime ?? null,
      status: 'open',
      createdBy: user.id,
    }).select().single();
    if (error) return err(error.message, 500);

    return cors({ success: true, data }, 201);
  } catch (e) {
    return err('Internal server error', 500);
  }
});
