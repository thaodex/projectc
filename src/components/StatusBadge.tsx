import { type FC } from 'react';
import type { KeyStatus } from '../data/mockData';

const CONFIG: Record<KeyStatus, { label: string; bg: string; color: string }> = {
  active:    { label: 'Active',    bg: '#d1fae5', color: '#065f46' },
  suspended: { label: 'Suspended', bg: '#fef3c7', color: '#92400e' },
  revoked:   { label: 'Revoked',   bg: '#fee2e2', color: '#991b1b' },
  expired:   { label: 'Expired',   bg: '#f3f4f6', color: '#4b5563' },
};

const DARK: Record<KeyStatus, { bg: string; color: string }> = {
  active:    { bg: '#052e16', color: '#6ee7b7' },
  suspended: { bg: '#1c1400', color: '#fcd34d' },
  revoked:   { bg: '#200a0a', color: '#fca5a5' },
  expired:   { bg: '#1a1a2e', color: '#9ca3af' },
};

interface Props {
  status: KeyStatus;
  dark?: boolean;
}

const StatusBadge: FC<Props> = ({ status, dark = false }) => {
  const c = dark ? { ...CONFIG[status], ...DARK[status] } : CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block"
        style={{ background: c.color }}
      />
      {c.label}
    </span>
  );
};

export default StatusBadge;
