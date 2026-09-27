import type { BookingStatus } from '../types';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_STYLE } from '../utils/labels';

export default function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BOOKING_STATUS_STYLE[status]}`}>
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}
