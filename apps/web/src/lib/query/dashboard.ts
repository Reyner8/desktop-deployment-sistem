import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/axios';
import type { Device } from './devices';
import type { Release } from './releases';
import { mapDeployment } from './deployments';

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
      const [devicesRes, releasesRes, recentRes, failedRes] = await Promise.all([
        api.get('/devices', { params: { limit: 1000 } }),
        api.get('/releases', { params: { status: 'PUBLISHED', limit: 1 } }),
        api.get('/deployments', { params: { limit: 5 } }),
        api.get('/deployments', { params: { status: 'FAILED', limit: 1 } }),
      ]);

      const devices: Device[] = devicesRes.data.data?.data || [];
      const latestRelease: Release | null = releasesRes.data.data?.data?.[0] || null;
      const recent: any[] = recentRes.data.data?.data || [];
      const failedTotal: number = failedRes.data.data?.total || 0;

      const online = devices.filter((d) => d.status === 'ONLINE').length;
      const offline = devices.filter((d) => d.status === 'OFFLINE').length;
      const pending = devices.filter((d) => d.status === 'UPDATE_AVAILABLE').length;

      return {
        totalDevices: devices.length,
        onlineDevices: online,
        offlineDevices: offline,
        pendingUpdates: pending,
        failedDeployments: failedTotal,
        currentRelease: latestRelease?.version || null,
        recentDeployments: recent.map((d) => {
          const mapped = mapDeployment(d);
          return {
            id: mapped.id,
            deviceHostname: mapped.deviceHostname,
            releaseVersion: mapped.releaseVersion,
            status: mapped.status,
            createdAt: mapped.createdAt,
          };
        }),
      };
    },
    refetchInterval: 30000,
  });
}