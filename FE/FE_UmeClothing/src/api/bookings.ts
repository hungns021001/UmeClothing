import { cleanParams, http, unwrap } from './client';
import type {
  Booking,
  BookingLookupRequest,
  BookingStatus,
  CreateBookingRequest,
  CreateGuestBookingRequest,
  BookingPhoneLookupRequest,
  PagedResult,
} from '../types';

export const bookingsApi = {
  create: (payload: CreateBookingRequest) => unwrap<Booking>(http.post('/api/bookings', payload)),
  /** Đặt thuê không cần tài khoản. */
  createGuest: (payload: CreateGuestBookingRequest) => unwrap<Booking>(http.post('/api/bookings/guest', payload)),
  my: (params: { status?: BookingStatus; page?: number; pageSize?: number }) =>
    unwrap<PagedResult<Booking>>(http.get('/api/bookings/my', { params: cleanParams(params) })),
  myByCode: (bookingCode: string) =>
    unwrap<Booking>(http.get(`/api/bookings/my/by-code/${encodeURIComponent(bookingCode)}`)),
  get: (id: number) => unwrap<Booking>(http.get(`/api/bookings/${id}`)),
  cancel: (id: number) => unwrap<Booking>(http.put(`/api/bookings/${id}/cancel`)),

  // Tra cứu đơn khách vãng lai bằng Mã đơn + SĐT (không cần đăng nhập).
  lookup: (payload: BookingLookupRequest) => unwrap<Booking>(http.post('/api/bookings/lookup', payload)),
  lookupByPhone: (payload: BookingPhoneLookupRequest) =>
    unwrap<PagedResult<Booking>>(http.post('/api/bookings/lookup/phone', payload)),
  cancelByLookup: (payload: BookingLookupRequest) => unwrap<Booking>(http.put('/api/bookings/lookup/cancel', payload)),
};
