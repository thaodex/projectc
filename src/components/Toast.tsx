import { type FC, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
}

interface Props {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS: Record<ToastType, string> = {
  success: 'var(--status-active)',
  error: 'var(--status-revoked)',
  info: 'var(--primary)',
};

const Toast: FC<Props> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50" style={{ pointerEvents: toasts.length ? 'all' : 'none' }}>
      {toasts.map(t => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm max-w-sm"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
              animation: 'slideUp 0.2s ease-out',
            }}
          >
            <Icon size={15} style={{ color: COLORS[t.type], flexShrink: 0 }} />
            <span className="flex-1">{t.message}</span>
            {t.undoLabel && (
              <button
                onClick={() => { t.onUndo?.(); onDismiss(t.id); }}
                className="text-xs font-semibold underline"
                style={{ color: 'var(--primary)' }}
              >
                {t.undoLabel}
              </button>
            )}
            <button onClick={() => onDismiss(t.id)} style={{ color: 'var(--muted-foreground)' }}>
              <X size={13} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const push = (t: Omit<ToastData, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
  };

  const dismiss = (id: string) => setToasts(prev => prev.filter(x => x.id !== id));

  return { toasts, push, dismiss };
}

export default Toast;
