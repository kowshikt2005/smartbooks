'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Session, User } from '@supabase/supabase-js';

interface SessionState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface SessionActions {
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

export const useSession = (): SessionState & SessionActions => {
  const { session, user, loading, refreshSession: authRefreshSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      setError(null);
      await authRefreshSession();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh session';
      setError(errorMessage);
      console.error('Session refresh error:', err);
    }
  }, [authRefreshSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    session,
    user,
    loading,
    error,
    refreshSession,
    clearError,
  };
};

// Hook for automatic session refresh
export const useAutoRefreshSession = (intervalMinutes: number = 30) => {
  const { refreshSession } = useSession();

  useEffect(() => {
    const interval = setInterval(() => {
      refreshSession();
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshSession, intervalMinutes]);
};

// Hook for session expiry warning
export const useSessionExpiryWarning = (warningMinutes: number = 5) => {
  const { session } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.expires_at) {
      setShowWarning(false);
      setTimeUntilExpiry(null);
      return;
    }

    const checkExpiry = () => {
      const now = Date.now();
      const expiryTime = session.expires_at * 1000;
      const timeLeft = expiryTime - now;
      const minutesLeft = Math.floor(timeLeft / (1000 * 60));

      setTimeUntilExpiry(minutesLeft);

      if (minutesLeft <= warningMinutes && minutesLeft > 0) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately
    checkExpiry();

    // Check every minute
    const interval = setInterval(checkExpiry, 60 * 1000);

    return () => clearInterval(interval);
  }, [session?.expires_at, warningMinutes]);

  return {
    showWarning,
    timeUntilExpiry,
  };
};

// Hook for session persistence
export const useSessionPersistence = () => {
  const { session, user } = useSession();

  useEffect(() => {
    if (session && user) {
      // Store session info in localStorage for persistence across tabs
      const sessionData = {
        userId: user.id,
        email: user.email,
        lastActivity: Date.now(),
      };
      localStorage.setItem('smartbooks_session', JSON.stringify(sessionData));
    } else {
      // Clear session data when logged out
      localStorage.removeItem('smartbooks_session');
    }
  }, [session, user]);

  const getStoredSession = useCallback(() => {
    try {
      const stored = localStorage.getItem('smartbooks_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const clearStoredSession = useCallback(() => {
    localStorage.removeItem('smartbooks_session');
  }, []);

  return {
    getStoredSession,
    clearStoredSession,
  };
};

// Hook for tracking user activity
export const useUserActivity = () => {
  const { user } = useSession();
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      setLastActivity(new Date());
      setIsActive(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsActive(false);
      } else {
        updateActivity();
      }
    };

    // Track user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Track page visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  return {
    lastActivity,
    isActive,
  };
};

// Hook for session timeout
export const useSessionTimeout = (timeoutMinutes: number = 60) => {
  const { signOut } = useAuth();
  const { lastActivity } = useUserActivity();
  const [timeoutWarning, setTimeoutWarning] = useState(false);

  useEffect(() => {
    const checkTimeout = () => {
      const now = new Date();
      const timeSinceActivity = now.getTime() - lastActivity.getTime();
      const minutesSinceActivity = timeSinceActivity / (1000 * 60);

      if (minutesSinceActivity >= timeoutMinutes) {
        // Auto sign out
        signOut();
      } else if (minutesSinceActivity >= timeoutMinutes - 5) {
        // Show warning 5 minutes before timeout
        setTimeoutWarning(true);
      } else {
        setTimeoutWarning(false);
      }
    };

    const interval = setInterval(checkTimeout, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [lastActivity, timeoutMinutes, signOut]);

  const extendSession = useCallback(() => {
    setTimeoutWarning(false);
    // Activity tracking will automatically update lastActivity
  }, []);

  return {
    timeoutWarning,
    extendSession,
  };
};