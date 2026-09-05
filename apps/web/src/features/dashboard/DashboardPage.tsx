import { useDashboardStats } from '@/lib/query/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Release</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentDeployments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.deviceHostname}</TableCell>
                    <TableCell>{d.releaseVersion}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell>{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No recent deployments.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}