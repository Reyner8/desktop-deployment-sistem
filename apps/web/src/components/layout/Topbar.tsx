import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { LogOut, User } from 'lucide-react';
import { useState } from 'react';

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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-accent"
        >
          <User className="h-4 w-4" />
          <span>{user?.displayName || user?.username || 'User'}</span>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border bg-background shadow-md">
              <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                {user?.username}
              </div>
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}