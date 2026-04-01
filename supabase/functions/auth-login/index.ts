import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { email, password } = await req.json();
    if (!email || !password) return err('Missing email or password');

    const sb = getServiceClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return err('Invalid credentials', 401);

    const userId = data.user.id;

    // Fetch user profile
    const { data: profile, error: profileErr } = await sb
      .from('users').select('*').eq('userId', userId).single();
    if (profileErr) return err('User profile not found', 404);

    return cors({
      success: true,
      data: {
        user: {
          userId,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: profile.role,
          businessId: profile.businessId,
        },
        token: data.session?.access_token,
      },
    });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
