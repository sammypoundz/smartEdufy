import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { effectivePrivileges, PRIVILEGE_ROUTES } from '../utils/privileges';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  // If provided, access is granted when the user holds this privilege
  // (any role that carries it), or one of allowedRoles.
  privilege?: string;
}

export default function ProtectedRoute({ allowedRoles, privilege }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

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

  const userRoles = user.roles?.length ? user.roles : [user.role].filter(Boolean);
  const pass = () => <Outlet />;

  // Role check: passes if the user holds ANY of the allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some(r => userRoles.includes(r));
    if (hasRole) return pass();
  }

  // Derive the effective privileges (roles + direct grants + legacy pages).
  const privileges = effectivePrivileges({
    roles: userRoles,
    privileges: user.privileges,
    allowedPages: user.allowedPages,
  });

  // For ADMIN-PANEL routes (/admin/*), non-admin users must hold the page as
  // an EXPLICIT grant (allowedPages). Role defaults (e.g. a TEACHER's
  // academic keys) apply to the teacher workspace only — they must not open
  // admin pages whose keys happen to match.
  const isAdminPath = location.pathname.startsWith('/admin');
  const explicitGrants = user.allowedPages || [];
  const isAdminUser = userRoles.some(r => r === 'ADMIN' || r === 'PRINCIPAL');

  // Explicit privilege prop
  if (privilege && privileges.includes(privilege)) return pass();

  // Privilege-route fallback: current path mapped to a privilege the user holds.
  const path = location.pathname;
  for (const [key, routes] of Object.entries(PRIVILEGE_ROUTES)) {
    const pathMatches = routes.some(r => path === r || path.startsWith(r + '/'));
    if (!pathMatches) continue;
    if (isAdminPath) {
      // Admin panel: explicit grant or admin/principal role required.
      if (isAdminUser || explicitGrants.includes(key)) return pass();
    } else if (privileges.includes(key)) {
      return pass();
    }
  }

  // No restrictions configured — any authenticated user passes.
  if ((!allowedRoles || allowedRoles.length === 0) && !privilege) return pass();

  return <Navigate to="/" replace />;
}