import axios, { AxiosError } from 'axios';
import { handleSessionExpired } from './auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
});

// Response interceptor to handle 401 session expirations and format error messages
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string; details?: string }>) => {
    if (error.response?.status === 401) {
      handleSessionExpired();
    }
    const message =
      error.response?.data?.details ||
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred';
    return Promise.reject(new Error(message));
  }
);

/**
 * Helper to build optional Bearer authorization header if a custom token is provided
 */
export function authHeader(token?: string | null): Record<string, string> {
  if (token && token !== 'cookie-session') {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
