import { type FC, useState } from 'react';
import { Shield, Bell, Key, Globe } from 'lucide-react';

interface Props { dark: boolean; }

const SettingsPage: FC<Props> = ({ dark }) => {
  const [rateLimit, setRateLimit] = useState(10);
  const [heartbeat, setHeartbeat] = useState(15);
  const [offlineGrace, setOfflineGrace] = useState(7);
  const [email2fa, setEmail2fa] = useState(false);
  const [alertCountries, setAlertCountries] = useState(3);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Cấu hình hệ thống License Key Server</p>
      </div>

      <div className="space-y-4">
        <Section icon={<Key size={15} />} title="API & Rate Limits">
          <SettingRow label="Rate limit activate (req/phút/IP)" hint="Mặc định: 10">
            <input
              type="number" value={rateLimit} onChange={e => setRateLimit(Number(e.target.value))}
              className="w-24 text-sm px-3 py-1.5 rounded-lg border outline-none text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
            />
          </SettingRow>
          <SettingRow label="Heartbeat interval (phút)" hint="Mặc định: 15">
            <input
              type="number" value={heartbeat} onChange={e => setHeartbeat(Number(e.target.value))}
              className="w-24 text-sm px-3 py-1.5 rounded-lg border outline-none text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
            />
          </SettingRow>
          <SettingRow label="Offline grace period (ngày)" hint="JWT TTL cho offline mode">
            <input
              type="number" value={offlineGrace} onChange={e => setOfflineGrace(Number(e.target.value))}
              className="w-24 text-sm px-3 py-1.5 rounded-lg border outline-none text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
            />
          </SettingRow>
        </Section>

        <Section icon={<Shield size={15} />} title="Security">
          <SettingRow label="Admin 2FA (TOTP)" hint="Yêu cầu xác thực 2 bước">
            <Toggle value={email2fa} onChange={setEmail2fa} />
          </SettingRow>
          <SettingRow label="Cảnh báo nhiều quốc gia" hint="Flag key khi kết nối từ > N quốc gia/24h">
            <input
              type="number" value={alertCountries} onChange={e => setAlertCountries(Number(e.target.value))}
              className="w-24 text-sm px-3 py-1.5 rounded-lg border outline-none text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
            />
          </SettingRow>
        </Section>

        <Section icon={<Globe size={15} />} title="App Info">
          <SettingRow label="Server Version" hint="">
            <span className="key-mono text-xs px-2.5 py-1 rounded-lg" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>v1.0.0</span>
          </SettingRow>
          <SettingRow label="Database" hint="">
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>PostgreSQL 16</span>
          </SettingRow>
        </Section>

        <button
          className="w-full py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
};

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div
        className="flex items-center gap-2 px-5 py-3 border-b"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
      >
        <span style={{ color: 'var(--primary)' }}>{icon}</span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>{children}</div>
    </div>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <p className="text-sm" style={{ color: 'var(--foreground)' }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-10 h-5.5 rounded-full transition-colors"
      style={{ background: value ? 'var(--primary)' : 'var(--secondary)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform"
        style={{ transform: value ? 'translateX(18px)' : 'translateX(0)' }}
      />
    </button>
  );
}

export default SettingsPage;
