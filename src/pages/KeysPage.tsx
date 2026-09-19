import { type FC, useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, Plus, Copy, Check, ChevronRight, X, RefreshCcw,
  Monitor, Clock, MapPin, Trash2, Download, MoreHorizontal,
  CalendarClock,
} from 'lucide-react';
import { LICENSE_KEYS, PRODUCTS, AUDIT_LOGS, type LicenseKey, type KeyStatus, relativeTime, daysUntil } from '../data/mockData';
import StatusBadge from '../components/StatusBadge';
import type { ToastData } from '../components/Toast';

interface Props {
  dark: boolean;
  onToast: (t: Omit<ToastData, 'id'>) => void;
}

const STATUSES: KeyStatus[] = ['active', 'suspended', 'revoked', 'expired'];
const PLANS = ['Starter', 'Professional', 'Enterprise'];

const KeysPage: FC<Props> = ({ dark, onToast }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<KeyStatus | ''>('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [slideOver, setSlideOver] = useState<LicenseKey | null>(null);
  const [slideTab, setSlideTab] = useState<'devices' | 'history'>('devices');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keys, setKeys] = useState<LicenseKey[]>(LICENSE_KEYS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmKick, setConfirmKick] = useState<string | null>(null);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSlideOver(null); setShowCreateModal(false); }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) {
        setShowCreateModal(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(() => {
    return keys.filter(k => {
      if (filterStatus && k.status !== filterStatus) return false;
      if (filterProduct && k.productId !== filterProduct) return false;
      if (filterPlan && k.plan !== filterPlan) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (!k.keyCode.toLowerCase().includes(q) &&
          !k.ownerName.toLowerCase().includes(q) &&
          !k.ownerEmail.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [keys, filterStatus, filterProduct, filterPlan, debouncedSearch]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(k => k.id)));
  };

  const copyKey = async (keyCode: string, id: string) => {
    await navigator.clipboard.writeText(keyCode);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleRevoke = (id: string, keyCode: string) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'revoked' as KeyStatus } : k));
    onToast({
      type: 'success',
      message: `Key ${keyCode.slice(0, 8)}… đã bị thu hồi`,
      undoLabel: 'Hoàn tác',
      onUndo: () => setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'active' as KeyStatus } : k)),
    });
  };

  const handleKickDevice = (keyId: string, deviceId: string) => {
    setKeys(prev => prev.map(k => {
      if (k.id !== keyId) return k;
      return {
        ...k,
        devicesUsed: k.devicesUsed - 1,
        devices: k.devices.map(d => d.id === deviceId ? { ...d, status: 'revoked' as const } : d),
      };
    }));
    setSlideOver(prev => {
      if (!prev || prev.id !== keyId) return prev;
      return {
        ...prev,
        devicesUsed: prev.devicesUsed - 1,
        devices: prev.devices.map(d => d.id === deviceId ? { ...d, status: 'revoked' as const } : d),
      };
    });
    setConfirmKick(null);
    onToast({ type: 'success', message: 'Đã kick thiết bị thành công' });
  };

  const updateExpiry = (keyId: string, expiresAt: string | null) => {
    setKeys(prev => prev.map(k => k.id === keyId ? { ...k, expiresAt } : k));
    setSlideOver(prev => prev?.id === keyId ? { ...prev, expiresAt } : prev);
    onToast({ type: 'success', message: expiresAt ? `Đã cập nhật hạn đến ${formatExactExpiry(expiresAt)}` : 'Key đã chuyển sang lifetime' });
  };

  const addGeneratedKeys = (generated: LicenseKey[]) => {
    setKeys(prev => [...generated, ...prev]);
  };

  const daysUntilExpiry = (k: LicenseKey) => {
    if (!k.expiresAt) return null;
    return Math.floor((new Date(k.expiresAt).getTime() - Date.now()) / 86400000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center gap-3"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <h1 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>License Keys</h1>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          {filtered.length}
        </span>
        <div className="flex-1" />

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{selected.size} đã chọn</span>
            <button
              className="text-xs px-2.5 py-1.5 rounded-lg border font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
              onClick={() => {
                selected.forEach(id => {
                  const k = keys.find(x => x.id === id);
                  if (k) handleRevoke(id, k.keyCode);
                });
                setSelected(new Set());
              }}
            >
              Thu hồi đã chọn
            </button>
            <button
              className="text-xs px-2.5 py-1.5 rounded-lg border font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
              onClick={() => setSelected(new Set())}
            >
              Bỏ chọn
            </button>
          </div>
        )}

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          <Plus size={14} />
          Create Key
          <kbd className="text-xs opacity-60 ml-1">N</kbd>
        </button>
      </div>

      {/* Filters */}
      <div
        className="px-6 py-3 border-b flex items-center gap-3 flex-wrap"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border flex-1 min-w-48"
          style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
        >
          <Search size={13} style={{ color: 'var(--muted-foreground)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo key, email, tên..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--foreground)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--muted-foreground)' }}>
              <X size={12} />
            </button>
          )}
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as KeyStatus | '')}
          className="text-sm px-2.5 py-1.5 rounded-lg border outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
        >
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        <select
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
          className="text-sm px-2.5 py-1.5 rounded-lg border outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
        >
          <option value="">All Products</option>
          {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="text-sm px-2.5 py-1.5 rounded-lg border outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
        >
          <option value="">All Plans</option>
          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <button
          onClick={() => { setFilterStatus(''); setFilterProduct(''); setFilterPlan(''); setSearch(''); }}
          className="text-xs px-2.5 py-1.5 rounded-lg border"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
        >
          <RefreshCcw size={12} />
        </button>

        <button
          className="text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <EmptyState onReset={() => { setSearch(''); setFilterStatus(''); setFilterProduct(''); setFilterPlan(''); }} />
        ) : (
          <table className="w-full min-w-[900px] text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--border)` }}>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                </th>
                {['Key', 'Owner', 'Plan', 'Devices', 'Status', 'Expires', 'Last Seen', ''].map(h => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-xs font-medium"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(k => {
                const isSelected = selected.has(k.id);
                const days = daysUntilExpiry(k);
                const isExpiringSoon = days !== null && days >= 0 && days <= 7;
                const isFull = k.devicesUsed >= k.maxDevices;

                return (
                  <tr
                    key={k.id}
                    onClick={() => { setSlideOver(k); setSlideTab('devices'); }}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderBottom: `1px solid var(--border)`,
                      background: isSelected ? 'var(--accent)' : undefined,
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(k.id)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="key-mono text-xs" style={{ color: 'var(--foreground)' }}>
                          {k.keyCode}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); copyKey(k.keyCode, k.id); }}
                          className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--muted-foreground)' }}
                          title="Copy key"
                        >
                          {copiedId === k.id ? <Check size={11} color="var(--status-active)" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{k.productName}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-xs" style={{ color: 'var(--foreground)' }}>{k.ownerName}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{k.ownerEmail}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: dark ? '#1e2347' : '#f0f0ff',
                          color: 'var(--accent-foreground)',
                        }}
                      >
                        {k.plan}
                      </span>
                    </td>
                    <td className="px-3 py-3" style={{ minWidth: 120 }}>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--secondary)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(k.devicesUsed / k.maxDevices) * 100}%`,
                              background: isFull ? '#ef4444' : 'var(--primary)',
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-medium key-mono shrink-0"
                          style={{ color: isFull ? '#ef4444' : 'var(--foreground)' }}
                        >
                          {k.devicesUsed}/{k.maxDevices}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={k.status} dark={dark} />
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="text-xs"
                        style={{ color: isExpiringSoon ? '#f59e0b' : 'var(--foreground)' }}
                      >
                        {daysUntil(k.expiresAt)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {relativeTime(k.lastSeenAt)}
                      </span>
                    </td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyKey(k.keyCode, k.id)}
                          className="p-1.5 rounded-md"
                          title="Copy"
                          style={{ color: 'var(--muted-foreground)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          {copiedId === k.id ? <Check size={13} color="var(--status-active)" /> : <Copy size={13} />}
                        </button>
                        {k.status === 'active' && (
                          <button
                            onClick={() => handleRevoke(k.id, k.keyCode)}
                            className="p-1.5 rounded-md"
                            title="Revoke"
                            style={{ color: 'var(--muted-foreground)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => { setSlideOver(k); setSlideTab('devices'); }}
                          className="p-1.5 rounded-md"
                          style={{ color: 'var(--muted-foreground)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over */}
      {slideOver && (
        <SlideOver
          key={slideOver.id}
          licenseKey={slideOver}
          tab={slideTab}
          onTabChange={setSlideTab}
          onClose={() => setSlideOver(null)}
          dark={dark}
          onKick={(deviceId) => setConfirmKick(deviceId)}
          onToast={onToast}
          onUpdateExpiry={updateExpiry}
        />
      )}

      {/* Kick confirm */}
      {confirmKick && slideOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div
            className="rounded-xl border p-6 w-80 shadow-2xl"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Xác nhận kick thiết bị?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Hành động này sẽ thu hồi slot thiết bị này. Người dùng sẽ cần kích hoạt lại.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmKick(null)}
                className="px-3 py-1.5 text-sm rounded-lg border"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Hủy
              </button>
              <button
                onClick={() => handleKickDevice(slideOver.id, confirmKick)}
                className="px-3 py-1.5 text-sm rounded-lg font-medium"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                Kick Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateKeyModal onClose={() => setShowCreateModal(false)} onToast={onToast} onCreate={addGeneratedKeys} />
      )}
    </div>
  );
};

/* ─── Slide-over panel ─── */
interface SlideOverProps {
  licenseKey: LicenseKey;
  tab: 'devices' | 'history';
  onTabChange: (t: 'devices' | 'history') => void;
  onClose: () => void;
  dark: boolean;
  onKick: (deviceId: string) => void;
  onToast: (t: Omit<ToastData, 'id'>) => void;
  onUpdateExpiry: (keyId: string, expiresAt: string | null) => void;
}

const SlideOver: FC<SlideOverProps> = ({ licenseKey: k, tab, onTabChange, onClose, dark, onKick, onToast, onUpdateExpiry }) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [expiryInput, setExpiryInput] = useState(toLocalDateTime(k.expiresAt));

  const copyKey = async () => {
    await navigator.clipboard.writeText(k.keyCode);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  const keyAudit = AUDIT_LOGS.filter(a => a.keyId === k.id);

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full z-40 shadow-2xl flex flex-col"
        style={{
          width: 420,
          background: 'var(--card)',
          borderLeft: `1px solid var(--border)`,
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="key-mono text-xs" style={{ color: 'var(--foreground)' }}>{k.keyCode}</span>
                <button onClick={copyKey}>
                  {copiedKey ? <Check size={11} color="var(--status-active)" /> : <Copy size={11} style={{ color: 'var(--muted-foreground)' }} />}
                </button>
              </div>
              <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{k.ownerName}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{k.ownerEmail}</p>
            </div>
            <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }}>
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={k.status} dark={dark} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{k.productName}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              {k.plan}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Hết hạn: {daysUntil(k.expiresAt)}
            </span>
          </div>

          {k.note && (
            <p
              className="text-xs mt-2 px-3 py-2 rounded-lg"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {k.note}
            </p>
          )}

          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-1.5"><CalendarClock size={13} style={{ color: 'var(--primary)' }} /><span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>Điều chỉnh hạn chính xác</span></div>
            <div className="flex gap-2">
              <input type="datetime-local" step="1" value={expiryInput} onChange={e => setExpiryInput(e.target.value)} className="min-w-0 flex-1 text-xs px-2 py-1.5 rounded-lg border outline-none" style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} />
              <button onClick={() => onUpdateExpiry(k.id, expiryInput ? new Date(expiryInput).toISOString() : null)} className="text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>Lưu</button>
              <button onClick={() => { setExpiryInput(''); onUpdateExpiry(k.id, null); }} className="text-xs px-2 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>∞</button>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--muted-foreground)' }}>Hỗ trợ mốc thời gian chính xác đến giây; để trống để cấp vĩnh viễn.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          {(['devices', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className="px-5 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderBottomColor: tab === t ? 'var(--primary)' : 'transparent',
                color: tab === t ? 'var(--primary)' : 'var(--muted-foreground)',
              }}
            >
              {t === 'devices' ? `Thiết bị (${k.devices.length})` : 'Lịch sử'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'devices' && (
            <div>
              {k.devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Monitor size={32} style={{ color: 'var(--muted-foreground)', marginBottom: 8 }} />
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Chưa có thiết bị nào</p>
                </div>
              ) : (
                k.devices.map(d => (
                  <div
                    key={d.id}
                    className="px-5 py-4 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Monitor size={13} style={{ color: 'var(--primary)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{d.deviceName}</span>
                          {d.status === 'revoked' && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>revoked</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="key-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{d.uidDisplay}</span>
                          <button onClick={async () => { await navigator.clipboard.writeText(d.deviceUid); onToast({ type: 'success', message: 'Đã copy UID' }); }}>
                            <Copy size={10} style={{ color: 'var(--muted-foreground)' }} />
                          </button>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {d.os} {d.osVersion} · v{d.appVersion}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            <MapPin size={10} />{d.ip} · {d.country}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            <Clock size={10} />{relativeTime(d.lastSeenAt)}
                          </span>
                        </div>
                      </div>
                      {d.status === 'active' && (
                        <button
                          onClick={() => onKick(d.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border font-medium ml-3"
                          style={{ borderColor: '#ef4444', color: '#ef4444' }}
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'history' && (
            <div>
              {keyAudit.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock size={32} style={{ color: 'var(--muted-foreground)', marginBottom: 8 }} />
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Chưa có lịch sử</p>
                </div>
              ) : (
                keyAudit.map(log => (
                  <div
                    key={log.id}
                    className="px-5 py-3 border-b flex items-start gap-3"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: 'var(--primary)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--foreground)' }}>{log.action}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        {log.actor} · {log.ip || 'system'} · {relativeTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ─── Create Key Modal ─── */
interface CreateModalProps {
  onClose: () => void;
  onToast: (t: Omit<ToastData, 'id'>) => void;
  onCreate: (keys: LicenseKey[]) => void;
}

const CreateKeyModal: FC<CreateModalProps> = ({ onClose, onToast, onCreate }) => {
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState(PRODUCTS[0].id);
  const [maxDevices, setMaxDevices] = useState(1);
  const [plan, setPlan] = useState('Starter');
  const [expiry, setExpiry] = useState('1year');
  const [customExpiry, setCustomExpiry] = useState(() => toLocalDateTime(new Date(Date.now() + 365 * 86400000).toISOString()));
  const [note, setNote] = useState('');
  const [created, setCreated] = useState<string[]>([]);
  const [allCopied, setAllCopied] = useState(false);

  const generate = () => {
    const safeQuantity = Math.max(1, Math.min(quantity || 1, 1000));
    const expiresAt = getExpiryIso(expiry, customExpiry);
    if (expiry === 'custom' && !expiresAt) {
      onToast({ type: 'error', message: 'Vui lòng nhập thời điểm hết hạn hợp lệ' });
      return;
    }
    const generated = Array.from({ length: Math.min(safeQuantity, 10) }, (_, index) => {
      const seg = () => {
        const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
        return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      };
      const p = PRODUCTS.find(pr => pr.id === product);
      const prefix = p?.slug.split('-').map(s => s[0].toUpperCase()).join('').slice(0, 3) ?? 'KEY';
      const keyCode = `${prefix}-${seg()}-${seg()}-${seg()}-${seg()}`;
      return { id: `local-${Date.now()}-${index}`, keyCode, productId: product, productName: p?.name ?? 'Unknown product', ownerName: 'Chưa gán', ownerEmail: '—', maxDevices: Math.max(1, maxDevices || 1), devicesUsed: 0, status: 'active' as KeyStatus, plan, expiresAt, note, createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), devices: [] };
    });
    onCreate(generated);
    setCreated(generated.map(key => key.keyCode));
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(created.join('\n'));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 1500);
    onToast({ type: 'success', message: `Đã copy ${created.length} key` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="rounded-xl border w-full max-w-lg mx-4 shadow-2xl overflow-hidden"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>Tạo License Key</h2>
          <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }}><X size={16} /></button>
        </div>

        {created.length === 0 ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Product</span>
                <select
                  value={product}
                  onChange={e => setProduct(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                >
                  {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Số lượng (1–1000)</span>
                <input
                  type="number" min={1} max={1000} value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Max Devices</span>
                <input
                  type="number" min={1} value={maxDevices}
                  onChange={e => setMaxDevices(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Plan</span>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                >
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="block col-span-2">
                <span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Thời hạn</span>
                <div className="flex gap-2">
                  {[['1month', '1 Tháng'], ['1year', '1 Năm'], ['custom', 'Tùy chỉnh'], ['lifetime', 'Lifetime']].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setExpiry(v)}
                      className="flex-1 py-2 text-xs rounded-lg border font-medium transition-colors"
                      style={{
                        borderColor: expiry === v ? 'var(--primary)' : 'var(--border)',
                        background: expiry === v ? 'var(--accent)' : 'var(--background)',
                        color: expiry === v ? 'var(--primary)' : 'var(--foreground)',
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {expiry === 'custom' && <div className="mt-2"><input type="datetime-local" step="1" value={customExpiry} onChange={e => setCustomExpiry(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: 'var(--primary)', background: 'var(--background)', color: 'var(--foreground)' }} /><p className="text-[11px] mt-1" style={{ color: 'var(--muted-foreground)' }}>Đặt ngày, giờ và giây chính xác theo múi giờ trình duyệt.</p></div>}
                {expiry !== 'lifetime' && <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted-foreground)' }}>Hết hạn: {formatExactExpiry(getExpiryIso(expiry, customExpiry))}</p>}
              </label>
              <label className="block col-span-2">
                <span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Ghi chú</span>
                <input
                  value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú tùy chọn..."
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                />
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Hủy
              </button>
              <button
                onClick={generate}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                Tạo {quantity} Key
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm mb-3" style={{ color: 'var(--foreground)' }}>
              Đã tạo {created.length} key thành công!
            </p>
            <div
              className="rounded-lg p-3 mb-4 max-h-48 overflow-y-auto"
              style={{ background: 'var(--muted)' }}
            >
              {created.map(k => (
                <p key={k} className="key-mono text-xs py-0.5" style={{ color: 'var(--foreground)' }}>{k}</p>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyAll}
                className="flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-1.5"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                {allCopied ? <Check size={14} /> : <Copy size={14} />}
                Copy All
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: 'var(--accent)' }}
      >
        <Search size={20} style={{ color: 'var(--primary)' }} />
      </div>
      <h3 className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>Không tìm thấy kết quả</h3>
      <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
      <button
        onClick={onReset}
        className="text-sm px-4 py-2 rounded-lg"
        style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
      >
        Xóa bộ lọc
      </button>
    </div>
  );
}

function getExpiryIso(mode: string, customValue: string): string | null {
  if (mode === 'lifetime') return null;
  if (mode === 'custom') return customValue ? new Date(customValue).toISOString() : null;
  const date = new Date();
  if (mode === '1month') date.setMonth(date.getMonth() + 1);
  if (mode === '1year') date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

function toLocalDateTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 19);
}

function formatExactExpiry(iso: string | null): string {
  if (!iso) return 'Lifetime';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' });
}

export default KeysPage;
