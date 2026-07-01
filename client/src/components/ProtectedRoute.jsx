import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader } from './Loader.jsx';
export function ProtectedRoute({ admin = false }) {
  const { user, loading } = useAuth(); const location = useLocation();
  if (loading) return <Loader />;
  if (!user) return <Navigate to={admin || location.pathname.startsWith('/admin') ? '/admin/login' : '/login'} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
