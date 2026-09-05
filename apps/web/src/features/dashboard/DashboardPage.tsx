import { useDashboardStats } from '@/lib/query/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Monitor,
  Wifi,
  WifiOff,
  AlertCircle,
  XCircle,
  Package,
} from 'lucide-react';

export function DashboardPage() {
  const { data, isLoading } = useDashboardStats();

  const statCards = [
    { label: 'Total Devices', value: data?.totalDevices ?? '-', icon: Monitor, color: 'text-blue-600' },
    { label: 'Online', value: data?.onlineDevices ?? '-', icon: Wifi, color: 'text-green-600' },
    { label: 'Offline', value: data?.offlineDevices ?? '-', icon: WifiOff, color: 'text-gray-500' },
    { label: 'Pending Updates', value: data?.pendingUpdates ?? '-', icon: AlertCircle, color: 'text-yellow-600' },
    { label: 'Failed Deployments', value: data?.failedDeployments ?? '-', icon: XCircle, color: 'text-red-600' },
    { label: 'Current Release', value: data?.currentRelease ?? 'N/A', icon: Package, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data?.recentDeployments?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Device</th>
                  <th className="pb-2 font-medium">Release</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentDeployments.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-2">{d.deviceHostname}</td>
                    <td className="py-2">{d.releaseVersion}</td>
                    <td className="py-2"><StatusBadge status={d.status} /></td>
                    <td className="py-2">{new Date(d.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No recent deployments.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}