// Export all service classes for easy importing
export { CustomerService } from './customers';

// Re-export types for convenience
export type {
  Customer,
  CustomerInsert,
  CustomerUpdate,
  Database
} from '../supabase/types';