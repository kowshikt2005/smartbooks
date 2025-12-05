-- Clear existing customer data
-- This migration removes all existing customer records to start fresh

-- Clear all existing customer records
DELETE FROM customers;

-- Reset the sequence if using auto-increment (not applicable for UUID, but good practice)
-- Note: Since we're using UUID primary keys, no sequence reset is needed

-- Add a comment to track this migration
COMMENT ON TABLE customers IS 'Customer table cleared on migration 005 - ready for new customer creation';