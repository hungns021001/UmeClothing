import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { errorText } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Đã đăng nhập (hoặc vừa đăng nhập xong) -> chuyển hướng.
  useEffect(() => {
    if (user) navigate(from ?? (user.role === 'Customer' ? '/' : '/admin'), { replace: true });
  }, [user, from, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Email không hợp lệ.';
    if (!password) next.password = 'Vui lòng nhập mật khẩu.';
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const me = await login(email.trim(), password);
      toast('success', `Xin chào, ${me.fullName}!`);
    } catch (err) {
      setServerError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
        <p className="mt-1 text-sm text-slate-500">Chào mừng bạn quay lại UmeClothing.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="label">
                Mật khẩu
              </label>
              <Link to="/forgot-password" className="text-xs font-medium text-brand-700 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {serverError}
            </p>
          )}

          <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" state={location.state} className="font-medium text-brand-700 hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
