import { useQuery } from '@tanstack/react-query';
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
  status: string;
}

export function useDevices(params?: { status?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: async () => {
      const { data } = await api.get('/devices', { params });
      return data as { data: Device[]; total: number; page: number; limit: number };
    },
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: ['device', id],
    queryFn: async () => {
      const { data } = await api.get(`/devices/${id}`);
      return data as Device;
    },
    enabled: !!id,
  });
}