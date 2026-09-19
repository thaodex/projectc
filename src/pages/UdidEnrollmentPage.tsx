import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, Download, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react';

type Enrollment = {
  token: string;
  profileUrl: string;
  statusUrl: string;
  expiresAt: string;
};

const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export default function UdidEnrollmentPage() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [state, setState] = useState<'idle' | 'ready' | 'checking' | 'verified' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    pollRef.current = null;
  };

  useEffect(() => () => stopPolling(), []);

  const checkStatus = async (current: Enrollment) => {
    try {
      const response = await fetch(current.statusUrl);
      const body = await response.json() as { udid_verified?: boolean; code?: string; message?: string };
      if (!response.ok) throw new Error(body.message ?? 'Không thể kiểm tra trạng thái xác thực.');
      if (body.udid_verified) {
        stopPolling();
        setState('verified');
        setMessage('UDID của iPhone đã được xác thực. Bạn có thể quay lại ứng dụng để nhập key.');
      }
    } catch (error) {
      stopPolling();
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Phiên xác thực đã gặp lỗi.');
    }
  };

  const start = async () => {
    stopPolling();
    setState('checking');
    setMessage('Đang tạo phiên xác thực an toàn…');
    try {
      const response = await fetch(`${apiBase}/api/public/udid-enrollments/start`, { method: 'POST' });
      const body = await response.json() as { enrollment_token?: string; profile_download_url?: string; status_url?: string; expires_at?: string; message?: string };
      if (!response.ok || !body.enrollment_token || !body.profile_download_url || !body.status_url || !body.expires_at) throw new Error(body.message ?? 'Không thể tạo phiên xác thực.');
      const current = { token: body.enrollment_token, profileUrl: body.profile_download_url, statusUrl: body.status_url, expiresAt: body.expires_at };
      setEnrollment(current);
      setState('ready');
      setMessage('Mở Settings, cài profile vừa tải về; trang này sẽ tự phát hiện UDID.');
      pollRef.current = window.setInterval(() => { void checkStatus(current); }, 3_000);
      window.location.assign(current.profileUrl);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Không thể bắt đầu xác thực.');
    }
  };

  const installProfile = () => {
    if (!enrollment) return;
    void checkStatus(enrollment);
    window.location.assign(enrollment.profileUrl);
  };

  const steps = [
    ['Tải profile', 'Nhấn nút bên dưới trong Safari để tải profile xác thực.'],
    ['Cài trong Settings', 'Mở Settings → Profile Downloaded → Install.'],
    ['Quay lại đây', 'LicenseVault tự kiểm tra UDID và mở khóa bước nhập key.'],
  ];

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8" style={{ background: '#f5f6fb' }}>
      <div className="mx-auto max-w-md">
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: '#4f46e5' }}><ShieldCheck size={17} color="white" /></div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: '#111827' }}>LicenseVault</span>
          <span className="ml-auto key-mono text-[10px] uppercase" style={{ color: '#6b7280' }}>Device verification</span>
        </div>

        <section className="rounded-2xl border p-6 shadow-sm" style={{ background: '#fff', borderColor: '#e5e7eb' }}>
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: '#eef2ff', color: '#4f46e5' }}><Smartphone size={22} /></div>
          <p className="key-mono text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: '#6366f1' }}>Bước 1 / Bắt buộc</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: '#111827' }}>Xác thực iPhone của bạn</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: '#6b7280' }}>Bạn cần xác thực UDID trước khi LicenseVault cho phép nhập hoặc kích hoạt key.</p>

          <div className="mt-6 space-y-0">
            {steps.map(([title, detail], index) => <div key={title} className="flex gap-3 border-t py-3.5 first:border-t-0 first:pt-0" style={{ borderColor: '#eef0f5' }}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold" style={{ background: index === 0 ? '#4f46e5' : '#eef2ff', color: index === 0 ? '#fff' : '#4f46e5' }}>{index + 1}</span>
              <div><p className="text-sm font-medium" style={{ color: '#1f2937' }}>{title}</p><p className="mt-0.5 text-xs leading-5" style={{ color: '#6b7280' }}>{detail}</p></div>
            </div>)}
          </div>

          {state === 'verified' ? <div className="mt-5 rounded-xl p-4" style={{ background: '#ecfdf5', color: '#047857' }}>
            <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={17} /> Thiết bị đã được xác thực</div>
            <p className="mt-1 text-xs leading-5">{message}</p>
          </div> : <>
            {message && <div className="mt-5 flex gap-2 rounded-xl px-3 py-2.5 text-xs leading-5" style={{ background: state === 'error' ? '#fff1f2' : '#f8fafc', color: state === 'error' ? '#be123c' : '#64748b' }}>
              {state === 'error' ? <CircleAlert className="mt-0.5 shrink-0" size={14} /> : <LockKeyhole className="mt-0.5 shrink-0" size={14} />}<span>{message}</span>
            </div>}
            <button onClick={enrollment ? installProfile : start} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: '#4f46e5', color: '#fff' }}>
              <Download size={16} />{enrollment ? 'Tải lại profile xác thực' : 'Lấy UDID của tôi'}<ArrowRight size={15} />
            </button>
          </>}
        </section>

        <div className="mt-5 flex items-start gap-2 px-2 text-xs leading-5" style={{ color: '#6b7280' }}><LockKeyhole size={13} className="mt-0.5 shrink-0" />UDID chỉ được dùng dưới dạng mã băm an toàn để kiểm tra quyền thiết bị. Bạn có thể xóa profile sau khi hoàn tất.</div>
      </div>
    </main>
  );
}
