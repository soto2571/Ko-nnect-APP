import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

function generatePassword(firstName: string, lastName: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${clean(firstName)}${clean(lastName)}${rand}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return err('No autorizado.', 401);

    const userSb = getUserClient(auth);
    const { data: { user }, error: userErr } = await userSb.auth.getUser();
    if (userErr || !user) return err('No autorizado.', 401);

    const { businessId, businessName, firstName, lastName } = await req.json();
    if (!businessId || !firstName || !lastName) return err('Faltan campos requeridos.');

    const sb = getServiceClient();
    const tempPassword = generatePassword(firstName, lastName);

    // Build email: john.smith@acmecorp.app — strip all non-alphanumeric from name+domain
    const domainBase = (businessName ?? 'business').toLowerCase().replace(/[^a-z0-9]/g, '') || 'business';
    const localBase  = `${firstName.toLowerCase().replace(/[^a-z0-9]/g,'')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g,'')}`;
    let email = `${localBase}@${domainBase}.app`;

    // Check for collision and find the next available suffix
    const { data: existing } = await sb.from('employees')
      .select('email')
      .ilike('email', `${localBase}%@${domainBase}.app`);
    if (existing && existing.length > 0) {
      const taken = new Set(existing.map((r: { email: string }) => r.email));
      let n = 2;
      while (taken.has(`${localBase}${n}@${domainBase}.app`)) n++;
      email = `${localBase}${n}@${domainBase}.app`;
    }

    // Create auth user for employee
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email, password: tempPassword, email_confirm: true,
    });
    if (authErr || !authData?.user) {
      return err(authErr?.message ?? 'No se pudo crear el empleado.', 500);
    }

    const empUserId = authData.user.id;

    // Create user profile — if this fails, clean up the auth user to avoid orphans
    const { error: profileErr } = await sb.from('users').insert({
      userId: empUserId,
      email,
      firstName,
      lastName,
      role: 'employee',
      businessId,
    });
    if (profileErr) {
      await sb.auth.admin.deleteUser(empUserId).catch(() => {});
      return err(profileErr.message, 500);
    }

    // Create employee record — if this fails, clean up both auth user and profile
    const { data: employee, error: empErr } = await sb.from('employees').insert({
      businessId,
      userId: empUserId,
      firstName,
      lastName,
      email,
      tempPassword,
    }).select().single();
    if (empErr) {
      await sb.from('users').delete().eq('userId', empUserId).catch(() => {});
      await sb.auth.admin.deleteUser(empUserId).catch(() => {});
      return err(empErr.message, 500);
    }

    return cors({ success: true, data: { employee, credentials: { email, password: tempPassword } } }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno del servidor.';
    return err(msg, 500);
  }
});
