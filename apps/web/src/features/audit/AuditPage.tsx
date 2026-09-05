import { useState } from 'react';
import { useAuditLogs } from '@/lib/query/audit';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Search } from 'lucide-react';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [actorFilter, setActorFilter] = useState('');
  const { data, isLoading } = useAuditLogs({
    actor: actorFilter || undefined,
    page,
    limit: 20,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by actor..."
            value={actorFilter}
            onChange={(e) => { setActorFilter(e.target.value); setPage(1); }}
            className="pl-8 w-60"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Timestamp</TableHead>
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
            data.data.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.actor}</TableCell>
                <TableCell>
                  <span className="capitalize">{log.action.replace(/_/g, ' ').toLowerCase()}</span>
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

      {data && data.total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}