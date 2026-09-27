import type { BookingStatus, ProductStatus } from '../types';

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  Pending: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  Renting: 'Đang thuê',
  Returned: 'Đã trả',
  Cancelled: 'Đã hủy',
  Completed: 'Hoàn tất',
};

export const BOOKING_STATUS_STYLE: Record<BookingStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Renting: 'bg-indigo-100 text-indigo-800',
  Returned: 'bg-teal-100 text-teal-800',
  Cancelled: 'bg-slate-200 text-slate-600',
  Completed: 'bg-emerald-100 text-emerald-800',
};

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  Available: 'Đang cho thuê',
  Hidden: 'Đang ẩn',
  Maintenance: 'Bảo trì',
};

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thuê tăng dần' },
  { value: 'price_desc', label: 'Giá thuê giảm dần' },
  { value: 'name', label: 'Tên A → Z' },
];

export const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free size'];

export const PRODUCT_STATUS_STYLE: Record<ProductStatus, string> = {
  Available: 'bg-emerald-100 text-emerald-800',
  Hidden: 'bg-slate-200 text-slate-600',
  Maintenance: 'bg-amber-100 text-amber-800',
};

/** Các bước chuyển trạng thái hợp lệ (khớp state machine backend; backend vẫn là nơi quyết định). */
export const NEXT_ACTIONS: Record<BookingStatus, { status: BookingStatus; label: string; danger?: boolean }[]> = {
  Pending: [
    { status: 'Confirmed', label: 'Xác nhận đơn' },
    { status: 'Cancelled', label: 'Hủy đơn', danger: true },
  ],
  Confirmed: [
    { status: 'Renting', label: 'Giao đồ (Đang thuê)' },
    { status: 'Cancelled', label: 'Hủy đơn', danger: true },
  ],
  Renting: [{ status: 'Returned', label: 'Đã nhận lại đồ' }],
  Returned: [{ status: 'Completed', label: 'Hoàn tất đơn' }],
  Completed: [],
  Cancelled: [],
};
