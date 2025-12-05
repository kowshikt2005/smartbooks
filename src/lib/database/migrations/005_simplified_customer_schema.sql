-- Simplified Customer Schema Migration
-- This migration simplifies the customer table to only include essential fields

-- Drop the old customers table and create new one with simplified schema
DROP TABLE IF EXISTS customers CASCADE;

-- Create new customers table with simplified schema
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone_no VARCHAR(20) NOT NULL,
    location VARCHAR(255),
    invoice_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT customers_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT customers_phone_not_empty CHECK (LENGTH(TRIM(phone_no)) > 0),
    CONSTRAINT customers_phone_format CHECK (phone_no ~ '^[+]?[0-9\s\-\(\)]+$')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone_no ON customers(phone_no);
CREATE INDEX IF NOT EXISTS idx_customers_invoice_id ON customers(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers(location);

-- Create trigger for updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();