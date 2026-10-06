'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { disconnectSocket } from '@/lib/socket';

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
  setAuthToken: (token: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Global session-expired handler.
 * Any module (api.ts, review-api.ts, etc.) can call this when it receives a 401.
 * It clears the stale token, disconnects the socket, and redirects to /login
 * so the user never sees a stale "logged-in" UI with a dead session.
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

  const fetchUser = useCallback(async (authToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(authToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', authToken);
        }
        _sessionExpiredFlag = false;
        return true;
      } else if (response.status === 401) {
        handleSessionExpired();
        setUser(null);
        setToken(null);
        return false;
      } else {
        console.warn('[AuthProvider] /auth/me returned non-ok status:', response.status);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
        setUser(null);
        setToken(null);
        return false;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      setUser(null);
      setToken(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (savedToken) {
      fetchUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = `${API_URL}/auth/github?_t=${Date.now()}`;
    }
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
    }
    setUser(null);
    setToken(null);
    router.push('/login');
  }, [router]);

  const setAuthToken = useCallback(async (newToken: string): Promise<boolean> => {
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
