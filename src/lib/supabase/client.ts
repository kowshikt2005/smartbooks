import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import type { Database } from './types';

// Validate required environment variables
if (!config.supabase.url) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!config.supabase.anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client for client-side operations
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Create Supabase client with service role for server-side operations
export const supabaseAdmin = createClient<Database>(
  config.supabase.url,
  config.supabase.serviceRoleKey || config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to get the current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
};

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return !!user;
};

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Helper function to sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Error signing in:', error);
    throw error;
  }
  
  return data;
};

// Helper function to sign up with email and password
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    console.error('Error signing up:', error);
    throw error;
  }
  
  return data;
};

// Helper function to reset password
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${config.app.url}/auth/reset-password`,
  });
  
  if (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

// Helper function to update password
export const updatePassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({
    password,
  });
  
  if (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

// Real-time subscription helpers
export const subscribeToTable = <T>(
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  let subscription = supabase
    .channel(`public:${table}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table,
        filter 
      }, 
      callback
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  // Handle specific Supabase error codes
  switch (error.code) {
    case 'PGRST116':
      return 'No data found';
    case 'PGRST301':
      return 'Duplicate entry';
    case '23505':
      return 'This record already exists';
    case '23503':
      return 'Cannot delete record - it is referenced by other data';
    case '23514':
      return 'Invalid data - check constraints failed';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-not-found':
      return 'User not found';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/email-already-in-use':
      return 'Email is already registered';
    default:
      return error.message || 'An error occurred';
  }
};

// Type-safe table references
export const tables = {
  customers: 'customers',
  items: 'items',
  invoices: 'invoices',
  ledger_entries: 'ledger_entries',
  stock_movements: 'stock_movements',
  tax_profiles: 'tax_profiles',
  whatsapp_logs: 'whatsapp_logs',
} as const;

export type TableName = keyof typeof tables;