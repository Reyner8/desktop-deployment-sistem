import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReleaseStatus } from '@rscb/shared';
import { useRelease, usePublishRelease, useArchiveRelease } from '@/lib/query/releases';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { getErrorMessage } from '@/lib/api/axios';
import { toast } from '@/stores/toast-store';
import { Package, Archive, ArrowLeft } from 'lucide-react';

export function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading, isError, refetch } = useRelease(id!);
  const publishRelease = usePublishRelease();
  const archiveRelease = useArchiveRelease();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const handlePublish = async () => {
    if (!id) return;
    try {
      await publishRelease.mutateAsync(id);
      toast({ title: 'Release published', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Failed to publish',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await archiveRelease.mutateAsync(id);
      toast({ title: 'Release archived', variant: 'success' });
      setArchiveOpen(false);
    } catch (error) {
      toast({
        title: 'Failed to archive',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Unable to load release"
            message="The deployment server could not be reached."
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  if (!release) {
    return <p className="text-muted-foreground">Release not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-xl font-semibold">{release.version}</h2>
          <StatusBadge status={release.status} />
        </div>
        <div className="flex gap-2">
          {(release.status === ReleaseStatus.DRAFT ||
            release.status === ReleaseStatus.VERIFYING) && (
            <Button onClick={handlePublish} disabled={publishRelease.isPending}>
              Publish
            </Button>
          )}
          {(release.status === ReleaseStatus.DRAFT ||
            release.status === ReleaseStatus.PUBLISHED) && (
            <Button variant="outline" onClick={() => setArchiveOpen(true)}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/releases')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Release Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Application" value={release.application} />
            <Row label="Version" value={release.version} />
            <Row label="Status" value={<StatusBadge status={release.status} />} />
            <Row label="Created" value={new Date(release.createdAt).toLocaleString()} />
            <Row
              label="Published"
              value={release.publishedAt ? new Date(release.publishedAt).toLocaleString() : '-'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Artifact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="File Name" value={release.fileName || '-'} />
            <Row
              label="Size"
              value={release.fileSize ? `${(release.fileSize / 1024 / 1024).toFixed(2)} MB` : '-'}
            />
            <Row
              label="SHA-256"
              value={<span className="font-mono text-xs break-all">{release.sha256 || '-'}</span>}
            />
          </CardContent>
        </Card>
      </div>

      {release.releaseNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Release Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{release.releaseNotes}</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive release?"
        description="Release yang diarsipkan tidak lagi didistribusikan ke agent. Artifact tetap tersimpan dan tidak diubah."
        confirmLabel="Archive"
        destructive
        loading={archiveRelease.isPending}
        onConfirm={handleArchive}
      />
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
