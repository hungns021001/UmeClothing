import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories';
import { errorText } from '../api/client';
import { productsApi } from '../api/products';
import { useRealtimeEvent } from '../contexts/RealtimeContext';
import type { ProductAvailabilityChangedEvent, ProductQuery } from '../types';
import { todayISO } from '../utils/dates';
import { SIZE_OPTIONS, SORT_OPTIONS } from '../utils/labels';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import Pagination from './Pagination';
import ProductCard from './ProductCard';
import { ProductGridSkeleton } from './Skeleton';

const PAGE_SIZE = 12;

interface FormState {
  search: string;
  category: string;
  size: string;
  color: string;
  minPrice: string;
  maxPrice: string;
  startDate: string;
  endDate: string;
}

function formFromParams(p: URLSearchParams): FormState {
  return {
    search: p.get('search') ?? '',
    category: p.get('category') ?? '',
    size: p.get('size') ?? '',
    color: p.get('color') ?? '',
    minPrice: p.get('minPrice') ?? '',
    maxPrice: p.get('maxPrice') ?? '',
    startDate: p.get('startDate') ?? '',
    endDate: p.get('endDate') ?? '',
  };
}

function toNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

interface Props {
  title: string;
  subtitle?: string;
  /** Khi dùng ở trang danh mục: cố định category, ẩn ô chọn danh mục. */
  fixedCategorySlug?: string;
}

export default function ProductListing({ title, subtitle, fixedCategorySlug }: Props) {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => formFromParams(params));
  const [formError, setFormError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Đồng bộ form khi URL đổi (back/forward, xóa bộ lọc...).
  useEffect(() => {
    setForm(formFromParams(params));
  }, [params]);

  const page = Math.max(1, Number(params.get('page')) || 1);
  const sort = params.get('sort') ?? 'newest';

  const query: ProductQuery = {
    search: params.get('search') ?? undefined,
    categorySlug: fixedCategorySlug ?? (params.get('category') || undefined),
    size: params.get('size') ?? undefined,
    color: params.get('color') ?? undefined,
    minPrice: toNumber(params.get('minPrice')),
    maxPrice: toNumber(params.get('maxPrice')),
    startDate: params.get('startDate') ?? undefined,
    endDate: params.get('endDate') ?? undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  };

  const productsQuery = useQuery({
    queryKey: ['products', query],
    queryFn: () => productsApi.list(query),
    placeholderData: keepPreviousData,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    enabled: !fixedCategorySlug,
  });

  // Đang lọc theo "còn trống trong khoảng ngày" -> làm mới khi có thay đổi lịch.
  useRealtimeEvent<ProductAvailabilityChangedEvent>('PRODUCT_AVAILABILITY_CHANGED', () => {
    if (query.startDate && query.endDate) {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const validate = (f: FormState): string | null => {
    if (!!f.startDate !== !!f.endDate) return 'Hãy chọn đủ cả ngày nhận và ngày trả, hoặc bỏ trống cả hai.';
    if (f.startDate && f.endDate && f.endDate <= f.startDate) return 'Ngày trả phải sau ngày nhận.';
    if (f.minPrice && f.maxPrice && Number(f.minPrice) > Number(f.maxPrice)) return 'Giá tối thiểu không được lớn hơn giá tối đa.';
    return null;
  };

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const error = validate(form);
    setFormError(error);
    if (error) return;

    const next = new URLSearchParams();
    const put = (k: string, v: string) => {
      if (v.trim()) next.set(k, v.trim());
    };
    put('search', form.search);
    if (!fixedCategorySlug) put('category', form.category);
    put('size', form.size);
    put('color', form.color);
    put('minPrice', form.minPrice);
    put('maxPrice', form.maxPrice);
    put('startDate', form.startDate);
    put('endDate', form.endDate);
    if (sort !== 'newest') next.set('sort', sort);
    setParams(next);
    setShowFilters(false);
  };

  const clear = () => {
    setFormError(null);
    setParams(new URLSearchParams());
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const data = productsQuery.data;
  const hasFilters = Array.from(params.keys()).some((k) => k !== 'page' && k !== 'sort');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside>
          <button type="button" className="btn-secondary mb-3 w-full lg:hidden" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </button>

          <form onSubmit={apply} className={`${showFilters ? 'block' : 'hidden'} card space-y-4 p-4 lg:block`}>
            <div>
              <label htmlFor="f-search" className="label">
                Tìm kiếm
              </label>
              <input
                id="f-search"
                className="input"
                placeholder="Tên hoặc mô tả..."
                value={form.search}
                onChange={(e) => set('search', e.target.value)}
              />
            </div>

            {!fixedCategorySlug && (
              <div>
                <label htmlFor="f-cat" className="label">
                  Danh mục
                </label>
                <select id="f-cat" className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="">Tất cả</option>
                  {categoriesQuery.data?.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="f-size" className="label">
                  Size
                </label>
                <select id="f-size" className="input" value={form.size} onChange={(e) => set('size', e.target.value)}>
                  <option value="">Tất cả</option>
                  {SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-color" className="label">
                  Màu
                </label>
                <input id="f-color" className="input" value={form.color} onChange={(e) => set('color', e.target.value)} />
              </div>
            </div>

            <div>
              <span className="label">Giá thuê / ngày (VND)</span>
              <div className="grid grid-cols-2 gap-3">
                <input
                  aria-label="Giá tối thiểu"
                  type="number"
                  min={0}
                  step={10000}
                  className="input"
                  placeholder="Từ"
                  value={form.minPrice}
                  onChange={(e) => set('minPrice', e.target.value)}
                />
                <input
                  aria-label="Giá tối đa"
                  type="number"
                  min={0}
                  step={10000}
                  className="input"
                  placeholder="Đến"
                  value={form.maxPrice}
                  onChange={(e) => set('maxPrice', e.target.value)}
                />
              </div>
            </div>

            <div>
              <span className="label">Còn trống trong khoảng</span>
              <div className="space-y-2">
                <input
                  aria-label="Ngày nhận"
                  type="date"
                  min={todayISO()}
                  className="input"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
                <input
                  aria-label="Ngày trả"
                  type="date"
                  min={form.startDate || todayISO()}
                  className="input"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                />
              </div>
            </div>

            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}

            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">
                Áp dụng
              </button>
              {hasFilters && (
                <button type="button" className="btn-secondary" onClick={clear}>
                  Xóa lọc
                </button>
              )}
            </div>
          </form>
        </aside>

        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{data ? `${data.totalCount} sản phẩm` : '\u00A0'}</p>
            <div className="flex items-center gap-2">
              <label htmlFor="f-sort" className="text-sm text-slate-500">
                Sắp xếp
              </label>
              <select
                id="f-sort"
                className="input w-auto"
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value === 'newest' ? '' : e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {productsQuery.isLoading && <ProductGridSkeleton count={8} />}

          {productsQuery.isError && (
            <ErrorState message={errorText(productsQuery.error)} onRetry={() => void productsQuery.refetch()} />
          )}

          {data && data.items.length === 0 && (
            <EmptyState
              title="Không tìm thấy sản phẩm phù hợp"
              description="Hãy thử thay đổi hoặc xóa bớt bộ lọc."
              action={
                hasFilters ? (
                  <button type="button" className="btn-secondary" onClick={clear}>
                    Xóa bộ lọc
                  </button>
                ) : undefined
              }
            />
          )}

          {data && data.items.length > 0 && (
            <div
              className={`grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 ${productsQuery.isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {data.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => updateParam('page', p > 1 ? String(p) : '')} />}
        </section>
      </div>
    </div>
  );
}
