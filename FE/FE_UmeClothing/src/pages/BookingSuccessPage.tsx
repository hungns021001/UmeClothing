import { useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings';
import { errorText } from '../api/client';
import ErrorState from '../components/ErrorState';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { shopInfo, shopLinks } from '../config/shop';
import type { Booking } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

interface BookingSuccessState {
  booking?: Booking;
  customerName?: string;
  phone?: string;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast('success', `Đã sao chép ${label.toLocaleLowerCase()}.`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('error', 'Không thể sao chép tự động. Vui lòng nhấn giữ để sao chép.');
    }
  };

  return (
    <button type="button" className="btn-secondary min-h-10 px-3 text-xs" onClick={() => void copy()}>
      {copied ? 'Đã sao chép' : `Sao chép ${label}`}
    </button>
  );
}

export default function BookingSuccessPage() {
  const { bookingCode = '' } = useParams<{ bookingCode: string }>();
  const location = useLocation();
  const initialState = (location.state as BookingSuccessState | null) ?? null;
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [phone, setPhone] = useState(initialState?.phone ?? '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [lookedUpBooking, setLookedUpBooking] = useState<Booking | null>(null);
  const [customerName, setCustomerName] = useState(initialState?.customerName ?? '');
  const [transferPhone, setTransferPhone] = useState(initialState?.phone ?? '');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const myBookingQuery = useQuery({
    queryKey: ['booking-success', bookingCode],
    queryFn: () => bookingsApi.myByCode(bookingCode),
    enabled: isAuthenticated && !initialState?.booking,
  });

  const booking = initialState?.booking ?? lookedUpBooking ?? myBookingQuery.data ?? null;
  const effectiveCustomerName = customerName || user?.fullName || '';
  const effectiveTransferPhone = transferPhone || user?.phone || '';

  const lookupMutation = useMutation({
    mutationFn: () => bookingsApi.lookup({ bookingCode, phone: phone.trim() }),
    onSuccess: (result) => {
      setLookedUpBooking(result);
      setCustomerName('');
      setTransferPhone(phone.trim());
      setPhoneError(null);
    },
    onError: (error) => setPhoneError(errorText(error)),
  });

  const submitLookup = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\+?[0-9\s-]{8,20}$/.test(phone.trim())) {
      setPhoneError('Vui lòng nhập số điện thoại hợp lệ đã dùng khi đặt đơn.');
      return;
    }
    setPhoneError(null);
    lookupMutation.mutate();
  };

  const transferContent = [effectiveCustomerName.trim(), effectiveTransferPhone.trim()].filter(Boolean).join(' ');

  const copyTransferContent = async () => {
    try {
      await navigator.clipboard.writeText(transferContent);
      setCopied(true);
      toast('success', 'Đã sao chép nội dung chuyển khoản.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('error', 'Không thể sao chép tự động. Vui lòng nhập nội dung chuyển khoản thủ công.');
    }
  };

  if (!booking && (authLoading || (isAuthenticated && myBookingQuery.isLoading))) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card animate-pulse p-8" aria-busy="true">
          <div className="h-7 w-2/3 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-full rounded bg-slate-100" />
          <div className="mt-2 h-4 w-4/5 rounded bg-slate-100" />
          <div className="mt-6 h-12 w-full rounded-lg bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!booking && isAuthenticated && myBookingQuery.isError) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState message={errorText(myBookingQuery.error)} onRetry={() => void myBookingQuery.refetch()} />
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/bookings" className="font-medium text-brand-700 hover:underline">Về danh sách đơn hàng</Link>
        </p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-6 sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-700" aria-hidden="true">
            ✓
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Đã tiếp nhận yêu cầu</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Đơn {bookingCode}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Đơn đã được tạo. Để xem số tiền cọc và thông tin chuyển khoản, nhập lại số điện thoại bạn đã dùng khi đặt.
          </p>

          <form className="mt-6 space-y-4" onSubmit={submitLookup} noValidate>
            <div>
              <label htmlFor="booking-success-phone" className="label">Số điện thoại đặt đơn</label>
              <input
                id="booking-success-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="input"
                placeholder="Nhập số điện thoại của bạn"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setPhoneError(null);
                }}
              />
            </div>
            {phoneError && <p className="text-sm text-red-600" role="alert">{phoneError}</p>}
            <button type="submit" className="btn-primary w-full py-3" disabled={lookupMutation.isPending}>
              {lookupMutation.isPending ? 'Đang xác minh...' : 'Xem hướng dẫn chuyển cọc'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            <Link to="/lookup" className="font-medium text-brand-700 hover:underline">Tra cứu đơn hàng</Link>
            {' · '}
            <Link to="/" className="font-medium text-brand-700 hover:underline">Về trang chủ</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white" aria-hidden="true">✓</span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-800">Đặt thuê thành công</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Đơn {booking.bookingCode} đã được ghi nhận</h1>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Đơn đang chờ shop kiểm tra và xác nhận. Vui lòng chuyển khoản tiền cọc theo thông tin bên dưới, sau đó nhắn shop mã đơn để đối soát.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Thông tin đơn thuê</h2>
            <StatusBadge status={booking.status} />
          </div>
          <div className="space-y-3 text-sm">
            {booking.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <p className="font-medium text-slate-800">{item.productName}</p>
                  <p className="mt-0.5 text-slate-500">Size {item.size} · {item.days} ngày thuê</p>
                </div>
                <span className="shrink-0 text-right">{formatCurrency(item.rentalPrice * item.days)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Thời gian thuê</span>
              <span className="text-right">{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Tiền thuê</span>
              <span>{formatCurrency(booking.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-3 font-medium">
              <span className="text-slate-600">Tiền cọc cần chuyển</span>
              <span className="text-brand-700">{formatCurrency(booking.deposit)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 text-base font-bold">
              <span>Tổng đơn</span>
              <span>{formatCurrency(booking.grandTotal)}</span>
            </div>
          </div>
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Đơn chỉ được giữ chỗ sau khi shop xác nhận. Nếu chưa chuyển cọc hoặc chưa được xác nhận, vui lòng liên hệ shop để kiểm tra tình trạng đơn.
          </p>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Thanh toán tiền cọc</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Quét mã VietinBank</h2>
            <p className="mt-1 text-sm text-slate-500">Chuyển đúng số tiền cọc hiển thị trong đơn.</p>
          </div>

          <div className="mx-auto mb-5 max-w-xs overflow-hidden rounded-2xl border border-slate-100 bg-[#eaf5ff] p-3">
            <img
              src={shopInfo.bank.qrUrl}
              alt={`Mã QR nhận tiền cọc VietinBank, chủ tài khoản ${shopInfo.bank.accountName}`}
              className="h-auto w-full rounded-xl"
            />
          </div>

          <dl className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Ngân hàng</dt>
              <dd className="text-right font-medium text-slate-800">{shopInfo.bank.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Chủ tài khoản</dt>
              <dd className="text-right font-semibold text-slate-800">{shopInfo.bank.accountName}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-slate-500">Số tài khoản</dt>
              <dd className="flex flex-wrap items-center justify-end gap-2 font-semibold text-slate-800">
                {shopInfo.bank.accountNumber}
                <CopyButton value={shopInfo.bank.accountNumber} label="số tài khoản" />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Chi nhánh</dt>
              <dd className="text-right text-slate-700">{shopInfo.bank.branch}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-800">Nội dung chuyển khoản</p>
                <p className="mt-1 break-words text-base font-bold text-slate-900">
                  {transferContent || 'HỌ TÊN SỐ ĐIỆN THOẠI'}
                </p>
              </div>
              {transferContent && (
                <button type="button" className="btn-secondary min-h-10 px-3 text-xs" onClick={() => void copyTransferContent()}>
                  {copied ? 'Đã sao chép' : 'Sao chép nội dung'}
                </button>
              )}
            </div>
            {(!effectiveCustomerName || !effectiveTransferPhone) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="transfer-name" className="label">Tên người đặt</label>
                  <input
                    id="transfer-name"
                    className="input bg-white"
                    autoComplete="name"
                    placeholder="Họ và tên"
                    value={customerName || user?.fullName || ''}
                    onChange={(event) => setCustomerName(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="transfer-phone" className="label">Số điện thoại</label>
                  <input
                    id="transfer-phone"
                    type="tel"
                    className="input bg-white"
                    autoComplete="tel"
                    placeholder="Số điện thoại đặt đơn"
                    value={transferPhone || user?.phone || ''}
                    onChange={(event) => setTransferPhone(event.target.value)}
                  />
                </div>
              </div>
            )}
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Nhập tên và số điện thoại đã dùng khi đặt. Ghi đúng nội dung giúp shop đối soát khoản cọc với đơn hàng.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a href={shopLinks.messenger} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1">
              Gửi mã đơn cho shop
            </a>
            <a href={`tel:${shopInfo.phoneLink}`} className="btn-secondary">
              Gọi shop
            </a>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            Sau khi chuyển khoản, nhắn shop mã đơn <strong>{booking.bookingCode}</strong> và ảnh xác nhận giao dịch.
          </p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to={booking.isGuest ? `/lookup?phone=${encodeURIComponent(effectiveTransferPhone)}` : '/bookings'} className="btn-secondary">
          {booking.isGuest ? 'Tra cứu đơn hàng' : 'Đơn thuê của tôi'}
        </Link>
        <Link to="/products" className="btn-secondary">Tiếp tục xem trang phục</Link>
      </div>
    </div>
  );
}
