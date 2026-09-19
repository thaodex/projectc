import { type FC, useEffect, useState } from 'react';
import { Package, Plus, X, Boxes } from 'lucide-react';
import { PRODUCTS, LICENSE_KEYS, type Product } from '../data/mockData';
import type { ToastData } from '../components/Toast';

interface Props { dark: boolean; onToast: (t: Omit<ToastData, 'id'>) => void; }

const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const ProductsPage: FC<Props> = ({ dark, onToast }) => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const accessToken = sessionStorage.getItem('licensevault_admin_token');
    if (!accessToken) return;
    void fetch(`${apiBase}/api/admin/products`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async response => ({ response, body: await response.json() as { items?: { id: string; name: string; slug: string; currentVersion: string; bundleId?: string }[] } }))
      .then(({ response, body }) => {
        if (!response.ok || !body.items) return;
        setProducts(body.items.map(item => ({ id: item.id, name: item.name, slug: item.slug, version: item.currentVersion, bundleId: item.bundleId })));
      })
      .catch(() => undefined);
  }, []);

  const createProduct = async (data: Omit<Product, 'id'>) => {
    const accessToken = sessionStorage.getItem('licensevault_admin_token');
    if (accessToken) {
      try {
        const response = await fetch(`${apiBase}/api/admin/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ name: data.name, slug: data.slug, bundle_id: data.bundleId, current_version: data.version }),
        });
        const body = await response.json() as { item?: { id: string; name: string; slug: string; currentVersion: string; bundleId?: string }; message?: string };
        if (!response.ok || !body.item) throw new Error(body.message ?? 'Không thể tạo Project trên server');
        const created = { id: body.item.id, name: body.item.name, slug: body.item.slug, version: body.item.currentVersion, bundleId: body.item.bundleId };
        setProducts(current => [created, ...current]);
        onToast({ type: 'success', message: `Đã tạo Project ${created.name}` });
        return;
      } catch (error) {
        onToast({ type: 'error', message: error instanceof Error ? error.message : 'Không thể tạo Project' });
        return;
      }
    }
    const created = { ...data, id: `local-product-${Date.now()}` };
    setProducts(current => [created, ...current]);
    onToast({ type: 'success', message: `Đã tạo Project ${created.name} trong phiên hiện tại` });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="key-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--primary)' }}>Application registry</p>
          <h1 className="text-xl font-semibold mt-1" style={{ color: 'var(--foreground)' }}>Projects</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Mỗi Project là một ứng dụng độc lập, có key và giới hạn UDID riêng.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}><Plus size={15} /> New Project</button>
      </div>

      <div className="rounded-xl border mb-5 px-4 py-3 flex gap-3 items-center" style={{ background: dark ? '#171a2d' : '#f6f7ff', borderColor: dark ? '#30355b' : '#dfe3ff' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--primary)' }}><Boxes size={15} /></div>
        <p className="text-xs leading-5" style={{ color: 'var(--muted-foreground)' }}>Cùng một iPhone có thể dùng key ở nhiều Project khác nhau. Trong mỗi Project, UDID chỉ được liên kết với một key.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map(p => {
          const keys = LICENSE_KEYS.filter(k => k.productId === p.id);
          const activeKeys = keys.filter(k => k.status === 'active').length;
          return <div key={p.id} className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}><Package size={18} style={{ color: 'var(--primary)' }} /></div><div className="min-w-0"><h3 className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>{p.name}</h3><p className="text-xs mt-0.5 key-mono truncate" style={{ color: 'var(--muted-foreground)' }}>v{p.version} · {p.slug}</p></div></div>
            <p className="key-mono text-[11px] truncate mb-4" style={{ color: 'var(--muted-foreground)' }}>{p.bundleId ?? 'Bundle ID chưa cấu hình'}</p>
            <div className="flex items-center gap-4"><div className="text-center"><p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{keys.length}</p><p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Total Keys</p></div><div className="text-center"><p className="text-2xl font-bold" style={{ color: '#10b981' }}>{activeKeys}</p><p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Active</p></div></div>
          </div>;
        })}
      </div>
      {showCreate && <CreateProductModal onClose={() => setShowCreate(false)} onCreate={createProduct} />}
    </div>
  );
};

function CreateProductModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: Omit<Product, 'id'>) => Promise<void> }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim() || !slug || !bundleId.trim()) return;
    setSaving(true);
    await onCreate({ name: name.trim(), slug, bundleId: bundleId.trim(), version });
    setSaving(false);
    onClose();
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.48)' }}>
    <div className="w-full max-w-md rounded-xl border shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}><div><h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>Tạo Project mới</h2><p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Một ứng dụng iOS độc lập trong LicenseVault.</p></div><button onClick={onClose} style={{ color: 'var(--muted-foreground)' }}><X size={17} /></button></div>
      <div className="p-5 space-y-3.5">
        <Field label="Tên ứng dụng"><input autoFocus value={name} onChange={e => { setName(e.target.value); if (!slug) setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')); }} placeholder="Ví dụ: My iOS App" className="project-input" /></Field>
        <Field label="Slug Project"><input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="my-ios-app" className="project-input key-mono" /></Field>
        <Field label="iOS Bundle ID"><input value={bundleId} onChange={e => setBundleId(e.target.value)} placeholder="com.company.myapp" className="project-input key-mono" /></Field>
        <Field label="Phiên bản hiện tại"><input value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0" className="project-input key-mono" /></Field>
      </div>
      <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}><button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Hủy</button><button disabled={saving || !name.trim() || !slug || !bundleId.trim()} onClick={() => void submit()} className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>{saving ? 'Đang tạo…' : 'Tạo Project'}</button></div>
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>{label}</span>{children}</label>; }

export default ProductsPage;
