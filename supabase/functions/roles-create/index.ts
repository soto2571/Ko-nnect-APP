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

    const { name, isAdmin = false, businessId } = await req.json();
    if (!name?.trim()) return err('El nombre del rol es requerido.');
    if (!businessId) return err('Missing businessId');

    const sb = getServiceClient();

    // Only the owner can create roles
    const { data: profile } = await sb.from('users').select('role, businessId').eq('userId', user.id).single();
    if (profile?.role !== 'owner' || profile?.businessId !== businessId)
      return err('Solo el dueño puede crear roles.', 403);

    const now = new Date().toISOString();
    const { data, error } = await sb.from('business_roles').insert({
      businessId,
      name: name.trim(),
      isAdmin: !!isAdmin,
      createdAt: now,
      updatedAt: now,
    }).select().single();
    if (error) {
      if (error.code === '23505') return err('Ya existe un rol con ese nombre.');
      return err(error.message, 500);
    }

    return cors({ success: true, data }, 201);
  } catch {
    return err('Internal server error', 500);
  }
});
