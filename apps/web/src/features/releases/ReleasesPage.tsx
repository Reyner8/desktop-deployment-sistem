import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReleaseStatus } from '@rscb/shared';
import { useReleases, usePublishRelease, useArchiveRelease } from '@/lib/query/releases';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { getErrorMessage } from '@/lib/api/axios';
import { Eye, Plus, Package, Archive } from 'lucide-react';
import { toast } from '@/stores/toast-store';

const statusOptions: Array<'ALL' | ReleaseStatus> = [
  'ALL',
  ReleaseStatus.DRAFT,
  ReleaseStatus.UPLOADING,
  ReleaseStatus.VERIFYING,
  ReleaseStatus.PUBLISHED,
  ReleaseStatus.FAILED,
  ReleaseStatus.ARCHIVED,
];

export function ReleasesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useReleases({
    status: statusFilter === 'ALL' ? undefined : (statusFilter as ReleaseStatus),
    page,
    limit,
  });
  const publishRelease = usePublishRelease();
  const archiveRelease = useArchiveRelease();

  const handlePublish = async (id: string) => {
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
    if (!archiveTarget) return;
    try {
      await archiveRelease.mutateAsync(archiveTarget);
      toast({ title: 'Release archived', variant: 'success' });
      setArchiveTarget(null);
    } catch (error) {
      toast({
        title: 'Failed to archive',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Releases</h2>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'ALL' ? 'All Status' : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => navigate('/releases/new')}>
            <Plus className="mr-2 h-4 w-4" /> New Release
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isError ? (
            <ErrorState
              title="Unable to load releases"
              message="The deployment server could not be reached."
              onRetry={() => refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>SHA-256</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Published At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.data?.length ? (
                  data.data.map((release) => (
                    <TableRow key={release.id}>
                      <TableCell className="font-medium">{release.version}</TableCell>
                      <TableCell>{release.application}</TableCell>
                      <TableCell>
                        {release.fileSize
                          ? `${(release.fileSize / 1024 / 1024).toFixed(1)} MB`
                          : '-'}
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs max-w-[180px] truncate"
                        title={release.sha256}
                      >
                        {release.sha256 ? `${release.sha256.slice(0, 20)}...` : '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={release.status} />
                      </TableCell>
                      <TableCell>{new Date(release.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {release.publishedAt
                          ? new Date(release.publishedAt).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Lihat detail ${release.version}`}
                            onClick={() => navigate(`/releases/${release.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(release.status === ReleaseStatus.DRAFT ||
                            release.status === ReleaseStatus.VERIFYING) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePublish(release.id)}
                              disabled={publishRelease.isPending}
                            >
                              Publish
                            </Button>
                          )}
                          {(release.status === ReleaseStatus.DRAFT ||
                            release.status === ReleaseStatus.PUBLISHED) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setArchiveTarget(release.id)}
                            >
                              <Archive className="mr-1 h-4 w-4" /> Archive
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      <Package className="mx-auto h-8 w-8 mb-2" />
                      No releases found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && (
        <PaginationBar
          page={page}
          total={data.total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
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
