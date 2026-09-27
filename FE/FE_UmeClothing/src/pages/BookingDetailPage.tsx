import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings';
import { errorText, parseApiError } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ImagePlaceholder from '../components/ImagePlaceholder';
import { Skeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { BookingStatus } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import { resolveImageUrl } from '../utils/image';
import { BOOKING_STATUS_LABEL } from '../utils/labels';

const FLOW: BookingStatus[] = ['Pending', 'Confirmed', 'Renting', 'Returned', 'Completed'];

function Timeline({ status }: { status: BookingStatus }) {
  if (status === 'Cancelled') {
    return <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">Đơn này đã bị hủy.</p>;
  }
  const current = FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1 text-center text-xs">
      {FLOW.map((s, i) => (
        <li key={s} className="flex flex-col items-center gap-1">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              i <= current ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}
            aria-current={i === current ? 'step' : undefined}
          >
            {i < current ? '✓' : i + 1}
          </span>
          <span className={i <= current ? 'font-medium text-slate-800' : 'text-slate-400'}>{BOOKING_STATUS_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookingId = Number(id);
  const validId = Number.isInteger(bookingId) && bookingId > 0;

  const { isCustomer } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);

  const bookingQuery = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.get(bookingId),
    enabled: validId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(bookingId),
    onSuccess: (b) => {
      toast('success', `Đã hủy đơn ${b.bookingCode}.`);
      setCancelOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    },
    onError: (err) => {
      toast('error', errorText(err));
      setCancelOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    },
  });

  if (!validId) {
    return <EmptyState title="Đường dẫn không hợp lệ" action={<Link to="/bookings" className="btn-primary">Về danh sách đơn</Link>} />;
  }

  if (bookingQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (bookingQuery.isError) {
    if (parseApiError(bookingQuery.error).status === 404) {
      return (
        <EmptyState
          title="Không tìm thấy đơn thuê"
          description="Đơn không tồn tại hoặc không thuộc tài khoản của bạn."
          action={
            <Link to="/bookings" className="btn-primary">
              Về danh sách đơn
            </Link>
          }
        />
      );
    }
    return <ErrorState message={errorText(bookingQuery.error)} onRetry={() => void bookingQuery.refetch()} />;
  }

  const booking = bookingQuery.data;
  if (!booking) return null;

  const days = booking.items[0]?.days ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 text-sm text-slate-500">
        {isCustomer && (
          <>
            <Link to="/bookings" className="hover:text-brand-700">
              Đơn thuê của tôi
            </Link>
            {' / '}
          </>
        )}
        <span>{booking.bookingCode}</span>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Đơn {booking.bookingCode}</h1>
        <StatusBadge status={booking.status} />
      </div>

      <div className="card mb-6 p-5">
        <Timeline status={booking.status} />
      </div>

      <div className="card mb-6 divide-y divide-slate-100">
        {booking.items.map((i) => {
          const img = resolveImageUrl(i.primaryImageUrl);
          return (
            <div key={i.id} className="flex gap-4 p-4">
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {img ? <img src={img} alt={i.productName} className="h-full w-full object-cover" /> : <ImagePlaceholder className="h-full w-full" />}
              </div>
              <div className="flex-1 text-sm">
                <Link to={`/products/${i.productSlug}`} className="font-semibold text-slate-900 hover:text-brand-700">
                  {i.productName}
                </Link>
                <span className="ml-1 text-slate-400">· Size {i.size}</span>
                <p className="mt-1 text-slate-500">
                  {formatCurrency(i.rentalPrice)} / ngày × {i.days} ngày
                </p>
                <p className="text-slate-500">Tiền cọc: {formatCurrency(i.depositPrice)}</p>
                {i.note && <p className="mt-1 text-xs italic text-slate-400">Ghi chú: {i.note}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mb-6 space-y-3 p-5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Ngày nhận</span>
          <span className="font-medium">{formatDate(booking.startDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Ngày trả</span>
          <span className="font-medium">{formatDate(booking.endDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Số ngày thuê</span>
          <span className="font-medium">{days}</span>
        </div>
        <hr className="border-slate-100" />
        <div className="flex justify-between">
          <span className="text-slate-500">Tiền thuê</span>
          <span>{formatCurrency(booking.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Tiền cọc</span>
          <span>{formatCurrency(booking.deposit)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>Tổng cộng</span>
          <span className="text-brand-700">{formatCurrency(booking.total)}</span>
        </div>
      </div>

      <div className="card mb-6 space-y-2 p-5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Tạo lúc</span>
          <span>{formatDateTime(booking.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Cập nhật lúc</span>
          <span>{formatDateTime(booking.updatedAt)}</span>
        </div>
        {booking.customerNote && (
          <div>
            <span className="text-slate-500">Ghi chú của bạn: </span>
            <span>{booking.customerNote}</span>
          </div>
        )}
      </div>

      {isCustomer && booking.status === 'Pending' && (
        <button type="button" className="btn-secondary text-red-600" onClick={() => setCancelOpen(true)}>
          Hủy đơn
        </button>
      )}
      {isCustomer && booking.status === 'Confirmed' && (
        <p className="text-sm text-slate-500">Đơn đã được xác nhận. Nếu cần hủy, vui lòng liên hệ cửa hàng.</p>
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
        Bạn chắc chắn muốn hủy đơn <strong>{booking.bookingCode}</strong>? Thao tác này không thể hoàn tác.
      </ConfirmModal>
    </div>
  );
}
