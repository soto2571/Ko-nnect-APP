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

    const sb = getServiceClient();
    const { data: profile, error: profileErr } = await sb
      .from('users').select('*').eq('userId', user.id).single();

    if (profileErr || !profile) return err('Profile not found', 404);

    return cors({
      success: true,
      data: {
        userId: profile.userId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: profile.role,
        businessId: profile.businessId ?? null,
      },
    });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
