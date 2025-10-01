import { supabase } from '../supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
}

// Auth service functions
export const authService = {
  // Sign in with email and password
  async signIn(credentials: SignInCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new AuthServiceError(error.message, error.status);
    }

    return {
      user: data.user,
      session: data.session,
    };
  },

  // Sign up with email and password
  async signUp(credentials: SignUpCredentials) {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new AuthServiceError(error.message, error.status);
    }

    return {
      user: data.user,
      session: data.session,
    };
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new AuthServiceError(error.message, error.status);
    }
  },

  // Get current session
  async getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw new AuthServiceError(error.message, error.status);
    }

    return data.session;
  },

  // Get current user
  async getUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw new AuthServiceError(error.message, error.status);
    }

    return data.user;
  },

  // Reset password
  async resetPassword(data: ResetPasswordData) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw new AuthServiceError(error.message, error.status);
    }
  },

  // Update password
  async updatePassword(data: UpdatePasswordData) {
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      throw new AuthServiceError(error.message, error.status);
    }
  },

  // Refresh session
  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      throw new AuthServiceError(error.message, error.status);
    }

    return data.session;
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Custom error class for auth service
export class AuthServiceError extends Error {
  public status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthServiceError';
    this.status = status;
  }
}

// Helper functions
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (password.length < 6) return 'weak';
  if (password.length < 10) return 'medium';
  if (isValidPassword(password)) return 'strong';
  return 'medium';
};

// Auth error messages
export const AUTH_ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  WEAK_PASSWORD: 'Password is too weak',
  EMAIL_NOT_CONFIRMED: 'Please check your email and click the confirmation link',
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'No account found with this email address',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  NETWORK_ERROR: 'Network error. Please check your connection and try again',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again',
} as const;

export type AuthErrorMessage = typeof AUTH_ERROR_MESSAGES[keyof typeof AUTH_ERROR_MESSAGES];