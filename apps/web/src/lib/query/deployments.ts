import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApiResponse,
  CreateDeploymentRequest,
  DeploymentEvent,
  DeploymentInfo,
  PaginatedResult,
  PaginationQuery,
} from '@rscb/shared';
import { DeploymentStatus } from '@rscb/shared';
import api from '@/lib/api/axios';

export type { DeploymentEvent };

export interface Deployment {
  id: string;
  deviceId: string;
  deviceHostname: string;
  releaseId: string;
  releaseVersion: string;
  status: DeploymentStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  events?: DeploymentEvent[];
}

export interface DeploymentQuery extends PaginationQuery {
  status?: DeploymentStatus;
  releaseId?: string;
  deviceId?: string;
}

export function mapDeployment(raw: DeploymentInfo): Deployment {
  return {
    id: raw.id,
    deviceId: raw.device?.id || '',
    deviceHostname: raw.device?.hostname || '-',
    releaseId: raw.release?.id || '',
    releaseVersion: raw.release?.version || '-',
    status: raw.status,
    errorMessage: raw.errorMessage || undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    events: raw.events || [],
  };
}

const TERMINAL_STATUSES: DeploymentStatus[] = [
  DeploymentStatus.SUCCESS,
  DeploymentStatus.FAILED,
  DeploymentStatus.CANCELLED,
];

export function useDeployments(params?: DeploymentQuery) {
  return useQuery({
    queryKey: ['deployments', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<DeploymentInfo>>>(
        '/deployments',
        { params },
      );
      const body = data.data!;
      return {
        data: body.data.map(mapDeployment),
        total: body.total,
        page: body.page,
        limit: body.limit,
        totalPages: body.totalPages,
      };
    },
    refetchInterval: (query) => {
      const items = query.state.data?.data;
      if (!items?.length) return false;
      return items.some((d) => !TERMINAL_STATUSES.includes(d.status)) ? 10000 : false;
    },
  });
}

export function useDeployment(id: string) {
  return useQuery({
    queryKey: ['deployment', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DeploymentInfo>>(`/deployments/${id}`);
      return mapDeployment(data.data!);
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const deployment = query.state.data;
      if (!deployment) return false;
      return TERMINAL_STATUSES.includes(deployment.status) ? false : 10000;
    },
  });
}

export function useCreateDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDeploymentRequest) => {
      const { data } = await api.post<ApiResponse<DeploymentInfo[]>>('/deployments', payload);
      // Backend membuat satu deployment per device. Kembalikan semuanya,
      // bukan hanya elemen pertama, supaya hasil bulk deploy tidak hilang.
      return (data.data || []).map(mapDeployment);
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
      const { data } = await api.post<ApiResponse<DeploymentInfo>>(`/deployments/${id}/cancel`);
      return mapDeployment(data.data!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
