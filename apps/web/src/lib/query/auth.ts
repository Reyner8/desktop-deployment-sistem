import { useMutation, useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '@rscb/shared';
import api from '@/lib/api/axios';
import { useAuthStore } from '@/stores/auth-store';

export interface AuthProfile {
  id: string;
  username: string;
  displayName: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  token: string;
  user: { username: string; displayName: string };
}

export interface RegisterUserPayload {
  username: string;
  password: string;
  displayName?: string;
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await api.post<LoginResult>('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
    },
  });
}

export function useMe() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AuthProfile>>('/auth/me');
      return data.data!;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useRegisterUser() {
  return useMutation({
    mutationFn: async (payload: RegisterUserPayload) => {
      const { data } = await api.post<ApiResponse<{ id: string; username: string }>>(
        '/auth/register',
        payload,
      );
      return data.data!;
    },
  });
}
