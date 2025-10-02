# Database Migration Guide

## Overview
This guide explains how to migrate from the old customer schema to the new schema with the updated fields.

## New Schema Fields
The new customer table includes the following fields:
- `location` - Customer location
- `grn_no` - GRN number
- `grn_date` - GRN date
- `month_year` - Month-year period
- `phone_no` - Phone number (renamed from phone)
- `invoice_id` - Invoice ID (replaces address field)
- `invoice_num` - Invoice number
- `name` - Customer name (unchanged)
- `adjusted_amount` - Adjusted amount
- `tds` - TDS amount
- `paid_amount` - Paid amount (replaces bank_balance)
- `branding_adjustment` - Branding adjustment amount
- `balance_pays` - Balance amount (replaces outstanding_purchase_amount)
- `payment_date` - Payment date

## Migration Steps

### Step 1: Run Database Migrations
Execute the following SQL files in your Supabase SQL editor:

1. **Schema Migration**: `src/lib/database/migrations/003_new_customer_schema.sql`
   - Drops the old customers table
   - Creates the new customers table with updated schema
   - Adds proper indexes and constraints

2. **Seed Data**: `src/lib/database/migrations/004_seed_new_customer_data.sql`
   - Inserts 25 mock customer records
   - Includes realistic Indian business data
   - Covers different scenarios (with/without phone numbers, various amounts)

### Step 2: Verify Migration
After running the migrations, verify:
- The new customers table exists with correct schema
- Mock data is properly inserted
- All constraints and indexes are in place

### Step 3: Test Application
1. Start the development server: `npm run dev`
2. Navigate to the dashboard to see updated statistics
3. Check the customers page to see the new data structure
4. Test WhatsApp functionality with the new invoice_id field

## Key Changes Made

### Database Schema
- Completely new table structure focused on invoice and payment tracking
- Removed GST and address fields
- Added financial tracking fields (TDS, adjustments, etc.)

### Application Updates
- Updated TypeScript types to match new schema
- Modified customer service to work with new fields
- Disabled customer creation functionality
- Updated dashboard statistics to show new financial metrics
- Modified WhatsApp messages to include invoice_id instead of address

### UI Changes
- Customer list now shows location, invoice_id, and balance instead of old fields
- Dashboard shows 5 financial metrics instead of 3
- WhatsApp page updated to work with phone_no and balance_pays fields
- Removed "Add Customer" button as per requirements

## Mock Data Overview
The seed data includes:
- 25 customer records across major Indian cities
- Realistic financial amounts in INR
- Mix of paid and unpaid invoices
- Some customers without phone numbers for testing
- Date ranges from January to March 2024

## Rollback Plan
If you need to rollback:
1. Backup the new data if needed
2. Drop the new customers table
3. Restore the original schema from `src/lib/database/schema.sql`
4. Revert the code changes in git

## Support
If you encounter any issues during migration:
1. Check the browser console for errors
2. Verify all environment variables are set correctly
3. Ensure Supabase connection is working
4. Check that all migration files executed successfully