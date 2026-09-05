import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/axios';
import type { Device } from './devices';
import type { Release } from './releases';

export interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  pendingUpdates: number;
  failedDeployments: number;
  currentRelease: string | null;
  recentDeployments: Array<{
    id: string;
    deviceHostname: string;
    releaseVersion: string;
    status: string;
    createdAt: string;
  }>;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [devicesRes, releasesRes] = await Promise.all([
        api.get('/devices', { params: { limit: 1000 } }),
        api.get('/releases', { params: { status: 'PUBLISHED', limit: 1 } }),
      ]);
      const devices: Device[] = devicesRes.data.data || [];
      const latestRelease: Release | null = releasesRes.data.data?.[0] || null;
      const online = devices.filter((d) => d.status === 'ONLINE').length;
      const offline = devices.filter((d) => d.status === 'OFFLINE').length;
      const pending = devices.filter((d) => d.status === 'UPDATE_AVAILABLE').length;

      const stats: DashboardStats = {
        totalDevices: devices.length,
        onlineDevices: online,
        offlineDevices: offline,
        pendingUpdates: pending,
        failedDeployments: 0,
        currentRelease: latestRelease?.version || null,
        recentDeployments: [],
      };

      try {
        const deplRes = await api.get('/deployments', { params: { limit: 5 } });
        stats.recentDeployments = deplRes.data.data || [];
      } catch {
        // deployments may not exist yet
      }

      return stats;
    },
    refetchInterval: 30000,
  });
}