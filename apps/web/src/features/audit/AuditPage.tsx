import { useState } from 'react';
import { AuditAction } from '@rscb/shared';
import { useAuditLogs } from '@/lib/query/audit';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { ErrorState } from '@/components/ui/error-state';
import { ScrollText, Search } from 'lucide-react';

const humanizeAction = (action: string) => action.replace(/_/g, ' ').toLowerCase();

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  // Default mengikuti default backend: timestamp DESC (terbaru dulu).
  const [sort, setSort] = useState('timestamp');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const handleSort = (key: string) => {
    if (key === sort) {
      setOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSort(key);
      setOrder('ASC');
    }
    setPage(1);
  };
  const { data, isLoading, isError, refetch } = useAuditLogs({
    actor: actorFilter || undefined,
    action: actionFilter === 'ALL' ? undefined : (actionFilter as AuditAction),
    page,
    limit,
    sort,
    order,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by actor..."
              value={actorFilter}
              onChange={(e) => {
                setActorFilter(e.target.value);
                setPage(1);
              }}
              className="pl-8 w-60"
            />
          </div>
          <Select
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              {Object.values(AuditAction).map((action) => (
                <SelectItem key={action} value={action}>
                  <span className="capitalize">{humanizeAction(action)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isError ? (
            <ErrorState
              title="Unable to load audit logs"
              message="The deployment server could not be reached."
              onRetry={() => refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    sortKey="actor"
                    sortActive={sort === 'actor'}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    Actor
                  </TableHead>
                  <TableHead
                    sortKey="action"
                    sortActive={sort === 'action'}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    Action
                  </TableHead>
                  <TableHead
                    sortKey="target"
                    sortActive={sort === 'target'}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    Target
                  </TableHead>
                  <TableHead
                    sortKey="result"
                    sortActive={sort === 'result'}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    Result
                  </TableHead>
                  <TableHead
                    sortKey="timestamp"
                    sortActive={sort === 'timestamp'}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    Timestamp
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.data?.length ? (
                  data.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.actor}</TableCell>
                      <TableCell>
                        <span className="capitalize">{humanizeAction(log.action)}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.target}</TableCell>
                      <TableCell>
                        <Badge variant={log.result === 'SUCCESS' ? 'success' : 'destructive'}>
                          {log.result}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <ScrollText className="mx-auto h-8 w-8 mb-2" />
                      No audit logs found
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
    </div>
  );
}
