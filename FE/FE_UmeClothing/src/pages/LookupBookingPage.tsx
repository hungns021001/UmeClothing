import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingsApi } from '../api/bookings';
import { errorText } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ImagePlaceholder from '../components/ImagePlaceholder';
import Pagination from '../components/Pagination';
import { Skeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Booking } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import { resolveImageUrl } from '../utils/image';

const PHONE_RE = /^\+?[0-9\s-]{8,20}$/;

export default function LookupBookingPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [submittedPhone, setSubmittedPhone] = useState(searchParams.get('phone') ?? '');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const queryPhone = searchParams.get('phone');
    if (queryPhone) {
      setPhone(queryPhone);
      setSubmittedPhone(queryPhone);
      setPage(1);
    }
  }, [searchParams]);

  const lookupQuery = useQuery({
    queryKey: ['guest-bookings', submittedPhone, page],
    queryFn: () => bookingsApi.lookupByPhone({ phone: submittedPhone, page, pageSize: 10 }),
    enabled: !!submittedPhone,
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!cancelBooking) throw new Error('Vui lòng chọn đơn cần hủy.');
      return bookingsApi.cancelByLookup({ bookingCode: cancelBooking.bookingCode, phone: submittedPhone });
    },
    onSuccess: (booking) => {
      setCancelBooking(null);
      toast('success', `Đã hủy đơn ${booking.bookingCode}.`);
      void queryClient.invalidateQueries({ queryKey: ['guest-bookings', submittedPhone] });
    },
    onError: (err) => {
      setCancelBooking(null);
      toast('error', errorText(err));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const normalizedPhone = phone.trim();
    if (!PHONE_RE.test(normalizedPhone)) {
      setError('Vui lòng nhập số điện thoại hợp lệ (8–20 chữ số).');
      return;
    }

    setError(null);
    setPage(1);
    if (normalizedPhone === submittedPhone && page === 1) {
      void lookupQuery.refetch();
    } else {
      setSubmittedPhone(normalizedPhone);
    }
  };

  const showResults = !!submittedPhone && submittedPhone === phone.trim();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="mb-1 text-sm font-medium text-brand-700">Hỗ trợ khách hàng</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Tra cứu đơn thuê</h1>
        <p className="text-sm text-slate-500">
          Nhập số điện thoại bạn đã dùng khi đặt hàng để xem các đơn thuê của mình.
        </p>
      </div>

      <form onSubmit={submit} noValidate className="card mb-6 space-y-4 p-5">
        <div>
          <label htmlFor="lk-phone" className="label">
            Số điện thoại
          </label>
          <input
            id="lk-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="input"
            placeholder="Ví dụ: 0912 345 678"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(null);
            }}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <p className="text-xs text-slate-500">
          Các đơn có số điện thoại trùng khớp sẽ được hiển thị. Để hủy đơn tài khoản, vui lòng đăng nhập.
        </p>

        <button type="submit" className="btn-primary w-full py-2.5" disabled={lookupQuery.isFetching}>
          {lookupQuery.isFetching ? 'Đang tìm đơn...' : 'Tìm đơn hàng'}
        </button>
      </form>

      {showResults && lookupQuery.isLoading && (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {showResults && lookupQuery.isError && (
        <ErrorState message={errorText(lookupQuery.error)} onRetry={() => void lookupQuery.refetch()} />
      )}

      {showResults && lookupQuery.data && lookupQuery.data.items.length === 0 && (
        <EmptyState
          title="Chưa tìm thấy đơn hàng"
          description="Kiểm tra lại số điện thoại bạn đã dùng khi đặt đơn."
        />
      )}

      {showResults && lookupQuery.data && lookupQuery.data.items.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Đơn hàng của bạn</h2>
            <span className="text-sm text-slate-500">{lookupQuery.data.totalCount} đơn</span>
          </div>

          <div className="space-y-4">
            {lookupQuery.data.items.map((booking, index) => (
              <section
                key={booking.id}
                className="card animate-rise-in space-y-4 p-5"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Mã đơn</p>
                    <h3 className="font-semibold text-brand-700">{booking.bookingCode}</h3>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>

                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {booking.items.map((item) => {
                    const image = resolveImageUrl(item.primaryImageUrl);
                    return (
                      <li key={item.id} className="flex gap-4 p-4 text-sm">
                        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {image ? (
                            <img src={image} alt={item.productName} className="h-full w-full object-cover" />
                          ) : (
                            <ImagePlaceholder className="h-full w-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">
                            {item.productName} <span className="text-slate-400">· Size {item.size}</span>
                          </p>
                          <p className="mt-1 text-slate-500">
                            {formatCurrency(item.rentalPrice)} × {item.days} ngày
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Thời gian thuê</span>
                    <span className="text-right">{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</span>
                  </div>
                  {booking.actualReturnDate && (
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Ngày trả thực tế</span>
                      <span>{formatDate(booking.actualReturnDate)}</span>
                    </div>
                  )}
                  {booking.lateFee > 0 && (
                    <div className="flex justify-between gap-3 text-amber-700">
                      <span>Phụ thu trả muộn</span>
                      <span>{formatCurrency(booking.lateFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-base font-semibold">
                    <span>Tổng cộng</span>
                    <span className="text-brand-700">{formatCurrency(booking.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-xs text-slate-400">
                    <span>Đặt lúc</span>
                    <span>{formatDateTime(booking.createdAt)}</span>
                  </div>
                </div>

                {booking.isGuest && booking.status === 'Pending' && (
                  <button
                    type="button"
                    className="btn-secondary text-red-600"
                    onClick={() => setCancelBooking(booking)}
                  >
                    Hủy đơn
                  </button>
                )}
                {!booking.isGuest && (
                  <p className="text-sm text-slate-500">
                    <Link to={isAuthenticated ? '/bookings' : '/login'} className="font-medium text-brand-700 hover:underline">
                      {isAuthenticated ? 'Xem đơn thuê của tôi' : 'Đăng nhập'}
                    </Link>{' '}
                    để quản lý đơn tài khoản.
                  </p>
                )}
              </section>
            ))}
          </div>

          <Pagination page={lookupQuery.data.page} totalPages={lookupQuery.data.totalPages} onChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={cancelBooking !== null}
        title="Hủy đơn thuê?"
        confirmLabel="Hủy đơn"
        cancelLabel="Giữ đơn"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setCancelBooking(null)}
      >
        Bạn chắc chắn muốn hủy đơn <strong>{cancelBooking?.bookingCode}</strong>? Thao tác này không thể hoàn tác.
      </ConfirmModal>
    </div>
  );
}
