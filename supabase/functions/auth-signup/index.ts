import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

// Called after client-side supabase.auth.signUp() + OTP verification.
// The user already exists in auth.users — this just creates the profile row.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return err('Unauthorized', 401);

    const { firstName, lastName, role } = await req.json();
    if (!firstName || !lastName || !role) return err('Faltan campos requeridos.');

    const userSb = getUserClient(auth);
    const { data: { user }, error: userErr } = await userSb.auth.getUser();
    if (userErr || !user) return err('Unauthorized', 401);

    const sb = getServiceClient();

    // Idempotent: return existing profile if already created
    const { data: existing } = await sb
      .from('users').select('*').eq('userId', user.id).single();
    if (existing) return cors({ success: true, data: { user: existing } });

    const { error: profileErr } = await sb.from('users').insert({
      userId: user.id,
      email: user.email,
      firstName,
      lastName,
      role,
    });
    if (profileErr) return err(profileErr.message, 500);

    return cors({
      success: true,
      data: {
        user: { userId: user.id, email: user.email, firstName, lastName, role },
      },
    }, 201);
  } catch {
    return err('Error interno del servidor.', 500);
  }
});
