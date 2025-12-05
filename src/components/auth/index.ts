// Auth components exports
export { LoginForm } from './LoginForm';
export { ProtectedRoute, withAuth, useRouteAccess, UnauthorizedAccess } from './ProtectedRoute';

// Re-export auth context and hooks
export { AuthProvider, useAuth, useAuthUser, useIsAuthenticated, useAuthLoading } from '../../contexts/AuthContext';

// Session hooks removed - using AuthContext directly

// Re-export auth service
export {
  authService,
  AuthServiceError,
  AUTH_ERROR_MESSAGES,
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
} from '../../lib/auth';