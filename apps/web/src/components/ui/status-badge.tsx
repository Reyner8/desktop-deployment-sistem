import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  FileText,
  Clock,
  LucideIcon,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'info' | 'muted' | 'secondary' | 'default'; icon: LucideIcon }> = {
  ONLINE: { label: 'Online', variant: 'success', icon: CheckCircle },
  OFFLINE: { label: 'Offline', variant: 'muted', icon: XCircle },
  UPDATE_AVAILABLE: { label: 'Update Available', variant: 'warning', icon: AlertCircle },
  UPDATING: { label: 'Updating', variant: 'info', icon: RefreshCw },
  ASSIGNED: { label: 'Assigned', variant: 'info', icon: Clock },
  DOWNLOADING: { label: 'Downloading', variant: 'info', icon: RefreshCw },
  VERIFYING: { label: 'Verifying', variant: 'info', icon: RefreshCw },
  INSTALLING: { label: 'Installing', variant: 'info', icon: RefreshCw },
  STARTING: { label: 'Starting', variant: 'info', icon: RefreshCw },
  ERROR: { label: 'Error', variant: 'destructive', icon: AlertTriangle },
  FAILED: { label: 'Failed', variant: 'destructive', icon: AlertTriangle },
  DRAFT: { label: 'Draft', variant: 'muted', icon: FileText },
  PUBLISHED: { label: 'Published', variant: 'success', icon: CheckCircle },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  SUCCESS: { label: 'Success', variant: 'success', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', variant: 'muted', icon: XCircle },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: 'default' as const, icon: AlertCircle };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1 px-3 py-1">
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );
}