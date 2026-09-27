import { cleanParams, http, unwrap } from './client';
import type { Booking, BookingStatus, CreateBookingRequest, PagedResult } from '../types';

export const bookingsApi = {
  create: (payload: CreateBookingRequest) => unwrap<Booking>(http.post('/api/bookings', payload)),
  my: (params: { status?: BookingStatus; page?: number; pageSize?: number }) =>
    unwrap<PagedResult<Booking>>(http.get('/api/bookings/my', { params: cleanParams(params) })),
  get: (id: number) => unwrap<Booking>(http.get(`/api/bookings/${id}`)),
  cancel: (id: number) => unwrap<Booking>(http.put(`/api/bookings/${id}/cancel`)),
};
