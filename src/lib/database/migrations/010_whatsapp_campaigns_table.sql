-- WhatsApp Campaigns Table Migration
-- Business tracking for campaign operations only
-- Meta handles detailed statistics and cost tracking

CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- Campaign name for business reference
    template_name VARCHAR(100), -- Reference to whatsapp_templates.name
    total_recipients INTEGER DEFAULT 0, -- Number of recipients in campaign
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'sending', 'completed', 'failed', 'cancelled')),
    created_by VARCHAR(255), -- User who created the campaign
    scheduled_at TIMESTAMP WITH TIME ZONE, -- When campaign is scheduled to send
    started_at TIMESTAMP WITH TIME ZONE, -- When campaign actually started
    completed_at TIMESTAMP WITH TIME ZONE, -- When campaign finished
    description TEXT, -- Optional campaign description
    target_criteria JSONB DEFAULT '{}', -- Criteria used to select recipients
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_status ON whatsapp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_template_name ON whatsapp_campaigns(template_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_created_by ON whatsapp_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_scheduled_at ON whatsapp_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_started_at ON whatsapp_campaigns(started_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_created_at ON whatsapp_campaigns(created_at);

-- Create trigger for updated_at column
CREATE TRIGGER update_whatsapp_campaigns_updated_at 
    BEFORE UPDATE ON whatsapp_campaigns 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint to templates table (soft reference)
-- Note: Using template_name instead of template_id for flexibility
-- Templates can be deleted while preserving campaign history

-- Create view for campaign summary with message counts
CREATE OR REPLACE VIEW whatsapp_campaign_summary AS
SELECT 
    c.id,
    c.name,
    c.template_name,
    c.total_recipients,
    c.status,
    c.created_by,
    c.scheduled_at,
    c.started_at,
    c.completed_at,
    c.created_at,
    COUNT(m.id) as messages_sent,
    COUNT(CASE WHEN m.status = 'delivered' THEN 1 END) as messages_delivered,
    COUNT(CASE WHEN m.status = 'read' THEN 1 END) as messages_read,
    COUNT(CASE WHEN m.status = 'failed' THEN 1 END) as messages_failed
FROM whatsapp_campaigns c
LEFT JOIN whatsapp_messages m ON c.id = m.campaign_id
GROUP BY c.id, c.name, c.template_name, c.total_recipients, c.status, 
         c.created_by, c.scheduled_at, c.started_at, c.completed_at, c.created_at;

-- Add comments for documentation
COMMENT ON TABLE whatsapp_campaigns IS 'Business tracking for WhatsApp campaigns. Meta provides detailed analytics and cost tracking.';
COMMENT ON COLUMN whatsapp_campaigns.name IS 'Business-friendly campaign name';
COMMENT ON COLUMN whatsapp_campaigns.template_name IS 'Reference to template used (soft reference)';
COMMENT ON COLUMN whatsapp_campaigns.total_recipients IS 'Number of recipients for business planning';
COMMENT ON COLUMN whatsapp_campaigns.status IS 'Campaign status for workflow management';
COMMENT ON COLUMN whatsapp_campaigns.created_by IS 'User who initiated the campaign';
COMMENT ON COLUMN whatsapp_campaigns.target_criteria IS 'JSON criteria used to select recipients';
COMMENT ON VIEW whatsapp_campaign_summary IS 'Summary view combining campaign data with basic message statistics';