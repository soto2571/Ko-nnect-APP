import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';
import { isAdminOrOwner } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return err('Unauthorized', 401);

    const userSb = getUserClient(auth);
    const { data: { user }, error: userErr } = await userSb.auth.getUser();
    if (userErr || !user) return err('Unauthorized', 401);

    const url = new URL(req.url);
    const businessId = url.searchParams.get('businessId');
    if (!businessId) return err('Missing businessId');

    if (!await isAdminOrOwner(user.id, businessId))
      return err('No autorizado', 403);

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('business_roles')
      .select('*')
      .eq('businessId', businessId)
      .order('name');
    if (error) return err(error.message, 500);

    return cors({ success: true, data: data ?? [] });
  } catch {
    return err('Internal server error', 500);
  }
});
