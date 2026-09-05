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

export function mapDevice(raw: any): Device {
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
  };
}

export function useDevices(params?: { status?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: async () => {
      const { data } = await api.get('/devices', { params });
      const body = data.data as { data: any[]; total: number; page: number; limit: number };
      return {
        data: (body.data || []).map(mapDevice),
        total: body.total,
        page: body.page,
        limit: body.limit,
      };
    },
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: ['device', id],
    queryFn: async () => {
      const { data } = await api.get(`/devices/${id}`);
      return mapDevice(data.data);
    },
    enabled: !!id,
  });
}