import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return err('Unauthorized', 401);

    const { newPassword } = await req.json();
    if (!newPassword) return err('Missing newPassword');

    const userSb = getUserClient(auth);
    const { error } = await userSb.auth.updateUser({ password: newPassword });
    if (error) return err(error.message, 400);

    return cors({ success: true, message: 'Password updated' });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
