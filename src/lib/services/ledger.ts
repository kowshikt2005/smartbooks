import { supabase, supabaseAdmin, handleSupabaseError } from '../supabase/client';
import type { LedgerEntry, LedgerEntryInsert, LedgerEntryUpdate } from '../supabase/types';

export class LedgerService {
  /**
   * Get all ledger entries with optional filtering and pagination
   */
  static async getAll(options?: {
    customerId?: string;
    invoiceId?: string;
    transactionType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    orderBy?: keyof LedgerEntry;
    orderDirection?: 'asc' | 'desc';
  }) {
    try {
      let query = supabase
        .from('ledger_entries')
        .select(`
          *,
          customers(name, phone),
          invoices(invoice_number, type)
        `);

      // Apply filters
      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId);
      }

      if (options?.invoiceId) {
        query = query.eq('invoice_id', options.invoiceId);
      }

      if (options?.transactionType) {
        query = query.eq('transaction_type', options.transactionType);
      }

      if (options?.dateFrom) {
        query = query.gte('transaction_date', options.dateFrom);
      }

      if (options?.dateTo) {
        query = query.lte('transaction_date', options.dateTo);
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy, { 
          ascending: options.orderDirection === 'asc' 
        });
      } else {
        query = query.order('transaction_date', { ascending: false });
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
      console.error('Error fetching ledger entries:', error);
      throw error;
    }
  }

  /**
   * Get a single ledger entry by ID
   */
  static async getById(id: string): Promise<LedgerEntry | null> {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select(`
          *,
          customers(name, phone),
          invoices(invoice_number, type)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Ledger entry not found
        }
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error fetching ledger entry:', error);
      throw error;
    }
  }

  /**
   * Create a new ledger entry with proper balance calculation
   */
  static async create(entry: LedgerEntryInsert): Promise<LedgerEntry> {
    try {
      // Get current balance for the customer
      let currentBalance = 0;
      if (entry.customer_id) {
        currentBalance = await this.getCustomerBalance(entry.customer_id);
      }

      // Calculate new balance
      const newBalance = currentBalance + (entry.debit_amount || 0) - (entry.credit_amount || 0);

      // Create entry with calculated balance
      const entryWithBalance = {
        ...entry,
        balance: newBalance,
        transaction_date: entry.transaction_date || new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('ledger_entries')
        .insert(entryWithBalance)
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error creating ledger entry:', error);
      throw error;
    }
  }

  /**
   * Update an existing ledger entry
   */
  static async update(id: string, updates: LedgerEntryUpdate): Promise<LedgerEntry> {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error updating ledger entry:', error);
      throw error;
    }
  }

  /**
   * Delete a ledger entry
   */
  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ledger_entries')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }
    } catch (error) {
      console.error('Error deleting ledger entry:', error);
      throw error;
    }
  }

  /**
   * Get customer ledger with running balance
   */
  static async getCustomerLedger(customerId: string, options?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabase
        .from('ledger_entries')
        .select(`
          *,
          invoices(invoice_number, type, invoice_date)
        `)
        .eq('customer_id', customerId);

      // Apply date filters
      if (options?.dateFrom) {
        query = query.gte('transaction_date', options.dateFrom);
      }

      if (options?.dateTo) {
        query = query.lte('transaction_date', options.dateTo);
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      query = query.order('transaction_date', { ascending: true });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      // Calculate running balance if not already calculated
      const entries = data || [];
      let runningBalance = 0;
      
      const entriesWithBalance = entries.map(entry => {
        // If balance is already calculated in the database, use it
        if (entry.balance !== null && entry.balance !== undefined) {
          runningBalance = entry.balance;
          return entry;
        }
        
        // Otherwise calculate running balance
        runningBalance += entry.debit_amount - entry.credit_amount;
        return {
          ...entry,
          balance: runningBalance
        };
      });

      return { data: entriesWithBalance, count: count || 0 };
    } catch (error) {
      console.error('Error fetching customer ledger:', error);
      throw error;
    }
  }

  /**
   * Get current balance for a customer
   */
  static async getCustomerBalance(customerId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('balance')
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return 0; // No entries found, balance is 0
        }
        throw new Error(handleSupabaseError(error));
      }

      return data?.balance || 0;
    } catch (error) {
      console.error('Error fetching customer balance:', error);
      throw error;
    }
  }

  /**
   * Get all customers with their current balances
   */
  static async getAllCustomerBalances() {
    try {
      // This query gets the latest ledger entry for each customer
      const { data, error } = await supabase
        .from('ledger_entries')
        .select(`
          customer_id,
          balance,
          customers(name, phone)
        `)
        .order('customer_id')
        .order('transaction_date', { ascending: false });

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      // Group by customer and get the latest balance for each
      const customerBalances = new Map();
      
      data?.forEach(entry => {
        if (!customerBalances.has(entry.customer_id)) {
          customerBalances.set(entry.customer_id, {
            customer_id: entry.customer_id,
            customer_name: entry.customers?.name,
            customer_phone: entry.customers?.phone,
            balance: entry.balance
          });
        }
      });

      return Array.from(customerBalances.values());
    } catch (error) {
      console.error('Error fetching all customer balances:', error);
      throw error;
    }
  }

  /**
   * Create invoice ledger entry
   */
  static async createInvoiceEntry(
    customerId: string,
    invoiceId: string,
    amount: number,
    invoiceNumber: string
  ): Promise<LedgerEntry> {
    try {
      return await this.create({
        customer_id: customerId,
        invoice_id: invoiceId,
        transaction_type: 'invoice',
        debit_amount: amount,
        credit_amount: 0,
        description: `Invoice ${invoiceNumber}`
      });
    } catch (error) {
      console.error('Error creating invoice ledger entry:', error);
      throw error;
    }
  }

  /**
   * Create payment ledger entry
   */
  static async createPaymentEntry(
    customerId: string,
    invoiceId: string | null,
    amount: number,
    description?: string
  ): Promise<LedgerEntry> {
    try {
      return await this.create({
        customer_id: customerId,
        invoice_id: invoiceId,
        transaction_type: 'payment',
        debit_amount: 0,
        credit_amount: amount,
        description: description || 'Payment received'
      });
    } catch (error) {
      console.error('Error creating payment ledger entry:', error);
      throw error;
    }
  }

  /**
   * Create adjustment ledger entry
   */
  static async createAdjustmentEntry(
    customerId: string,
    amount: number,
    type: 'debit' | 'credit',
    description: string
  ): Promise<LedgerEntry> {
    try {
      return await this.create({
        customer_id: customerId,
        invoice_id: null,
        transaction_type: 'adjustment',
        debit_amount: type === 'debit' ? amount : 0,
        credit_amount: type === 'credit' ? amount : 0,
        description
      });
    } catch (error) {
      console.error('Error creating adjustment ledger entry:', error);
      throw error;
    }
  }

  /**
   * Get outstanding receivables summary
   */
  static async getOutstandingReceivables() {
    try {
      const balances = await this.getAllCustomerBalances();
      
      const summary = {
        totalOutstanding: 0,
        customersWithBalance: 0,
        largestBalance: 0,
        averageBalance: 0
      };

      const positiveBalances = balances.filter(b => b.balance > 0);
      
      summary.customersWithBalance = positiveBalances.length;
      summary.totalOutstanding = positiveBalances.reduce((sum, b) => sum + b.balance, 0);
      summary.largestBalance = Math.max(...positiveBalances.map(b => b.balance), 0);
      summary.averageBalance = summary.customersWithBalance > 0 
        ? summary.totalOutstanding / summary.customersWithBalance 
        : 0;

      return {
        ...summary,
        customers: positiveBalances.sort((a, b) => b.balance - a.balance)
      };
    } catch (error) {
      console.error('Error getting outstanding receivables:', error);
      throw error;
    }
  }

  /**
   * Get ledger entries for a specific date range
   */
  static async getEntriesByDateRange(dateFrom: string, dateTo: string) {
    try {
      return await this.getAll({
        dateFrom,
        dateTo,
        orderBy: 'transaction_date',
        orderDirection: 'asc'
      });
    } catch (error) {
      console.error('Error fetching entries by date range:', error);
      throw error;
    }
  }

  /**
   * Get transaction summary for a date range
   */
  static async getTransactionSummary(dateFrom: string, dateTo: string) {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('transaction_type, debit_amount, credit_amount')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      const summary = {
        totalDebits: 0,
        totalCredits: 0,
        netAmount: 0,
        transactionCount: data?.length || 0,
        byType: {} as Record<string, { debits: number; credits: number; count: number }>
      };

      data?.forEach(entry => {
        summary.totalDebits += entry.debit_amount;
        summary.totalCredits += entry.credit_amount;

        if (!summary.byType[entry.transaction_type]) {
          summary.byType[entry.transaction_type] = { debits: 0, credits: 0, count: 0 };
        }

        summary.byType[entry.transaction_type].debits += entry.debit_amount;
        summary.byType[entry.transaction_type].credits += entry.credit_amount;
        summary.byType[entry.transaction_type].count += 1;
      });

      summary.netAmount = summary.totalDebits - summary.totalCredits;

      return summary;
    } catch (error) {
      console.error('Error getting transaction summary:', error);
      throw error;
    }
  }
}