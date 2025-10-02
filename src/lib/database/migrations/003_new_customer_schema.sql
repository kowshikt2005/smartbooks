-- New Customer Schema Migration
-- This migration creates a new table with the updated schema

-- Drop the old customers table and create new one with updated schema
DROP TABLE IF EXISTS customers CASCADE;

-- Create new customers table with updated schema
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location VARCHAR(255),
    grn_no VARCHAR(100),
    grn_date DATE,
    month_year VARCHAR(20),
    phone_no VARCHAR(20),
    invoice_id VARCHAR(100),
    invoice_num VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    adjusted_amount DECIMAL(12,2) DEFAULT 0,
    tds DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    branding_adjustment DECIMAL(12,2) DEFAULT 0,
    balance_pays DECIMAL(12,2) DEFAULT 0,
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT customers_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT customers_phone_format CHECK (phone_no IS NULL OR phone_no ~ '^[+]?[0-9\s\-\(\)]+$'),
    CONSTRAINT customers_adjusted_amount_non_negative CHECK (adjusted_amount >= 0),
    CONSTRAINT customers_tds_non_negative CHECK (tds >= 0),
    CONSTRAINT customers_paid_amount_non_negative CHECK (paid_amount >= 0),
    CONSTRAINT customers_branding_adjustment_non_negative CHECK (branding_adjustment >= 0),
    CONSTRAINT customers_balance_pays_non_negative CHECK (balance_pays >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone_no ON customers(phone_no);
CREATE INDEX IF NOT EXISTS idx_customers_invoice_id ON customers(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customers_invoice_num ON customers(invoice_num);
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers(location);
CREATE INDEX IF NOT EXISTS idx_customers_grn_no ON customers(grn_no);
CREATE INDEX IF NOT EXISTS idx_customers_month_year ON customers(month_year);
CREATE INDEX IF NOT EXISTS idx_customers_balance_pays ON customers(balance_pays);
CREATE INDEX IF NOT EXISTS idx_customers_payment_date ON customers(payment_date);

-- Create trigger for updated_at column
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();