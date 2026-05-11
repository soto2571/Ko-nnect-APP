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

    const body = await req.json();
    const sb = getServiceClient();

    // Verify the role belongs to the caller's business and caller is owner
    const { data: role } = await sb.from('business_roles').select('businessId').eq('roleId', roleId).single();
    if (!role) return err('Rol no encontrado', 404);

    const { data: profile } = await sb.from('users').select('role, businessId').eq('userId', user.id).single();
    if (profile?.role !== 'owner' || profile?.businessId !== role.businessId)
      return err('Solo el dueño puede modificar roles.', 403);

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.isAdmin !== undefined) updates.isAdmin = !!body.isAdmin;

    const { data, error } = await sb.from('business_roles').update(updates).eq('roleId', roleId).select().single();
    if (error) {
      if (error.code === '23505') return err('Ya existe un rol con ese nombre.');
      return err(error.message, 500);
    }

    return cors({ success: true, data });
  } catch {
    return err('Internal server error', 500);
  }
});
