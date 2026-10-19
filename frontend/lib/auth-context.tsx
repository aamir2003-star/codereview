'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { disconnectSocket } from '@/lib/socket';
import { http } from '@/lib/http';

export interface User {
  _id: string;
  githubId: string;
  username: string;
  avatarUrl: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  setAuthToken: (token?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Global session-expired handler.
 * Any module (api.ts, review-api.ts, etc.) can call this when it receives a 401.
 * It clears client-side state, disconnects the socket, and redirects to /login.
 */
let _sessionExpiredFlag = false;
export function handleSessionExpired() {
  if (_sessionExpiredFlag) return;
  _sessionExpiredFlag = true;

  disconnectSocket();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    sessionStorage.clear();
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/auth/callback')) {
      window.location.href = '/login';
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchUser = useCallback(async (authToken?: string): Promise<boolean> => {
    try {
      const headers = authToken && authToken !== 'cookie-session' ? { Authorization: `Bearer ${authToken}` } : undefined;
      const response = await http.get<{ user: User }>('/auth/me', { headers });

      setUser(response.data.user);
      setToken(authToken || 'cookie-session');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      _sessionExpiredFlag = false;
      return true;
    } catch {
      setUser(null);
      setToken(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check session on mount via HttpOnly cookie (or legacy localStorage token if one exists)
    const legacyToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    fetchUser(legacyToken || undefined);
  }, [fetchUser]);

  const login = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = `${API_URL}/auth/github?_t=${Date.now()}`;
    }
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    try {
      await http.post('/auth/logout');
    } catch (err) {
      console.warn('Failed to call backend logout:', err);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
    }
    setUser(null);
    setToken(null);
    router.push('/login');
  }, [router]);

  const setAuthToken = useCallback(async (newToken?: string): Promise<boolean> => {
    setIsLoading(true);
    return await fetchUser(newToken);
  }, [fetchUser]);

  const contextValue = React.useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      setAuthToken,
    }),
    [user, token, isLoading, login, logout, setAuthToken]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
