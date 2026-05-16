import type { NextConfig } from 'next';
import { config } from 'dotenv';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

// Load root .env so all credentials live in one place across the monorepo.
config({ path: path.resolve(process.cwd(), '../.env') });

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:           process.env.SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:      process.env.SUPABASE_ANON_KEY!,
    NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL: process.env.SUPABASE_FUNCTIONS_URL!,
  },
};

export default withSentryConfig(nextConfig, {
  org: 'konnecta',
  project: 'konnecta-web',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
