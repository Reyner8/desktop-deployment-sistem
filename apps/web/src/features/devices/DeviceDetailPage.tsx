import { useParams } from 'react-router-dom';
import { useDevice } from '@/lib/query/devices';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Monitor } from 'lucide-react';

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: device, isLoading } = useDevice(id!);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!device) {
    return <p className="text-muted-foreground">Device not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Monitor className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{device.hostname}</h2>
        <StatusBadge status={device.status} />
      </div>

      <Card>
        <CardHeader><CardTitle>Device Information</CardTitle></CardHeader>
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