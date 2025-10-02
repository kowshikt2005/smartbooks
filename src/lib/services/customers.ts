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
        query = query.or(`name.ilike.%${options.search}%,phone_no.ilike.%${options.search}%,invoice_id.ilike.%${options.search}%,invoice_num.ilike.%${options.search}%`);
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
   * Create a new customer - DISABLED as per requirements
   */
  static async create(customer: CustomerInsert) {
    throw new Error('Creating new customers is not allowed in this system');
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
   * Get customer with their current balance (using new schema)
   */
  static async getWithBalance(id: string) {
    try {
      const customer = await this.getById(id);
      if (!customer) return null;

      return {
        ...customer,
        current_balance: customer.balance_pays || 0,
        outstanding_amount: customer.balance_pays || 0
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
        .select('id, name, phone_no, invoice_id, invoice_num')
        .or(`name.ilike.%${query}%,phone_no.ilike.%${query}%,invoice_id.ilike.%${query}%,invoice_num.ilike.%${query}%`)
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
   * Get customers with outstanding balances
   */
  static async getWithOutstandingBalances() {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .gt('balance_pays', 0);

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
 * Calculate total financial amounts using new schema
 */
export async function calculateCustomerFinancials(customers?: any[]) {
  try {
    // If customers array is provided, calculate from it
    if (customers && customers.length > 0) {
      let totalPaidAmount = 0;
      let totalBalancePays = 0;
      let totalAdjustedAmount = 0;
      let totalTds = 0;

      for (const customer of customers) {
        totalPaidAmount += customer.paid_amount || 0;
        totalBalancePays += customer.balance_pays || 0;
        totalAdjustedAmount += customer.adjusted_amount || 0;
        totalTds += customer.tds || 0;
      }

      return { 
        totalPaidAmount, 
        totalBalancePays, 
        totalAdjustedAmount, 
        totalTds,
        // For backward compatibility
        totalBankBalance: totalPaidAmount,
        totalOutstanding: totalBalancePays
      };
    }

    // Otherwise, use database aggregation for better performance
    const { data, error } = await supabase
      .from('customers')
      .select('paid_amount, balance_pays, adjusted_amount, tds');

    if (error) {
      console.error('Error fetching customer financial data:', error);
      return { 
        totalPaidAmount: 0, 
        totalBalancePays: 0, 
        totalAdjustedAmount: 0, 
        totalTds: 0,
        totalBankBalance: 0,
        totalOutstanding: 0
      };
    }

    let totalPaidAmount = 0;
    let totalBalancePays = 0;
    let totalAdjustedAmount = 0;
    let totalTds = 0;

    if (data && data.length > 0) {
      for (const customer of data) {
        totalPaidAmount += customer.paid_amount || 0;
        totalBalancePays += customer.balance_pays || 0;
        totalAdjustedAmount += customer.adjusted_amount || 0;
        totalTds += customer.tds || 0;
      }
    }

    return { 
      totalPaidAmount, 
      totalBalancePays, 
      totalAdjustedAmount, 
      totalTds,
      // For backward compatibility
      totalBankBalance: totalPaidAmount,
      totalOutstanding: totalBalancePays
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

    // Get financial totals
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

