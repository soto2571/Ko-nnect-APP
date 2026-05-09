import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const SUPABASE_URL      = Constants.expoConfig?.extra?.supabaseUrl     as string;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey as string;

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
