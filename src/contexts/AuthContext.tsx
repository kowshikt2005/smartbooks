'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService, AuthServiceError, type SignInCredentials, type SignUpCredentials } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const currentSession = await authService.getSession();
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // User signed in or token refreshed
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;

    if (session?.expires_at) {
      // Refresh token 5 minutes before expiry
      const refreshTime = (session.expires_at * 1000) - Date.now() - (5 * 60 * 1000);
      
      if (refreshTime > 0) {
        refreshTimer = setTimeout(async () => {
          try {
            await refreshSession();
          } catch (error) {
            console.error('Auto token refresh failed:', error);
          }
        }, refreshTime);
      }
    }

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [session?.expires_at]);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    setLoading(true);
    try {
      const { user, session } = await authService.signIn(credentials);
      setUser(user);
      setSession(session);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    setLoading(true);
    try {
      const { user, session } = await authService.signUp(credentials);
      setUser(user);
      setSession(session);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authService.resetPassword({ email });
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      await authService.updatePassword({ password });
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const newSession = await authService.refreshSession();
      setSession(newSession);
      setUser(newSession?.user ?? null);
    } catch (error) {
      console.error('Refresh session error:', error);
      // If refresh fails, sign out the user
      await signOut();
      throw error;
    }
  }, [signOut]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for checking if user is authenticated
export const useAuthUser = () => {
  const { user } = useAuth();
  return user;
};

// Hook for checking authentication status
export const useIsAuthenticated = () => {
  const { user, loading } = useAuth();
  return { isAuthenticated: !!user, loading };
};

// Hook for getting auth loading state
export const useAuthLoading = () => {
  const { loading } = useAuth();
  return loading;
};