import { useQuery } from '@tanstack/react-query';
import type {
  ApiResponse,
  DeploymentInfo,
  DeviceInfo,
  PaginatedResult,
  ReleaseInfo,
} from '@rscb/shared';
import { DeploymentStatus, DeviceStatus, ReleaseStatus } from '@rscb/shared';
import api from '@/lib/api/axios';
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
    status: DeploymentStatus;
    createdAt: string;
  }>;
  deviceVersionDistribution: Array<{ version: string; count: number }>;
  deploymentActivity: Array<{ date: string; total: number; success: number; failed: number }>;
}

function lastDays(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - i));
    return date.toISOString().slice(0, 10);
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [devicesRes, releasesRes, failedRes, deploymentsRes] = await Promise.all([
        api.get<ApiResponse<PaginatedResult<DeviceInfo>>>('/devices', {
          params: { limit: 1000 },
        }),
        api.get<ApiResponse<PaginatedResult<ReleaseInfo>>>('/releases', {
          params: { status: ReleaseStatus.PUBLISHED, limit: 1 },
        }),
        api.get<ApiResponse<PaginatedResult<DeploymentInfo>>>('/deployments', {
          params: { status: DeploymentStatus.FAILED, limit: 1 },
        }),
        api.get<ApiResponse<PaginatedResult<DeploymentInfo>>>('/deployments', {
          params: { limit: 200 },
        }),
      ]);

      const devices: DeviceInfo[] = devicesRes.data.data?.data || [];
      const latestRelease: ReleaseInfo | null = releasesRes.data.data?.data?.[0] || null;
      const failedTotal: number = failedRes.data.data?.total || 0;
      const deploymentRows: DeploymentInfo[] = deploymentsRes.data.data?.data || [];

      const online = devices.filter((d) => d.status === DeviceStatus.ONLINE).length;
      const offline = devices.filter((d) => d.status === DeviceStatus.OFFLINE).length;
      const pending = devices.filter((d) => d.status === DeviceStatus.UPDATE_AVAILABLE).length;

      const versionCounts = new Map<string, number>();
      devices.forEach((device) => {
        const version = device.applicationVersion || 'Unknown';
        versionCounts.set(version, (versionCounts.get(version) || 0) + 1);
      });
      const deviceVersionDistribution = [...versionCounts.entries()]
        .map(([version, count]) => ({ version, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const days = lastDays(7);
      const activityMap = new Map(
        days.map((date) => [date, { date, total: 0, success: 0, failed: 0 }]),
      );
      deploymentRows.forEach((row) => {
        const deployment = mapDeployment(row);
        const date = new Date(deployment.createdAt).toISOString().slice(0, 10);
        const bucket = activityMap.get(date);
        if (!bucket) return;
        bucket.total += 1;
        if (deployment.status === DeploymentStatus.SUCCESS) bucket.success += 1;
        if (deployment.status === DeploymentStatus.FAILED) bucket.failed += 1;
      });
      const deploymentActivity = days.map((date) => activityMap.get(date)!);

      return {
        totalDevices: devices.length,
        onlineDevices: online,
        offlineDevices: offline,
        pendingUpdates: pending,
        failedDeployments: failedTotal,
        currentRelease: latestRelease?.version || null,
        recentDeployments: deploymentRows.slice(0, 5).map((d) => {
          const mapped = mapDeployment(d);
          return {
            id: mapped.id,
            deviceHostname: mapped.deviceHostname,
            releaseVersion: mapped.releaseVersion,
            status: mapped.status,
            createdAt: mapped.createdAt,
          };
        }),
        deviceVersionDistribution,
        deploymentActivity,
      };
    },
    refetchInterval: 30000,
  });
}
