-- WhatsApp Mappings Table Migration
-- This table stores the mapping results between imported WhatsApp data and customer records

CREATE TABLE IF NOT EXISTS whatsapp_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imported_name VARCHAR(255),
    imported_phone VARCHAR(50),
    matched_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    confidence VARCHAR(20) CHECK (confidence IN ('exact', 'fuzzy', 'none')),
    conflict_type VARCHAR(50) CHECK (conflict_type IN ('name_mismatch', 'phone_mismatch', 'no_match')),
    source VARCHAR(20) CHECK (source IN ('customer_db', 'imported', 'manual')),
    final_name VARCHAR(255) NOT NULL,
    final_phone VARCHAR(50),
    additional_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_mappings_customer_id ON whatsapp_mappings(matched_customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mappings_phone ON whatsapp_mappings(final_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mappings_confidence ON whatsapp_mappings(confidence);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mappings_created_at ON whatsapp_mappings(created_at);

-- Create trigger for updated_at column
CREATE TRIGGER update_whatsapp_mappings_updated_at 
    BEFORE UPDATE ON whatsapp_mappings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to create the table (for use in the mapping service)
CREATE OR REPLACE FUNCTION create_whatsapp_mappings_table()
RETURNS void AS $$
BEGIN
    -- This function is used by the mapping service to ensure the table exists
    -- The actual table creation is handled by this migration
    RETURN;
END;
$$ LANGUAGE plpgsql;