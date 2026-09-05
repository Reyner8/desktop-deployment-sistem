import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '@/lib/query/devices';
import { useReleases } from '@/lib/query/releases';
import { useCreateDeployment } from '@/lib/query/deployments';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/stores/toast-store';
import { ArrowLeft, ArrowRight, Check, Rocket, Search } from 'lucide-react';

export function NewDeploymentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>('');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [deviceSearch, setDeviceSearch] = useState('');
  const createDeployment = useCreateDeployment();

  const { data: releases, isLoading: loadingReleases } = useReleases({ status: 'PUBLISHED', limit: 100 });
  const { data: devices, isLoading: loadingDevices } = useDevices({ limit: 500 });

  const visibleDevices = devices?.data?.filter(
    (d) =>
      d.hostname.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      d.ipAddress.toLowerCase().includes(deviceSearch.toLowerCase()),
  );

  const toggleDevice = (id: string) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!visibleDevices?.length) return;
    const allVisibleSelected = visibleDevices.every((d) => selectedDeviceIds.has(d.id));
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      visibleDevices.forEach((d) => {
        if (allVisibleSelected) next.delete(d.id);
        else next.add(d.id);
      });
      return next;
    });
  };

  const handleDeploy = async () => {
    if (!selectedReleaseId || selectedDeviceIds.size === 0) return;
    try {
      const result = await createDeployment.mutateAsync({
        releaseId: selectedReleaseId,
        deviceIds: Array.from(selectedDeviceIds),
      });
      toast({ title: 'Deployment created', variant: 'success' });
      navigate(`/deployments/${result.id}`);
    } catch {
      toast({ title: 'Deployment failed', variant: 'destructive' });
    }
  };

  const selectedRelease = releases?.data?.find((r) => r.id === selectedReleaseId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">New Deployment</h2>

      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={`h-0.5 w-12 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Select Release</CardTitle></CardHeader>
          <CardContent>
            {loadingReleases ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedReleaseId} onValueChange={setSelectedReleaseId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {releases?.data?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.application} - {r.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex justify-end mt-4">
              <Button onClick={() => setStep(2)} disabled={!selectedReleaseId}>
                Next: Select Devices <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Select Devices</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search hostname or IP..."
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                    className="pl-8 w-56"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {visibleDevices?.length && visibleDevices.every((d) => selectedDeviceIds.has(d.id))
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDevices ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={!!visibleDevices?.length && visibleDevices.every((d) => selectedDeviceIds.has(d.id))}
                        onCheckedChange={selectAll}
                      />
                    </TableHead>
                    <TableHead>Hostname</TableHead>
                    <TableHead>Current Version</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDevices?.length ? (
                    visibleDevices.map((device) => (
                    <TableRow key={device.id} className="cursor-pointer" onClick={() => toggleDevice(device.id)}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDeviceIds.has(device.id)}
                          onCheckedChange={() => toggleDevice(device.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{device.hostname}</TableCell>
                      <TableCell>{device.applicationVersion || '-'}</TableCell>
                      <TableCell><StatusBadge status={device.status} /></TableCell>
                    </TableRow>
                  ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No devices match the search
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep(3)} disabled={selectedDeviceIds.size === 0}>
                Next: Review <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Review Deployment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Release</span>
                <span className="font-medium">{selectedRelease?.application} - {selectedRelease?.version}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Devices Selected</span>
                <span className="font-medium">{selectedDeviceIds.size}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Online</span>
                <span className="font-medium">
                  {devices?.data?.filter((d) => selectedDeviceIds.has(d.id) && d.status === 'ONLINE').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Offline</span>
                <span className="font-medium">
                  {devices?.data?.filter((d) => selectedDeviceIds.has(d.id) && d.status === 'OFFLINE').length}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={handleDeploy} disabled={createDeployment.isPending}>
                <Rocket className="mr-2 h-4 w-4" />
                {createDeployment.isPending ? 'Deploying...' : 'Confirm Deploy'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}