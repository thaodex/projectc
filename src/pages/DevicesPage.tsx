import { type FC, useMemo, useState } from 'react';
import { Search, Monitor, MapPin, Clock, X, Smartphone, ShieldCheck, CircleAlert, Link2 } from 'lucide-react';
import { LICENSE_KEYS, relativeTime, type Device, type LicenseKey } from '../data/mockData';
import type { ToastData } from '../components/Toast';

interface Props { dark: boolean; onToast: (t: Omit<ToastData, 'id'>) => void; }

const UDID_PATTERN = /^[A-F0-9]{40}$/;

const DevicesPage: FC<Props> = ({ dark, onToast }) => {
  const [search, setSearch] = useState('');
  const [keys, setKeys] = useState<LicenseKey[]>(LICENSE_KEYS);
  const [udid, setUdid] = useState('');
  const [deviceName, setDeviceName] = useState('iPhone');
  const [keyId, setKeyId] = useState(LICENSE_KEYS.find(key => key.status === 'active')?.id ?? '');
  const [udidTouched, setUdidTouched] = useState(false);

  const allDevices: (Device & { keyCode: string; ownerName: string })[] = useMemo(() => keys.flatMap(k =>
    k.devices.map(d => ({ ...d, keyCode: k.keyCode, ownerName: k.ownerName }))
  ), [keys]);

  const normalizedUdid = udid.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  const matchedDevice = allDevices.find(device => device.deviceUid.toUpperCase() === normalizedUdid);
  const udidError = udidTouched && normalizedUdid.length > 0 && !UDID_PATTERN.test(normalizedUdid)
    ? 'UDID iPhone phải gồm đúng 40 ký tự hexadecimal.' : '';
  const matchedMessage = matchedDevice ? `UDID đã thuộc về ${matchedDevice.ownerName} · ${matchedDevice.keyCode}` : '';

  const bindIphone = () => {
    setUdidTouched(true);
    if (!UDID_PATTERN.test(normalizedUdid)) {
      onToast({ type: 'error', message: 'UDID không hợp lệ — cần đúng 40 ký tự hexadecimal.' });
      return;
    }
    if (matchedDevice) {
      onToast({ type: 'error', message: `UDID này đã được gắn với key ${matchedDevice.keyCode.slice(0, 8)}…` });
      return;
    }
    const selectedKey = keys.find(key => key.id === keyId);
    if (!selectedKey || selectedKey.status !== 'active') {
      onToast({ type: 'error', message: 'Chọn một key đang active để gắn iPhone.' });
      return;
    }
    if (selectedKey.devicesUsed >= selectedKey.maxDevices) {
      onToast({ type: 'error', message: 'Key này đã đạt giới hạn thiết bị.' });
      return;
    }
    const newDevice: Device = {
      id: `ios-${Date.now()}`, keyId: selectedKey.id, deviceUid: normalizedUdid,
      uidDisplay: `${normalizedUdid.slice(0, 4)}…${normalizedUdid.slice(-4)}`,
      deviceName: deviceName.trim() || 'iPhone', os: 'iOS', osVersion: '17.6', appVersion: '—',
      ip: 'Chờ xác thực', country: '—', status: 'active', activatedAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(),
    };
    setKeys(current => current.map(key => key.id === selectedKey.id ? { ...key, devicesUsed: key.devicesUsed + 1, devices: [...key.devices, newDevice] } : key));
    setUdid('');
    setUdidTouched(false);
    onToast({ type: 'success', message: `Đã xác thực ${newDevice.deviceName}; UDID chỉ có thể dùng với key này.` });
  };

  const filtered = allDevices.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.deviceName.toLowerCase().includes(q) ||
      d.uidDisplay.toLowerCase().includes(q) ||
      d.ip.includes(q) ||
      d.ownerName.toLowerCase().includes(q);
  });

  const online = allDevices.filter(d => Date.now() - new Date(d.lastSeenAt).getTime() < 86400000 && d.status === 'active');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Devices</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          {allDevices.length} thiết bị tổng · {online.length} online hôm nay
        </p>
      </div>

      <section className="rounded-xl border mb-5 overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--primary)' }}><Smartphone size={15} /></span>
          <div><h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Xác thực iPhone bằng UDID</h2><p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Một UDID iPhone chỉ được gắn với duy nhất một license key.</p></div>
        </div>
        <div className="p-4 grid gap-3 lg:grid-cols-[1.4fr_0.7fr_1fr_auto] items-start">
          <label className="block"><span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>UDID (40 ký tự hex)</span><input value={udid} onChange={e => setUdid(e.target.value.toUpperCase())} onBlur={() => setUdidTouched(true)} placeholder="00008110…" className="key-mono w-full text-xs px-3 py-2 rounded-lg border outline-none" style={{ borderColor: udidError ? '#e11d48' : matchedDevice ? '#ea580c' : 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} /></label>
          <label className="block"><span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Tên thiết bị</span><input value={deviceName} onChange={e => setDeviceName(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} /></label>
          <label className="block"><span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Gắn với key</span><select value={keyId} onChange={e => setKeyId(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}>{keys.filter(key => key.status === 'active').map(key => <option key={key.id} value={key.id}>{key.keyCode.slice(0, 12)}… · {key.ownerName}</option>)}</select></label>
          <button onClick={bindIphone} className="mt-5 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}><Link2 size={14} />Xác thực & gắn</button>
        </div>
        {(udidError || matchedDevice) && <div className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: matchedDevice ? (dark ? '#361a09' : '#fff7ed') : (dark ? '#3b1016' : '#fff1f2'), color: matchedDevice ? '#ea580c' : '#e11d48' }}><CircleAlert size={14} />{udidError || matchedMessage}</div>}
        {!udidError && !matchedDevice && normalizedUdid.length === 40 && <div className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: dark ? '#052e16' : '#ecfdf5', color: '#059669' }}><ShieldCheck size={14} />UDID hợp lệ và chưa được gắn với key nào.</div>}
        <p className="px-5 pb-3 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>Backend cần áp dụng unique index cho UDID (hoặc HMAC hash UDID) để đảm bảo quy tắc này trên mọi phiên và mọi API request.</p>
      </section>

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-5 max-w-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <Search size={13} style={{ color: 'var(--muted-foreground)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm thiết bị..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--foreground)' }}
        />
        {search && <button onClick={() => setSearch('')}><X size={12} style={{ color: 'var(--muted-foreground)' }} /></button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(d => (
          <div
            key={d.id}
            className="rounded-xl border p-4"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent)' }}
                >
                  <Monitor size={14} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{d.deviceName}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{d.os} {d.osVersion}</p>
                </div>
              </div>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: d.status === 'active' ? (dark ? '#052e16' : '#d1fae5') : (dark ? '#200a0a' : '#fee2e2'),
                  color: d.status === 'active' ? '#10b981' : '#ef4444',
                }}
              >
                {d.status}
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs key-mono" style={{ color: 'var(--muted-foreground)' }}>{d.uidDisplay}</p>
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <MapPin size={10} />{d.ip} · {d.country}
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <Clock size={10} />Last seen {relativeTime(d.lastSeenAt)}
              </div>
            </div>

            <div
              className="mt-3 pt-2.5 border-t text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
            >
              <span className="key-mono">{d.keyCode.slice(0, 12)}…</span>
              {' · '}{d.ownerName}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <Monitor size={32} className="mx-auto mb-3" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Không tìm thấy thiết bị nào</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevicesPage;
