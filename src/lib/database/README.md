# SmartBooks Database Setup

This directory contains all database-related files for the SmartBooks application, including schema definitions, migrations, and utilities.

## Structure

```
database/
├── README.md                 # This file
├── schema.sql               # Complete database schema
├── rls-policies.sql         # Row Level Security policies
├── migrate.ts               # Migration runner utility
├── utils.ts                 # Database utility functions
├── index.ts                 # Main exports
└── migrations/
    ├── 001_initial_schema.sql
    └── 002_seed_data.sql
```

## Quick Start

### 1. Environment Setup

Make sure your `.env.local` file has the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Migrations

```bash
# Check migration status
npm run db:status

# Run all pending migrations
npm run db:migrate

# Validate database schema
npm run db:validate
```

## Database Schema

The SmartBooks database consists of the following main tables:

### Core Tables

1. **customers** - Customer information and discount rules
2. **items** - Product/service items with pricing and stock
3. **invoices** - Sales and purchase invoices
4. **ledger_entries** - Customer account ledger with running balances
5. **stock_movements** - Inventory movement tracking
6. **tax_profiles** - Tax rate configurations
7. **whatsapp_logs** - WhatsApp message delivery logs

### Key Features

- **Automatic Stock Updates**: Stock levels are automatically updated when invoices are created
- **Running Balance Calculation**: Customer ledger maintains running balances automatically
- **Computed Fields**: Sales prices are automatically calculated from purchase price and margin
- **Data Integrity**: Comprehensive constraints and validation rules
- **Performance Optimized**: Strategic indexes for common queries

## Migrations

### Available Commands

```bash
# Run pending migrations
npm run db:migrate

# Check migration status
npm run db:status

# Reset database (⚠️ deletes all data)
npm run db:reset

# Validate database schema
npm run db:validate
```

### Creating New Migrations

1. Create a new SQL file in `migrations/` directory
2. Follow naming convention: `XXX_description.sql`
3. Add the migration to the `availableMigrations` array in `migrate.ts`
4. Run `npm run db:migrate`

### Migration Best Practices

- Always test migrations on a copy of production data
- Use transactions for complex migrations
- Include rollback instructions in comments
- Validate data integrity after migrations

## Row Level Security (RLS)

The database uses Supabase's Row Level Security for data access control:

- **Authenticated Users**: Can access all data (single-tenant setup)
- **Service Role**: Full administrative access
- **Anonymous Users**: No access

For multi-tenant setups, modify the RLS policies in `rls-policies.sql`.

## Database Services

The application includes comprehensive service classes for each table:

```typescript
import { CustomerService, ItemService, InvoiceService } from '@/lib/database';

// Example usage
const customers = await CustomerService.getAll();
const lowStockItems = await ItemService.getLowStockItems();
const overdueInvoices = await InvoiceService.getOverdueInvoices();
```

### Available Services

- `CustomerService` - Customer CRUD and balance operations
- `ItemService` - Item management and stock operations
- `InvoiceService` - Invoice processing and calculations
- `LedgerService` - Ledger entries and balance tracking
- `StockMovementService` - Inventory movement tracking
- `TaxProfileService` - Tax configuration management
- `WhatsAppLogService` - Message logging and statistics

## Database Utilities

### Health Checks

```typescript
import { checkDatabaseHealth } from '@/lib/database';

const health = await checkDatabaseHealth();
console.log(health.status); // 'healthy' | 'warning' | 'error'
```

### Maintenance Operations

```typescript
import { dbOperations } from '@/lib/database';

// Get quick statistics
const stats = await dbOperations.getQuickStats();

// Perform maintenance
const maintenance = await dbOperations.performMaintenance();

// Create backup
const backup = await dbOperations.createBackup();
```

### Data Cleanup

```typescript
import { DatabaseUtils } from '@/lib/database';

// Clean up old data
const cleanup = await DatabaseUtils.cleanupOldData({
  whatsappLogsDays: 90,
  stockMovementsDays: 365,
  ledgerEntriesDays: 1095
});
```

## Performance Optimization

### Indexes

The database includes optimized indexes for:

- Text search (using trigram indexes)
- Common query patterns
- Partial indexes for specific conditions
- Composite indexes for multi-column queries

### Query Optimization

- Use the provided service classes for optimized queries
- Leverage database views for complex reporting
- Use pagination for large datasets
- Monitor query performance with `EXPLAIN ANALYZE`

### Maintenance

Regular maintenance tasks:

```bash
# Analyze tables for better query planning
npm run db:optimize

# Clean up old data
npm run db:cleanup

# Validate data integrity
npm run db:validate
```

## Backup and Recovery

### Automated Backups

```typescript
import { dbOperations } from '@/lib/database';

// Create full backup
const backup = await dbOperations.createBackup();

// Save backup to file
fs.writeFileSync(`backup-${Date.now()}.json`, JSON.stringify(backup));
```

### Manual Backup (Supabase Dashboard)

1. Go to Supabase Dashboard
2. Navigate to Settings > Database
3. Click "Create Backup"
4. Download the backup file

### Recovery

For data recovery, use the Supabase Dashboard or restore from JSON backup using the migration system.

## Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check Supabase credentials
   - Verify service role permissions
   - Check for syntax errors in SQL

2. **RLS Blocks Queries**
   - Ensure user is authenticated
   - Check RLS policies
   - Use service role for admin operations

3. **Performance Issues**
   - Run `npm run db:optimize`
   - Check for missing indexes
   - Analyze slow queries

4. **Data Integrity Issues**
   - Run `npm run db:validate`
   - Check constraint violations
   - Verify trigger functions

### Getting Help

1. Check the console for detailed error messages
2. Use `npm run db:status` to check migration state
3. Run `npm run db:validate` to check data integrity
4. Review Supabase logs in the dashboard

## Development Workflow

### Local Development

1. Set up Supabase project
2. Configure environment variables
3. Run migrations: `npm run db:migrate`
4. Start development server: `npm run dev`

### Testing

1. Use seed data for consistent testing
2. Reset database between test runs if needed
3. Validate data integrity after tests

### Production Deployment

1. Run migrations on production database
2. Verify data integrity
3. Monitor performance
4. Set up automated backups

## Security Considerations

- Never expose service role key in client-side code
- Use RLS policies for data access control
- Validate all user inputs
- Monitor for suspicious database activity
- Regular security audits of database permissions

## Contributing

When making database changes:

1. Create a new migration file
2. Test thoroughly with sample data
3. Update service classes if needed
4. Document any breaking changes
5. Update this README if necessary