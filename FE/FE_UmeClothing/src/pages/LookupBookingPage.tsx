import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings';
import { errorText } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import ImagePlaceholder from '../components/ImagePlaceholder';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../contexts/ToastContext';
import type { Booking } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import { resolveImageUrl } from '../utils/image';

/** Tra cứu đơn đặt không cần tài khoản, xác thực bằng Mã đơn + SĐT. */
export default function LookupBookingPage() {
  const { toast } = useToast();
  const [bookingCode, setBookingCode] = useState('');
  const [phone, setPhone] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const lookupMutation = useMutation({
    mutationFn: () => bookingsApi.lookup({ bookingCode: bookingCode.trim(), phone: phone.trim() }),
    onSuccess: (b) => {
      setBooking(b);
      setError(null);
    },
    onError: (err) => {
      setBooking(null);
      setError(errorText(err));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancelByLookup({ bookingCode: bookingCode.trim(), phone: phone.trim() }),
    onSuccess: (b) => {
      setBooking(b);
      setCancelOpen(false);
      toast('success', `Đã hủy đơn ${b.bookingCode}.`);
    },
    onError: (err) => {
      setCancelOpen(false);
      toast('error', errorText(err));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!bookingCode.trim() || !phone.trim()) {
      setError('Vui lòng nhập đủ mã đơn và số điện thoại.');
      return;
    }
    lookupMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Tra cứu đơn thuê</h1>
      <p className="mb-6 text-sm text-slate-500">Dành cho đơn đặt không cần tài khoản. Nhập đúng Mã đơn và Số điện thoại đã dùng lúc đặt.</p>

      <form onSubmit={submit} noValidate className="card mb-6 space-y-4 p-5">
        <div>
          <label htmlFor="lk-code" className="label">
            Mã đơn
          </label>
          <input
            id="lk-code"
            className="input uppercase"
            placeholder="UME-20260101-ABCDEF"
            value={bookingCode}
            onChange={(e) => setBookingCode(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="lk-phone" className="label">
            Số điện thoại
          </label>
          <input id="lk-phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full py-2.5" disabled={lookupMutation.isPending}>
          {lookupMutation.isPending ? 'Đang tra cứu...' : 'Tra cứu'}
        </button>
      </form>

      {booking && (
        <div className="card space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Đơn {booking.bookingCode}</h2>
            <StatusBadge status={booking.status} />
          </div>

          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {booking.items.map((i) => {
              const img = resolveImageUrl(i.primaryImageUrl);
              return (
                <li key={i.id} className="flex gap-4 p-4 text-sm">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {img ? <img src={img} alt={i.productName} className="h-full w-full object-cover" /> : <ImagePlaceholder className="h-full w-full" />}
                  </div>
                  <div>
                    <p className="font-medium">
                      {i.productName} <span className="text-slate-400">· Size {i.size}</span>
                    </p>
                    <p className="text-slate-500">
                      {formatCurrency(i.rentalPrice)} × {i.days} ngày
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Ngày nhận</span>
              <span>{formatDate(booking.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ngày trả dự kiến</span>
              <span>{formatDate(booking.endDate)}</span>
            </div>
            {booking.actualReturnDate && (
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày trả thực tế</span>
                <span>{formatDate(booking.actualReturnDate)}</span>
              </div>
            )}
            {booking.lateFee > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Phụ thu trả muộn</span>
                <span>{formatCurrency(booking.lateFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span>Tổng cộng</span>
              <span className="text-brand-700">{formatCurrency(booking.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tạo lúc</span>
              <span>{formatDateTime(booking.createdAt)}</span>
            </div>
          </div>

          {booking.status === 'Pending' && (
            <button type="button" className="btn-secondary text-red-600" onClick={() => setCancelOpen(true)}>
              Hủy đơn
            </button>
          )}
        </div>
      )}

      <ConfirmModal
        open={cancelOpen}
        title="Hủy đơn thuê?"
        confirmLabel="Hủy đơn"
        cancelLabel="Giữ đơn"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setCancelOpen(false)}
      >
        Bạn chắc chắn muốn hủy đơn <strong>{booking?.bookingCode}</strong>? Thao tác này không thể hoàn tác.
      </ConfirmModal>
    </div>
  );
}
