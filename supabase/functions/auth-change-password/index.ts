import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return err('Unauthorized', 401);

    const { newPassword, currentPassword } = await req.json();
    if (!newPassword) return err('Missing newPassword');

    const userSb = getUserClient(auth);
    const { data: { user }, error: userErr } = await userSb.auth.getUser();
    if (userErr || !user) return err('Unauthorized', 401);

    // Verify current password when provided (skipped during forced onboarding change)
    if (currentPassword) {
      const { error: verifyErr } = await userSb.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (verifyErr) return err('La contraseña actual es incorrecta.', 400);
    }

    const sb = getServiceClient();
    const { error } = await sb.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) return err(error.message, 400);

    // Clear tempPassword so the onboarding flag is lifted on next login
    await sb.from('employees')
      .update({ tempPassword: null })
      .eq('userId', user.id);

    return cors({ success: true, message: 'Password updated' });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
