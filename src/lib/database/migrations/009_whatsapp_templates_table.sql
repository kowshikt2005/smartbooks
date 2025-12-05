-- WhatsApp Templates Table Migration
-- Local template storage for UI and business logic
-- Meta Business Manager handles approval status and usage statistics

CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- Template identifier (kebab-case)
    display_name VARCHAR(255) NOT NULL, -- Human-readable template name
    body_content TEXT NOT NULL, -- Template message body with variables
    variables JSONB DEFAULT '[]', -- Array of variable names ["customer_name", "amount", "invoice_id"]
    is_active BOOLEAN DEFAULT true, -- Whether template is available for use
    category VARCHAR(50) DEFAULT 'UTILITY' CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
    language VARCHAR(10) DEFAULT 'en', -- Template language code
    header_content TEXT, -- Optional header text
    footer_content TEXT, -- Optional footer text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_name ON whatsapp_templates(name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_is_active ON whatsapp_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON whatsapp_templates(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_created_at ON whatsapp_templates(created_at);

-- Create trigger for updated_at column
CREATE TRIGGER update_whatsapp_templates_updated_at 
    BEFORE UPDATE ON whatsapp_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default payment reminder templates
INSERT INTO whatsapp_templates (name, display_name, body_content, variables, category) VALUES
(
    'payment-reminder-basic',
    'Basic Payment Reminder',
    'Dear {{customer_name}},

This is a friendly payment reminder for your outstanding invoice.

📋 Details:
• Invoice: {{invoice_id}}
• Amount: ₹{{amount}}
• Location: {{location}}

Please make the payment at your earliest convenience.

Thank you for your business!

Best regards,
SmartBooks Team',
    '["customer_name", "invoice_id", "amount", "location"]',
    'UTILITY'
),
(
    'payment-reminder-urgent',
    'Urgent Payment Reminder',
    'Dear {{customer_name}},

URGENT: Payment Overdue

📋 Details:
• Invoice: {{invoice_id}}
• Overdue Amount: ₹{{amount}}
• Location: {{location}}

Please make immediate payment to avoid service disruption.

Contact us if you have any questions.

SmartBooks Team',
    '["customer_name", "invoice_id", "amount", "location"]',
    'UTILITY'
),
(
    'payment-confirmation',
    'Payment Confirmation',
    'Dear {{customer_name}},

Thank you for your payment!

📋 Payment Details:
• Invoice: {{invoice_id}}
• Amount Paid: ₹{{amount}}
• Location: {{location}}

Your payment has been successfully processed.

Best regards,
SmartBooks Team',
    '["customer_name", "invoice_id", "amount", "location"]',
    'UTILITY'
);

-- Add comments for documentation
COMMENT ON TABLE whatsapp_templates IS 'Local template storage for UI and business logic. Meta Business Manager handles approval and analytics.';
COMMENT ON COLUMN whatsapp_templates.name IS 'Unique template identifier for API reference';
COMMENT ON COLUMN whatsapp_templates.display_name IS 'Human-readable name for UI display';
COMMENT ON COLUMN whatsapp_templates.body_content IS 'Template message body with variable placeholders';
COMMENT ON COLUMN whatsapp_templates.variables IS 'JSON array of variable names used in template';
COMMENT ON COLUMN whatsapp_templates.is_active IS 'Whether template is available for selection in UI';