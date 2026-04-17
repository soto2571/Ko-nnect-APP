import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    if (!body.email) return err('Missing email');

    const sb = getServiceClient();

    // Check Supabase Auth's auth.users table for the provider
    const { data, error } = await sb.auth.admin.listUsers();
    if (error) return err(error.message, 500);

    const email = body.email.toLowerCase().trim();
    const authUser = data.users.find(
      (u: any) => u.email?.toLowerCase() === email
    );

    if (!authUser) {
      return cors({ success: true, data: { provider: null } });
    }

    // Check if user signed up via Google OAuth
    const isGoogle = authUser.app_metadata?.providers?.includes('google')
      || authUser.app_metadata?.provider === 'google';

    return cors({ success: true, data: { provider: isGoogle ? 'google' : 'email' } });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
