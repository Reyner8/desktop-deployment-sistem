import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/axios';

export interface Deployment {
  id: string;
  deviceId: string;
  deviceHostname: string;
  releaseId: string;
  releaseVersion: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  events?: DeploymentEvent[];
}

export interface DeploymentEvent {
  id: string;
  deploymentId: string;
  status: string;
  message: string;
  timestamp: string;
}

export function useDeployments(params?: { status?: string; deviceId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['deployments', params],
    queryFn: async () => {
      const { data } = await api.get('/deployments', { params });
      return data as { data: Deployment[]; total: number; page: number; limit: number };
    },
  });
}

export function useDeployment(id: string) {
  return useQuery({
    queryKey: ['deployment', id],
    queryFn: async () => {
      const { data } = await api.get(`/deployments/${id}`);
      return data as Deployment;
    },
    enabled: !!id,
  });
}

export function useCreateDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { releaseId: string; deviceIds: string[] }) => {
      const { data } = await api.post('/deployments', payload);
      return data as Deployment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });
}

export function useCancelDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/deployments/${id}/cancel`);
      return data as Deployment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });
}