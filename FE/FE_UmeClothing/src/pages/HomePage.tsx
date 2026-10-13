import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories';
import { errorText } from '../api/client';
import { productsApi } from '../api/products';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ProductCard from '../components/ProductCard';
import { CustomerFeedbackSection, ShopContactSection } from '../components/ShopContact';
import { ProductGridSkeleton, Skeleton } from '../components/Skeleton';

export default function HomePage() {
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const latestQuery = useQuery({
    queryKey: ['products', 'latest'],
    queryFn: () => productsApi.list({ sort: 'newest', page: 1, pageSize: 8 }),
  });

  return (
    <div className="space-y-14">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-brand-100 bg-[radial-gradient(ellipse_at_80%_10%,rgba(191,219,254,0.55),transparent_42%),linear-gradient(125deg,#fff_0%,#f8fbff_55%,#edf5ff_100%)] px-6 py-10 shadow-[0_24px_80px_rgba(30,64,175,0.09)] sm:px-12 sm:py-14 lg:px-16 lg:py-16">
        <div aria-hidden="true" className="absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full border border-brand-200/70" />
        <div aria-hidden="true" className="absolute -right-10 -top-16 -z-10 h-60 w-60 rounded-full border border-brand-200/50" />
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-rise-in">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-800 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              UME Dress · Kỳ Anh, Hà Tĩnh
            </p>
            <h1 className="mt-6 max-w-2xl font-serif text-4xl font-medium leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Khoảnh khắc đặc biệt,
              <span className="mt-1 block italic text-brand-700">diện mạo thật riêng.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Váy và áo dài cho những buổi tiệc, buổi chụp hình đáng nhớ. Chọn thiết kế bạn yêu, shop hỗ trợ tư vấn và giữ lịch thật dễ dàng.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn-primary px-5 py-3 shadow-lg shadow-brand-700/15">
                Khám phá bộ sưu tập <span aria-hidden="true">↗</span>
              </Link>
              <a href="#lien-he" className="btn-secondary border-brand-200 bg-white/80 px-5 py-3">
                Ghé thăm cửa hàng
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-brand-100 pt-5 text-sm text-slate-600">
              <span><strong className="font-semibold text-slate-900">Từ 100.000đ</strong> / lượt thuê</span>
              <span className="hidden h-4 w-px bg-brand-200 sm:block" />
              <span>08:00 – 22:00 mỗi ngày</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm animate-rise-in [animation-delay:100ms]">
            <div aria-hidden="true" className="absolute -inset-3 rotate-[-6deg] rounded-[2rem] border border-brand-200/80 bg-white/40" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white bg-white p-3 shadow-[0_24px_70px_rgba(30,64,175,0.16)]">
              <img
                src="/ume-dress-logo.png"
                alt="Logo UME Dress – EST. 2025"
                className="aspect-square w-full rounded-[1.35rem] object-contain"
              />
              <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-3">
                <div>
                  <p className="font-serif text-lg font-semibold text-slate-900">Một chiếc váy, một câu chuyện.</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Chọn đồ · Thử đồ · Tỏa sáng</p>
                </div>
                <span className="shrink-0 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-[10px] font-semibold tracking-wider text-brand-800">
                  EST. 2025
                </span>
              </div>
            </div>
          </div>
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
                className="group relative flex h-28 flex-col items-start justify-between overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-white via-white to-brand-50/80 p-4 text-left shadow-[0_4px_18px_rgba(30,64,175,0.04)] transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_14px_28px_rgba(30,64,175,0.1)]"
              >
                <span aria-hidden="true" className="absolute -right-4 -top-5 h-20 w-20 rounded-full border border-brand-100 transition-transform duration-300 group-hover:scale-125" />
                <span className="relative font-serif text-lg font-semibold text-slate-900">{c.name}</span>
                <span className="relative flex w-full items-center justify-between text-xs text-slate-500">
                  <span>{c.productCount} thiết kế</span>
                  <span className="text-brand-700 transition-transform group-hover:translate-x-1" aria-hidden="true">↗</span>
                </span>
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

      <ShopContactSection />
      <CustomerFeedbackSection />
    </div>
  );
}
