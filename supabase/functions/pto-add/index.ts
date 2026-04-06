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
    const { employeeId, businessId, date, hours, type, note } = body;
    if (!employeeId || !businessId || !date || !hours || !type) return err('Missing required fields');
    if (hours <= 0 || hours > 24) return err('Hours must be between 0 and 24');

    const sb = getServiceClient();
    const { data, error } = await sb.from('paid_time_off').insert({
      employeeId, businessId, date, hours, type, note: note ?? null,
    }).select().single();
    if (error) return err(error.message, 500);

    return cors({ success: true, data }, 201);
  } catch (e) {
    return err('Internal server error', 500);
  }
});
