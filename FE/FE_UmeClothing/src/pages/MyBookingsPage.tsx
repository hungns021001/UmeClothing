import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings';
import { errorText } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Pagination from '../components/Pagination';
import { Skeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../contexts/ToastContext';
import { BOOKING_STATUSES, type Booking, type BookingStatus } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import { BOOKING_STATUS_LABEL } from '../utils/labels';

export default function MyBookingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<BookingStatus | 'All'>('All');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'my', status, page],
    queryFn: () => bookingsApi.my({ status: status === 'All' ? undefined : status, page, pageSize: 10 }),
    placeholderData: keepPreviousData,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.cancel(id),
    onSuccess: (b) => {
      toast('success', `Đã hủy đơn ${b.bookingCode}.`);
      setCancelTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['booking', b.id] });
    },
    onError: (err) => {
      toast('error', errorText(err));
      setCancelTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const data = bookingsQuery.data;
  const tabs: (BookingStatus | 'All')[] = ['All', ...BOOKING_STATUSES];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Đơn thuê của tôi</h1>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo trạng thái">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={status === t}
            onClick={() => {
              setStatus(t);
              setPage(1);
            }}
            className={status === t ? 'btn-primary px-3 py-1.5' : 'btn-secondary px-3 py-1.5'}
          >
            {t === 'All' ? 'Tất cả' : BOOKING_STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      {bookingsQuery.isLoading && (
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {bookingsQuery.isError && (
        <ErrorState message={errorText(bookingsQuery.error)} onRetry={() => void bookingsQuery.refetch()} />
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          title={status === 'All' ? 'Bạn chưa có đơn thuê nào' : 'Không có đơn nào ở trạng thái này'}
          action={
            <Link to="/products" className="btn-primary">
              Khám phá sản phẩm
            </Link>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <div className={`space-y-4 ${bookingsQuery.isPlaceholderData ? 'opacity-60' : ''}`}>
          {data.items.map((b) => (
            <article key={b.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link to={`/bookings/${b.id}`} className="font-semibold text-brand-700 hover:underline">
                    {b.bookingCode}
                  </Link>
                  <p className="text-xs text-slate-400">Tạo lúc {formatDateTime(b.createdAt)}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {b.items.map((i) => (
                  <li key={i.id}>
                    <Link to={`/products/${i.productSlug}`} className="hover:text-brand-700">
                      {i.productName}
                    </Link>
                    <span className="text-slate-400"> · Size {i.size}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
                <span className="text-slate-500">
                  {formatDate(b.startDate)} → {formatDate(b.endDate)}
                </span>
                <span className="font-semibold">{formatCurrency(b.total)}</span>
              </div>

              <div className="mt-3 flex gap-2">
                <Link to={`/bookings/${b.id}`} className="btn-secondary px-3 py-1.5">
                  Chi tiết
                </Link>
                {b.status === 'Pending' && (
                  <button type="button" className="btn-secondary px-3 py-1.5 text-red-600" onClick={() => setCancelTarget(b)}>
                    Hủy đơn
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      <ConfirmModal
        open={cancelTarget !== null}
        title="Hủy đơn thuê?"
        confirmLabel="Hủy đơn"
        cancelLabel="Giữ đơn"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)}
      >
        Bạn chắc chắn muốn hủy đơn <strong>{cancelTarget?.bookingCode}</strong>? Thao tác này không thể hoàn tác.
      </ConfirmModal>
    </div>
  );
}
