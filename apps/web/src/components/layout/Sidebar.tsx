import { NavLink, useLocation } from 'react-router-dom';
import { DeviceStatus } from '@rscb/shared';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Monitor,
  Package,
  Rocket,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  children?: Array<{ to: string; label: string }>;
};

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    to: '/devices',
    label: 'Devices',
    icon: Monitor,
    children: [
      { to: '/devices', label: 'All Devices' },
      { to: `/devices?status=${DeviceStatus.OFFLINE}`, label: 'Offline' },
    ],
  },
  { to: '/releases', label: 'Releases', icon: Package },
  { to: '/deployments', label: 'Deployments', icon: Rocket },
  { to: '/audit', label: 'Audit Logs', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function statusOf(to: string): string | null {
  const query = to.split('?')[1];
  if (!query) return null;
  return new URLSearchParams(query).get('status');
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const location = useLocation();
  const currentStatus = new URLSearchParams(location.search).get('status');

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && <span className="text-sm font-semibold tracking-tight">RSCB Deploy</span>}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          className={cn('rounded-md p-1 hover:bg-accent', collapsed ? 'mx-auto' : 'ml-auto')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <div key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
            {!collapsed && item.children && (
              <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                {item.children.map((child) => {
                  const active =
                    location.pathname.startsWith('/devices') &&
                    (currentStatus || null) === statusOf(child.to);
                  return (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={cn(
                        'block rounded-md px-2 py-1 text-xs font-medium transition-colors',
                        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {child.label}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
