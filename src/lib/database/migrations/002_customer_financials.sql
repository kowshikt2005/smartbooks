-- Migration 002: Customer Financial Fields
-- This migration adds bank balance and outstanding purchase amount fields to customers
-- and creates a customer_ledger table for tracking financial transactions

-- Add financial fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS bank_balance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS outstanding_purchase_amount DECIMAL(12,2) DEFAULT 0;

-- Add constraints for the new fields
ALTER TABLE customers 
ADD CONSTRAINT IF NOT EXISTS customers_bank_balance_non_negative CHECK (bank_balance >= 0),
ADD CONSTRAINT IF NOT EXISTS customers_outstanding_purchase_amount_non_negative CHECK (outstanding_purchase_amount >= 0);

-- Create customer_ledger table for tracking financial transactions
CREATE TABLE IF NOT EXISTS customer_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    bank_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT customer_ledger_transaction_type_not_empty CHECK (LENGTH(TRIM(transaction_type)) > 0),
    CONSTRAINT customer_ledger_bank_balance_non_negative CHECK (bank_balance >= 0),
    CONSTRAINT customer_ledger_outstanding_amount_non_negative CHECK (outstanding_amount >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_bank_balance ON customers(bank_balance);
CREATE INDEX IF NOT EXISTS idx_customers_outstanding_purchase_amount ON customers(outstanding_purchase_amount);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_created_at ON customer_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_transaction_type ON customer_ledger(transaction_type);

-- Function to update customer balances when ledger entries are added
CREATE OR REPLACE FUNCTION update_customer_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the customer's current balances based on the latest ledger entry
    UPDATE customers 
    SET 
        bank_balance = NEW.bank_balance,
        outstanding_purchase_amount = NEW.outstanding_amount,
        updated_at = NOW()
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update customer balances when ledger entries are added
DROP TRIGGER IF EXISTS trigger_update_customer_balances ON customer_ledger;
CREATE TRIGGER trigger_update_customer_balances
    AFTER INSERT ON customer_ledger
    FOR EACH ROW EXECUTE FUNCTION update_customer_balances();

-- Initialize existing customers with random financial data
DO $$
DECLARE
    customer_record RECORD;
    random_bank_balance DECIMAL(12,2);
    random_outstanding DECIMAL(12,2);
BEGIN
    FOR customer_record IN SELECT id FROM customers LOOP
        -- Generate random bank balance between 50,000 and 200,000
        random_bank_balance := (RANDOM() * 150000 + 50000)::DECIMAL(12,2);
        
        -- Generate random outstanding amount between 5,000 and 25,000
        random_outstanding := (RANDOM() * 20000 + 5000)::DECIMAL(12,2);
        
        -- Update customer with initial balances
        UPDATE customers 
        SET 
            bank_balance = random_bank_balance,
            outstanding_purchase_amount = random_outstanding,
            updated_at = NOW()
        WHERE id = customer_record.id;
        
        -- Create initial ledger entry
        INSERT INTO customer_ledger (
            customer_id,
            transaction_type,
            description,
            amount,
            bank_balance,
            outstanding_amount,
            created_at
        ) VALUES (
            customer_record.id,
            'INITIAL',
            'Initial balance setup',
            random_bank_balance,
            random_bank_balance,
            random_outstanding,
            NOW()
        );
    END LOOP;
END $$;