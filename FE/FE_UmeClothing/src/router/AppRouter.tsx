import { Route, Routes } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import MainLayout from '../layouts/MainLayout';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage';
import AdminCalendarPage from '../pages/admin/AdminCalendarPage';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import AdminCustomersPage from '../pages/admin/AdminCustomersPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminProductFormPage from '../pages/admin/AdminProductFormPage';
import AdminProductsPage from '../pages/admin/AdminProductsPage';
import BookingDetailPage from '../pages/BookingDetailPage';
import CartPage from '../pages/CartPage';
import CategoryPage from '../pages/CategoryPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import MyBookingsPage from '../pages/MyBookingsPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import ProductsPage from '../pages/ProductsPage';
import ProfilePage from '../pages/ProfilePage';
import RegisterPage from '../pages/RegisterPage';
import ProtectedRoute from './ProtectedRoute';

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="categories/:slug" element={<CategoryPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['Customer']} />}>
          <Route path="bookings" element={<MyBookingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['Admin', 'Staff']} />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/create" element={<AdminProductFormPage />} />
          <Route path="products/:id/edit" element={<AdminProductFormPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="calendar" element={<AdminCalendarPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
