import { type FC } from 'react';
import {
  LayoutDashboard, Key, Monitor, Package, ScrollText, Settings,
  ChevronRight, Shield, Sun, Moon
} from 'lucide-react';

export type Page = 'dashboard' | 'keys' | 'devices' | 'products' | 'audit' | 'settings';

const NAV = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'keys' as Page, label: 'License Keys', icon: Key },
  { id: 'devices' as Page, label: 'Devices', icon: Monitor },
  { id: 'products' as Page, label: 'Products', icon: Package },
  { id: 'audit' as Page, label: 'Audit Log', icon: ScrollText },
  { id: 'settings' as Page, label: 'Settings', icon: Settings },
];

interface SidebarProps {
  page: Page;
  onNavigate: (p: Page) => void;
  dark: boolean;
  onToggleDark: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  adminEmail: string | null;
  onAdminAction: () => void;
}

const Sidebar: FC<SidebarProps> = ({ page, onNavigate, dark, onToggleDark, collapsed, onToggleCollapse, adminEmail, onAdminAction }) => {
  return (
    <aside
      className="flex flex-col border-r h-full transition-all duration-200 shrink-0"
      style={{
        width: collapsed ? 56 : 220,
        background: 'var(--sidebar)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-3 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--primary)' }}
        >
          <Shield size={14} color="white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight truncate" style={{ color: 'var(--foreground)' }}>
            LicenseVault
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="ml-auto p-1 rounded hover:bg-muted transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight
            size={14}
            style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}
          />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-hidden">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              title={collapsed ? label : undefined}
              className="w-full flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md transition-all text-sm font-medium group"
              style={{
                width: 'calc(100% - 8px)',
                color: active ? 'var(--primary)' : 'var(--sidebar-foreground)',
                background: active ? 'var(--accent)' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="pb-3 px-1 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
        <button onClick={onAdminAction} title={adminEmail ? 'Đăng xuất admin' : 'Đăng nhập admin'} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors" style={{ color: adminEmail ? 'var(--primary)' : 'var(--muted-foreground)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <Shield size={15} /> {!collapsed && <span className="truncate">{adminEmail ?? 'Admin sign in'}</span>}
        </button>
        <button
          onClick={onToggleDark}
          title={dark ? 'Light mode' : 'Dark mode'}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
          {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
