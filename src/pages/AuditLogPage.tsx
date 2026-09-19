import { type FC } from 'react';
import { AUDIT_LOGS, relativeTime } from '../data/mockData';
import { ScrollText } from 'lucide-react';

interface Props { dark: boolean; }

const ACTION_COLORS: Record<string, string> = {
  'key.revoke': '#ef4444',
  'key.suspend': '#f59e0b',
  'key.create': '#10b981',
  'key.expired': '#6b7280',
  'device.activate': '#6366f1',
  'device.verify': '#3b82f6',
  'device.kick': '#f59e0b',
};

const AuditLogPage: FC<Props> = ({ dark }) => {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Audit Log</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          Lịch sử toàn bộ hành động trong hệ thống (append-only)
        </p>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--border)` }}>
              {['Thời gian', 'Actor', 'Hành động', 'Key', 'Device UID', 'IP'].map(h => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AUDIT_LOGS.map((log, i) => (
              <tr
                key={log.id}
                style={{ borderBottom: i < AUDIT_LOGS.length - 1 ? `1px solid var(--border)` : undefined }}
              >
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {relativeTime(log.createdAt)}
                </td>
                <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                  {log.actor}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: `${ACTION_COLORS[log.action] ?? '#6366f1'}22`,
                      color: ACTION_COLORS[log.action] ?? '#6366f1',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACTION_COLORS[log.action] ?? '#6366f1' }} />
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="key-mono text-xs" style={{ color: 'var(--foreground)' }}>
                    {log.keyCode.slice(0, 12)}…
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="key-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {log.deviceUid || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {log.ip || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {AUDIT_LOGS.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <ScrollText size={32} style={{ color: 'var(--muted-foreground)', marginBottom: 8 }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Chưa có dữ liệu audit</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;
