import { useEffect, useMemo, useState } from 'react';
import type { ProductImage } from '../types';
import { resolveImageUrl } from '../utils/image';
import ImagePlaceholder from './ImagePlaceholder';

export default function ImageGallery({ images, alt }: { images: ProductImage[]; alt: string }) {
  // Ảnh chính đứng đầu, còn lại theo thứ tự sắp xếp.
  const ordered = useMemo(
    () => [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder),
    [images],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= ordered.length) setIndex(0);
  }, [ordered.length, index]);

  const current = resolveImageUrl(ordered[index]?.url);

  return (
    <div>
      <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-100">
        {current ? (
          <img src={current} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <ImagePlaceholder className="h-full w-full" />
        )}
      </div>
      {ordered.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {ordered.map((img, i) => {
            const url = resolveImageUrl(img.url);
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={i === index}
                className={`aspect-square overflow-hidden rounded-lg border-2 ${
                  i === index ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
