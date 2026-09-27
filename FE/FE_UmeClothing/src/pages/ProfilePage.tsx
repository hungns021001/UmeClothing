import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { errorText } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDateTime } from '../utils/format';

const ROLE_LABEL = { Customer: 'Khách hàng', Staff: 'Nhân viên', Admin: 'Quản trị viên' } as const;
const PHONE_RE = /^\+?[0-9\s-]{8,20}$/;

function ProfileForm() {
  const { user, setLocalUser } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.updateProfile({ fullName: fullName.trim(), phone: phone.trim() || undefined }),
    onSuccess: (updated) => {
      setLocalUser(updated);
      toast('success', 'Đã lưu thay đổi.');
    },
    onError: (err) => setError(errorText(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      setError('Họ tên phải có ít nhất 2 ký tự.');
      return;
    }
    if (phone.trim() && !PHONE_RE.test(phone.trim())) {
      setError('Số điện thoại không hợp lệ.');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  if (!user) return null;

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5">
      <h2 className="text-base font-semibold text-slate-900">Thông tin cá nhân</h2>

      <div>
        <label htmlFor="pf-email" className="label">
          Email
        </label>
        <input id="pf-email" className="input" value={user.email} disabled />
        <p className="mt-1 text-xs text-slate-400">Không thể tự đổi email tại đây. Liên hệ cửa hàng nếu cần đổi.</p>
      </div>

      <div>
        <label htmlFor="pf-name" className="label">
          Họ và tên
        </label>
        <input id="pf-name" className="input" maxLength={150} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      <div>
        <label htmlFor="pf-phone" className="label">
          Số điện thoại
        </label>
        <input id="pf-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <p className="text-xs text-slate-400">Vai trò: {ROLE_LABEL[user.role]} · Ngày tạo tài khoản: {formatDateTime(user.createdAt)}</p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={mutation.isPending}>
        {mutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </form>
  );
}

function PasswordForm() {
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      toast('success', 'Đã đổi mật khẩu.');
      setCurrent('');
      setNext('');
      setConfirm('');
    },
    onError: (err) => setError(errorText(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự, gồm cả chữ và số.');
      return;
    }
    if (next !== confirm) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5">
      <h2 className="text-base font-semibold text-slate-900">Đổi mật khẩu</h2>

      <div>
        <label htmlFor="pw-current" className="label">
          Mật khẩu hiện tại
        </label>
        <input id="pw-current" type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <label htmlFor="pw-new" className="label">
          Mật khẩu mới
        </label>
        <input id="pw-new" type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
        <p className="mt-1 text-xs text-slate-400">Ít nhất 8 ký tự, gồm cả chữ và số.</p>
      </div>
      <div>
        <label htmlFor="pw-confirm" className="label">
          Nhập lại mật khẩu mới
        </label>
        <input id="pw-confirm" type="password" autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={mutation.isPending}>
        {mutation.isPending ? 'Đang đổi...' : 'Đổi mật khẩu'}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const { user, isCustomer, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Hồ sơ của tôi</h1>

      <ProfileForm />
      <PasswordForm />

      <div className="flex flex-wrap gap-3">
        {isCustomer && (
          <Link to="/bookings" className="btn-secondary">
            Đơn thuê của tôi
          </Link>
        )}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
