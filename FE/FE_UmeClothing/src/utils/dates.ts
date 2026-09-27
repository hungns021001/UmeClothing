import type { DateRange } from '../types';

/** Số ngày thuê tối đa mỗi đơn (khớp Booking:MaxRentalDays ở backend; backend vẫn là nơi quyết định). */
export const MAX_RENTAL_DAYS = 30;

const pad = (n: number) => String(n).padStart(2, '0');

/** Date -> "YYYY-MM-DD" theo giờ địa phương (không dùng toISOString để tránh lệch múi giờ). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Số ngày từ a đến b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

/** Cùng công thức overlap với backend: r.start < end && r.end > start (chuỗi ISO so sánh được theo thứ tự chữ). */
export function rangesOverlap(ranges: DateRange[], start: string, end: string): boolean {
  return ranges.some((r) => r.start < end && start < r.end);
}

export function isDayBlocked(ranges: DateRange[], day: string): boolean {
  return ranges.some((r) => r.start <= day && day < r.end);
}
