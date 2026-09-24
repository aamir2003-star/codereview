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
  setAuthToken: (token: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchUser = async (authToken: string): Promise<boolean> => {
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
        return true;
      } else {
        localStorage.removeItem('auth_token');
        setUser(null);
        setToken(null);
        return false;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('auth_token');
      setUser(null);
      setToken(null);
      return false;
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
    window.location.href = `${API_URL}/auth/github?_t=${Date.now()}`;
  };

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem('auth_token');
    sessionStorage.clear();
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  const setAuthToken = async (newToken: string): Promise<boolean> => {
    setIsLoading(true);
    return await fetchUser(newToken);
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
