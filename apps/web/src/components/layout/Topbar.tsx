import { useLocation, useNavigate } from 'react-router-dom';
import { DeviceStatus } from '@rscb/shared';
import { useAuthStore } from '@/stores/auth-store';
import { useMe } from '@/lib/query/auth';
import { useHealth } from '@/lib/query/health';
import { usePendingUpdatesCount } from '@/lib/query/devices';
import { cn } from '@/lib/utils';
import { LogOut, User, Bell, Wifi, WifiOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/devices': 'Devices',
  '/releases': 'Releases',
  '/deployments': 'Deployments',
  '/audit': 'Audit Logs',
  '/settings': 'Settings',
};

export function Topbar() {
  const path = useLocation().pathname;
  const navigate = useNavigate();
  const base = '/' + (path.split('/')[1] || '');
  const title = pageTitles[base] || 'RSCB Deployment System';
  const storedUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: profile } = useMe();
  const displayName = profile?.displayName || storedUser?.displayName || profile?.username || 'User';

  const { isError: serverOffline } = useHealth();
  const { data: updateCount = 0 } = usePendingUpdatesCount();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
            serverOffline ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700',
          )}
          title={
            serverOffline
              ? 'Deployment server tidak dapat dijangkau'
              : 'Terhubung ke deployment server'
          }
        >
          {serverOffline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
          {serverOffline ? 'Server offline' : 'Connected'}
        </span>

        <button
          type="button"
          className="relative rounded-md p-2 text-muted-foreground hover:bg-accent"
          onClick={() => navigate(`/devices?status=${DeviceStatus.UPDATE_AVAILABLE}`)}
          aria-label={`${updateCount} device menunggu update`}
          title={`${updateCount} device menunggu update`}
        >
          <Bell className="h-4 w-4" />
          {updateCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {updateCount > 99 ? '99+' : updateCount}
            </span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-accent"
            >
              <User className="h-4 w-4" />
              <span>{displayName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
              {storedUser?.username}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onSelect={() => logout()}>
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
