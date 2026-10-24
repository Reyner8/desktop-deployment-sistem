import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, DeviceInfo, PaginatedResult, PaginationQuery } from '@rscb/shared';
import { DeviceStatus } from '@rscb/shared';
import api from '@/lib/api/axios';

export interface Device {
  id: string;
  deviceId: string;
  hostname: string;
  ipAddress: string;
  os: string;
  agentVersion: string;
  applicationVersion: string;
  lastSeen: string;
  status: DeviceStatus;
  isActive: boolean;
}

export interface DeviceQuery extends PaginationQuery {
  status?: DeviceStatus;
  search?: string;
}

export function mapDevice(raw: DeviceInfo): Device {
  return {
    id: raw.id,
    deviceId: raw.deviceId,
    hostname: raw.hostname,
    ipAddress: raw.networks?.[0]?.ipAddress || '',
    os: raw.os || '',
    agentVersion: raw.agentVersion,
    applicationVersion: raw.applicationVersion || '',
    lastSeen: raw.lastSeen,
    status: raw.status,
    isActive: raw.isActive ?? true,
  };
}

export function useDevices(params?: DeviceQuery) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<DeviceInfo>>>('/devices', {
        params,
      });
      const body = data.data!;
      return {
        data: body.data.map(mapDevice),
        total: body.total,
        page: body.page,
        limit: body.limit,
        totalPages: body.totalPages,
      };
    },
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: ['device', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DeviceInfo>>(`/devices/${id}`);
      return mapDevice(data.data!);
    },
    enabled: !!id,
  });
}

export function usePendingUpdatesCount() {
  return useQuery({
    queryKey: ['devices', 'pending-updates', 'count'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<DeviceInfo>>>('/devices', {
        params: { status: DeviceStatus.UPDATE_AVAILABLE, limit: 1 },
      });
      return data.data?.total ?? 0;
    },
    refetchInterval: 30000,
  });
}

export function useSetDeviceActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await api.patch<ApiResponse<DeviceInfo>>(`/devices/${id}/active`, {
        isActive,
      });
      return mapDevice(data.data!);
    },
    onSuccess: (device) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device', device.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
