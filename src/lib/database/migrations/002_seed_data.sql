-- Migration 002: Seed Data
-- This migration inserts initial test data for development and testing

-- Insert default tax profiles
INSERT INTO tax_profiles (name, tax_type, rate, is_active) VALUES
('GST 0%', 'GST', 0.00, true),
('GST 5%', 'GST', 5.00, true),
('GST 12%', 'GST', 12.00, true),
('GST 18%', 'GST', 18.00, true),
('GST 28%', 'GST', 28.00, true),
('VAT 0%', 'VAT', 0.00, true),
('VAT 5%', 'VAT', 5.00, true),
('VAT 10%', 'VAT', 10.00, true),
('VAT 15%', 'VAT', 15.00, true),
('Service Tax 15%', 'Service Tax', 15.00, true),
('IGST 5%', 'IGST', 5.00, true),
('IGST 12%', 'IGST', 12.00, true),
('IGST 18%', 'IGST', 18.00, true),
('IGST 28%', 'IGST', 28.00, true)
ON CONFLICT DO NOTHING;

-- Insert sample customers
INSERT INTO customers (name, phone, gst_id, address, discount_rules) VALUES
('ABC Electronics Ltd', '+91-9876543210', '29ABCDE1234F1Z5', '123 Electronics Street, Mumbai, Maharashtra 400001', '{"line_discount": 5, "group_discount": 2, "brand_discount": 3}'),
('XYZ Traders', '+91-9876543211', '27XYZAB5678G2H6', '456 Trade Avenue, Delhi, Delhi 110001', '{"line_discount": 3, "group_discount": 1, "brand_discount": 2}'),
('PQR Distributors', '+91-9876543212', '33PQRCD9012I3J7', '789 Distribution Road, Chennai, Tamil Nadu 600001', '{"line_discount": 7, "group_discount": 3, "brand_discount": 4}'),
('LMN Retail Store', '+91-9876543213', '19LMNEF3456K4L8', '321 Retail Plaza, Bangalore, Karnataka 560001', '{"line_discount": 2, "group_discount": 1, "brand_discount": 1}'),
('RST Wholesale', '+91-9876543214', '24RSTGH7890M5N9', '654 Wholesale Market, Pune, Maharashtra 411001', '{"line_discount": 10, "group_discount": 5, "brand_discount": 3}'),
('UVW Enterprises', '+91-9876543215', '36UVWIJ1234O6P0', '987 Enterprise Zone, Hyderabad, Telangana 500001', '{"line_discount": 4, "group_discount": 2, "brand_discount": 2}'),
('DEF Solutions', '+91-9876543216', '07DEFKL5678Q7R1', '147 Solutions Street, Kolkata, West Bengal 700001', '{"line_discount": 6, "group_discount": 3, "brand_discount": 2}'),
('GHI Technologies', '+91-9876543217', '23GHIMN9012S8T2', '258 Tech Park, Ahmedabad, Gujarat 380001', '{"line_discount": 8, "group_discount": 4, "brand_discount": 5}'),
('JKL Industries', '+91-9876543218', '14JKLOP3456U9V3', '369 Industrial Area, Jaipur, Rajasthan 302001', '{"line_discount": 5, "group_discount": 2, "brand_discount": 3}'),
('MNO Services', '+91-9876543219', '32MNOQR7890W0X4', '741 Service Center, Lucknow, Uttar Pradesh 226001', '{"line_discount": 3, "group_discount": 1, "brand_discount": 2}')
ON CONFLICT DO NOTHING;

-- Insert sample items
INSERT INTO items (sku, name, brand, sub_brand, category, sub_category, unit, purchase_price, margin_percentage, tax_rate, current_stock, reorder_level) VALUES
('ELEC001', 'LED TV 32 Inch', 'Samsung', 'Crystal UHD', 'Electronics', 'Television', 'Piece', 25000.00, 20.00, 18.00, 15, 5),
('ELEC002', 'Smartphone 128GB', 'Apple', 'iPhone', 'Electronics', 'Mobile', 'Piece', 45000.00, 15.00, 18.00, 8, 3),
('ELEC003', 'Laptop 8GB RAM', 'Dell', 'Inspiron', 'Electronics', 'Computer', 'Piece', 35000.00, 18.00, 18.00, 12, 4),
('ELEC004', 'Wireless Headphones', 'Sony', 'WH-1000XM4', 'Electronics', 'Audio', 'Piece', 8000.00, 25.00, 18.00, 25, 8),
('ELEC005', 'Smart Watch', 'Apple', 'Watch Series', 'Electronics', 'Wearable', 'Piece', 18000.00, 22.00, 18.00, 10, 3),
('HOME001', 'Refrigerator 300L', 'LG', 'Double Door', 'Home Appliances', 'Kitchen', 'Piece', 28000.00, 20.00, 18.00, 6, 2),
('HOME002', 'Washing Machine 7kg', 'Whirlpool', 'Front Load', 'Home Appliances', 'Laundry', 'Piece', 22000.00, 18.00, 18.00, 8, 3),
('HOME003', 'Air Conditioner 1.5 Ton', 'Daikin', 'Split AC', 'Home Appliances', 'Cooling', 'Piece', 32000.00, 15.00, 18.00, 5, 2),
('HOME004', 'Microwave Oven 25L', 'Panasonic', 'Convection', 'Home Appliances', 'Kitchen', 'Piece', 12000.00, 20.00, 18.00, 12, 4),
('HOME005', 'Water Purifier', 'Kent', 'RO+UV', 'Home Appliances', 'Water', 'Piece', 8000.00, 25.00, 18.00, 15, 5),
('FURN001', 'Office Chair', 'Steelcase', 'Ergonomic', 'Furniture', 'Office', 'Piece', 5000.00, 30.00, 18.00, 20, 6),
('FURN002', 'Study Table', 'IKEA', 'Modern', 'Furniture', 'Study', 'Piece', 3000.00, 35.00, 18.00, 18, 5),
('FURN003', 'Sofa Set 3+2', 'Godrej', 'Fabric', 'Furniture', 'Living Room', 'Set', 25000.00, 25.00, 18.00, 4, 2),
('FURN004', 'Dining Table 6 Seater', 'Durian', 'Wooden', 'Furniture', 'Dining', 'Piece', 15000.00, 28.00, 18.00, 6, 2),
('FURN005', 'Wardrobe 3 Door', 'Nilkamal', 'Sliding', 'Furniture', 'Bedroom', 'Piece', 12000.00, 30.00, 18.00, 8, 3),
('STAT001', 'A4 Paper Ream', 'JK Copier', 'Premium', 'Stationery', 'Paper', 'Ream', 250.00, 40.00, 12.00, 100, 20),
('STAT002', 'Ball Pen Blue', 'Reynolds', 'Trimax', 'Stationery', 'Writing', 'Piece', 10.00, 50.00, 12.00, 500, 100),
('STAT003', 'Notebook 200 Pages', 'Classmate', 'Ruled', 'Stationery', 'Books', 'Piece', 25.00, 60.00, 12.00, 200, 50),
('STAT004', 'Marker Set 12 Colors', 'Camlin', 'Permanent', 'Stationery', 'Art', 'Set', 150.00, 45.00, 12.00, 50, 15),
('STAT005', 'Calculator Scientific', 'Casio', 'FX-991EX', 'Stationery', 'Calculator', 'Piece', 800.00, 35.00, 12.00, 25, 8)
ON CONFLICT DO NOTHING;

-- Insert sample invoices
INSERT INTO invoices (invoice_number, type, customer_id, invoice_date, due_date, items, subtotal, tax_amount, discount_amount, total_amount, status) VALUES
('INV-2024-0001', 'sales', (SELECT id FROM customers WHERE name = 'ABC Electronics Ltd' LIMIT 1), '2024-01-15', '2024-02-14', 
 '[{"item_id": "' || (SELECT id FROM items WHERE sku = 'ELEC001') || '", "quantity": 2, "unit_price": 30000, "discount_percentage": 5, "tax_rate": 18, "line_total": 67080}]', 
 60000.00, 9720.00, 3000.00, 66720.00, 'paid'),

('INV-2024-0002', 'sales', (SELECT id FROM customers WHERE name = 'XYZ Traders' LIMIT 1), '2024-01-20', '2024-02-19', 
 '[{"item_id": "' || (SELECT id FROM items WHERE sku = 'ELEC002') || '", "quantity": 1, "unit_price": 51750, "discount_percentage": 3, "tax_rate": 18, "line_total": 58806.15}]', 
 51750.00, 8415.15, 1552.50, 58612.65, 'pending'),

('INV-2024-0003', 'sales', (SELECT id FROM customers WHERE name = 'PQR Distributors' LIMIT 1), '2024-01-25', '2024-02-24', 
 '[{"item_id": "' || (SELECT id FROM items WHERE sku = 'HOME001') || '", "quantity": 1, "unit_price": 33600, "discount_percentage": 7, "tax_rate": 18, "line_total": 36806.16}]', 
 33600.00, 5616.16, 2352.00, 36864.16, 'pending'),

('PUR-2024-0001', 'purchase', NULL, '2024-01-10', '2024-02-09', 
 '[{"item_id": "' || (SELECT id FROM items WHERE sku = 'ELEC001') || '", "quantity": 10, "unit_price": 25000, "discount_percentage": 0, "tax_rate": 18, "line_total": 295000}]', 
 250000.00, 45000.00, 0.00, 295000.00, 'paid'),

('PUR-2024-0002', 'purchase', NULL, '2024-01-12', '2024-02-11', 
 '[{"item_id": "' || (SELECT id FROM items WHERE sku = 'HOME001') || '", "quantity": 5, "unit_price": 28000, "discount_percentage": 0, "tax_rate": 18, "line_total": 165200}]', 
 140000.00, 25200.00, 0.00, 165200.00, 'pending')
ON CONFLICT DO NOTHING;

-- Update invoice vendor names for purchase invoices
UPDATE invoices SET vendor_name = 'Samsung Electronics India' WHERE invoice_number = 'PUR-2024-0001';
UPDATE invoices SET vendor_name = 'LG Electronics India' WHERE invoice_number = 'PUR-2024-0002';

-- Insert sample ledger entries for sales invoices
INSERT INTO ledger_entries (customer_id, invoice_id, transaction_type, debit_amount, credit_amount, description, transaction_date) VALUES
((SELECT id FROM customers WHERE name = 'ABC Electronics Ltd' LIMIT 1), 
 (SELECT id FROM invoices WHERE invoice_number = 'INV-2024-0001' LIMIT 1), 
 'invoice', 66720.00, 0.00, 'Invoice INV-2024-0001', '2024-01-15'),

((SELECT id FROM customers WHERE name = 'ABC Electronics Ltd' LIMIT 1), 
 (SELECT id FROM invoices WHERE invoice_number = 'INV-2024-0001' LIMIT 1), 
 'payment', 0.00, 66720.00, 'Payment for Invoice INV-2024-0001', '2024-01-20'),

((SELECT id FROM customers WHERE name = 'XYZ Traders' LIMIT 1), 
 (SELECT id FROM invoices WHERE invoice_number = 'INV-2024-0002' LIMIT 1), 
 'invoice', 58612.65, 0.00, 'Invoice INV-2024-0002', '2024-01-20'),

((SELECT id FROM customers WHERE name = 'PQR Distributors' LIMIT 1), 
 (SELECT id FROM invoices WHERE invoice_number = 'INV-2024-0003' LIMIT 1), 
 'invoice', 36864.16, 0.00, 'Invoice INV-2024-0003', '2024-01-25')
ON CONFLICT DO NOTHING;

-- Insert sample stock movements
INSERT INTO stock_movements (item_id, invoice_id, movement_type, quantity, unit_price, reference_number, movement_date) VALUES
-- Purchase movements (stock in)
((SELECT id FROM items WHERE sku = 'ELEC001'), (SELECT id FROM invoices WHERE invoice_number = 'PUR-2024-0001'), 'in', 10, 25000.00, 'PUR-2024-0001', '2024-01-10'),
((SELECT id FROM items WHERE sku = 'HOME001'), (SELECT id FROM invoices WHERE invoice_number = 'PUR-2024-0002'), 'in', 5, 28000.00, 'PUR-2024-0002', '2024-01-12'),

-- Sales movements (stock out)
((SELECT id FROM items WHERE sku = 'ELEC001'), (SELECT id FROM invoices WHERE invoice_number = 'INV-2024-0001'), 'out', -2, 30000.00, 'INV-2024-0001', '2024-01-15'),
((SELECT id FROM items WHERE sku = 'ELEC002'), (SELECT id FROM invoices WHERE invoice_number = 'INV-2024-0002'), 'out', -1, 51750.00, 'INV-2024-0002', '2024-01-20'),
((SELECT id FROM items WHERE sku = 'HOME001'), (SELECT id FROM invoices WHERE invoice_number = 'INV-2024-0003'), 'out', -1, 33600.00, 'INV-2024-0003', '2024-01-25'),

-- Sample adjustments
((SELECT id FROM items WHERE sku = 'STAT001'), NULL, 'adjustment', 50, NULL, 'Opening stock adjustment', '2024-01-01'),
((SELECT id FROM items WHERE sku = 'STAT002'), NULL, 'adjustment', 200, NULL, 'Opening stock adjustment', '2024-01-01'),
((SELECT id FROM items WHERE sku = 'STAT003'), NULL, 'adjustment', 100, NULL, 'Opening stock adjustment', '2024-01-01')
ON CONFLICT DO NOTHING;

-- Insert sample WhatsApp logs
INSERT INTO whatsapp_logs (customer_id, invoice_id, phone_number, message, status, sent_at, response) VALUES
((SELECT id FROM customers WHERE name = 'XYZ Traders' LIMIT 1), 
 (SELECT id FROM invoices WHERE invoice_number = 'INV-2024-0002' LIMIT 1), 
 '+91-9876543211', 
 'Hi XYZ Traders, your invoice #INV-2024-0002 of ₹58,612.65 is due on 2024-02-19. Please make the payment. Thank you!', 
 'delivered', '2024-02-18 10:30:00', 'Message delivered successfully'),

((SELECT id FROM customers WHERE name = 'PQR Distributors' LIMIT 1), 
 (SELECT id FROM invoices WHERE invoice_number = 'INV-2024-0003' LIMIT 1), 
 '+91-9876543212', 
 'Hi PQR Distributors, your invoice #INV-2024-0003 of ₹36,864.16 is due on 2024-02-24. Please make the payment. Thank you!', 
 'sent', '2024-02-23 09:15:00', NULL),

((SELECT id FROM customers WHERE name = 'ABC Electronics Ltd' LIMIT 1), 
 NULL, 
 '+91-9876543210', 
 'Thank you for your payment! Your account is now up to date.', 
 'delivered', '2024-01-21 14:45:00', 'Message delivered successfully')
ON CONFLICT DO NOTHING;

-- Create some additional sample data for testing

-- Insert more items for different categories
INSERT INTO items (sku, name, brand, sub_brand, category, sub_category, unit, purchase_price, margin_percentage, tax_rate, current_stock, reorder_level) VALUES
('BOOK001', 'Programming Book', 'O''Reilly', 'Tech Series', 'Books', 'Programming', 'Piece', 500.00, 40.00, 5.00, 30, 10),
('BOOK002', 'Business Management', 'Harvard', 'Business Review', 'Books', 'Business', 'Piece', 800.00, 35.00, 5.00, 20, 8),
('TOOL001', 'Screwdriver Set', 'Stanley', 'Professional', 'Tools', 'Hand Tools', 'Set', 200.00, 50.00, 18.00, 40, 12),
('TOOL002', 'Electric Drill', 'Bosch', 'Power Tools', 'Tools', 'Power Tools', 'Piece', 2500.00, 30.00, 18.00, 8, 3),
('CLOTH001', 'Cotton T-Shirt', 'Nike', 'Sportswear', 'Clothing', 'Casual', 'Piece', 300.00, 100.00, 12.00, 50, 15)
ON CONFLICT DO NOTHING;

-- Add some adjustment entries for testing
INSERT INTO stock_movements (item_id, movement_type, quantity, reference_number, movement_date) VALUES
((SELECT id FROM items WHERE sku = 'ELEC003'), 'adjustment', 5, 'Stock count adjustment', '2024-01-30'),
((SELECT id FROM items WHERE sku = 'HOME002'), 'adjustment', -2, 'Damaged goods write-off', '2024-01-28'),
((SELECT id FROM items WHERE sku = 'FURN001'), 'adjustment', 10, 'New stock received', '2024-01-25')
ON CONFLICT DO NOTHING;

-- Update some invoice statuses to overdue for testing
UPDATE invoices 
SET status = 'overdue', due_date = '2024-01-30' 
WHERE invoice_number IN ('INV-2024-0002', 'INV-2024-0003');

-- Add some payment entries for partial payments
INSERT INTO ledger_entries (customer_id, invoice_id, transaction_type, debit_amount, credit_amount, description, transaction_date) VALUES
((SELECT id FROM customers WHERE name = 'XYZ Traders' LIMIT 1), 
 (SELECT id FROM invoices WHERE invoice_number = 'INV-2024-0002' LIMIT 1), 
 'payment', 0.00, 20000.00, 'Partial payment for Invoice INV-2024-0002', '2024-02-10')
ON CONFLICT DO NOTHING;

-- Create a view for easy customer balance checking
CREATE OR REPLACE VIEW customer_balances AS
SELECT 
    c.id,
    c.name,
    c.phone,
    COALESCE(latest_balance.balance, 0) as current_balance,
    COALESCE(latest_balance.last_transaction_date, c.created_at) as last_transaction_date
FROM customers c
LEFT JOIN (
    SELECT DISTINCT ON (customer_id) 
        customer_id,
        balance,
        transaction_date as last_transaction_date
    FROM ledger_entries
    ORDER BY customer_id, transaction_date DESC, id DESC
) latest_balance ON c.id = latest_balance.customer_id;

-- Create a view for low stock items
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
    i.*,
    (i.reorder_level - i.current_stock) as shortage_quantity,
    CASE 
        WHEN i.current_stock = 0 THEN 'Out of Stock'
        WHEN i.current_stock <= i.reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status
FROM items i
WHERE i.current_stock <= i.reorder_level
ORDER BY i.current_stock ASC;

-- Create a view for overdue invoices
CREATE OR REPLACE VIEW overdue_invoices AS
SELECT 
    i.*,
    c.name as customer_name,
    c.phone as customer_phone,
    (CURRENT_DATE - i.due_date) as days_overdue
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
WHERE i.status = 'pending' 
AND i.due_date < CURRENT_DATE
AND i.type = 'sales'
ORDER BY i.due_date ASC;

-- Add some comments for the views
COMMENT ON VIEW customer_balances IS 'Current balance for all customers based on latest ledger entries';
COMMENT ON VIEW low_stock_items IS 'Items that are at or below their reorder level';
COMMENT ON VIEW overdue_invoices IS 'Sales invoices that are past their due date and still pending';

-- Final message
DO $$ 
BEGIN 
    RAISE NOTICE 'Seed data migration completed successfully!';
    RAISE NOTICE 'Created % customers', (SELECT COUNT(*) FROM customers);
    RAISE NOTICE 'Created % items', (SELECT COUNT(*) FROM items);
    RAISE NOTICE 'Created % tax profiles', (SELECT COUNT(*) FROM tax_profiles);
    RAISE NOTICE 'Created % invoices', (SELECT COUNT(*) FROM invoices);
    RAISE NOTICE 'Created % ledger entries', (SELECT COUNT(*) FROM ledger_entries);
    RAISE NOTICE 'Created % stock movements', (SELECT COUNT(*) FROM stock_movements);
    RAISE NOTICE 'Created % WhatsApp logs', (SELECT COUNT(*) FROM whatsapp_logs);
END $$;