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

    // includeDeleted=true is used by the payroll report to resolve names of past employees
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true';

    const sb = getServiceClient();
    // Join with business_roles to return role info in the same query
    let query = sb
      .from('employees')
      .select('*, business_roles(roleId, name, isAdmin)')
      .eq('businessId', businessId);
    if (!includeDeleted) query = query.is('deletedAt', null);

    const { data, error } = await query;
    if (error) return err(error.message, 500);

    // Flatten role fields onto each employee
    const employees = (data ?? []).map((e: any) => ({
      ...e,
      roleName: e.business_roles?.name ?? null,
      roleIsAdmin: e.business_roles?.isAdmin ?? false,
      business_roles: undefined,
    }));

    return cors({ success: true, data: employees });
  } catch {
    return err('Internal server error', 500);
  }
});
