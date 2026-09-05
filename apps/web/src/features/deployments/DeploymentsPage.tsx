import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeployments } from '@/lib/query/deployments';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { Eye, Plus, Rocket } from 'lucide-react';

const statusOptions = ['ALL', 'PENDING', 'ASSIGNED', 'DOWNLOADING', 'VERIFYING', 'INSTALLING', 'STARTING', 'SUCCESS', 'FAILED', 'CANCELLED'];

export function DeploymentsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { data, isLoading } = useDeployments({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    page,
    limit: limit,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Deployments</h2>
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
          <Button onClick={() => navigate('/deployments/new')}>
            <Plus className="mr-2 h-4 w-4" /> New Deployment
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device</TableHead>
            <TableHead>Release Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : data?.data?.length ? (
            data.data.map((dep) => (
              <TableRow key={dep.id}>
                <TableCell className="font-medium">{dep.deviceHostname}</TableCell>
                <TableCell>{dep.releaseVersion}</TableCell>
                <TableCell><StatusBadge status={dep.status} /></TableCell>
                <TableCell>{new Date(dep.createdAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/deployments/${dep.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                <Rocket className="mx-auto h-8 w-8 mb-2" />
                No deployments found
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