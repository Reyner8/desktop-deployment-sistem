import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DeviceStatus } from '@rscb/shared';
import { useDevices } from '@/lib/query/devices';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ErrorState } from '@/components/ui/error-state';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Monitor, Rocket, Search, X } from 'lucide-react';

const statusOptions: Array<'ALL' | DeviceStatus> = [
  'ALL',
  DeviceStatus.ONLINE,
  DeviceStatus.OFFLINE,
  DeviceStatus.UPDATE_AVAILABLE,
  DeviceStatus.UPDATING,
  DeviceStatus.ERROR,
];

export function DevicesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  // Default mengikuti default backend: lastSeen DESC (terbaru dulu).
  const [sort, setSort] = useState('lastSeen');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const statusFilter = searchParams.get('status') || 'ALL';
  const setStatusFilter = (value: string) => {
    setSearchParams(value === 'ALL' ? {} : { status: value }, { replace: true });
    setPage(1);
  };
  const handleSort = (key: string) => {
    if (key === sort) {
      setOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSort(key);
      setOrder('ASC');
    }
    setPage(1);
  };
  const { data, isLoading, isError, refetch } = useDevices({
    status: statusFilter === 'ALL' ? undefined : (statusFilter as DeviceStatus),
    search: search || undefined,
    page,
    limit,
    sort,
    order,
  });

  const visibleDevices = data?.data || [];
  const allVisibleSelected =
    visibleDevices.length > 0 && visibleDevices.every((d) => selectedIds.has(d.id));

  const toggleDevice = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleDevices.forEach((d) => {
        if (allVisibleSelected) next.delete(d.id);
        else next.add(d.id);
      });
      return next;
    });
  };

  const startBulkDeployment = () => {
    // Pilihan diteruskan lewat query param supaya wizard deployment baru
    // bisa langsung memakai device yang sama, dan URL tetap bisa dibagikan.
    navigate(`/deployments/new?devices=${Array.from(selectedIds).join(',')}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Devices</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hostname..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 w-60"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-2">
          <span className="text-sm">
            {selectedIds.size} device{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="mr-2 h-4 w-4" /> Clear
            </Button>
            <Button size="sm" onClick={startBulkDeployment}>
              <Rocket className="mr-2 h-4 w-4" /> Deploy selected
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {isError ? (
            <ErrorState
              title="Unable to load devices"
              message="The deployment server could not be reached."
              onRetry={() => refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Pilih semua device di halaman ini"
                    />
                  </TableHead>
                  <TableHead
                    sortKey="hostname"
                    sortActive={sort === 'hostname'}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    Device
                  </TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead
                    sortKey="applicationVersion"
                    sortActive={sort === 'applicationVersion'}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    SIMRS Version
                  </TableHead>
                  <TableHead
                    sortKey="agentVersion"
                    sortActive={sort === 'agentVersion'}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    Agent Version
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead
                    sortKey="lastSeen"
                    sortActive={sort === 'lastSeen'}
                    sortDirection={order}
                    onSort={handleSort}
                  >
                    Last Seen
                  </TableHead>
                  <TableHead className="text-right">Action</TableHead>
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
                  data.data.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(device.id)}
                          onCheckedChange={() => toggleDevice(device.id)}
                          aria-label={`Pilih ${device.hostname}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{device.hostname}</TableCell>
                      <TableCell>{device.ipAddress}</TableCell>
                      <TableCell>{device.applicationVersion || '-'}</TableCell>
                      <TableCell>{device.agentVersion}</TableCell>
                      <TableCell>
                        <StatusBadge status={device.status} />
                      </TableCell>
                      <TableCell>{new Date(device.lastSeen).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Lihat detail ${device.hostname}`}
                          onClick={() => navigate(`/devices/${device.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      <Monitor className="mx-auto h-8 w-8 mb-2" />
                      No devices found
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
