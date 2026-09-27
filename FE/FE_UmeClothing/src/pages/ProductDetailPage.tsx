import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { errorText, parseApiError } from '../api/client';
import { productsApi } from '../api/products';
import BookingPanel from '../components/BookingPanel';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ImageGallery from '../components/ImageGallery';
import { Skeleton } from '../components/Skeleton';
import { formatCurrency } from '../utils/format';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const productQuery = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getBySlug(slug as string),
    enabled: !!slug,
  });

  if (productQuery.isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]" aria-busy="true">
        <Skeleton className="aspect-[3/4] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (productQuery.isError) {
    if (parseApiError(productQuery.error).status === 404) {
      return (
        <EmptyState
          title="Không tìm thấy sản phẩm"
          description="Sản phẩm không tồn tại hoặc đã bị ẩn."
          action={
            <Link to="/products" className="btn-primary">
              Xem sản phẩm khác
            </Link>
          }
        />
      );
    }
    return <ErrorState message={errorText(productQuery.error)} onRetry={() => void productQuery.refetch()} />;
  }

  const product = productQuery.data;
  if (!product) return null;

  return (
    <div>
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-700">
          Trang chủ
        </Link>
        {' / '}
        <Link to={`/categories/${product.categorySlug}`} className="hover:text-brand-700">
          {product.categoryName}
        </Link>
        {' / '}
        <span className="text-slate-800">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <ImageGallery images={product.images} alt={product.name} />

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            <p className="mt-2 text-2xl font-semibold text-brand-700">
              {formatCurrency(product.rentalPrice)}
              <span className="text-base font-normal text-slate-400"> / ngày</span>
            </p>
          </div>

          <dl className="card grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
            <dt className="text-slate-500">Tiền cọc</dt>
            <dd className="text-right font-medium">{formatCurrency(product.depositPrice)}</dd>
            <dt className="text-slate-500">Màu sắc</dt>
            <dd className="text-right font-medium">{product.color}</dd>
            <dt className="text-slate-500">Danh mục</dt>
            <dd className="text-right font-medium">{product.categoryName}</dd>
          </dl>

          {product.description && (
            <div>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Mô tả</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{product.description}</p>
            </div>
          )}

          <SizeAndBooking product={product} />
        </div>
      </div>
    </div>
  );
}

/** Chọn size trước, rồi mới hiện lịch/đặt thuê của đúng size đó (mỗi size có lịch riêng). */
function SizeAndBooking({ product }: { product: import('../types').Product }) {
  const bookableVariants = product.variants.filter((v) => v.status !== 'Hidden');
  const [selectedId, setSelectedId] = useState<number | null>(bookableVariants[0]?.id ?? null);
  const selected = bookableVariants.find((v) => v.id === selectedId) ?? null;

  if (product.variants.length === 0) {
    return (
      <div className="card border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Sản phẩm này hiện chưa có size nào để đặt thuê. Vui lòng quay lại sau.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Chọn size</h2>
        <div className="flex flex-wrap gap-2">
          {bookableVariants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              disabled={v.status === 'Maintenance'}
              aria-pressed={v.id === selectedId}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                v.id === selectedId
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : v.status === 'Maintenance'
                    ? 'cursor-not-allowed border-slate-200 text-slate-300 line-through'
                    : 'border-slate-300 text-slate-700 hover:border-brand-400'
              }`}
              title={v.status === 'Maintenance' ? 'Size này đang bảo trì/giặt ủi' : undefined}
            >
              {v.size}
            </button>
          ))}
        </div>
      </div>

      {selected && <BookingPanel product={product} variant={selected} />}
    </div>
  );
}
