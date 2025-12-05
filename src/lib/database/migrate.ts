import { supabaseAdmin } from '../supabase/client';
import { readFileSync } from 'fs';
import { join } from 'path';

interface Migration {
  id: string;
  name: string;
  filename: string;
  executed_at?: string;
}

export class DatabaseMigrator {
  private static readonly MIGRATIONS_TABLE = 'schema_migrations';
  
  /**
   * Initialize the migrations table
   */
  static async initializeMigrationsTable(): Promise<void> {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ${this.MIGRATIONS_TABLE} (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            filename VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });

      if (error) {
        throw new Error(`Failed to initialize migrations table: ${error.message}`);
      }

      console.log('✅ Migrations table initialized');
    } catch (error) {
      console.error('❌ Error initializing migrations table:', error);
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  static async getExecutedMigrations(): Promise<Migration[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.MIGRATIONS_TABLE)
        .select('*')
        .order('id');

      if (error) {
        throw new Error(`Failed to get executed migrations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error getting executed migrations:', error);
      throw error;
    }
  }

  /**
   * Mark migration as executed
   */
  static async markMigrationAsExecuted(migration: Omit<Migration, 'executed_at'>): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from(this.MIGRATIONS_TABLE)
        .insert({
          id: migration.id,
          name: migration.name,
          filename: migration.filename
        });

      if (error) {
        throw new Error(`Failed to mark migration as executed: ${error.message}`);
      }

      console.log(`✅ Migration ${migration.id} marked as executed`);
    } catch (error) {
      console.error(`❌ Error marking migration ${migration.id} as executed:`, error);
      throw error;
    }
  }

  /**
   * Execute a single migration file
   */
  static async executeMigration(migrationPath: string, migration: Omit<Migration, 'executed_at'>): Promise<void> {
    try {
      console.log(`🔄 Executing migration: ${migration.name}`);

      // Read the migration file
      const sql = readFileSync(migrationPath, 'utf8');

      // Split SQL into individual statements (basic splitting by semicolon)
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabaseAdmin.rpc('exec_sql', {
            sql: statement
          });

          if (error) {
            throw new Error(`Failed to execute statement: ${error.message}\nStatement: ${statement}`);
          }
        }
      }

      // Mark migration as executed
      await this.markMigrationAsExecuted(migration);

      console.log(`✅ Migration ${migration.name} executed successfully`);
    } catch (error) {
      console.error(`❌ Error executing migration ${migration.name}:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  static async runMigrations(migrationsDir?: string): Promise<void> {
    try {
      console.log('🚀 Starting database migrations...');

      // Initialize migrations table
      await this.initializeMigrationsTable();

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      const executedIds = new Set(executedMigrations.map(m => m.id));

      // Define available migrations
      const availableMigrations: Omit<Migration, 'executed_at'>[] = [
        {
          id: '001',
          name: 'Initial Schema',
          filename: '001_initial_schema.sql'
        },
        {
          id: '002',
          name: 'Seed Data',
          filename: '002_seed_data.sql'
        },
        {
          id: '005',
          name: 'Simplified Customer Schema',
          filename: '005_simplified_customer_schema.sql'
        },
        {
          id: '006',
          name: 'Seed Simplified Customer Data',
          filename: '006_seed_simplified_customer_data.sql'
        },
        {
          id: '007',
          name: 'WhatsApp Mappings Table',
          filename: '007_whatsapp_mappings_table.sql'
        },
        {
          id: '008',
          name: 'WhatsApp Messages Table',
          filename: '008_whatsapp_messages_table.sql'
        },
        {
          id: '009',
          name: 'WhatsApp Templates Table',
          filename: '009_whatsapp_templates_table.sql'
        },
        {
          id: '010',
          name: 'WhatsApp Campaigns Table',
          filename: '010_whatsapp_campaigns_table.sql'
        }
      ];

      // Filter pending migrations
      const pendingMigrations = availableMigrations.filter(m => !executedIds.has(m.id));

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations to run');
        return;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

      // Execute pending migrations
      const basePath = migrationsDir || join(process.cwd(), 'src/lib/database/migrations');
      
      for (const migration of pendingMigrations) {
        const migrationPath = join(basePath, migration.filename);
        await this.executeMigration(migrationPath, migration);
      }

      console.log('🎉 All migrations completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback a specific migration (basic implementation)
   */
  static async rollbackMigration(migrationId: string): Promise<void> {
    try {
      console.log(`🔄 Rolling back migration: ${migrationId}`);

      // Remove from migrations table
      const { error } = await supabaseAdmin
        .from(this.MIGRATIONS_TABLE)
        .delete()
        .eq('id', migrationId);

      if (error) {
        throw new Error(`Failed to rollback migration: ${error.message}`);
      }

      console.log(`✅ Migration ${migrationId} rolled back`);
      console.log('⚠️  Note: This only removes the migration record. Manual cleanup may be required.');
    } catch (error) {
      console.error(`❌ Error rolling back migration ${migrationId}:`, error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  static async getMigrationStatus(): Promise<{
    executed: Migration[];
    pending: string[];
    total: number;
  }> {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const executedIds = new Set(executedMigrations.map(m => m.id));

      const allMigrations = ['001', '002', '005', '006', '007', '008', '009', '010']; // Add new migration IDs here
      const pendingMigrations = allMigrations.filter(id => !executedIds.has(id));

      return {
        executed: executedMigrations,
        pending: pendingMigrations,
        total: allMigrations.length
      };
    } catch (error) {
      console.error('❌ Error getting migration status:', error);
      throw error;
    }
  }

  /**
   * Reset database (drop all tables and re-run migrations)
   * ⚠️ WARNING: This will delete all data!
   */
  static async resetDatabase(): Promise<void> {
    try {
      console.log('⚠️  WARNING: This will delete all data!');
      console.log('🔄 Resetting database...');

      // Drop all tables
      const dropTablesSQL = `
        DROP TABLE IF EXISTS whatsapp_messages CASCADE;
        DROP TABLE IF EXISTS whatsapp_campaigns CASCADE;
        DROP TABLE IF EXISTS whatsapp_templates CASCADE;
        DROP TABLE IF EXISTS whatsapp_mappings CASCADE;
        DROP TABLE IF EXISTS whatsapp_logs CASCADE;
        DROP TABLE IF EXISTS stock_movements CASCADE;
        DROP TABLE IF EXISTS ledger_entries CASCADE;
        DROP TABLE IF EXISTS invoices CASCADE;
        DROP TABLE IF EXISTS tax_profiles CASCADE;
        DROP TABLE IF EXISTS items CASCADE;
        DROP TABLE IF EXISTS customers CASCADE;
        DROP TABLE IF EXISTS ${this.MIGRATIONS_TABLE} CASCADE;
        
        -- Drop custom types
        DROP TYPE IF EXISTS invoice_type CASCADE;
        DROP TYPE IF EXISTS invoice_status CASCADE;
        DROP TYPE IF EXISTS movement_type CASCADE;
        DROP TYPE IF EXISTS whatsapp_status CASCADE;
        
        -- Drop views
        DROP VIEW IF EXISTS whatsapp_campaign_summary CASCADE;
        DROP VIEW IF EXISTS customer_balances CASCADE;
        DROP VIEW IF EXISTS low_stock_items CASCADE;
        DROP VIEW IF EXISTS overdue_invoices CASCADE;
      `;

      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: dropTablesSQL
      });

      if (error) {
        throw new Error(`Failed to drop tables: ${error.message}`);
      }

      console.log('✅ All tables dropped');

      // Re-run all migrations
      await this.runMigrations();

      console.log('🎉 Database reset completed successfully!');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  /**
   * Validate database schema
   */
  static async validateSchema(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    try {
      const issues: string[] = [];

      // Check if all required tables exist
      const requiredTables = [
        'customers',
        'items',
        'invoices',
        'ledger_entries',
        'stock_movements',
        'tax_profiles',
        'whatsapp_logs',
        'whatsapp_mappings',
        'whatsapp_messages',
        'whatsapp_templates',
        'whatsapp_campaigns'
      ];

      for (const table of requiredTables) {
        const { data, error } = await supabaseAdmin
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', table);

        if (error || !data || data.length === 0) {
          issues.push(`Missing table: ${table}`);
        }
      }

      // Check if RLS is enabled
      for (const table of requiredTables) {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
          sql: `SELECT relrowsecurity FROM pg_class WHERE relname = '${table}';`
        });

        if (error || !data || data.length === 0 || !data[0].relrowsecurity) {
          issues.push(`RLS not enabled on table: ${table}`);
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('❌ Error validating schema:', error);
      return {
        valid: false,
        issues: [`Validation error: ${error}`]
      };
    }
  }
}

// CLI interface for running migrations
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'migrate':
      DatabaseMigrator.runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case 'status':
      DatabaseMigrator.getMigrationStatus()
        .then(status => {
          console.log('📊 Migration Status:');
          console.log(`   Executed: ${status.executed.length}`);
          console.log(`   Pending: ${status.pending.length}`);
          console.log(`   Total: ${status.total}`);
          
          if (status.executed.length > 0) {
            console.log('\n✅ Executed migrations:');
            status.executed.forEach(m => {
              console.log(`   ${m.id}: ${m.name} (${m.executed_at})`);
            });
          }
          
          if (status.pending.length > 0) {
            console.log('\n⏳ Pending migrations:');
            status.pending.forEach(id => {
              console.log(`   ${id}`);
            });
          }
          
          process.exit(0);
        })
        .catch(() => process.exit(1));
      break;

    case 'reset':
      DatabaseMigrator.resetDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case 'validate':
      DatabaseMigrator.validateSchema()
        .then(result => {
          if (result.valid) {
            console.log('✅ Database schema is valid');
          } else {
            console.log('❌ Database schema validation failed:');
            result.issues.forEach(issue => console.log(`   - ${issue}`));
          }
          process.exit(result.valid ? 0 : 1);
        })
        .catch(() => process.exit(1));
      break;

    default:
      console.log('Usage: npm run migrate [command]');
      console.log('Commands:');
      console.log('  migrate  - Run pending migrations');
      console.log('  status   - Show migration status');
      console.log('  reset    - Reset database (⚠️  deletes all data)');
      console.log('  validate - Validate database schema');
      process.exit(1);
  }
}