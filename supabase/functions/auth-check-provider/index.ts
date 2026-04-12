import { corsHeaders, cors, err } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    if (!body.email) return err('Missing email');

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('users')
      .select('provider')
      .eq('email', body.email.toLowerCase().trim())
      .maybeSingle();

    if (error) return err(error.message, 500);

    return cors({ success: true, data: { provider: data?.provider ?? null } });
  } catch (e) {
    return err('Internal server error', 500);
  }
});
