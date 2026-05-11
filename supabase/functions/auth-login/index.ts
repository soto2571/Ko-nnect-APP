import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { email, password } = await req.json();
    if (!email || !password) return err('Ingresa tu correo y contraseña.');

    const sb = getServiceClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return err('Credenciales incorrectas.', 401);

    const userId = data.user.id;

    // Fetch user profile
    const { data: profile, error: profileErr } = await sb
      .from('users').select('*').eq('userId', userId).single();
    if (profileErr) return err('Perfil de usuario no encontrado.', 404);

    // For employees, check admin role and whether they still have a temp password
    let isAdmin = false;
    let mustChangePassword = false;
    if (profile.role === 'employee' && profile.businessId) {
      const { data: emp } = await sb
        .from('employees')
        .select('roleId, tempPassword')
        .eq('userId', userId)
        .eq('businessId', profile.businessId)
        .is('deletedAt', null)
        .single();
      if (emp?.roleId) {
        const { data: bizRole } = await sb
          .from('business_roles')
          .select('isAdmin')
          .eq('roleId', emp.roleId)
          .single();
        if (bizRole?.isAdmin === true) isAdmin = true;
      }
      // tempPassword set = they haven't changed it yet (first login or after a reset)
      if (emp?.tempPassword) mustChangePassword = true;
    }

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
          ...(isAdmin && { isAdmin: true }),
          ...(mustChangePassword && { mustChangePassword: true }),
        },
        token: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
      },
    });
  } catch (e) {
    return err('Error interno del servidor.', 500);
  }
});
