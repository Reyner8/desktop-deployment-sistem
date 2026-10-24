import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@rscb/shared';
import { UserRole } from '@rscb/shared';
import api from '@/lib/api/axios';
import { useAuthStore } from '@/stores/auth-store';

export interface AuthProfile {
  id: string;
  username: string;
  displayName: string | null;
  role?: UserRole;
}

export interface ManagedUser {
  id: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
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
  role?: UserRole;
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

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const { data } = await api.post<ApiResponse<null>>('/auth/change-password', payload);
      return data;
    },
  });
}

export function useUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['auth', 'users'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ManagedUser[]>>('/auth/users');
      return data.data!;
    },
    enabled,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { data } = await api.patch<ApiResponse<ManagedUser>>(`/auth/users/${id}/role`, {
        role,
      });
      return data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete<ApiResponse<null>>(`/auth/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'users'] });
    },
  });
}
