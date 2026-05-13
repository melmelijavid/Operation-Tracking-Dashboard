import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  if (isBootstrapping) return null;
  if (isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }
  return <Outlet />;
}

export function RoleRoute({ allowedRoles }) {
  const { role } = useAuth();

  if (allowedRoles.includes(role)) {
    return <Outlet />;
  }

  return <Navigate to="/welcome" replace />;
}
