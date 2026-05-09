import type { NextConfig } from 'next';
import { config } from 'dotenv';
import path from 'path';

// Load root .env so all credentials live in one place across the monorepo.
// web/.env.local is no longer needed.
config({ path: path.resolve(process.cwd(), '../.env') });

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:           process.env.SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:      process.env.SUPABASE_ANON_KEY!,
    NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL: process.env.SUPABASE_FUNCTIONS_URL!,
  },
};

export default nextConfig;
