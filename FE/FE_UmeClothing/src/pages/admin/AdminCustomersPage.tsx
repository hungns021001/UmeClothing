import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { errorText } from '../../api/client';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Pagination from '../../components/Pagination';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import type { CustomerListItem } from '../../types';
import { formatDateTime } from '../../utils/format';

export default function AdminCustomersPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ customer: CustomerListItem; nextActive: boolean } | null>(null);
  const debounced = useDebounce(search.trim());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['admin', 'customers', debounced, page],
    queryFn: () => adminApi.customers({ search: debounced || undefined, page, pageSize: 20 }),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: number; isActive: boolean }) => adminApi.setCustomerActive(vars.id, vars.isActive),
    onSuccess: (updated) => {
      toast('success', updated.isActive ? `Đã mở khóa ${updated.fullName}.` : `Đã khóa ${updated.fullName}.`);
      setTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
    },
    onError: (err) => {
      toast('error', errorText(err));
      setTarget(null);
    },
  });

  const data = query.data;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Khách hàng</h1>

      <input
        className="input mb-4 max-w-sm"
        placeholder="Tìm theo tên, email, số điện thoại..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        aria-label="Tìm khách hàng"
      />

      {query.isLoading && <Skeleton className="h-48 w-full" />}
      {query.isError && <ErrorState message={errorText(query.error)} onRetry={() => void query.refetch()} />}
      {data && data.items.length === 0 && <EmptyState title="Không tìm thấy khách hàng" />}

      {data && data.items.length > 0 && (
        <div className={`card overflow-x-auto ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Điện thoại</th>
                <th className="px-4 py-3 text-right">Số đơn</th>
                <th className="px-4 py-3">Ngày đăng ký</th>
                <th className="px-4 py-3">Trạng thái</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{c.fullName}</td>
                  <td className="px-4 py-3">{c.email}</td>
                  <td className="px-4 py-3">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{c.bookingCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {c.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        className={c.isActive ? 'btn-secondary px-3 py-1 text-red-600' : 'btn-secondary px-3 py-1 text-emerald-700'}
                        onClick={() => setTarget({ customer: c, nextActive: !c.isActive })}
                      >
                        {c.isActive ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      <ConfirmModal
        open={target !== null}
        title={target?.nextActive ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?'}
        confirmLabel={target?.nextActive ? 'Mở khóa' : 'Khóa'}
        danger={!target?.nextActive}
        loading={statusMutation.isPending}
        onConfirm={() => target && statusMutation.mutate({ id: target.customer.id, isActive: target.nextActive })}
        onCancel={() => setTarget(null)}
      >
        {target?.nextActive ? (
          <>
            Khách hàng <strong>{target.customer.fullName}</strong> sẽ đăng nhập được trở lại.
          </>
        ) : (
          <>
            Khách hàng <strong>{target?.customer.fullName}</strong> sẽ không đăng nhập được nữa. Phiên đăng nhập hiện tại của họ (nếu có) vẫn còn hiệu lực đến khi hết hạn, không bị hủy ngay lập tức.
          </>
        )}
      </ConfirmModal>
    </div>
  );
}
