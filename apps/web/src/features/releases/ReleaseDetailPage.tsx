import { useParams, useNavigate } from 'react-router-dom';
import { useRelease } from '@/lib/query/releases';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/stores/toast-store';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/axios';
import { Package, Archive } from 'lucide-react';

export function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: release, isLoading } = useRelease(id!);

  const handlePublish = async () => {
    try {
      await api.post(`/releases/${id}/publish`);
      toast({ title: 'Release published', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['release', id] });
    } catch {
      toast({ title: 'Failed to publish', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-60 w-full" /></div>;
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
          {(release.status === 'DRAFT' || release.status === 'VERIFYING') && (
            <Button onClick={handlePublish}>Publish</Button>
          )}
          <Button variant="outline" onClick={() => navigate('/releases')}>
            <Archive className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Release Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="Application" value={release.application} />
            <Row label="Version" value={release.version} />
            <Row label="Status" value={<StatusBadge status={release.status} />} />
            <Row label="Created" value={new Date(release.createdAt).toLocaleString()} />
            <Row label="Published" value={release.publishedAt ? new Date(release.publishedAt).toLocaleString() : '-'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Artifact</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="File Name" value={release.fileName || '-'} />
            <Row label="Size" value={release.fileSize ? `${(release.fileSize / 1024 / 1024).toFixed(2)} MB` : '-'} />
            <Row label="SHA-256" value={<span className="font-mono text-xs break-all">{release.sha256 || '-'}</span>} />
          </CardContent>
        </Card>
      </div>

      {release.releaseNotes && (
        <Card>
          <CardHeader><CardTitle>Release Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{release.releaseNotes}</p>
          </CardContent>
        </Card>
      )}
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