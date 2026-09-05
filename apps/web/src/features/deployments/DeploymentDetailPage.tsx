import { useParams } from 'react-router-dom';
import { useDeployment } from '@/lib/query/deployments';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/stores/toast-store';
import { useCancelDeployment } from '@/lib/query/deployments';
import { Rocket, XCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

const eventIcons: Record<string, React.ElementType> = {
  SUCCESS: CheckCircle,
  FAILED: XCircle,
  PENDING: Clock,
  ASSIGNED: Clock,
  DOWNLOADING: RefreshCw,
  VERIFYING: RefreshCw,
  INSTALLING: RefreshCw,
  STARTING: RefreshCw,
  CANCELLED: XCircle,
};

const ACTIVE_STATUSES = ['PENDING', 'ASSIGNED', 'DOWNLOADING', 'VERIFYING', 'INSTALLING', 'STARTING'];

export function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: deployment, isLoading } = useDeployment(id!);
  const cancelDeployment = useCancelDeployment();

  const handleCancel = async () => {
    if (!id) return;
    try {
      await cancelDeployment.mutateAsync(id);
      toast({ title: 'Deployment cancelled', variant: 'success' });
    } catch {
      toast({ title: 'Failed to cancel', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-60 w-full" /></div>;
  }

  if (!deployment) {
    return <p className="text-muted-foreground">Deployment not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Rocket className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-xl font-semibold">
            {deployment.deviceHostname} - {deployment.releaseVersion}
          </h2>
          <StatusBadge status={deployment.status} />
        </div>
        {ACTIVE_STATUSES.includes(deployment.status) && (
          <Button variant="destructive" size="sm" onClick={handleCancel}>
            <XCircle className="mr-2 h-4 w-4" /> Cancel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="Device" value={deployment.deviceHostname} />
            <Row label="Release" value={deployment.releaseVersion} />
            <Row label="Status" value={<StatusBadge status={deployment.status} />} />
            <Row label="Created" value={new Date(deployment.createdAt).toLocaleString()} />
            <Row label="Updated" value={new Date(deployment.updatedAt).toLocaleString()} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            {deployment.events && deployment.events.length > 0 ? (
              <div className="relative space-y-4">
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                {deployment.events.map((event) => {
                  const Icon = eventIcons[event.status] || Clock;
                  return (
                    <div key={event.id} className="relative flex gap-4 pl-10">
                      <div className="absolute left-2 flex h-5 w-5 items-center justify-center rounded-full bg-background border">
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}