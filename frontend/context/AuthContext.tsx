import React, { createContext, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as api from '@/services/api';
import { supabase } from '@/lib/supabase';
import { SUPABASE_FUNCTIONS_URL } from '@/constants';
import type { Business, User } from '@/types';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  user: User | null;
  token: string | null;
  business: Business | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'owner' | 'employee';
  }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
  setBusiness: (b: Business) => void;
  primaryColor: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    business: null,
    isLoading: true,
  });

  // On mount: restore session from secure storage
  useEffect(() => {
    (async () => {
      try {
        const token = await api.getToken();
        const refreshToken = await api.getRefreshToken();
        const user = await api.getSavedUser();
        if (!token || !user) {
          setState((s) => ({ ...s, isLoading: false }));
          return;
        }
        // Load the session into the Supabase SDK so autoRefreshToken works
        if (refreshToken) {
          await supabase.auth.setSession({ access_token: token, refresh_token: refreshToken });
        }
        let business: Business | null = null;
        if (user.businessId) {
          try {
            business = await api.getBusiness(user.businessId);
          } catch {}
        }
        setState({ user, token, business, isLoading: false });
      } catch {
        await api.removeToken();
        await api.removeRefreshToken();
        await api.removeUser();
        setState({ user: null, token: null, business: null, isLoading: false });
      }
    })();
  }, []);

  // Keep stored tokens in sync when Supabase auto-refreshes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        api.saveToken(session.access_token);
        api.saveRefreshToken(session.refresh_token);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { user, token, refreshToken } = await api.login({ email, password });
    await api.saveToken(token);
    if (refreshToken) await api.saveRefreshToken(refreshToken);
    await api.saveUser(user);
    if (token && refreshToken) {
      await supabase.auth.setSession({ access_token: token, refresh_token: refreshToken });
    }
    let business: Business | null = null;
    if (user.businessId) {
      try {
        business = await api.getBusiness(user.businessId);
      } catch {}
    }
    setState({ user, token, business, isLoading: false });
  };

  const signup = async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'owner' | 'employee';
  }) => {
    const { user, token, refreshToken } = await api.signup(payload);
    await api.saveToken(token);
    if (refreshToken) await api.saveRefreshToken(refreshToken);
    await api.saveUser(user);
    if (token && refreshToken) {
      await supabase.auth.setSession({ access_token: token, refresh_token: refreshToken });
    }
    setState({ user, token, business: null, isLoading: false });
  };

  const signInWithGoogle = async () => {
    const redirectTo = 'konnect://';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error || !data.url) throw new Error(error?.message ?? 'Could not start Google sign-in');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return; // user cancelled

    // Parse access_token and refresh_token from the redirect URL fragment/query
    const raw = result.url;
    const fragment = raw.includes('#') ? raw.split('#')[1] : raw.split('?')[1] ?? '';
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') ?? '';

    if (!accessToken) throw new Error('Google sign-in failed — no token received');

    const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionErr || !sessionData?.session) throw new Error(sessionErr?.message ?? 'Google sign-in failed');

    const token = sessionData.session.access_token;

    // Fetch user profile (created by DB trigger on first sign-in)
    // Retry once to handle edge function cold start
    let profileJson: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const profileRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/auth-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      profileJson = await profileRes.json();
      if (profileJson.success) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    if (!profileJson?.success) throw new Error(profileJson?.message ?? 'Could not load profile');

    const user: User = { ...profileJson.data, provider: 'google' };

    await api.saveToken(token);
    await api.saveRefreshToken(refreshToken);
    await api.saveUser(user);
    // Session is already set via supabase.auth.setSession() above

    let business: Business | null = null;
    if (user.businessId) {
      try { business = await api.getBusiness(user.businessId); } catch {}
    }

    setState({ user, token, business, isLoading: false });
  };

  const logout = async () => {
    await api.removeToken();
    await api.removeRefreshToken();
    await api.removeUser();
    try { await supabase.auth.signOut(); } catch {}
    setState({ user: null, token: null, business: null, isLoading: false });
  };

  const refreshBusiness = async () => {
    if (!state.user?.businessId) return;
    const business = await api.getBusiness(state.user.businessId);
    setState((s) => ({ ...s, business }));
  };

  const setBusiness = (business: Business) => {
    setState((s) => {
      const updatedUser = s.user ? { ...s.user, businessId: business.businessId } : s.user;
      if (updatedUser) api.saveUser(updatedUser);
      return { ...s, business, user: updatedUser };
    });
  };

  const primaryColor = state.business?.color ?? '#4F46E5';

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, signInWithGoogle, logout, refreshBusiness, setBusiness, primaryColor }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
