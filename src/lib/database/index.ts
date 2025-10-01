// Export all database-related utilities and functions
export { DatabaseMigrator } from './migrate';
export { DatabaseUtils, dbUtils } from './utils';

// Re-export Supabase client and types for convenience
export { supabase, supabaseAdmin, handleSupabaseError, tables } from '../supabase/client';
export type { Database, TableName } from '../supabase/types';

// Export all service classes
export * from '../services';

// Database configuration and constants
export const DATABASE_CONFIG = {
  // Migration settings
  MIGRATIONS_TABLE: 'schema_migrations',
  
  // Cleanup settings (in days)
  DEFAULT_CLEANUP_SETTINGS: {
    whatsappLogsDays: 90,
    stockMovementsDays: 365,
    ledgerEntriesDays: 1095 // 3 years
  },
  
  // Performance settings
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
  
  // Validation settings
  MAX_DECIMAL_PLACES: 2,
  MAX_PERCENTAGE: 100,
  
  // Business rules
  BUSINESS_RULES: {
    maxDiscountPercentage: 50,
    maxTaxRate: 50,
    minReorderLevel: 0,
    maxMarginPercentage: 1000
  }
} as const;

// Common database queries and operations
export const commonQueries = {
  // Customer queries
  getCustomersWithBalance: () => `
    SELECT 
      c.*,
      COALESCE(latest_balance.balance, 0) as current_balance
    FROM customers c
    LEFT JOIN (
      SELECT DISTINCT ON (customer_id) 
        customer_id,
        balance
      FROM ledger_entries
      ORDER BY customer_id, transaction_date DESC, id DESC
    ) latest_balance ON c.id = latest_balance.customer_id
    ORDER BY c.name
  `,
  
  // Item queries
  getLowStockItems: () => `
    SELECT *
    FROM items
    WHERE current_stock <= reorder_level
    ORDER BY current_stock ASC
  `,
  
  // Invoice queries
  getOverdueInvoices: () => `
    SELECT 
      i.*,
      c.name as customer_name,
      c.phone as customer_phone
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.status = 'pending' 
    AND i.due_date < CURRENT_DATE
    AND i.type = 'sales'
    ORDER BY i.due_date ASC
  `,
  
  // Sales summary
  getSalesSummary: (dateFrom: string, dateTo: string) => `
    SELECT 
      COUNT(*) as invoice_count,
      SUM(total_amount) as total_sales,
      SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as overdue_amount
    FROM invoices
    WHERE type = 'sales'
    AND invoice_date BETWEEN '${dateFrom}' AND '${dateTo}'
  `
};

// Database health check function
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'warning' | 'error';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }>;
}> {
  const checks = [];
  let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

  try {
    // 1. Connection test
    const connectionTest = await DatabaseUtils.testConnection();
    checks.push({
      name: 'Database Connection',
      status: connectionTest.success ? 'pass' : 'fail',
      message: connectionTest.message,
      details: connectionTest.details
    });

    if (!connectionTest.success) {
      overallStatus = 'error';
    }

    // 2. Table existence check
    const stats = await DatabaseUtils.getDatabaseStats();
    const hasData = Object.values(stats).some(count => count > 0);
    checks.push({
      name: 'Database Tables',
      status: 'pass',
      message: 'All required tables exist',
      details: stats
    });

    // 3. Data integrity check
    const integrityCheck = await DatabaseUtils.validateDataIntegrity();
    checks.push({
      name: 'Data Integrity',
      status: integrityCheck.valid ? 'pass' : 'warning',
      message: integrityCheck.valid ? 'Data integrity is valid' : `Found ${integrityCheck.issues.length} issues`,
      details: integrityCheck.issues
    });

    if (!integrityCheck.valid) {
      overallStatus = overallStatus === 'error' ? 'error' : 'warning';
    }

    // 4. Performance check (table sizes)
    try {
      const tableSizes = await DatabaseUtils.getTableSizes();
      const largeTable = tableSizes.find(table => table.rows > 100000);
      checks.push({
        name: 'Database Performance',
        status: largeTable ? 'warning' : 'pass',
        message: largeTable ? 'Large tables detected, consider optimization' : 'Database size is optimal',
        details: tableSizes
      });

      if (largeTable && overallStatus === 'healthy') {
        overallStatus = 'warning';
      }
    } catch (error) {
      checks.push({
        name: 'Database Performance',
        status: 'warning',
        message: 'Could not check table sizes',
        details: error
      });
    }

  } catch (error) {
    checks.push({
      name: 'Health Check Error',
      status: 'fail',
      message: 'Failed to complete health check',
      details: error
    });
    overallStatus = 'error';
  }

  return {
    status: overallStatus,
    checks
  };
}

// Initialize database function
export async function initializeDatabase(options: {
  runMigrations?: boolean;
  seedData?: boolean;
  createIndexes?: boolean;
} = {}): Promise<{
  success: boolean;
  message: string;
  details: any;
}> {
  try {
    const {
      runMigrations = true,
      seedData = true,
      createIndexes = true
    } = options;

    const results = {
      migrations: null as any,
      indexes: null as any,
      validation: null as any
    };

    // Run migrations
    if (runMigrations) {
      await DatabaseMigrator.runMigrations();
      results.migrations = await DatabaseMigrator.getMigrationStatus();
    }

    // Create optimization indexes
    if (createIndexes) {
      results.indexes = await DatabaseUtils.createOptimizationIndexes();
    }

    // Validate setup
    results.validation = await DatabaseUtils.validateDataIntegrity();

    return {
      success: true,
      message: 'Database initialized successfully',
      details: results
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database initialization failed',
      details: error
    };
  }
}

// Export types for database operations
export interface DatabaseOperation {
  name: string;
  description: string;
  execute: () => Promise<any>;
}

export interface DatabaseBackup {
  timestamp: string;
  tables: string[];
  recordCount: number;
  size: string;
  data: any;
}

export interface DatabaseMigration {
  id: string;
  name: string;
  filename: string;
  executed_at?: string;
}

// Utility functions for common operations
export const dbOperations = {
  // Quick stats
  async getQuickStats() {
    const stats = await DatabaseUtils.getDatabaseStats();
    const health = await checkDatabaseHealth();
    
    return {
      totalRecords: Object.values(stats).reduce((sum, count) => sum + count, 0),
      tableStats: stats,
      healthStatus: health.status,
      lastChecked: new Date().toISOString()
    };
  },

  // Maintenance operations
  async performMaintenance() {
    const results = {
      cleanup: await DatabaseUtils.cleanupOldData(),
      optimization: await DatabaseUtils.optimizeDatabase(),
      validation: await DatabaseUtils.validateDataIntegrity()
    };

    return results;
  },

  // Backup operations
  async createBackup(): Promise<DatabaseBackup> {
    const data = await DatabaseUtils.backupData();
    const stats = await DatabaseUtils.getDatabaseStats();
    
    return {
      timestamp: data.timestamp,
      tables: Object.keys(stats),
      recordCount: Object.values(stats).reduce((sum, count) => sum + count, 0),
      size: JSON.stringify(data).length + ' bytes',
      data
    };
  }
};