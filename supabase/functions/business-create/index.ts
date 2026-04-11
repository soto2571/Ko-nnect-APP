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
    const body = await req.json();
    if (!body.name) return err('Missing business name');

    const { data: business, error: bizErr } = await sb.from('businesses').insert({
      name: body.name,
      ownerId: user.id,
      color: body.color ?? '#E11D48',
      payPeriodType: body.payPeriodType ?? 'weekly',
      payPeriodStartDay: body.payPeriodStartDay ?? 0,
      payPeriodAnchorDate: body.payPeriodAnchorDate ?? null,
      openDays: body.openDays ?? [0,1,2,3,4,5,6],
      maxHoursPerDay: body.maxHoursPerDay ?? 0,
      autoClockOut: body.autoClockOut ?? false,
      autoClockOutMinutes: body.autoClockOutMinutes ?? 30,
      schedulingWeeks: body.schedulingWeeks ?? 6,
    }).select().single();
    if (bizErr) return err(bizErr.message, 500);

    // Link business to user profile
    await sb.from('users').update({ businessId: business.businessId }).eq('userId', user.id);

    return cors({ success: true, data: business }, 201);
  } catch (e) {
    return err('Internal server error', 500);
  }
});
