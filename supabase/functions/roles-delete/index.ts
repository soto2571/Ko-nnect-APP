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

    const url = new URL(req.url);
    const roleId = url.pathname.split('/').pop();
    if (!roleId) return err('Missing roleId');

    const sb = getServiceClient();

    const { data: role } = await sb.from('business_roles').select('businessId').eq('roleId', roleId).single();
    if (!role) return err('Rol no encontrado', 404);

    const { data: profile } = await sb.from('users').select('role, businessId').eq('userId', user.id).single();
    if (profile?.role !== 'owner' || profile?.businessId !== role.businessId)
      return err('Solo el dueño puede eliminar roles.', 403);

    // Unassign this role from all employees before deleting (FK is ON DELETE SET NULL so DB handles it)
    const { error } = await sb.from('business_roles').delete().eq('roleId', roleId);
    if (error) return err(error.message, 500);

    return cors({ success: true, message: 'Rol eliminado' });
  } catch {
    return err('Internal server error', 500);
  }
});
