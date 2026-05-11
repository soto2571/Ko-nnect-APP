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

    // For employees, check if their role has isAdmin = true
    let isAdmin = false;
    if (profile.role === 'employee' && profile.businessId) {
      const { data: emp } = await sb
        .from('employees')
        .select('roleId')
        .eq('userId', user.id)
        .eq('businessId', profile.businessId)
        .is('deletedAt', null)
        .single();

      if (emp?.roleId) {
        const { data: bizRole } = await sb
          .from('business_roles')
          .select('isAdmin')
          .eq('roleId', emp.roleId)
          .single();
        isAdmin = bizRole?.isAdmin === true;
      }
    }

    const provider = user.app_metadata?.provider === 'google' ? 'google' : 'email';

    return cors({
      success: true,
      data: {
        userId: profile.userId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: profile.role,
        businessId: profile.businessId ?? null,
        provider,
        isAdmin,
      },
    });
  } catch {
    return err('Internal server error', 500);
  }
});
