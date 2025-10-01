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
        query = query.or(`name.ilike.%${options.search}%,phone.ilike.%${options.search}%,gst_id.ilike.%${options.search}%`);
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
   * Create a new customer with default bank balance and outstanding amount
   */
  static async create(customer: CustomerInsert) {
    try {
      // Set default financial values for new customers
      const bankBalance = 0; // Can be updated later based on business requirements
      const outstandingAmount = 0; // Can be updated later based on business requirements
      
      const customerData = {
        ...customer,
        bank_balance: bankBalance,
        outstanding_purchase_amount: outstandingAmount
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      // Note: Customer ledger entries can be created later when needed for transaction tracking

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
   * Get customer with their current balance (already stored in customers table)
   */
  static async getWithBalance(id: string) {
    try {
      const customer = await this.getById(id);
      if (!customer) return null;

      return {
        ...customer,
        current_balance: customer.bank_balance || 0,
        outstanding_amount: customer.outstanding_purchase_amount || 0
      };
    } catch (error) {
      console.error('Error fetching customer with balance:', error);
      throw error;
    }
  }

  /**
   * Search customers by name, phone, or GST ID
   */
  static async search(query: string, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, gst_id')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,gst_id.ilike.%${query}%`)
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
        .gt('outstanding_purchase_amount', 0);

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
 * Calculate total bank balance and outstanding amount using database aggregation
 */
export async function calculateCustomerFinancials(customers?: any[]) {
  try {
    // If customers array is provided, calculate from it
    if (customers && customers.length > 0) {
      let totalBankBalance = 0;
      let totalOutstanding = 0;

      for (const customer of customers) {
        totalBankBalance += customer.bank_balance || 0;
        totalOutstanding += customer.outstanding_purchase_amount || 0;
      }

      return { totalBankBalance, totalOutstanding };
    }

    // Otherwise, use database aggregation for better performance
    const { data, error } = await supabase
      .from('customers')
      .select('bank_balance, outstanding_purchase_amount');

    if (error) {
      console.error('Error fetching customer financial data:', error);
      return { totalBankBalance: 0, totalOutstanding: 0 };
    }

    let totalBankBalance = 0;
    let totalOutstanding = 0;

    if (data && data.length > 0) {
      for (const customer of data) {
        totalBankBalance += customer.bank_balance || 0;
        totalOutstanding += customer.outstanding_purchase_amount || 0;
      }
    }

    return { totalBankBalance, totalOutstanding };
  } catch (error) {
    console.error('Error calculating customer financials:', error);
    return { totalBankBalance: 0, totalOutstanding: 0 };
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
      return { totalCustomers: 0, totalBankBalance: 0, totalOutstanding: 0 };
    }

    // Get financial totals
    const { totalBankBalance, totalOutstanding } = await calculateCustomerFinancials();

    return {
      totalCustomers: count || 0,
      totalBankBalance,
      totalOutstanding
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { totalCustomers: 0, totalBankBalance: 0, totalOutstanding: 0 };
  }
}

