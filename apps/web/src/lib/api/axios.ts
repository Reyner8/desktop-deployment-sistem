import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

export interface ApiError {
  status: number | null;
  message: string;
  code?: string;
}

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const body = error.response?.data as
      { message?: string | string[]; error?: string } | undefined;
    let message: string =
      (Array.isArray(body?.message) ? body?.message.join(', ') : body?.message) ||
      error.message ||
      'Request failed';
    if (!message) {
      message = 'Request failed';
    }
    return { status, message, code: body?.error };
  }
  return {
    status: null,
    message: error instanceof Error ? error.message : 'Unexpected error',
  };
}

export function getErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeApiError(error);
    const url = error.config?.url || '';
    const isLoginRequest = url.includes('/auth/login');
    if (normalized.status === 401 && !isLoginRequest) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
