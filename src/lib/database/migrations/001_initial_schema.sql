-- Migration 001: Initial Schema
-- This migration creates the basic database structure for SmartBooks

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    gst_id VARCHAR(50),
    address TEXT,
    discount_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT customers_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT customers_phone_format CHECK (phone IS NULL OR phone ~ '^[+]?[0-9\s\-\(\)]+$'),
    CONSTRAINT customers_gst_format CHECK (gst_id IS NULL OR LENGTH(gst_id) >= 10)
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    sub_brand VARCHAR(100),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    unit VARCHAR(50),
    purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    margin_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    sales_price DECIMAL(10,2) GENERATED ALWAYS AS (purchase_price * (1 + margin_percentage/100)) STORED,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT items_sku_not_empty CHECK (LENGTH(TRIM(sku)) > 0),
    CONSTRAINT items_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT items_purchase_price_positive CHECK (purchase_price >= 0),
    CONSTRAINT items_margin_percentage_valid CHECK (margin_percentage >= 0 AND margin_percentage <= 1000),
    CONSTRAINT items_tax_rate_valid CHECK (tax_rate >= 0 AND tax_rate <= 100),
    CONSTRAINT items_current_stock_non_negative CHECK (current_stock >= 0),
    CONSTRAINT items_reorder_level_non_negative CHECK (reorder_level >= 0)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sales', 'purchase')),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255),
    invoice_date DATE NOT NULL,
    due_date DATE,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT invoices_invoice_number_not_empty CHECK (LENGTH(TRIM(invoice_number)) > 0),
    CONSTRAINT invoices_customer_or_vendor CHECK (
        (type = 'sales' AND customer_id IS NOT NULL) OR 
        (type = 'purchase' AND vendor_name IS NOT NULL)
    ),
    CONSTRAINT invoices_due_date_after_invoice_date CHECK (due_date IS NULL OR due_date >= invoice_date),
    CONSTRAINT invoices_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT invoices_tax_amount_non_negative CHECK (tax_amount >= 0),
    CONSTRAINT invoices_discount_amount_non_negative CHECK (discount_amount >= 0),
    CONSTRAINT invoices_total_amount_non_negative CHECK (total_amount >= 0)
);

-- Ledger entries table
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL,
    debit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT ledger_entries_transaction_type_not_empty CHECK (LENGTH(TRIM(transaction_type)) > 0),
    CONSTRAINT ledger_entries_debit_amount_non_negative CHECK (debit_amount >= 0),
    CONSTRAINT ledger_entries_credit_amount_non_negative CHECK (credit_amount >= 0),
    CONSTRAINT ledger_entries_not_both_zero CHECK (debit_amount > 0 OR credit_amount > 0)
);

-- Stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    reference_number VARCHAR(100),
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT stock_movements_quantity_not_zero CHECK (quantity != 0),
    CONSTRAINT stock_movements_unit_price_non_negative CHECK (unit_price IS NULL OR unit_price >= 0)
);

-- Tax profiles table
CREATE TABLE IF NOT EXISTS tax_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    tax_type VARCHAR(50) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tax_profiles_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT tax_profiles_tax_type_not_empty CHECK (LENGTH(TRIM(tax_type)) > 0),
    CONSTRAINT tax_profiles_rate_valid CHECK (rate >= 0 AND rate <= 100)
);

-- WhatsApp logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT whatsapp_logs_phone_number_not_empty CHECK (LENGTH(TRIM(phone_number)) > 0),
    CONSTRAINT whatsapp_logs_message_not_empty CHECK (LENGTH(TRIM(message)) > 0),
    CONSTRAINT whatsapp_logs_phone_format CHECK (phone_number ~ '^[+]?[0-9\s\-\(\)]+$')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_gst_id ON customers(gst_id);

CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_brand ON items(brand);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_current_stock ON items(current_stock);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_invoice_id ON ledger_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_date ON ledger_entries(transaction_date);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_invoice_id ON stock_movements(invoice_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_date ON stock_movements(movement_date);

CREATE INDEX IF NOT EXISTS idx_tax_profiles_is_active ON tax_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_customer_id ON whatsapp_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_invoice_id ON whatsapp_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update stock levels
CREATE OR REPLACE FUNCTION update_item_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update stock based on movement type
        IF NEW.movement_type = 'in' THEN
            UPDATE items SET current_stock = current_stock + NEW.quantity WHERE id = NEW.item_id;
        ELSIF NEW.movement_type = 'out' THEN
            UPDATE items SET current_stock = current_stock - NEW.quantity WHERE id = NEW.item_id;
        ELSIF NEW.movement_type = 'adjustment' THEN
            UPDATE items SET current_stock = current_stock + NEW.quantity WHERE id = NEW.item_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Reverse the stock movement
        IF OLD.movement_type = 'in' THEN
            UPDATE items SET current_stock = current_stock - OLD.quantity WHERE id = OLD.item_id;
        ELSIF OLD.movement_type = 'out' THEN
            UPDATE items SET current_stock = current_stock + OLD.quantity WHERE id = OLD.item_id;
        ELSIF OLD.movement_type = 'adjustment' THEN
            UPDATE items SET current_stock = current_stock - OLD.quantity WHERE id = OLD.item_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for stock updates
CREATE TRIGGER trigger_update_item_stock
    AFTER INSERT OR DELETE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION update_item_stock();

-- Create function to calculate running balance for ledger entries
CREATE OR REPLACE FUNCTION calculate_ledger_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance DECIMAL(12,2) := 0;
BEGIN
    -- Get the current balance for the customer
    SELECT COALESCE(balance, 0) INTO current_balance
    FROM ledger_entries
    WHERE customer_id = NEW.customer_id
    ORDER BY transaction_date DESC, id DESC
    LIMIT 1;
    
    -- Calculate new balance
    NEW.balance := current_balance + NEW.debit_amount - NEW.credit_amount;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for ledger balance calculation
CREATE TRIGGER trigger_calculate_ledger_balance
    BEFORE INSERT ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION calculate_ledger_balance();