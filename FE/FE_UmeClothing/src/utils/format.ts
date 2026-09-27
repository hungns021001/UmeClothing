const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export function formatCurrency(value: number): string {
  return currency.format(value);
}

/** "2026-10-01" -> "01/10/2026" (không qua Date để tránh lệch múi giờ). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Chuỗi ISO datetime (UTC, có 'Z') -> giờ địa phương. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { hour12: false });
}
