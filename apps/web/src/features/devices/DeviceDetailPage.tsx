import { useParams } from 'react-router-dom';
import { useDevice } from '@/lib/query/devices';
import { useDeployments } from '@/lib/query/deployments';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ErrorState } from '@/components/ui/error-state';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Monitor, Package, Activity } from 'lucide-react';

function lastSeenLabel(lastSeen: string): string {
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: device, isLoading, isError, refetch } = useDevice(id!);
  const {
    data: deployments,
    isLoading: loadingHistory,
    isError: historyError,
  } = useDeployments({
    deviceId: id,
    limit: 10,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Unable to load device"
            message="The deployment server could not be reached."
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  if (!device) {
    return <p className="text-muted-foreground">Device not found.</p>;
  }

  const heartbeatStale = Date.now() - new Date(device.lastSeen).getTime() > 5 * 60 * 1000;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Monitor className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{device.hostname}</h2>
        <StatusBadge status={device.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <Row label="Device ID" value={<span className="break-all">{device.deviceId}</span>} />
            <Row label="Hostname" value={device.hostname} />
            <Row label="IP Address" value={device.ipAddress || '-'} />
            <Row label="Operating System" value={device.os || '-'} />
            <Row label="Agent Version" value={device.agentVersion} />
            <Row label="SIMRS Version" value={device.applicationVersion || '-'} />
            <Row label="Last Seen" value={new Date(device.lastSeen).toLocaleString()} />
            <Row label="Status" value={<StatusBadge status={device.status} />} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" /> Installed Application
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="SIMRS Version" value={device.applicationVersion || 'Belum terpasang'} />
            <Row label="Device Status" value={<StatusBadge status={device.status} />} />
            <Row label="Last Seen" value={new Date(device.lastSeen).toLocaleString()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" /> Agent Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Agent Version" value={device.agentVersion} />
            <Row
              label="Heartbeat"
              value={
                heartbeatStale ? (
                  <span className="text-destructive">
                    Terakhir {lastSeenLabel(device.lastSeen)}
                  </span>
                ) : (
                  <span className="text-green-600">Aktif ({lastSeenLabel(device.lastSeen)})</span>
                )
              }
            />
            <Row label="Operating System" value={device.os || '-'} />
            <Row label="Status" value={<StatusBadge status={device.status} />} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyError ? (
            <p className="text-sm text-muted-foreground">Gagal memuat riwayat deployment.</p>
          ) : loadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : deployments?.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Release</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deployments.data.map((deployment) => (
                  <TableRow key={deployment.id}>
                    <TableCell className="font-medium">{deployment.releaseVersion}</TableCell>
                    <TableCell>
                      <StatusBadge status={deployment.status} />
                    </TableCell>
                    <TableCell>{new Date(deployment.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada riwayat deployment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
      <Separator className="mt-2.5" />
    </div>
  );
}
