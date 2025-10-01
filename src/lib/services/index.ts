// Export all service classes for easy importing
export { CustomerService } from './customers';
export { LedgerService } from './ledger';

// Re-export types for convenience
export type {
  Customer,
  CustomerInsert,
  CustomerUpdate,
  LedgerEntry,
  LedgerEntryInsert,
  LedgerEntryUpdate,
  DiscountRules,
  Database
} from '../supabase/types';