import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return err('Unauthorized', 401);

    // Validate user is authenticated
    const userSb = getUserClient(auth);
    const { data: { user }, error: userErr } = await userSb.auth.getUser();
    if (userErr || !user) return err('Unauthorized', 401);

    const url = new URL(req.url);
    const logId = url.pathname.split('/').pop();
    if (!logId) return err('Missing logId');

    const sb = getServiceClient();

    // Verify the log exists
    const { data: existing } = await sb.from('timelogs').select('logId').eq('logId', logId).single();
    if (!existing) return err('Time log not found', 404);

    const { error } = await sb.from('timelogs').delete().eq('logId', logId);
    if (error) return err(error.message, 500);

    return cors({ success: true });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
