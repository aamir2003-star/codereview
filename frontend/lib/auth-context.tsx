'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  setAuthToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(authToken);
        localStorage.setItem('auth_token', authToken);
      } else {
        // Token is invalid or expired — purge it
        localStorage.removeItem('auth_token');
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('auth_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      fetchUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = () => {
    // Navigate to GitHub OAuth route with timestamp to avoid cached redirects
    window.location.href = `${API_URL}/auth/github?_t=${Date.now()}`;
  };

  const logout = () => {
    // 1. Disconnect any active socket sessions
    disconnectSocket();

    // 2. Completely delete JWT token and cached user credentials
    localStorage.removeItem('auth_token');
    sessionStorage.clear();

    // 3. Reset application state
    setUser(null);
    setToken(null);

    // 4. Redirect to login page
    router.push('/login');
  };

  const setAuthToken = async (newToken: string) => {
    setIsLoading(true);
    await fetchUser(newToken);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        setAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
