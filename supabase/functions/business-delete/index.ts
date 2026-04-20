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
    const businessId = url.pathname.split('/').pop();
    if (!businessId) return err('Missing businessId');

    const sb = getServiceClient();

    // Verify the requester owns this business
    const { data: biz } = await sb.from('businesses').select('ownerId')
      .eq('businessId', businessId).single();
    if (!biz || biz.ownerId !== user.id) return err('Forbidden', 403);

    // Get all employees of this business so we can delete their auth accounts
    const { data: emps } = await sb.from('employees').select('userId')
      .eq('businessId', businessId);

    // Delete all related data (FK cascades may handle some of these,
    // but explicit deletes ensure nothing is orphaned)
    await sb.from('time_logs').delete().eq('businessId', businessId);
    await sb.from('shifts').delete().eq('businessId', businessId);
    await sb.from('availability').delete().eq('businessId', businessId);
    await sb.from('pto_requests').delete().eq('businessId', businessId);
    await sb.from('employees').delete().eq('businessId', businessId);
    await sb.from('businesses').delete().eq('businessId', businessId);

    // Delete employee auth accounts
    if (emps && emps.length > 0) {
      for (const emp of emps) {
        if (emp.userId) {
          await sb.auth.admin.deleteUser(emp.userId);
        }
      }
    }

    // Delete the owner's auth account last
    await sb.auth.admin.deleteUser(user.id);

    return cors({ success: true, message: 'Business deleted' });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
