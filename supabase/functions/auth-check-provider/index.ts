import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    if (!body.email) return err('Missing email');

    const sb = getServiceClient();
    const email = body.email.toLowerCase().trim();

    // Look up the user in our users table
    const { data: profile } = await sb
      .from('users')
      .select('userId')
      .eq('email', email)
      .single();

    if (!profile) return cors({ success: true, data: { provider: null } });

    // Get auth details to determine the provider
    const { data: authData } = await sb.auth.admin.getUserById(profile.userId);
    if (!authData?.user) return cors({ success: true, data: { provider: null } });

    const isGoogle = authData.user.app_metadata?.providers?.includes('google')
      || authData.user.app_metadata?.provider === 'google';

    return cors({ success: true, data: { provider: isGoogle ? 'google' : 'email' } });
  } catch {
    return err('Internal server error', 500);
  }
});
