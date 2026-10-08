export type UserRole = 'Customer' | 'Staff' | 'Admin';
export type ProductStatus = 'Available' | 'Hidden' | 'Maintenance';
export type BookingStatus = 'Pending' | 'Confirmed' | 'Renting' | 'Returned' | 'Cancelled' | 'Completed';

export const BOOKING_STATUSES: BookingStatus[] = ['Pending', 'Confirmed', 'Renting', 'Returned', 'Completed', 'Cancelled'];

/** Envelope thống nhất của backend. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: User;
}

export interface ProductImage {
  id: number;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

/** Một size cụ thể = một món đồ vật lý riêng, có lịch thuê riêng. */
export interface ProductVariant {
  id: number;
  productId: number;
  size: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  name: string;
  slug: string;
  description: string | null;
  rentalPrice: number;
  depositPrice: number;
  color: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Ngày dạng "YYYY-MM-DD". `end` là exclusive. */
export interface DateRange {
  start: string;
  end: string;
}

/** Lịch luôn theo MỘT size cụ thể (variant), không phải theo Product. */
export interface VariantAvailability {
  productId: number;
  variantId: number;
  size: string;
  startDate: string | null;
  endDate: string | null;
  isAvailable: boolean | null;
  reason: string | null;
  conflicts: DateRange[];
  blockedRanges: DateRange[];
}

export interface ProductQuery {
  search?: string;
  categoryId?: number;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  status?: ProductStatus;
  startDate?: string;
  endDate?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface BookingItem {
  id: number;
  variantId: number;
  productId: number;
  productName: string;
  productSlug: string;
  size: string;
  primaryImageUrl: string | null;
  rentalPrice: number;
  depositPrice: number;
  quantity: number;
  startDate: string;
  endDate: string;
  days: number;
  note: string | null;
}

export interface Booking {
  id: number;
  bookingCode: string;
  startDate: string;
  endDate: string;
  /** Có giá trị sau khi chuyển sang Returned. */
  actualReturnDate: string | null;
  status: BookingStatus;
  subtotal: number;
  deposit: number;
  /** Phụ thu trả muộn, 0 nếu trả đúng/sớm hạn. */
  lateFee: number;
  /** Subtotal + Deposit (KHÔNG gồm lateFee). Dùng grandTotal để có tổng cuối cùng. */
  total: number;
  /** total + lateFee — số tiền thực tế phải thanh toán. */
  grandTotal: number;
  customerNote: string | null;
  createdAt: string;
  updatedAt: string;
  items: BookingItem[];
}

export interface CreateBookingRequest {
  startDate: string;
  endDate: string;
  customerNote?: string;
  items: { variantId: number; note?: string }[];
}

/** Đặt thuê không cần tài khoản. */
export interface CreateGuestBookingRequest {
  guestName: string;
  guestPhone: string;
  startDate: string;
  endDate: string;
  customerNote?: string;
  items: { variantId: number; note?: string }[];
}

export interface BookingLookupRequest {
  bookingCode: string;
  phone: string;
}

// ---- Realtime payloads (camelCase, enum dạng chuỗi) ----
export interface BookingCreatedEvent {
  bookingId: number;
  bookingCode: string;
  customerName: string;
  createdAt: string;
  status: BookingStatus;
}

export interface BookingStatusChangedEvent {
  bookingId: number;
  bookingCode: string;
  oldStatus: BookingStatus;
  newStatus: BookingStatus;
  updatedAt: string;
}

export interface ProductAvailabilityChangedEvent {
  productId: number;
  variantId: number;
  startDate: string;
  endDate: string;
}

// ---- Admin ----
export interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  rentingBookings: number;
  returnedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  revenue: number;
}

export interface AdminBooking extends Booking {
  isGuest: boolean;
  /** null nếu là khách vãng lai. */
  customerId: number | null;
  /** Tên khách (tài khoản hoặc guest). */
  customerName: string;
  /** null nếu là khách vãng lai (guest không có email). */
  customerEmail: string | null;
  customerPhone: string | null;
  adminNote: string | null;
}

/** Doanh thu gộp theo ngày/tuần/tháng — chỉ tính đơn Completed. */
export interface RevenuePeriod {
  periodStart: string;
  rentalRevenue: number;
  lateFeeRevenue: number;
  totalRevenue: number;
  bookingCount: number;
}

export interface RevenueReport {
  groupBy: 'day' | 'week' | 'month';
  from: string;
  to: string;
  grandTotal: number;
  periods: RevenuePeriod[];
}

export interface CustomerListItem {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  bookingCount: number;
}

export interface CalendarItem {
  bookingId: number;
  bookingCode: string;
  variantId: number;
  productId: number;
  productName: string;
  size: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  customerName: string;
}

export interface ProductRequest {
  categoryId: number;
  name: string;
  slug?: string;
  description?: string;
  rentalPrice: number;
  depositPrice: number;
  color: string;
  status: ProductStatus;
}

export interface ProductVariantRequest {
  size: string;
  status: ProductStatus;
}

export interface CategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  isActive: boolean;
}
