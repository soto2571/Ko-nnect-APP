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

    const sb = getServiceClient();
    const { error } = await sb.from('shifts').delete().eq('shiftId', shiftId);
    if (error) return err(error.message, 500);

    return cors({ success: true, message: 'Shift deleted' });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
