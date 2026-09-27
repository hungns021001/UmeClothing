import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { errorText } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Hai bước trên cùng một trang:
 *  1. Nhập email -> gửi mã OTP 6 số qua email (backend luôn trả thành công, không lộ email nào đã đăng ký).
 *  2. Nhập mã + mật khẩu mới -> đặt lại mật khẩu, sau đó chuyển tới trang đăng nhập.
 */
export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Email không hợp lệ.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep('confirm');
      toast('info', 'Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi. Vui lòng kiểm tra hộp thư.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Vui lòng nhập mã xác nhận.');
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự, gồm cả chữ và số.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword(email.trim(), code.trim(), newPassword);
      toast('success', 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Quên mật khẩu</h1>

        {step === 'request' ? (
          <>
            <p className="mt-1 text-sm text-slate-500">Nhập email đã đăng ký, chúng tôi sẽ gửi mã xác nhận.</p>
            <form onSubmit={submitRequest} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="fp-email" className="label">
                  Email
                </label>
                <input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi mã xác nhận'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Nhập mã xác nhận đã gửi tới <strong>{email}</strong> và mật khẩu mới. Mã có hiệu lực trong 15 phút.
            </p>
            <form onSubmit={submitReset} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="fp-code" className="label">
                  Mã xác nhận
                </label>
                <input
                  id="fp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="input"
                  maxLength={10}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="fp-new" className="label">
                  Mật khẩu mới
                </label>
                <input
                  id="fp-new"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">Ít nhất 8 ký tự, gồm cả chữ và số.</p>
              </div>
              <div>
                <label htmlFor="fp-confirm" className="label">
                  Nhập lại mật khẩu mới
                </label>
                <input
                  id="fp-confirm"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
              <button type="button" className="w-full text-center text-sm text-slate-500 underline" onClick={() => setStep('request')}>
                Chưa nhận được mã? Gửi lại
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Nhớ mật khẩu rồi?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
