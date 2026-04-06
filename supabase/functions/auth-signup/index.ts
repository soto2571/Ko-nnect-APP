import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { email, password, firstName, lastName, role } = await req.json();
    if (!email || !password || !firstName || !lastName || !role)
      return err('Missing required fields');

    const sb = getServiceClient();

    // Create auth user
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authErr) {
      if (authErr.message.includes('already registered'))
        return err('User already exists', 409);
      return err(authErr.message, 400);
    }

    const userId = authData.user.id;

    // Insert public user profile
    const { error: profileErr } = await sb.from('users').insert({
      userId, email, firstName, lastName, role,
    });
    if (profileErr) return err(profileErr.message, 500);

    // Sign in to get token
    const { data: signIn, error: signInErr } = await sb.auth.signInWithPassword({ email, password });
    if (signInErr) return err(signInErr.message, 500);

    return cors({
      success: true,
      data: {
        user: { userId, email, firstName, lastName, role },
        token: signIn.session?.access_token,
        refreshToken: signIn.session?.refresh_token,
      },
    }, 201);
  } catch (e) {
    return err('Internal server error', 500);
  }
});
