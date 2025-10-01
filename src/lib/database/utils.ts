import { supabase, supabaseAdmin } from '../supabase/client';

/**
 * Database utility functions for SmartBooks
 */
export class DatabaseUtils {
  /**
   * Test database connection
   */
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('count')
        .limit(1);

      if (error) {
        return {
          success: false,
          message: 'Database connection failed',
          details: error
        };
      }

      return {
        success: true,
        message: 'Database connection successful',
        details: { recordCount: data?.length || 0 }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database connection error',
        details: error
      };
    }
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats(): Promise<{
    customers: number;
    items: number;
    invoices: number;
    ledgerEntries: number;
    stockMovements: number;
    taxProfiles: number;
    whatsappLogs: number;
  }> {
    try {
      const [
        customersResult,
        itemsResult,
        invoicesResult,
        ledgerResult,
        stockResult,
        taxResult,
        whatsappResult
      ] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('items').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id', { count: 'exact', head: true }),
        supabase.from('ledger_entries').select('id', { count: 'exact', head: true }),
        supabase.from('stock_movements').select('id', { count: 'exact', head: true }),
        supabase.from('tax_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('whatsapp_logs').select('id', { count: 'exact', head: true })
      ]);

      return {
        customers: customersResult.count || 0,
        items: itemsResult.count || 0,
        invoices: invoicesResult.count || 0,
        ledgerEntries: ledgerResult.count || 0,
        stockMovements: stockResult.count || 0,
        taxProfiles: taxResult.count || 0,
        whatsappLogs: whatsappResult.count || 0
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old data based on retention policies
   */
  static async cleanupOldData(options: {
    whatsappLogsDays?: number;
    stockMovementsDays?: number;
    ledgerEntriesDays?: number;
  } = {}): Promise<{
    whatsappLogsDeleted: number;
    stockMovementsDeleted: number;
    ledgerEntriesDeleted: number;
  }> {
    try {
      const {
        whatsappLogsDays = 90,
        stockMovementsDays = 365,
        ledgerEntriesDays = 1095 // 3 years
      } = options;

      const results = {
        whatsappLogsDeleted: 0,
        stockMovementsDeleted: 0,
        ledgerEntriesDeleted: 0
      };

      // Clean up old WhatsApp logs
      if (whatsappLogsDays > 0) {
        const whatsappCutoff = new Date();
        whatsappCutoff.setDate(whatsappCutoff.getDate() - whatsappLogsDays);

        const { data: deletedWhatsapp } = await supabaseAdmin
          .from('whatsapp_logs')
          .delete()
          .lt('created_at', whatsappCutoff.toISOString())
          .select('id');

        results.whatsappLogsDeleted = deletedWhatsapp?.length || 0;
      }

      // Clean up old stock movements (keep recent ones for reporting)
      if (stockMovementsDays > 0) {
        const stockCutoff = new Date();
        stockCutoff.setDate(stockCutoff.getDate() - stockMovementsDays);

        const { data: deletedStock } = await supabaseAdmin
          .from('stock_movements')
          .delete()
          .lt('movement_date', stockCutoff.toISOString())
          .is('invoice_id', null) // Only delete adjustments, keep invoice-related movements
          .select('id');

        results.stockMovementsDeleted = deletedStock?.length || 0;
      }

      // Clean up very old ledger entries (be very careful with this)
      if (ledgerEntriesDays > 0) {
        const ledgerCutoff = new Date();
        ledgerCutoff.setDate(ledgerCutoff.getDate() - ledgerEntriesDays);

        // Only delete entries for customers with zero balance
        const { data: deletedLedger } = await supabaseAdmin
          .from('ledger_entries')
          .delete()
          .lt('transaction_date', ledgerCutoff.toISOString())
          .in('customer_id', 
            supabase
              .from('customer_balances')
              .select('id')
              .eq('current_balance', 0)
          )
          .select('id');

        results.ledgerEntriesDeleted = deletedLedger?.length || 0;
      }

      return results;
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw error;
    }
  }

  /**
   * Backup database data to JSON
   */
  static async backupData(): Promise<{
    customers: any[];
    items: any[];
    invoices: any[];
    ledgerEntries: any[];
    stockMovements: any[];
    taxProfiles: any[];
    whatsappLogs: any[];
    timestamp: string;
  }> {
    try {
      const [
        customers,
        items,
        invoices,
        ledgerEntries,
        stockMovements,
        taxProfiles,
        whatsappLogs
      ] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('items').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('ledger_entries').select('*'),
        supabase.from('stock_movements').select('*'),
        supabase.from('tax_profiles').select('*'),
        supabase.from('whatsapp_logs').select('*')
      ]);

      return {
        customers: customers.data || [],
        items: items.data || [],
        invoices: invoices.data || [],
        ledgerEntries: ledgerEntries.data || [],
        stockMovements: stockMovements.data || [],
        taxProfiles: taxProfiles.data || [],
        whatsappLogs: whatsappLogs.data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error backing up data:', error);
      throw error;
    }
  }

  /**
   * Validate data integrity
   */
  static async validateDataIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    try {
      const issues: string[] = [];

      // Check for orphaned records
      
      // 1. Invoices with invalid customer references
      const { data: orphanedInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('type', 'sales')
        .is('customer_id', null);

      if (orphanedInvoices && orphanedInvoices.length > 0) {
        issues.push(`Found ${orphanedInvoices.length} sales invoices without customer references`);
      }

      // 2. Ledger entries with invalid customer references
      const { data: orphanedLedger } = await supabase
        .from('ledger_entries')
        .select('id')
        .not('customer_id', 'in', 
          supabase.from('customers').select('id')
        );

      if (orphanedLedger && orphanedLedger.length > 0) {
        issues.push(`Found ${orphanedLedger.length} ledger entries with invalid customer references`);
      }

      // 3. Stock movements with invalid item references
      const { data: orphanedStock } = await supabase
        .from('stock_movements')
        .select('id')
        .not('item_id', 'in', 
          supabase.from('items').select('id')
        );

      if (orphanedStock && orphanedStock.length > 0) {
        issues.push(`Found ${orphanedStock.length} stock movements with invalid item references`);
      }

      // 4. Check for negative stock levels
      const { data: negativeStock } = await supabase
        .from('items')
        .select('id, sku, name, current_stock')
        .lt('current_stock', 0);

      if (negativeStock && negativeStock.length > 0) {
        issues.push(`Found ${negativeStock.length} items with negative stock levels`);
      }

      // 5. Check for inconsistent ledger balances
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name');

      for (const customer of customers || []) {
        const { data: ledgerEntries } = await supabase
          .from('ledger_entries')
          .select('debit_amount, credit_amount, balance')
          .eq('customer_id', customer.id)
          .order('transaction_date', { ascending: true });

        if (ledgerEntries && ledgerEntries.length > 0) {
          let calculatedBalance = 0;
          for (const entry of ledgerEntries) {
            calculatedBalance += entry.debit_amount - entry.credit_amount;
            if (Math.abs(calculatedBalance - entry.balance) > 0.01) {
              issues.push(`Inconsistent balance for customer ${customer.name}: calculated ${calculatedBalance}, stored ${entry.balance}`);
              break;
            }
          }
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error validating data integrity:', error);
      return {
        valid: false,
        issues: [`Validation error: ${error}`]
      };
    }
  }

  /**
   * Optimize database performance
   */
  static async optimizeDatabase(): Promise<{
    success: boolean;
    operations: string[];
    errors: string[];
  }> {
    try {
      const operations: string[] = [];
      const errors: string[] = [];

      // Analyze tables for better query planning
      const tables = [
        'customers',
        'items',
        'invoices',
        'ledger_entries',
        'stock_movements',
        'tax_profiles',
        'whatsapp_logs'
      ];

      for (const table of tables) {
        try {
          await supabaseAdmin.rpc('exec_sql', {
            sql: `ANALYZE ${table};`
          });
          operations.push(`Analyzed table: ${table}`);
        } catch (error) {
          errors.push(`Failed to analyze table ${table}: ${error}`);
        }
      }

      // Update table statistics
      try {
        await supabaseAdmin.rpc('exec_sql', {
          sql: 'VACUUM ANALYZE;'
        });
        operations.push('Updated database statistics');
      } catch (error) {
        errors.push(`Failed to update statistics: ${error}`);
      }

      return {
        success: errors.length === 0,
        operations,
        errors
      };
    } catch (error) {
      console.error('Error optimizing database:', error);
      return {
        success: false,
        operations: [],
        errors: [`Optimization error: ${error}`]
      };
    }
  }

  /**
   * Get table sizes and disk usage
   */
  static async getTableSizes(): Promise<Array<{
    table: string;
    size: string;
    rows: number;
  }>> {
    try {
      const { data, error } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename as table,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_stat_get_tuples_returned(c.oid) as rows
          FROM pg_tables pt
          JOIN pg_class c ON c.relname = pt.tablename
          WHERE schemaname = 'public'
          AND tablename IN ('customers', 'items', 'invoices', 'ledger_entries', 'stock_movements', 'tax_profiles', 'whatsapp_logs')
          ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        `
      });

      if (error) {
        throw new Error(`Failed to get table sizes: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting table sizes:', error);
      throw error;
    }
  }

  /**
   * Execute custom SQL query (admin only)
   */
  static async executeQuery(sql: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabaseAdmin.rpc('exec_sql', {
        sql
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: `Query execution error: ${error}`
      };
    }
  }

  /**
   * Create database indexes for better performance
   */
  static async createOptimizationIndexes(): Promise<{
    success: boolean;
    created: string[];
    errors: string[];
  }> {
    try {
      const created: string[] = [];
      const errors: string[] = [];

      const indexes = [
        // Composite indexes for common queries
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_date_type ON invoices(invoice_date, type)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_customer_date ON ledger_entries(customer_id, transaction_date DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_item_date ON stock_movements(item_id, movement_date DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_category_brand ON items(category, brand)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_status_date ON whatsapp_logs(status, created_at DESC)',
        
        // Partial indexes for specific conditions
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_overdue ON invoices(due_date) WHERE status = \'pending\' AND type = \'sales\'',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_low_stock ON items(current_stock) WHERE current_stock <= reorder_level',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_pending ON whatsapp_logs(created_at) WHERE status = \'pending\'',
        
        // Text search indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_name_gin ON customers USING gin(name gin_trgm_ops)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_name_gin ON items USING gin(name gin_trgm_ops)'
      ];

      for (const indexSql of indexes) {
        try {
          await supabaseAdmin.rpc('exec_sql', { sql: indexSql });
          created.push(indexSql.split(' ')[5]); // Extract index name
        } catch (error) {
          errors.push(`Failed to create index: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        created,
        errors
      };
    } catch (error) {
      console.error('Error creating optimization indexes:', error);
      return {
        success: false,
        created: [],
        errors: [`Index creation error: ${error}`]
      };
    }
  }
}

// Export utility functions for common database operations
export const dbUtils = {
  testConnection: DatabaseUtils.testConnection,
  getStats: DatabaseUtils.getDatabaseStats,
  cleanup: DatabaseUtils.cleanupOldData,
  backup: DatabaseUtils.backupData,
  validate: DatabaseUtils.validateDataIntegrity,
  optimize: DatabaseUtils.optimizeDatabase,
  getTableSizes: DatabaseUtils.getTableSizes,
  executeQuery: DatabaseUtils.executeQuery,
  createIndexes: DatabaseUtils.createOptimizationIndexes
};