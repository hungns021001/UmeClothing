import { cleanParams, http, unwrap } from './client';
import type { AdminBooking, BookingStatus, CalendarItem, CustomerListItem, DashboardStats, PagedResult, RevenueReport } from '../types';

export const adminApi = {
  dashboard: () => unwrap<DashboardStats>(http.get('/api/admin/dashboard')),

  customers: (params: { search?: string; page?: number; pageSize?: number }) =>
    unwrap<PagedResult<CustomerListItem>>(http.get('/api/admin/customers', { params: cleanParams(params) })),

  calendar: (from: string, to: string) =>
    unwrap<CalendarItem[]>(http.get('/api/admin/calendar', { params: cleanParams({ from, to }) })),

  setCustomerActive: (customerId: number, isActive: boolean) =>
    unwrap<CustomerListItem>(http.put(`/api/admin/customers/${customerId}/status`, { isActive })),

  bookings: (params: { status?: BookingStatus; search?: string; page?: number; pageSize?: number }) =>
    unwrap<PagedResult<AdminBooking>>(http.get('/api/admin/bookings', { params: cleanParams(params) })),

  booking: (id: number) => unwrap<AdminBooking>(http.get(`/api/admin/bookings/${id}`)),

  updateStatus: (id: number, status: BookingStatus, adminNote?: string, actualReturnDate?: string) =>
    unwrap<AdminBooking>(
      http.put(`/api/admin/bookings/${id}/status`, { status, adminNote: adminNote || undefined, actualReturnDate: actualReturnDate || undefined }),
    ),

  revenue: (from: string, to: string, groupBy: 'day' | 'week' | 'month') =>
    unwrap<RevenueReport>(http.get('/api/admin/revenue', { params: cleanParams({ from, to, groupBy }) })),
};
