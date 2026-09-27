import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { errorText } from '../../api/client';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Pagination from '../../components/Pagination';
import { Skeleton } from '../../components/Skeleton';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { BOOKING_STATUSES, type BookingStatus } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { BOOKING_STATUS_LABEL, NEXT_ACTIONS } from '../../utils/labels';

function BookingDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<{ status: BookingStatus; label: string; danger?: boolean } | null>(null);

  const detailQuery = useQuery({ queryKey: ['admin', 'booking', id], queryFn: () => adminApi.booking(id) });

  useEffect(() => {
    if (detailQuery.data) setNote(detailQuery.data.adminNote ?? '');
    // Chỉ nạp ghi chú khi mở đơn; không ghi đè khi realtime làm mới lúc đang gõ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  const statusMutation = useMutation({
    mutationFn: (status: BookingStatus) => adminApi.updateStatus(id, status, note.trim()),
    onSuccess: (b) => {
      toast('success', `Đơn ${b.bookingCode} → ${BOOKING_STATUS_LABEL[b.status]}.`);
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => {
      // 409 (đặt trùng khi xác nhận) và 400 (chuyển trạng thái không hợp lệ) đều hiện thông điệp từ backend.
      toast('error', errorText(err));
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const b = detailQuery.data;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4" onMouseDown={() => !pending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết đơn thuê"
        className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{b ? `Đơn ${b.bookingCode}` : 'Chi tiết đơn'}</h2>
          <button type="button" className="btn-secondary px-3 py-1" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {detailQuery.isLoading && <Skeleton className="h-64 w-full" />}
        {detailQuery.isError && <ErrorState message={errorText(detailQuery.error)} onRetry={() => void detailQuery.refetch()} />}

        {b && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={b.status} />
              <span className="text-xs text-slate-400">Tạo lúc {formatDateTime(b.createdAt)}</span>
            </div>

            <div className="grid gap-2 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Khách hàng</p>
                <p className="font-medium">{b.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Liên hệ</p>
                <p>{b.customerEmail}</p>
                <p>{b.customerPhone ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Thời gian thuê</p>
                <p className="font-medium">
                  {formatDate(b.startDate)} → {formatDate(b.endDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Cập nhật lần cuối</p>
                <p>{formatDateTime(b.updatedAt)}</p>
              </div>
            </div>

            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {b.items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-medium">{i.productName} <span className="text-slate-400">· Size {i.size}</span></p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(i.rentalPrice)} × {i.days} ngày · cọc {formatCurrency(i.depositPrice)}
                    </p>
                    {i.note && <p className="text-xs italic text-slate-400">Ghi chú: {i.note}</p>}
                  </div>
                  <span className="font-medium">{formatCurrency(i.rentalPrice * i.days)}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Tiền thuê</span>
                <span>{formatCurrency(b.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tiền cọc</span>
                <span>{formatCurrency(b.deposit)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Tổng cộng</span>
                <span className="text-brand-700">{formatCurrency(b.total)}</span>
              </div>
            </div>

            {b.customerNote && (
              <p>
                <span className="text-slate-500">Ghi chú của khách: </span>
                {b.customerNote}
              </p>
            )}

            <div>
              <label htmlFor="admin-note" className="label">
                Ghi chú nội bộ
              </label>
              <textarea id="admin-note" className="input min-h-[72px]" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
              <p className="mt-1 text-xs text-slate-400">Ghi chú được lưu khi bạn chuyển trạng thái đơn.</p>
            </div>

            {NEXT_ACTIONS[b.status].length > 0 ? (
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                {NEXT_ACTIONS[b.status].map((a) => (
                  <button key={a.status} type="button" className={a.danger ? 'btn-secondary text-red-600' : 'btn-primary'} onClick={() => setPending(a)}>
                    {a.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="border-t border-slate-100 pt-4 text-right text-xs text-slate-400">Đơn ở trạng thái cuối, không thể chuyển tiếp.</p>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={pending !== null}
        title={pending?.label ?? ''}
        confirmLabel="Xác nhận"
        danger={pending?.danger}
        loading={statusMutation.isPending}
        onConfirm={() => pending && statusMutation.mutate(pending.status)}
        onCancel={() => setPending(null)}
      >
        Chuyển đơn <strong>{b?.bookingCode}</strong> sang trạng thái “{pending ? BOOKING_STATUS_LABEL[pending.status] : ''}”?
        {pending?.status === 'Confirmed' && ' Hệ thống sẽ kiểm tra lại lịch trống trước khi xác nhận.'}
      </ConfirmModal>
    </div>
  );
}

export default function AdminBookingsPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const debounced = useDebounce(search.trim());

  // Khi điều hướng từ dashboard/lịch với ?search=...
  const urlSearch = params.get('search');
  useEffect(() => {
    if (urlSearch !== null) {
      setSearch(urlSearch);
      setPage(1);
    }
  }, [urlSearch]);

  const query = useQuery({
    queryKey: ['admin', 'bookings', status, debounced, page],
    queryFn: () => adminApi.bookings({ status: status || undefined, search: debounced || undefined, page, pageSize: 15 }),
    placeholderData: keepPreviousData,
  });

  const data = query.data;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Đơn thuê</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-sm"
          placeholder="Mã đơn, tên, email, điện thoại..."
          aria-label="Tìm đơn thuê"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input w-auto"
          aria-label="Lọc trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as BookingStatus | '');
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BOOKING_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading && <Skeleton className="h-64 w-full" />}
      {query.isError && <ErrorState message={errorText(query.error)} onRetry={() => void query.refetch()} />}
      {data && data.items.length === 0 && <EmptyState title="Không có đơn thuê nào" description="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." />}

      {data && data.items.length > 0 && (
        <div className={`card overflow-x-auto ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Thời gian thuê</th>
                <th className="px-4 py-3 text-right">Tổng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-700">{b.bookingCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{b.customerName}</p>
                    <p className="text-xs text-slate-400">{b.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {b.items.slice(0, 2).map((i) => `${i.productName} (${i.size})`).join(', ')}
                    {b.items.length > 2 && ` +${b.items.length - 2}`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatDate(b.startDate)} → {formatDate(b.endDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatCurrency(b.total)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="btn-secondary px-3 py-1" onClick={() => setSelectedId(b.id)}>
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      {selectedId !== null && <BookingDetailModal id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
