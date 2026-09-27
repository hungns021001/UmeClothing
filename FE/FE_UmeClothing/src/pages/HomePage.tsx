import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories';
import { errorText } from '../api/client';
import { productsApi } from '../api/products';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton, Skeleton } from '../components/Skeleton';

export default function HomePage() {
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const latestQuery = useQuery({
    queryKey: ['products', 'latest'],
    queryFn: () => productsApi.list({ sort: 'newest', page: 1, pageSize: 8 }),
  });

  return (
    <div className="space-y-14">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-400 px-6 py-14 text-white sm:px-12 sm:py-20">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-100">Cho thuê trang phục</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">Mặc đẹp cho mọi dịp, không cần sở hữu.</h1>
        <p className="mt-4 max-w-xl text-brand-50">
          Váy dạ hội, vest, sơ mi, phụ kiện… Chọn ngày, kiểm tra lịch trống theo thời gian thực và đặt thuê chỉ trong vài bước.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/products" className="btn bg-white text-brand-700 hover:bg-brand-50">
            Xem tất cả sản phẩm
          </Link>
          <Link to="/register" className="btn border border-white/60 text-white hover:bg-white/10">
            Tạo tài khoản
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Danh mục</h2>
        {categoriesQuery.isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}
        {categoriesQuery.isError && (
          <ErrorState message={errorText(categoriesQuery.error)} onRetry={() => void categoriesQuery.refetch()} />
        )}
        {categoriesQuery.data && categoriesQuery.data.length === 0 && <EmptyState title="Chưa có danh mục nào" />}
        {categoriesQuery.data && categoriesQuery.data.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categoriesQuery.data.map((c) => (
              <Link
                key={c.id}
                to={`/categories/${c.slug}`}
                className="card flex h-24 flex-col items-center justify-center text-center transition hover:border-brand-300 hover:shadow-md"
              >
                <span className="font-semibold text-slate-900">{c.name}</span>
                <span className="text-xs text-slate-400">{c.productCount} sản phẩm</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold text-slate-900">Mới cập nhật</h2>
          <Link to="/products" className="text-sm font-medium text-brand-700 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {latestQuery.isLoading && <ProductGridSkeleton count={8} />}
        {latestQuery.isError && <ErrorState message={errorText(latestQuery.error)} onRetry={() => void latestQuery.refetch()} />}
        {latestQuery.data && latestQuery.data.items.length === 0 && (
          <EmptyState title="Chưa có sản phẩm nào" description="Cửa hàng sẽ sớm cập nhật sản phẩm mới." />
        )}
        {latestQuery.data && latestQuery.data.items.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {latestQuery.data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
