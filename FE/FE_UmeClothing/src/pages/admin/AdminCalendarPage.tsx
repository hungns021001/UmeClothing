import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { errorText } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import type { BookingStatus, CalendarItem } from '../../types';
import { diffDays, toISODate } from '../../utils/dates';
import { formatDate } from '../../utils/format';
import { BOOKING_STATUS_LABEL } from '../../utils/labels';

const BAR: Record<BookingStatus, string> = {
  Pending: 'bg-amber-400 text-amber-950',
  Confirmed: 'bg-blue-500 text-white',
  Renting: 'bg-indigo-600 text-white',
  Returned: 'bg-teal-500 text-white',
  Completed: 'bg-emerald-500 text-white',
  Cancelled: 'bg-slate-300 text-slate-700',
};

const LEGEND: BookingStatus[] = ['Pending', 'Confirmed', 'Renting', 'Returned', 'Completed'];

export default function AdminCalendarPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [filter, setFilter] = useState('');

  const from = toISODate(month);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const to = toISODate(nextMonth);
  const daysInMonth = diffDays(from, to);

  const query = useQuery({ queryKey: ['admin', 'calendar', from, to], queryFn: () => adminApi.calendar(from, to) });

  // Mỗi HÀNG là một size (variant) cụ thể, không phải cả sản phẩm — size này đang cho thuê không ảnh hưởng size khác.
  const rows = useMemo(() => {
    const byVariant = new Map<number, { name: string; size: string; items: CalendarItem[] }>();
    const term = filter.trim().toLowerCase();
    for (const item of query.data ?? []) {
      if (term && !item.productName.toLowerCase().includes(term)) continue;
      const row = byVariant.get(item.variantId) ?? { name: item.productName, size: item.size, items: [] };
      row.items.push(item);
      byVariant.set(item.variantId, row);
    }
    return Array.from(byVariant.entries())
      .map(([variantId, v]) => ({ variantId, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi') || a.size.localeCompare(b.size, 'vi'));
  }, [query.data, filter]);

  const gridCols = { gridTemplateColumns: `11rem repeat(${daysInMonth}, minmax(1.75rem, 1fr))` };
  const title = month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Lịch thuê</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary px-3" aria-label="Tháng trước" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            ‹
          </button>
          <span className="min-w-[9rem] text-center text-sm font-semibold capitalize">{title}</span>
          <button type="button" className="btn-secondary px-3" aria-label="Tháng sau" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            ›
          </button>
          <button type="button" className="btn-secondary px-3" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Hôm nay
          </button>
        </div>
        <input className="input max-w-xs" placeholder="Lọc theo tên sản phẩm..." aria-label="Lọc sản phẩm" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-600">
        {LEGEND.map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded ${BAR[s].split(' ')[0]}`} />
            {BOOKING_STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {query.isLoading && <Skeleton className="h-64 w-full" />}
      {query.isError && <ErrorState message={errorText(query.error)} onRetry={() => void query.refetch()} />}
      {query.data && rows.length === 0 && <EmptyState title="Không có lịch thuê trong tháng này" />}

      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid border-b border-slate-200 bg-slate-50 text-center text-xs text-slate-500" style={gridCols}>
              <div className="px-3 py-2 text-left font-medium">Sản phẩm</div>
              {Array.from({ length: daysInMonth }).map((_, i) => (
                <div key={i} className="py-2">
                  {i + 1}
                </div>
              ))}
            </div>

            {rows.map((row) => (
              <div key={row.variantId} className="grid items-center border-b border-slate-100 last:border-b-0" style={gridCols}>
                <div className="truncate px-3 py-3 text-sm font-medium text-slate-800" title={`${row.name} · Size ${row.size}`}>
                  {row.name} <span className="text-slate-400">· {row.size}</span>
                </div>
                {/* Vùng chứa các thanh: chiếm toàn bộ các cột ngày, mỗi thanh đặt theo cột bắt đầu/kết thúc. */}
                <div className="relative grid h-9" style={{ gridColumn: `2 / ${daysInMonth + 2}`, gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
                  {row.items.map((item) => {
                    const startIdx = Math.max(0, diffDays(from, item.startDate));
                    const endIdx = Math.min(daysInMonth, diffDays(from, item.endDate)); // exclusive
                    if (endIdx <= startIdx) return null;
                    return (
                      <Link
                        key={`${item.bookingId}-${item.variantId}`}
                        to={`/admin/bookings?search=${encodeURIComponent(item.bookingCode)}`}
                        className={`m-0.5 truncate rounded px-1.5 text-xs leading-8 ${BAR[item.status]}`}
                        style={{ gridColumn: `${startIdx + 1} / ${endIdx + 1}`, gridRow: 1 }}
                        title={`${item.bookingCode} · ${item.customerName} · ${formatDate(item.startDate)} → ${formatDate(item.endDate)} · ${BOOKING_STATUS_LABEL[item.status]}`}
                      >
                        {item.customerName}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Thanh thể hiện khoảng [ngày nhận, ngày trả). Không hiển thị ngày đệm và đơn đã hủy. Bấm vào thanh để mở đơn. Lịch tự cập nhật khi có thay đổi.
      </p>
    </div>
  );
}
