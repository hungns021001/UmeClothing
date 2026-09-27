interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1" aria-label="Phân trang">
      <button type="button" className="btn-secondary px-3" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹ Trước
      </button>
      {start > 1 && (
        <>
          <button type="button" className="btn-secondary px-3" onClick={() => onChange(1)}>
            1
          </button>
          {start > 2 && <span className="px-1 text-slate-400">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={p === page ? 'btn-primary px-3' : 'btn-secondary px-3'}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
          <button type="button" className="btn-secondary px-3" onClick={() => onChange(totalPages)}>
            {totalPages}
          </button>
        </>
      )}
      <button type="button" className="btn-secondary px-3" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Sau ›
      </button>
    </nav>
  );
}
