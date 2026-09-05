import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/axios';

export interface DeploymentEvent {
  id: string;
  deploymentId: string;
  status: string;
  message: string;
  timestamp: string;
}

export interface Deployment {
  id: string;
  deviceId: string;
  deviceHostname: string;
  releaseId: string;
  releaseVersion: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  events?: DeploymentEvent[];
}

export function mapDeployment(raw: any): Deployment {
  return {
    id: raw.id,
    deviceId: raw.device?.id || '',
    deviceHostname: raw.device?.hostname || '-',
    releaseId: raw.release?.id || '',
    releaseVersion: raw.release?.version || '-',
    status: raw.status,
    errorMessage: raw.errorMessage,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    events: (raw.events || []).map((e: any) => ({
      id: e.id,
      deploymentId: raw.id,
      status: e.status,
      message: e.message,
      timestamp: e.timestamp,
    })),
  };
}

export function useDeployments(params?: { status?: string; releaseId?: string; deviceId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['deployments', params],
    queryFn: async () => {
      const { data } = await api.get('/deployments', { params });
      const body = data.data as { data: any[]; total: number; page: number; limit: number };
      return {
        data: (body.data || []).map(mapDeployment),
        total: body.total,
        page: body.page,
        limit: body.limit,
      };
    },
  });
}

export function useDeployment(id: string) {
  return useQuery({
    queryKey: ['deployment', id],
    queryFn: async () => {
      const { data } = await api.get(`/deployments/${id}`);
      return mapDeployment(data.data);
    },
    enabled: !!id,
  });
}

export function useCreateDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { releaseId: string; deviceIds: string[] }) => {
      const { data } = await api.post('/deployments', payload);
      const created = data.data || [];
      return mapDeployment(created[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/deployments/${id}/cancel`);
      return mapDeployment(data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}