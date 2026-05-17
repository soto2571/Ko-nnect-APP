import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

const ALLOWED = ['notifyShiftReminder', 'notifyClockOutReminder'] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return err('Unauthorized', 401);

    const userSb = getUserClient(auth);
    const { data: { user }, error: userErr } = await userSb.auth.getUser();
    if (userErr || !user) return err('Unauthorized', 401);

    const body = await req.json();
    const update: Record<string, boolean> = {};
    for (const key of ALLOWED) {
      if (typeof body[key] === 'boolean') update[key] = body[key];
    }
    if (!Object.keys(update).length) return err('No valid fields to update');

    const sb = getServiceClient();
    const { error } = await sb.from('users').update(update).eq('userId', user.id);
    if (error) return err(error.message, 500);

    return cors({ success: true });
  } catch {
    return err('Internal server error', 500);
  }
});
