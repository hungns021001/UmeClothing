import { useMemo, useState } from 'react';
import type { DateRange } from '../types';
import { MAX_RENTAL_DAYS, diffDays, isDayBlocked, rangesOverlap, toISODate, todayISO } from '../utils/dates';

interface Props {
  /** Các khoảng ngày đã bị chặn (End là exclusive, đã gồm ngày đệm) lấy từ backend. */
  blockedRanges: DateRange[];
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
  /** Thông báo lỗi chọn ngày (null = xóa thông báo). */
  onMessage?: (message: string | null) => void;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Chọn "Ngày nhận" rồi "Ngày trả". Ngày trả là exclusive: sản phẩm bị giữ trong [nhận, trả).
 * Ngày đã bị chặn vẫn bấm được để làm Ngày trả (miễn là khoảng chọn không chạm khoảng bị chặn),
 * giống công thức overlap ở backend. Backend vẫn là nơi quyết định cuối cùng.
 */
export default function AvailabilityCalendar({ blockedRanges, startDate, endDate, onChange, onMessage }: Props) {
  const today = todayISO();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // tuần bắt đầu từ Thứ 2
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const arr: (string | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(toISODate(new Date(y, m, d)));
    return arr;
  }, [month]);

  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const canGoPrev = month.getTime() > currentMonth.getTime();

  const notify = (msg: string | null) => onMessage?.(msg);

  const handleClick = (day: string) => {
    if (day < today) return;

    const startNew = () => {
      if (isDayBlocked(blockedRanges, day)) {
        notify('Ngày nhận này đã có lịch thuê. Vui lòng chọn ngày khác.');
        return;
      }
      notify(null);
      onChange(day, null);
    };

    // Chưa chọn gì, hoặc đã chọn đủ một khoảng -> bắt đầu chọn lại từ Ngày nhận.
    if (!startDate || endDate) {
      startNew();
      return;
    }

    // Đang chờ Ngày trả.
    if (day <= startDate) {
      startNew();
      return;
    }

    if (diffDays(startDate, day) > MAX_RENTAL_DAYS) {
      notify(`Thời gian thuê tối đa ${MAX_RENTAL_DAYS} ngày.`);
      return;
    }

    if (rangesOverlap(blockedRanges, startDate, day)) {
      notify('Khoảng thời gian này có ngày đã được đặt. Vui lòng chọn khoảng khác.');
      return;
    }

    notify(null);
    onChange(startDate, day);
  };

  const title = month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className="btn-secondary px-3 py-1"
          disabled={!canGoPrev}
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          aria-label="Tháng trước"
        >
          ‹
        </button>
        <span className="text-sm font-semibold capitalize text-slate-800">{title}</span>
        <button
          type="button"
          className="btn-secondary px-3 py-1"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          aria-label="Tháng sau"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`b${i}`} />;

          const past = day < today;
          const blocked = isDayBlocked(blockedRanges, day);
          const isStart = day === startDate;
          const isEnd = day === endDate;
          const inRange = !!startDate && !!endDate && day > startDate && day < endDate;

          let cls = 'h-9 rounded-md text-sm transition ';
          if (isStart || isEnd) cls += 'bg-brand-600 font-semibold text-white';
          else if (inRange) cls += 'bg-brand-100 text-brand-900';
          else if (past) cls += 'cursor-not-allowed text-slate-300';
          else if (blocked) cls += 'bg-slate-200 text-slate-400 line-through';
          else cls += 'text-slate-700 hover:bg-brand-50';

          const label =
            `${day}${isStart ? ' - ngày nhận' : ''}${isEnd ? ' - ngày trả' : ''}${blocked ? ' - đã có lịch' : ''}${past ? ' - đã qua' : ''}`;

          return (
            <button key={day} type="button" className={cls} onClick={() => handleClick(day)} disabled={past} aria-label={label}>
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-brand-600" /> Đã chọn
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-slate-200" /> Đã có lịch (gồm ngày đệm)
        </span>
      </div>
    </div>
  );
}
