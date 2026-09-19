import { useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';

const apiBase = (import.meta.env.VITE_API_URL ?? 'https://projectc-production-3300.up.railway.app').replace(/\/$/, '');

export default function AdminLoginModal({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const response = await fetch(`${apiBase}/api/admin/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const body = await response.json() as { access_token?: string; user?: { email: string }; message?: string };
      if (!response.ok || !body.access_token || !body.user) throw new Error(body.message ?? 'Không thể đăng nhập');
      sessionStorage.setItem('licensevault_admin_token', body.access_token);
      sessionStorage.setItem('licensevault_admin_email', body.user.email);
      onAuthenticated(body.user.email);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập'); }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(8,10,20,.54)' }}>
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex justify-between px-5 pt-5"><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent)', color: 'var(--primary)' }}><ShieldCheck size={18} /></div><button type="button" onClick={onClose} style={{ color: 'var(--muted-foreground)' }}><X size={17} /></button></div>
      <div className="px-5 pb-5"><h2 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Admin sign in</h2><p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted-foreground)' }}>Kết nối dashboard với LicenseVault API để tạo Project và quản lý key thật.</p>
        <label className="mt-5 block"><span className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Email</span><input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} required className="project-input" placeholder="admin@company.com" /></label>
        <label className="mt-3 block"><span className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="project-input" placeholder="••••••••" /></label>
        {error && <p className="mt-3 text-xs" style={{ color: '#e11d48' }}>{error}</p>}
        <button disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}><KeyRound size={15} />{loading ? 'Đang đăng nhập…' : 'Sign in'}</button>
      </div>
    </form>
  </div>;
}
