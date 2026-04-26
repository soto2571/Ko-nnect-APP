'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { setToken } from '@/lib/token-store';
import type { User, Business } from '@/types';
import * as api from '@/services/api';

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL!;

interface AuthContextValue {
  user: User | null;
  business: Business | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, business: null, loading: true,
  logout: async () => {}, refreshBusiness: async () => {},
});

async function fetchProfile(token: string): Promise<User | null> {
  try {
    const res  = await fetch(`${FUNCTIONS_URL}/auth-profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return json?.data ?? null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading]   = useState(true);
  const initialized = useRef(false);

  const loadBusiness = useCallback(async (bizId: string) => {
    try { setBusiness(await api.getBusiness(bizId)); } catch { setBusiness(null); }
  }, []);

  const applySession = useCallback(async (token: string) => {
    setToken(token); // keep module-level store in sync
    const profile = await fetchProfile(token);
    if (profile) {
      setUser(profile);
      if (profile.businessId) await loadBusiness(profile.businessId);
    } else {
      setUser(null);
      setBusiness(null);
    }
  }, [loadBusiness]);

  useEffect(() => {
    const supabase = createClient();

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.access_token) await applySession(session.access_token);
      } finally {
        setLoading(false);
        initialized.current = true;
      }
    });

    // Listen for auth changes after initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!initialized.current) return; // let getSession handle initial load
      if (session?.access_token) {
        await applySession(session.access_token);
      } else {
        setUser(null);
        setBusiness(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [applySession]);

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      setToken(null);
      setUser(null);
      setBusiness(null);
      window.location.href = '/login';
    }
  };

  const refreshBusiness = async () => {
    if (user?.businessId) await loadBusiness(user.businessId);
  };

  return (
    <AuthContext.Provider value={{ user, business, loading, logout, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
