import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { LogOut, User } from 'lucide-react';
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
  const base = '/' + (path.split('/')[1] || '');
  const title = pageTitles[base] || 'RSCB Deployment System';
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-accent">
            <User className="h-4 w-4" />
            <span>{user?.displayName || user?.username || 'User'}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
            {user?.username}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onSelect={() => logout()}>
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}