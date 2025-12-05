import { supabase, handleSupabaseError } from '../supabase/client';
import type { Customer, CustomerInsert, CustomerUpdate } from '../supabase/types';

export class CustomerService {
  /**
   * Get all customers with optional filtering and pagination
   */
  static async getAll(options?: {
    search?: string;
    limit?: number;
    offset?: number;
    orderBy?: keyof Customer;
    orderDirection?: 'asc' | 'desc';
  }) {
    try {
      let query = supabase
        .from('customers')
        .select('*');

      // Apply search filter
      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,phone_no.ilike.%${options.search}%,invoice_id.ilike.%${options.search}%`);
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy, { 
          ascending: options.orderDirection === 'asc' 
        });
      } else {
        query = query.order('name', { ascending: true });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  /**
   * Get a single customer by ID
   */
  static async getById(id: string): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Customer not found
        }
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  /**
   * Search customers by name (exact and fuzzy matching)
   */
  static async searchByName(name: string): Promise<Customer[]> {
    try {
      const trimmedName = name.trim();
      
      // First try exact match (case-insensitive)
      const { data: exactMatches, error: exactError } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', trimmedName)
        .order('name');

      if (exactError) {
        throw new Error(handleSupabaseError(exactError));
      }

      // If we have exact matches, return them
      if (exactMatches && exactMatches.length > 0) {
        return exactMatches;
      }

      // If no exact matches, try fuzzy search
      const { data: fuzzyMatches, error: fuzzyError } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', `%${trimmedName}%`)
        .order('name')
        .limit(10); // Limit fuzzy results

      if (fuzzyError) {
        throw new Error(handleSupabaseError(fuzzyError));
      }

      return fuzzyMatches || [];
    } catch (error) {
      console.error('Error searching customers by name:', error);
      throw error;
    }
  }

  /**
   * Get customers with phone numbers that match a name pattern
   */
  static async getCustomersWithPhoneByName(name: string): Promise<Customer[]> {
    try {
      const trimmedName = name.trim();
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', `%${trimmedName}%`)
        .not('phone_no', 'is', null)
        .neq('phone_no', '')
        .order('name')
        .limit(5);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching customers with phone by name:', error);
      throw error;
    }
  }

  /**
   * Create a new customer
   */
  static async create(customer: CustomerInsert): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customer,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }



  /**
   * Update an existing customer
   */
  static async update(id: string, updates: CustomerUpdate): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  /**
   * Delete a customer
   */
  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  /**
   * Delete multiple customers
   */
  static async deleteMultiple(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', ids);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }
    } catch (error) {
      console.error('Error deleting multiple customers:', error);
      throw error;
    }
  }

  /**
   * Get customer with their current balance (simplified schema)
   */
  static async getWithBalance(id: string) {
    try {
      const customer = await this.getById(id);
      if (!customer) return null;

      return {
        ...customer,
        current_balance: 0,
        outstanding_amount: 0
      };
    } catch (error) {
      console.error('Error fetching customer with balance:', error);
      throw error;
    }
  }

  /**
   * Search customers by name, phone, or invoice details
   */
  static async search(query: string, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone_no, invoice_id')
        .or(`name.ilike.%${query}%,phone_no.ilike.%${query}%,invoice_id.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }

  /**
   * Get customers with outstanding balances (simplified - returns all customers)
   */
  static async getWithOutstandingBalances() {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*');

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return customers || [];
    } catch (error) {
      console.error('Error fetching customers with outstanding balances:', error);
      throw error;
    }
  }
}

/**
 * Calculate total financial amounts (simplified schema - returns zeros)
 */
export async function calculateCustomerFinancials(customers?: any[]) {
  try {
    return { 
      totalPaidAmount: 0, 
      totalBalancePays: 0, 
      totalAdjustedAmount: 0, 
      totalTds: 0,
      // For backward compatibility
      totalBankBalance: 0,
      totalOutstanding: 0
    };
  } catch (error) {
    console.error('Error calculating customer financials:', error);
    return { 
      totalPaidAmount: 0, 
      totalBalancePays: 0, 
      totalAdjustedAmount: 0, 
      totalTds: 0,
      totalBankBalance: 0,
      totalOutstanding: 0
    };
  }
}

/**
 * Get dashboard statistics with proper error handling
 */
export async function getDashboardStats() {
  try {
    // Get customer count
    const { count, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting customer count:', countError);
      return { 
        totalCustomers: 0, 
        totalBankBalance: 0, 
        totalOutstanding: 0,
        totalPaidAmount: 0,
        totalBalancePays: 0,
        totalAdjustedAmount: 0,
        totalTds: 0
      };
    }

    // Get financial totals (simplified - all zeros)
    const financials = await calculateCustomerFinancials();

    return {
      totalCustomers: count || 0,
      totalBankBalance: financials.totalBankBalance,
      totalOutstanding: financials.totalOutstanding,
      totalPaidAmount: financials.totalPaidAmount,
      totalBalancePays: financials.totalBalancePays,
      totalAdjustedAmount: financials.totalAdjustedAmount,
      totalTds: financials.totalTds
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { 
      totalCustomers: 0, 
      totalBankBalance: 0, 
      totalOutstanding: 0,
      totalPaidAmount: 0,
      totalBalancePays: 0,
      totalAdjustedAmount: 0,
      totalTds: 0
    };
  }
}

