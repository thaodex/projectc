import { useState, useEffect } from 'react';
import Sidebar, { type Page } from './components/Sidebar';
import Toast, { useToast } from './components/Toast';
import DashboardPage from './pages/DashboardPage';
import KeysPage from './pages/KeysPage';
import DevicesPage from './pages/DevicesPage';
import ProductsPage from './pages/ProductsPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
import UdidEnrollmentPage from './pages/UdidEnrollmentPage';
import AdminLoginModal from './components/AdminLoginModal';

export default function App() {
  if (window.location.pathname === '/udid') return <UdidEnrollmentPage />;
  const [page, setPage] = useState<Page>('dashboard');
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(() => sessionStorage.getItem('licensevault_admin_email'));
  const [showLogin, setShowLogin] = useState(false);
  const { toasts, push, dismiss } = useToast();

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  // ⌘K shortcut placeholder
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        push({ type: 'info', message: '⌘K Command palette — coming soon' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const pages: Record<Page, React.ReactNode> = {
    dashboard: <DashboardPage dark={dark} onToast={push} />,
    keys: <KeysPage dark={dark} onToast={push} />,
    devices: <DevicesPage dark={dark} onToast={push} />,
    products: <ProductsPage dark={dark} onToast={push} />,
    audit: <AuditLogPage dark={dark} />,
    settings: <SettingsPage dark={dark} />,
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar
        page={page}
        onNavigate={setPage}
        dark={dark}
        onToggleDark={() => setDark(d => !d)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        adminEmail={adminEmail}
        onAdminAction={() => {
          if (adminEmail) { sessionStorage.removeItem('licensevault_admin_token'); sessionStorage.removeItem('licensevault_admin_email'); setAdminEmail(null); push({ type: 'info', message: 'Đã đăng xuất admin' }); }
          else setShowLogin(true);
        }}
      />

      <main className="flex-1 overflow-y-auto min-w-0">
        {pages[page]}
      </main>

      <Toast toasts={toasts} onDismiss={dismiss} />
      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} onAuthenticated={email => { setAdminEmail(email); setShowLogin(false); push({ type: 'success', message: `Đã kết nối API với ${email}` }); }} />}
    </div>
  );
}
