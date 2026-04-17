import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { email, password, firstName, lastName, role } = await req.json();
    if (!email || !password || !firstName || !lastName || !role)
      return err('Faltan campos requeridos.');

    const sb = getServiceClient();

    // Create auth user
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authErr) {
      const msg = authErr.message ?? String(authErr);
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists'))
        return err('Ya existe una cuenta con este correo electrónico.', 409);
      return err(msg, 400);
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
    return err('Error interno del servidor.', 500);
  }
});
