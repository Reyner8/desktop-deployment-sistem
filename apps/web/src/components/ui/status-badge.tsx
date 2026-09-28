import { Badge } from '@/components/ui/badge';
import { DeploymentStatus, DeviceStatus, ReleaseStatus } from '@rscb/shared';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  FileText,
  Clock,
  Archive,
  LucideIcon,
} from 'lucide-react';

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'success' | 'destructive' | 'warning' | 'info' | 'muted' | 'secondary' | 'default';
    icon: LucideIcon;
  }
> = {
  [DeviceStatus.ONLINE]: { label: 'Online', variant: 'success', icon: CheckCircle },
  [DeviceStatus.OFFLINE]: { label: 'Offline', variant: 'muted', icon: XCircle },
  [DeviceStatus.UPDATE_AVAILABLE]: {
    label: 'Update Available',
    variant: 'warning',
    icon: AlertCircle,
  },
  [DeviceStatus.UPDATING]: { label: 'Updating', variant: 'info', icon: RefreshCw },
  [DeploymentStatus.PENDING]: { label: 'Pending', variant: 'warning', icon: Clock },
  [DeploymentStatus.ASSIGNED]: { label: 'Assigned', variant: 'info', icon: Clock },
  [DeploymentStatus.DOWNLOADING]: { label: 'Downloading', variant: 'info', icon: RefreshCw },
  [DeploymentStatus.VERIFYING]: { label: 'Verifying', variant: 'info', icon: RefreshCw },
  // ui-design.md bagian 30 menyebut Waiting sebagai status tersendiri.
  // Bagian 29 melarang UI menampilkan Installing selagi Agent masih
  // menunggu user menutup SIMRS.
  [DeploymentStatus.WAITING]: { label: 'Waiting', variant: 'warning', icon: Clock },
  [DeploymentStatus.INSTALLING]: { label: 'Installing', variant: 'info', icon: RefreshCw },
  [DeploymentStatus.STARTING]: { label: 'Starting', variant: 'info', icon: RefreshCw },
  [DeploymentStatus.SUCCESS]: { label: 'Success', variant: 'success', icon: CheckCircle },
  [DeploymentStatus.FAILED]: { label: 'Failed', variant: 'destructive', icon: AlertTriangle },
  [DeploymentStatus.CANCELLED]: { label: 'Cancelled', variant: 'muted', icon: XCircle },
  [DeviceStatus.ERROR]: { label: 'Error', variant: 'destructive', icon: AlertTriangle },
  [ReleaseStatus.DRAFT]: { label: 'Draft', variant: 'muted', icon: FileText },
  [ReleaseStatus.UPLOADING]: { label: 'Uploading', variant: 'info', icon: RefreshCw },
  [ReleaseStatus.PUBLISHED]: { label: 'Published', variant: 'success', icon: CheckCircle },
  [ReleaseStatus.ARCHIVED]: { label: 'Archived', variant: 'muted', icon: Archive },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    variant: 'default' as const,
    icon: AlertCircle,
  };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1 px-3 py-1">
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );
}
