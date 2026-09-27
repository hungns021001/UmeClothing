import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../../api/categories';
import { errorText } from '../../api/client';
import { productsApi } from '../../api/products';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ImagePlaceholder from '../../components/ImagePlaceholder';
import Pagination from '../../components/Pagination';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import type { Product, ProductStatus } from '../../types';
import { formatCurrency } from '../../utils/format';
import { resolveImageUrl } from '../../utils/image';
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUS_STYLE } from '../../utils/labels';

export default function AdminProductsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const debounced = useDebounce(search.trim());

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  // Có token Admin/Staff nên backend trả cả sản phẩm Hidden.
  const query = useQuery({
    queryKey: ['admin', 'products', debounced, categoryId, status, page],
    queryFn: () =>
      productsApi.list({
        search: debounced || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        status: status || undefined,
        sort: 'newest',
        page,
        pageSize: 10,
      }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      toast('success', 'Đã xóa sản phẩm.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => {
      // 409 khi sản phẩm đã có lịch sử thuê: backend gợi ý chuyển sang Hidden.
      toast('error', errorText(err));
      setDeleteTarget(null);
    },
  });

  const data = query.data;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Sản phẩm</h1>
        <Link to="/admin/products/create" className="btn-primary">
          + Thêm sản phẩm
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Tìm theo tên hoặc mô tả..."
          aria-label="Tìm sản phẩm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select className="input w-auto" aria-label="Lọc danh mục" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
          <option value="">Tất cả danh mục</option>
          {categoriesQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input w-auto" aria-label="Lọc trạng thái" value={status} onChange={(e) => { setStatus(e.target.value as ProductStatus | ''); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(PRODUCT_STATUS_LABEL) as ProductStatus[]).map((s) => (
            <option key={s} value={s}>
              {PRODUCT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading && <Skeleton className="h-64 w-full" />}
      {query.isError && <ErrorState message={errorText(query.error)} onRetry={() => void query.refetch()} />}
      {data && data.items.length === 0 && (
        <EmptyState
          title="Không có sản phẩm nào"
          action={
            <Link to="/admin/products/create" className="btn-primary">
              Thêm sản phẩm đầu tiên
            </Link>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <div className={`card overflow-x-auto ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Danh mục</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Màu</th>
                <th className="px-4 py-3 text-right">Giá thuê/ngày</th>
                <th className="px-4 py-3 text-right">Cọc</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((p) => {
                const primary = p.images.find((i) => i.isPrimary) ?? p.images[0];
                const img = resolveImageUrl(primary?.url);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-slate-100">
                          {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <ImagePlaceholder className="h-full w-full" />}
                        </div>
                        <span className="font-medium text-slate-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.categoryName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.variants.length === 0 ? (
                        <span className="text-amber-600">Chưa có size</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.variants.map((v) => (
                            <span key={v.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                              {v.size}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.color}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(p.rentalPrice)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(p.depositPrice)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRODUCT_STATUS_STYLE[p.status]}`}>{PRODUCT_STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link to={`/admin/products/${p.id}/edit`} className="btn-secondary mr-2 px-3 py-1">
                        Sửa
                      </Link>
                      {isAdmin && (
                        <button type="button" className="btn-secondary px-3 py-1 text-red-600" onClick={() => setDeleteTarget(p)}>
                          Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Xóa sản phẩm?"
        confirmLabel="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      >
        Xóa <strong>{deleteTarget?.name}</strong> cùng toàn bộ ảnh? Sản phẩm đã từng được thuê sẽ không xóa được; hãy chuyển sang trạng thái “Đang ẩn” thay vì xóa.
      </ConfirmModal>
    </div>
  );
}
