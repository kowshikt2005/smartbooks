-- WhatsApp Messages Table Migration
-- Minimal tracking table for business correlation only
-- Meta provides comprehensive monitoring, so we focus on essential business data

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    whatsapp_message_id VARCHAR(100), -- WhatsApp Cloud API message ID
    campaign_id UUID, -- Reference to whatsapp_campaigns table
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'media')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer_id ON whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_number ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_campaign_id ON whatsapp_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_whatsapp_id ON whatsapp_messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);

-- Create trigger for updated_at column
CREATE TRIGGER update_whatsapp_messages_updated_at 
    BEFORE UPDATE ON whatsapp_messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE whatsapp_messages IS 'Minimal tracking of WhatsApp messages for business correlation. Meta provides comprehensive analytics.';
COMMENT ON COLUMN whatsapp_messages.customer_id IS 'Link to customer record for business correlation';
COMMENT ON COLUMN whatsapp_messages.phone_number IS 'Recipient phone number in international format';
COMMENT ON COLUMN whatsapp_messages.message_content IS 'Message content for business reference';
COMMENT ON COLUMN whatsapp_messages.whatsapp_message_id IS 'WhatsApp Cloud API message identifier';
COMMENT ON COLUMN whatsapp_messages.campaign_id IS 'Link to campaign for business grouping';
COMMENT ON COLUMN whatsapp_messages.status IS 'Basic message status for business tracking';