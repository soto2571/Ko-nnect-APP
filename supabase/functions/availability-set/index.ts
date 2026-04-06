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

    const body = await req.json();
    const { employeeId, businessId, type, startDate, endDate, daysOfWeek, startTime, endTime, note } = body;
    if (!employeeId || !businessId || !type) return err('Missing required fields');

    const sb = getServiceClient();

    if (req.method === 'DELETE') {
      const { availabilityId } = body;
      if (!availabilityId) return err('Missing availabilityId');
      await sb.from('employee_availability').delete().eq('availabilityId', availabilityId);
      return cors({ success: true });
    }

    const { data, error } = await sb.from('employee_availability').insert({
      employeeId, businessId, type,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      daysOfWeek: daysOfWeek ?? null,
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      note: note ?? null,
    }).select().single();
    if (error) return err(error.message, 500);

    return cors({ success: true, data }, 201);
  } catch (e) {
    return err('Internal server error', 500);
  }
});
