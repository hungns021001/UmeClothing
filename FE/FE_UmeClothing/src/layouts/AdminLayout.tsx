import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime, useRealtimeEvent, type ConnectionStatus } from '../contexts/RealtimeContext';
import { useToast } from '../contexts/ToastContext';
import type { BookingCreatedEvent, DashboardStats } from '../types';

const NAV = [
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/products', label: 'Sản phẩm', end: false },
  { to: '/admin/categories', label: 'Danh mục', end: false },
  { to: '/admin/bookings', label: 'Đơn thuê', end: false },
  { to: '/admin/customers', label: 'Khách hàng', end: false },
  { to: '/admin/calendar', label: 'Lịch thuê', end: false },
  { to: '/admin/revenue', label: 'Doanh thu', end: false },
];

const STATUS_UI: Record<ConnectionStatus, { dot: string; label: string }> = {
  connected: { dot: 'bg-emerald-500', label: 'Realtime: đã kết nối' },
  connecting: { dot: 'bg-amber-400', label: 'Realtime: đang kết nối...' },
  reconnecting: { dot: 'bg-amber-400', label: 'Realtime: đang kết nối lại...' },
  disconnected: { dot: 'bg-red-500', label: 'Realtime: mất kết nối' },
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`;

/**
 * Đăng ký một lần các sự kiện realtime cho khu vực admin:
 * - BOOKING_CREATED: toast + làm mới các danh sách.
 * - BOOKING_STATUS_CHANGED / PRODUCT_AVAILABILITY_CHANGED: làm mới danh sách/lịch.
 * - DASHBOARD_UPDATED: ghi thẳng số liệu mới vào cache dashboard (không cần gọi lại API).
 */
function AdminRealtimeSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshLists = () =>
    void queryClient.invalidateQueries({
      predicate: (q) => q.queryKey[0] === 'admin' && q.queryKey[1] !== 'dashboard',
    });

  useRealtimeEvent<BookingCreatedEvent>('BOOKING_CREATED', (e) => {
    toast('info', `Đơn mới ${e.bookingCode} từ ${e.customerName}.`);
    refreshLists();
  });
  useRealtimeEvent('BOOKING_STATUS_CHANGED', refreshLists);
  useRealtimeEvent('PRODUCT_AVAILABILITY_CHANGED', () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'calendar'] });
  });
  useRealtimeEvent<DashboardStats>('DASHBOARD_UPDATED', (stats) => {
    queryClient.setQueryData<DashboardStats>(['admin', 'dashboard'], stats);
  });

  return null;
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { status } = useRealtime();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const ui = STATUS_UI[status];

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <AdminRealtimeSync />

      <aside
        className={`${open ? 'block' : 'hidden'} border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r`}
      >
        <div className="hidden px-5 py-5 lg:block">
          <Link to="/admin" className="text-lg font-bold text-brand-700">
            Ume<span className="text-slate-900">Admin</span>
          </Link>
        </div>
        <nav className="space-y-1 px-3 py-3" aria-label="Điều hướng quản trị">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-3">
            <button type="button" className="btn-secondary px-3 py-1 lg:hidden" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? '✕' : '☰'}
            </button>
            <span className="flex items-center gap-2 text-xs text-slate-500" role="status">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${ui.dot}`} />
              <span className="hidden sm:inline">{ui.label}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-slate-500 sm:inline">
              {user?.fullName} ({user?.role})
            </span>
            <Link to="/" className="btn-secondary px-3 py-1">
              Trang khách
            </Link>
            <button
              type="button"
              className="btn-secondary px-3 py-1"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
