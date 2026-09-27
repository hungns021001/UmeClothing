import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { errorText } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/format';

function StatCard({ label, value, tone = 'text-slate-900' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  // Số liệu được ghi đè realtime bởi AdminRealtimeSync (DASHBOARD_UPDATED); REST vẫn là nguồn khi tải trang.
  const statsQuery = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminApi.dashboard });
  const pendingQuery = useQuery({
    queryKey: ['admin', 'bookings', 'dashboard-pending'],
    queryFn: () => adminApi.bookings({ status: 'Pending', page: 1, pageSize: 5 }),
  });

  const s = statsQuery.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>

      {statsQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}
      {statsQuery.isError && <ErrorState message={errorText(statsQuery.error)} onRetry={() => void statsQuery.refetch()} />}

      {s && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Tổng sản phẩm" value={s.totalProducts} />
            <StatCard label="Tổng khách hàng" value={s.totalCustomers} />
            <StatCard label="Tổng đơn thuê" value={s.totalBookings} />
            <StatCard label="Doanh thu (đơn hoàn tất)" value={formatCurrency(s.revenue)} tone="text-brand-700" />
            <StatCard label="Chờ xác nhận" value={s.pendingBookings} tone="text-amber-600" />
            <StatCard label="Đã xác nhận" value={s.confirmedBookings} tone="text-blue-600" />
            <StatCard label="Đang thuê" value={s.rentingBookings} tone="text-indigo-600" />
            <StatCard label="Hoàn tất" value={s.completedBookings} tone="text-emerald-600" />
          </div>
          <p className="text-xs text-slate-400">
            Doanh thu = tổng tiền thuê của đơn Hoàn tất (không tính tiền cọc hoàn lại). Đã trả: {s.returnedBookings} · Đã hủy: {s.cancelledBookings}.
          </p>
        </>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Đơn chờ xác nhận</h2>
          <Link to="/admin/bookings" className="text-sm font-medium text-brand-700 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {pendingQuery.isLoading && <Skeleton className="h-32 w-full" />}
        {pendingQuery.isError && <ErrorState message={errorText(pendingQuery.error)} onRetry={() => void pendingQuery.refetch()} />}
        {pendingQuery.data && pendingQuery.data.items.length === 0 && <EmptyState title="Không có đơn nào đang chờ xác nhận" />}
        {pendingQuery.data && pendingQuery.data.items.length > 0 && (
          <div className="card divide-y divide-slate-100">
            {pendingQuery.data.items.map((b) => (
              <Link
                key={b.id}
                to={`/admin/bookings?search=${encodeURIComponent(b.bookingCode)}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-slate-50"
              >
                <div>
                  <span className="font-semibold text-brand-700">{b.bookingCode}</span>
                  <span className="ml-2 text-slate-600">{b.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{formatDateTime(b.createdAt)}</span>
                  <span className="font-medium">{formatCurrency(b.total)}</span>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
