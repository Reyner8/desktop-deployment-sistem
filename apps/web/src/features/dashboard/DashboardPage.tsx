import { useDashboardStats } from '@/lib/query/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Monitor, Wifi, WifiOff, AlertCircle, XCircle, Package } from 'lucide-react';

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardStats();

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Unable to load dashboard"
            message="The deployment server could not be reached."
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      label: 'Total Devices',
      value: data?.totalDevices ?? '-',
      icon: Monitor,
      color: 'text-blue-600',
    },
    { label: 'Online', value: data?.onlineDevices ?? '-', icon: Wifi, color: 'text-green-600' },
    { label: 'Offline', value: data?.offlineDevices ?? '-', icon: WifiOff, color: 'text-gray-500' },
    {
      label: 'Pending Updates',
      value: data?.pendingUpdates ?? '-',
      icon: AlertCircle,
      color: 'text-yellow-600',
    },
    {
      label: 'Failed Deployments',
      value: data?.failedDeployments ?? '-',
      icon: XCircle,
      color: 'text-red-600',
    },
    {
      label: 'Current Release',
      value: data?.currentRelease ?? 'N/A',
      icon: Package,
      color: 'text-purple-600',
    },
  ];

  const maxVersionCount = Math.max(
    1,
    ...(data?.deviceVersionDistribution?.map((v) => v.count) || [1]),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Device Version Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : data?.deviceVersionDistribution?.length ? (
              data.deviceVersionDistribution.map((item) => (
                <div key={item.version} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.version}</span>
                    <span className="text-muted-foreground">{item.count} device</span>
                  </div>
                  <div className="h-2 rounded bg-muted">
                    <div
                      className="h-2 rounded bg-primary"
                      style={{ width: `${(item.count / maxVersionCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No devices registered.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deployment Activity (7 hari terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.deploymentActivity?.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>{new Date(`${row.date}T00:00:00`).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{row.total}</TableCell>
                      <TableCell className="text-right text-green-600">{row.success}</TableCell>
                      <TableCell className="text-right text-red-600">{row.failed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
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
                    <TableCell>
                      <StatusBadge status={d.status} />
                    </TableCell>
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
