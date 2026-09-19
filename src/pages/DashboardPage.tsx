import { type FC, useState } from 'react';
import { Key, MonitorCheck, AlertTriangle, Clock, ShieldAlert, Eye, Ban } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { LICENSE_KEYS, ACTIVATION_CHART_DATA, AUDIT_LOGS, SECURITY_ALERTS, relativeTime, type SecurityAlert } from '../data/mockData';
import StatusBadge from '../components/StatusBadge';
import type { ToastData } from '../components/Toast';

interface Props { dark: boolean; onToast: (t: Omit<ToastData, 'id'>) => void; }

const DashboardPage: FC<Props> = ({ dark, onToast }) => {
  const [alerts, setAlerts] = useState(SECURITY_ALERTS);
  const total = LICENSE_KEYS.length;
  const active = LICENSE_KEYS.filter(k => k.status === 'active').length;
  const onlineToday = LICENSE_KEYS.filter(k => {
    const diff = Date.now() - new Date(k.lastSeenAt).getTime();
    return diff < 86400000 && k.status === 'active';
  }).length;
  const expiringSoon = LICENSE_KEYS.filter(k => {
    if (!k.expiresAt || k.status !== 'active') return false;
    const diff = new Date(k.expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 7 * 86400000;
  }).length;

  const STATS = [
    { label: 'Total Keys', value: total, icon: Key, color: '#6366f1', bg: '#eef2ff' },
    { label: 'Active Keys', value: active, icon: MonitorCheck, color: '#10b981', bg: '#d1fae5' },
    { label: 'Devices Online (24h)', value: onlineToday * 3, icon: MonitorCheck, color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Expiring in 7 days', value: expiringSoon, icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7' },
  ];

  const darkStats = [
    { bg: '#1e2347', color: '#a5b4fc' },
    { bg: '#052e16', color: '#6ee7b7' },
    { bg: '#172554', color: '#93c5fd' },
    { bg: '#1c1400', color: '#fcd34d' },
  ];

  const handleAlert = (alert: SecurityAlert, action: 'investigate' | 'revoke') => {
    if (action === 'revoke') {
      setAlerts(current => current.map(item => item.id === alert.id ? { ...item, status: 'resolved' } : item));
      onToast({ type: 'success', message: `Đã đưa ${alert.keyCode.slice(0, 8)}… vào quy trình thu hồi` });
      return;
    }
    setAlerts(current => current.map(item => item.id === alert.id ? { ...item, status: 'investigating' } : item));
    onToast({ type: 'info', message: `Đang điều tra ${alert.keyCode.slice(0, 8)}…` });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          Tổng quan hệ thống License Key — {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Security watchlist */}
      <section className="rounded-xl border mb-6 overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: dark ? '#3b1016' : '#fff1f2', color: '#e11d48' }}><ShieldAlert size={15} /></span>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Security watchlist</h2>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{alerts.filter(a => a.status !== 'resolved').length} tín hiệu cần xử lý từ bộ phát hiện lạm dụng</p>
            </div>
          </div>
          <span className="key-mono text-xs px-2 py-1 rounded-md" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>server signals</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {alerts.filter(a => a.status !== 'resolved').map(alert => {
            const tone = alert.severity === 'critical' ? '#e11d48' : alert.severity === 'high' ? '#ea580c' : '#ca8a04';
            return <div key={alert.id} className="px-5 py-3.5 flex gap-3 items-start">
              <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: tone }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{alert.title}</p><span className="key-mono text-[10px] uppercase" style={{ color: tone }}>{alert.severity}</span></div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{alert.detail}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">{alert.signals.map(signal => <span key={signal} className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{signal}</span>)}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleAlert(alert, 'investigate')} title="Điều tra" className="p-1.5 rounded-md" style={{ color: 'var(--primary)' }}><Eye size={14} /></button>
                <button onClick={() => handleAlert(alert, 'revoke')} title="Thu hồi key" className="p-1.5 rounded-md" style={{ color: '#e11d48' }}><Ban size={14} /></button>
              </div>
            </div>;
          })}
          {alerts.every(a => a.status === 'resolved') && <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>Không còn cảnh báo đang mở.</p>}
        </div>
      </section>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          const colors = dark ? darkStats[i] : { bg: s.bg, color: s.color };
          return (
            <div
              key={s.label}
              className="rounded-xl p-4 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
                  <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>{s.value}</p>
                </div>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: colors.bg }}
                >
                  <Icon size={16} style={{ color: colors.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div
        className="rounded-xl border p-5 mb-6"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Activations & Verifications (30 ngày)
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={ACTIVATION_CHART_DATA} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#252840' : '#e5e7f0'} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: dark ? '#151825' : '#fff',
                border: `1px solid var(--border)`,
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--foreground)',
              }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />
            <Line type="monotone" dataKey="activations" stroke="#6366f1" strokeWidth={2} dot={false} name="Activations" />
            <Line type="monotone" dataKey="verifications" stroke="#10b981" strokeWidth={2} dot={false} name="Verifications" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div
        className="rounded-xl border"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="px-5 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Hoạt động mới nhất</h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {AUDIT_LOGS.slice(0, 6).map(log => (
            <div key={log.id} className="flex items-center gap-4 px-5 py-3">
              <ActionDot action={log.action} />
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  <span className="font-medium">{log.actor}</span>
                  {' — '}
                  <span style={{ color: 'var(--muted-foreground)' }}>{actionLabel(log.action)}</span>
                </p>
                <p className="text-xs key-mono mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>
                  {log.keyCode}{log.deviceUid ? ` · ${log.deviceUid}` : ''}
                </p>
              </div>
              <span className="text-xs shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                {relativeTime(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    'key.revoke': 'Thu hồi license key',
    'key.suspend': 'Tạm ngưng license key',
    'key.create': 'Tạo license key mới',
    'key.expired': 'Key đã hết hạn (tự động)',
    'device.activate': 'Thiết bị kích hoạt',
    'device.verify': 'Thiết bị xác thực',
    'device.kick': 'Kick thiết bị',
  };
  return map[action] ?? action;
}

function ActionDot({ action }: { action: string }) {
  const colors: Record<string, string> = {
    'key.revoke': '#ef4444',
    'key.suspend': '#f59e0b',
    'key.create': '#10b981',
    'key.expired': '#6b7280',
    'device.activate': '#6366f1',
    'device.verify': '#3b82f6',
    'device.kick': '#f59e0b',
  };
  return (
    <div
      className="w-2 h-2 rounded-full shrink-0"
      style={{ background: colors[action] ?? '#6366f1' }}
    />
  );
}

export default DashboardPage;
