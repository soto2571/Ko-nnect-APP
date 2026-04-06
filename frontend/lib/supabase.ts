import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://izfcsiqucpkroylkgjei.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6ZmNzaXF1Y3Brcm95bGtnamVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjIwNDYsImV4cCI6MjA5MDYzODA0Nn0.KINZBxaLMOUgLdF6esMfD9CnySgofYrgGbZGoFL6nbA';

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,   // We manage our own token storage via SecureStore
    autoRefreshToken: true,  // Supabase refreshes in-memory session automatically
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});
