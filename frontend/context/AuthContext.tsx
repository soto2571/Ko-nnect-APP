import React, { createContext, useContext, useEffect, useState } from 'react';
import * as api from '@/services/api';
import type { Business, User } from '@/types';

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
        if (!token) {
          setState((s) => ({ ...s, isLoading: false }));
          return;
        }
        // Decode token payload (base64)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const user: User = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          firstName: '',
          lastName: '',
          businessId: payload.businessId,
        };
        let business: Business | null = null;
        if (payload.businessId) {
          try {
            business = await api.getBusiness(payload.businessId);
          } catch {}
        }
        setState({ user, token, business, isLoading: false });
      } catch {
        await api.removeToken();
        setState({ user: null, token: null, business: null, isLoading: false });
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { user, token } = await api.login({ email, password });
    await api.saveToken(token);
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
    const { user, token } = await api.signup(payload);
    await api.saveToken(token);
    setState({ user, token, business: null, isLoading: false });
  };

  const logout = async () => {
    await api.removeToken();
    setState({ user: null, token: null, business: null, isLoading: false });
  };

  const refreshBusiness = async () => {
    if (!state.user?.businessId) return;
    const business = await api.getBusiness(state.user.businessId);
    setState((s) => ({ ...s, business }));
  };

  const setBusiness = (business: Business) => {
    setState((s) => ({
      ...s,
      business,
      user: s.user ? { ...s.user, businessId: business.businessId } : s.user,
    }));
  };

  const primaryColor = state.business?.color ?? '#4F46E5';

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, logout, refreshBusiness, setBusiness, primaryColor }}
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
