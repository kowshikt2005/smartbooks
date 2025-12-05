-- Seed data for simplified customer schema
-- This migration adds sample customer data with the new simplified structure

INSERT INTO customers (name, phone_no, location, invoice_id) VALUES
('Rajesh Kumar', '+91-9876543210', 'Mumbai', 'INV-2024-001'),
('Priya Sharma', '+91-8765432109', 'Delhi', 'INV-2024-002'),
('Amit Patel', '+91-7654321098', 'Ahmedabad', 'INV-2024-003'),
('Sunita Singh', '+91-6543210987', 'Pune', 'INV-2024-004'),
('Vikram Gupta', '+91-5432109876', 'Bangalore', 'INV-2024-005'),
('Meera Reddy', '+91-4321098765', 'Hyderabad', 'INV-2024-006'),
('Arjun Nair', '+91-3210987654', 'Kochi', 'INV-2024-007'),
('Kavya Iyer', '+91-2109876543', 'Chennai', 'INV-2024-008'),
('Rohit Joshi', '+91-1098765432', 'Jaipur', 'INV-2024-009'),
('Neha Agarwal', '+91-0987654321', 'Kolkata', 'INV-2024-010'),
('Deepak Verma', '+91-9876543211', 'Lucknow', NULL),
('Sonia Kapoor', '+91-8765432110', 'Chandigarh', NULL),
('Manish Tiwari', '+91-7654321099', 'Indore', 'INV-2024-013'),
('Ritu Malhotra', '+91-6543210988', 'Gurgaon', 'INV-2024-014'),
('Ashish Yadav', '+91-5432109877', 'Noida', 'INV-2024-015');