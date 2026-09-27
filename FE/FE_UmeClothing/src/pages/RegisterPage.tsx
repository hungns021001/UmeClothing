import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { errorText } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{8,20}$/;

interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirm?: string;
}

export default function RegisterPage() {
  const { register, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (fullName.trim().length < 2) next.fullName = 'Họ tên phải có ít nhất 2 ký tự.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Email không hợp lệ.';
    if (phone.trim() && !PHONE_RE.test(phone.trim())) next.phone = 'Số điện thoại không hợp lệ (8–20 chữ số).';
    if (password.length < 8) next.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) next.password = 'Mật khẩu phải chứa cả chữ và số.';
    if (confirm !== password) next.confirm = 'Mật khẩu nhập lại không khớp.';
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const me = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
      toast('success', `Đăng ký thành công. Xin chào, ${me.fullName}!`);
    } catch (err) {
      setServerError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void, opts: { type?: string; autoComplete?: string; error?: string; hint?: string }) => (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type={opts.type ?? 'text'}
        autoComplete={opts.autoComplete}
        className="input"
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={!!opts.error}
      />
      {opts.hint && !opts.error && <p className="mt-1 text-xs text-slate-400">{opts.hint}</p>}
      {opts.error && <p className="mt-1 text-xs text-red-600">{opts.error}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-slate-500">Đăng ký để đặt thuê và theo dõi đơn của bạn.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {field('fullName', 'Họ và tên', fullName, setFullName, { autoComplete: 'name', error: errors.fullName })}
          {field('email', 'Email', email, setEmail, { type: 'email', autoComplete: 'email', error: errors.email })}
          {field('phone', 'Số điện thoại (không bắt buộc)', phone, setPhone, { type: 'tel', autoComplete: 'tel', error: errors.phone })}
          {field('password', 'Mật khẩu', password, setPassword, {
            type: 'password',
            autoComplete: 'new-password',
            error: errors.password,
            hint: 'Ít nhất 8 ký tự, gồm cả chữ và số.',
          })}
          {field('confirm', 'Nhập lại mật khẩu', confirm, setConfirm, { type: 'password', autoComplete: 'new-password', error: errors.confirm })}

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {serverError}
            </p>
          )}

          <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
            {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Đã có tài khoản?{' '}
          <Link to="/login" state={location.state} className="font-medium text-brand-700 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
