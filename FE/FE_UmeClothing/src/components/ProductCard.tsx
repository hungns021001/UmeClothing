import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { formatCurrency } from '../utils/format';
import { resolveImageUrl } from '../utils/image';
import ImagePlaceholder from './ImagePlaceholder';

export default function ProductCard({ product }: { product: Product }) {
  const primary = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const imageUrl = resolveImageUrl(primary?.url);
  const unavailable = product.status !== 'Available';

  return (
    <Link
      to={`/products/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder className="h-full w-full" />
        )}
        {unavailable && (
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-xs font-medium text-white">
            Tạm ngưng cho thuê
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-wide text-slate-400">{product.categoryName}</span>
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</h3>
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-slate-500">
          {product.variants.slice(0, 4).map((v) => (
            <span key={v.id} className="rounded bg-slate-100 px-1.5 py-0.5">
              {v.size}
            </span>
          ))}
          {product.variants.length > 4 && <span className="rounded bg-slate-100 px-1.5 py-0.5">+{product.variants.length - 4}</span>}
          {product.variants.length === 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Chưa có size</span>}
          <span className="rounded bg-slate-100 px-1.5 py-0.5">{product.color}</span>
        </div>
        <p className="mt-auto pt-2 text-sm">
          <span className="font-semibold text-brand-700">{formatCurrency(product.rentalPrice)}</span>
          <span className="text-slate-400"> / ngày</span>
        </p>
      </div>
    </Link>
  );
}
