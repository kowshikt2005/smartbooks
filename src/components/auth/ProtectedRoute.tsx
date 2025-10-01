'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
  requireAuth = true,
  fallback,
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        // User is not authenticated and auth is required
        router.push(redirectTo);
      } else if (!requireAuth && user) {
        // User is authenticated but shouldn't be (e.g., login page)
        router.push('/dashboard');
      }
    }
  }, [user, loading, requireAuth, redirectTo, router]);

  // Show loading state while checking authentication
  if (loading) {
    return fallback || <LoadingSpinner />;
  }

  // If auth is required but user is not authenticated, don't render children
  if (requireAuth && !user) {
    return fallback || <LoadingSpinner />;
  }

  // If auth is not required but user is authenticated, don't render children
  if (!requireAuth && user) {
    return fallback || <LoadingSpinner />;
  }

  // Render children if all conditions are met
  return <>{children}</>;
};

// Loading spinner component
const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
};

// Higher-order component for protecting pages
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    redirectTo?: string;
    requireAuth?: boolean;
    fallback?: React.ReactNode;
  } = {}
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Hook for checking route access
export const useRouteAccess = (requireAuth: boolean = true) => {
  const { user, loading } = useAuth();
  
  const hasAccess = React.useMemo(() => {
    if (loading) return null; // Still checking
    return requireAuth ? !!user : !user;
  }, [user, loading, requireAuth]);

  return {
    hasAccess,
    loading,
    user,
  };
};

// Component for unauthorized access
export const UnauthorizedAccess: React.FC<{
  message?: string;
  showLoginButton?: boolean;
}> = ({
  message = "You don't have permission to access this page.",
  showLoginButton = true,
}) => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Denied
        </h3>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {showLoginButton && (
          <div className="space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Login
            </button>
            
            <button
              onClick={() => router.back()}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};