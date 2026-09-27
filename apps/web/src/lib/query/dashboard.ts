import { useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '@rscb/shared';
import { DeploymentStatus } from '@rscb/shared';
import api from '@/lib/api/axios';

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
    status: DeploymentStatus;
    createdAt: string;
  }>;
  deviceVersionDistribution: Array<{ version: string; count: number }>;
  deploymentActivity: Array<{ date: string; total: number; success: number; failed: number }>;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
      if (!data.data) {
        throw new Error('Dashboard stats is empty');
      }
      return data.data;
    },
    refetchInterval: 30000,
  });
}
