import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReleases } from '@/lib/query/releases';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { Eye, Plus, Package } from 'lucide-react';
import api from '@/lib/api/axios';
import { toast } from '@/stores/toast-store';
import { useQueryClient } from '@tanstack/react-query';

const statusOptions = ['ALL', 'DRAFT', 'VERIFYING', 'PUBLISHED'];

export function ReleasesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { data, isLoading } = useReleases({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    page,
    limit,
  });

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/releases/${id}/publish`);
      toast({ title: 'Release published', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
    } catch {
      toast({ title: 'Failed to publish', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Releases</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</SelectItem>
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
          <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
            <TableHead>Application</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>SHA-256</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : data?.data?.length ? (
            data.data.map((release) => (
              <TableRow key={release.id}>
                <TableCell className="font-medium">{release.version}</TableCell>
                <TableCell>{release.application}</TableCell>
                <TableCell>{release.fileSize ? `${(release.fileSize / 1024 / 1024).toFixed(1)} MB` : '-'}</TableCell>
                <TableCell className="font-mono text-xs max-w-[180px] truncate" title={release.sha256}>
                  {release.sha256 ? `${release.sha256.slice(0, 20)}...` : '-'}
                </TableCell>
                <TableCell><StatusBadge status={release.status} /></TableCell>
                <TableCell>{new Date(release.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/releases/${release.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(release.status === 'DRAFT' || release.status === 'VERIFYING') && (
                      <Button variant="outline" size="sm" onClick={() => handlePublish(release.id)}>
                        Publish
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                <Package className="mx-auto h-8 w-8 mb-2" />
                No releases found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
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
    </div>
  );
}