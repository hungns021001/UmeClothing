import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { errorText } from '../../api/client';
import ErrorState from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { toISODate } from '../../utils/dates';
import { formatCurrency, formatDate } from '../../utils/format';

const GROUP_LABEL = { day: 'Theo ngày', week: 'Theo tuần', month: 'Theo tháng' } as const;

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return toISODate(d);
}

export default function AdminRevenuePage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(toISODate(new Date()));
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const query = useQuery({
    queryKey: ['admin', 'revenue', from, to, groupBy],
    queryFn: () => adminApi.revenue(from, to, groupBy),
  });

  const report = query.data;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Doanh thu</h1>
      <p className="mb-4 text-xs text-slate-500">
        Chỉ tính các đơn đã <strong>Hoàn tất</strong>, gộp theo ngày đơn chuyển sang Hoàn tất. Gồm cả phụ thu trả muộn.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="rev-from" className="label">
            Từ ngày
          </label>
          <input id="rev-from" type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="rev-to" className="label">
            Đến ngày
          </label>
          <input id="rev-to" type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label htmlFor="rev-group" className="label">
            Gộp theo
          </label>
          <select id="rev-group" className="input w-auto" value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}>
            {(Object.keys(GROUP_LABEL) as (keyof typeof GROUP_LABEL)[]).map((g) => (
              <option key={g} value={g}>
                {GROUP_LABEL[g]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {query.isLoading && <Skeleton className="h-64 w-full" />}
      {query.isError && <ErrorState message={errorText(query.error)} onRetry={() => void query.refetch()} />}

      {report && (
        <>
          <div className="mb-4 card p-5">
            <p className="text-sm text-slate-500">Tổng doanh thu trong khoảng đã chọn</p>
            <p className="mt-1 text-3xl font-bold text-brand-700">{formatCurrency(report.grandTotal)}</p>
          </div>

          {report.periods.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
              Chưa có đơn Hoàn tất nào trong khoảng ngày này.
            </p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Kỳ</th>
                    <th className="px-4 py-3 text-right">Tiền thuê</th>
                    <th className="px-4 py-3 text-right">Phụ thu trả muộn</th>
                    <th className="px-4 py-3 text-right">Tổng</th>
                    <th className="px-4 py-3 text-right">Số đơn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.periods.map((p) => (
                    <tr key={p.periodStart}>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatDate(p.periodStart)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(p.rentalRevenue)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-amber-700">
                        {p.lateFeeRevenue > 0 ? formatCurrency(p.lateFeeRevenue) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatCurrency(p.totalRevenue)}</td>
                      <td className="px-4 py-3 text-right">{p.bookingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
