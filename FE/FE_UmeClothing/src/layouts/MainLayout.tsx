import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useRealtimeEvent } from '../contexts/RealtimeContext';
import { useToast } from '../contexts/ToastContext';
import type { BookingStatusChangedEvent } from '../types';
import { BOOKING_STATUS_LABEL } from '../utils/labels';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive ? 'text-brand-700' : 'text-slate-600 hover:text-brand-700'
  }`;

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Thông báo realtime cho khách khi cửa hàng đổi trạng thái đơn của họ. */
function BookingStatusNotifier() {
  const { isCustomer } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useRealtimeEvent<BookingStatusChangedEvent>('BOOKING_STATUS_CHANGED', (e) => {
    void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    void queryClient.invalidateQueries({ queryKey: ['booking', e.bookingId] });
    if (isCustomer) {
      toast('info', `Đơn ${e.bookingCode} chuyển sang “${BOOKING_STATUS_LABEL[e.newStatus]}”.`);
    }
  });

  return null;
}

function Navbar() {
  const { user, loading, isCustomer, isStaff, logout } = useAuth();
  const { count: cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  useEffect(() => {
    setMobileOpen(false);
    setCategoriesOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeAll = () => {
    setCategoriesOpen(false);
    setUserOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold tracking-tight text-brand-700">
          Ume<span className="text-slate-900">Clothing</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
          <NavLink to="/" end className={navLinkClass}>
            Trang chủ
          </NavLink>
          <NavLink to="/products" className={navLinkClass}>
            Sản phẩm
          </NavLink>
          <div className="relative">
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-700"
              aria-expanded={categoriesOpen}
              onClick={() => {
                setUserOpen(false);
                setCategoriesOpen((v) => !v);
              }}
            >
              Danh mục ▾
            </button>
            {categoriesOpen && (
              <>
                <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Đóng menu" onClick={closeAll} />
                <ul className="absolute left-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {categoriesQuery.data?.map((c) => (
                    <li key={c.id}>
                      <Link to={`/categories/${c.slug}`} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                  {categoriesQuery.isLoading && <li className="px-4 py-2 text-sm text-slate-400">Đang tải...</li>}
                  {categoriesQuery.data?.length === 0 && <li className="px-4 py-2 text-sm text-slate-400">Chưa có danh mục</li>}
                </ul>
              </>
            )}
          </div>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/cart" className="btn-secondary relative" aria-label={`Giỏ hàng (${cartCount} sản phẩm)`}>
            Giỏ hàng
            {cartCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">{cartCount}</span>}
          </Link>
          <Link to="/lookup" className="btn-secondary">
            Tra cứu đơn
          </Link>
          {loading ? null : user ? (
            <div className="relative">
              <button
                type="button"
                className="btn-secondary"
                aria-expanded={userOpen}
                onClick={() => {
                  setCategoriesOpen(false);
                  setUserOpen((v) => !v);
                }}
              >
                {user.fullName} ▾
              </button>
              {userOpen && (
                <>
                  <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Đóng menu" onClick={closeAll} />
                  <ul className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {isCustomer && (
                      <li>
                        <Link to="/bookings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          Đơn thuê của tôi
                        </Link>
                      </li>
                    )}
                    {isStaff && (
                      <li>
                        <Link to="/admin" className="block px-4 py-2 text-sm font-medium text-brand-700 hover:bg-slate-50">
                          Trang quản trị
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        Hồ sơ
                      </Link>
                    </li>
                    <li>
                      <button type="button" onClick={handleLogout} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50">
                        Đăng xuất
                      </button>
                    </li>
                  </ul>
                </>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn-primary">
                Đăng ký
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn-secondary px-3 md:hidden"
          aria-label="Mở menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Điều hướng di động">
            <NavLink to="/" end className={navLinkClass}>
              Trang chủ
            </NavLink>
            <NavLink to="/products" className={navLinkClass}>
              Sản phẩm
            </NavLink>
            {categoriesQuery.data?.map((c) => (
              <NavLink key={c.id} to={`/categories/${c.slug}`} className={navLinkClass}>
                &nbsp;&nbsp;› {c.name}
              </NavLink>
            ))}
            <NavLink to="/cart" className={navLinkClass}>
              Giỏ hàng {cartCount > 0 ? `(${cartCount})` : ''}
            </NavLink>
            <hr className="my-2 border-slate-200" />
            {loading ? null : user ? (
              <>
                {isCustomer && (
                  <NavLink to="/bookings" className={navLinkClass}>
                    Đơn thuê của tôi
                  </NavLink>
                )}
                {isStaff && (
                  <NavLink to="/admin" className={navLinkClass}>
                    Trang quản trị
                  </NavLink>
                )}
                <NavLink to="/profile" className={navLinkClass}>
                  Hồ sơ ({user.fullName})
                </NavLink>
                <button type="button" onClick={handleLogout} className="rounded-md px-3 py-2 text-left text-sm font-medium text-red-600">
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Đăng nhập
                </NavLink>
                <NavLink to="/register" className={navLinkClass}>
                  Đăng ký
                </NavLink>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row">
        <span>© {new Date().getFullYear()} UmeClothing. Dịch vụ cho thuê trang phục.</span>
        <span>Đặt lịch trước – nhận đồ đúng ngày.</span>
      </div>
    </footer>
  );
}

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <BookingStatusNotifier />
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
