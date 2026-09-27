import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

interface Props {
  /** Nếu có: chỉ các role này được vào. */
  roles?: UserRole[];
}

export default function ProtectedRoute({ roles }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Đang xác thực..." />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
