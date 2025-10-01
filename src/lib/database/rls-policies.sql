-- Row Level Security Policies for SmartBooks
-- These policies ensure data access control and security

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- For now, we'll allow all authenticated users to access all data
-- In a multi-tenant setup, you would filter by user_id or organization_id

-- Customers table policies
CREATE POLICY "Allow authenticated users to view customers" ON customers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert customers" ON customers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update customers" ON customers
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete customers" ON customers
    FOR DELETE USING (auth.role() = 'authenticated');

-- Items table policies
CREATE POLICY "Allow authenticated users to view items" ON items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert items" ON items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update items" ON items
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete items" ON items
    FOR DELETE USING (auth.role() = 'authenticated');

-- Invoices table policies
CREATE POLICY "Allow authenticated users to view invoices" ON invoices
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert invoices" ON invoices
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update invoices" ON invoices
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete invoices" ON invoices
    FOR DELETE USING (auth.role() = 'authenticated');

-- Ledger entries table policies
CREATE POLICY "Allow authenticated users to view ledger_entries" ON ledger_entries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert ledger_entries" ON ledger_entries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update ledger_entries" ON ledger_entries
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete ledger_entries" ON ledger_entries
    FOR DELETE USING (auth.role() = 'authenticated');

-- Stock movements table policies
CREATE POLICY "Allow authenticated users to view stock_movements" ON stock_movements
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert stock_movements" ON stock_movements
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update stock_movements" ON stock_movements
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete stock_movements" ON stock_movements
    FOR DELETE USING (auth.role() = 'authenticated');

-- Tax profiles table policies
CREATE POLICY "Allow authenticated users to view tax_profiles" ON tax_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert tax_profiles" ON tax_profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update tax_profiles" ON tax_profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete tax_profiles" ON tax_profiles
    FOR DELETE USING (auth.role() = 'authenticated');

-- WhatsApp logs table policies
CREATE POLICY "Allow authenticated users to view whatsapp_logs" ON whatsapp_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert whatsapp_logs" ON whatsapp_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update whatsapp_logs" ON whatsapp_logs
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete whatsapp_logs" ON whatsapp_logs
    FOR DELETE USING (auth.role() = 'authenticated');

-- Service role policies (for server-side operations)
-- These allow the service role to bypass RLS for administrative operations

CREATE POLICY "Allow service role full access to customers" ON customers
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to items" ON items
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to invoices" ON invoices
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to ledger_entries" ON ledger_entries
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to stock_movements" ON stock_movements
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to tax_profiles" ON tax_profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to whatsapp_logs" ON whatsapp_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Additional security functions

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS BOOLEAN AS $
BEGIN
    RETURN auth.role() = 'authenticated';
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user ID
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS UUID AS $
BEGIN
    RETURN (auth.jwt() ->> 'sub')::UUID;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has admin role (for future use)
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $
BEGIN
    RETURN (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() ->> 'role') = 'service_role';
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant service role permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Comments for documentation
COMMENT ON POLICY "Allow authenticated users to view customers" ON customers IS 
'Allows authenticated users to view customer records';

COMMENT ON POLICY "Allow service role full access to customers" ON customers IS 
'Allows service role to perform administrative operations on customers';

-- Note: In a production multi-tenant environment, you would typically add
-- additional filters based on organization_id or user_id to ensure data isolation
-- between different tenants or user groups.

-- Example of tenant-based policy (commented out for single-tenant setup):
-- CREATE POLICY "Users can only see their organization's customers" ON customers
--     FOR SELECT USING (organization_id = auth.jwt() ->> 'organization_id');