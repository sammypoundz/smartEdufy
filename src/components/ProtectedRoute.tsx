import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: Array<'admin' | 'teacher' | 'parent' | 'student'>;
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Wait for auth to load (restore from localStorage)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Compare roles case‑insensitively (backend sends "ADMIN", frontend uses "admin")
  const userRole = user.role?.toLowerCase();
  if (allowedRoles && userRole && !allowedRoles.includes(userRole as any)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}