-- ============================================================================
-- Message Automation Service - Database Schema
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Scheduled Messages Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    message TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    timezone VARCHAR(50),
    error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduled_messages_user_id ON scheduled_messages(user_id);
CREATE INDEX idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX idx_scheduled_messages_scheduled_at ON scheduled_messages(scheduled_at);
CREATE INDEX idx_scheduled_messages_recipient_id ON scheduled_messages(recipient_id);

-- ============================================================================
-- Auto Response Templates Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS auto_response_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    trigger TEXT NOT NULL,
    response TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    conditions JSONB DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auto_response_user_id ON auto_response_templates(user_id);
CREATE INDEX idx_auto_response_enabled ON auto_response_templates(enabled);

-- ============================================================================
-- Message Templates Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    tone VARCHAR(20) CHECK (tone IN ('casual', 'flirty', 'friendly', 'formal', 'playful')),
    tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_message_templates_user_id ON message_templates(user_id);
CREATE INDEX idx_message_templates_category ON message_templates(category);
CREATE INDEX idx_message_templates_tone ON message_templates(tone);
CREATE INDEX idx_message_templates_public ON message_templates(is_public);

-- ============================================================================
-- Smart Reply Cache Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS smart_reply_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    last_message_hash VARCHAR(64) NOT NULL,
    suggestions JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_suggestion_id UUID
);

CREATE INDEX idx_smart_reply_conversation ON smart_reply_cache(conversation_id);
CREATE INDEX idx_smart_reply_user ON smart_reply_cache(user_id);
CREATE INDEX idx_smart_reply_expires ON smart_reply_cache(expires_at);

-- ============================================================================
-- Conversation Starters Cache Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_starters_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    match_user_id UUID NOT NULL,
    match_id UUID NOT NULL,
    starters JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_starter_id UUID,
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_conv_starters_user ON conversation_starters_cache(user_id);
CREATE INDEX idx_conv_starters_match ON conversation_starters_cache(match_id);
CREATE INDEX idx_conv_starters_expires ON conversation_starters_cache(expires_at);

-- ============================================================================
-- Automation Analytics Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    feature VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_analytics_user ON automation_analytics(user_id);
CREATE INDEX idx_automation_analytics_event ON automation_analytics(event_type);
CREATE INDEX idx_automation_analytics_feature ON automation_analytics(feature);
CREATE INDEX idx_automation_analytics_timestamp ON automation_analytics(timestamp);

-- ============================================================================
-- User Preferences Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_automation_preferences (
    user_id UUID PRIMARY KEY,
    auto_response_enabled BOOLEAN DEFAULT false,
    smart_replies_enabled BOOLEAN DEFAULT true,
    icebreakers_enabled BOOLEAN DEFAULT true,
    optimal_timing_enabled BOOLEAN DEFAULT true,
    preferred_tone VARCHAR(20) DEFAULT 'casual' CHECK (preferred_tone IN ('casual', 'flirty', 'friendly', 'formal', 'playful')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    max_daily_automated_messages INTEGER DEFAULT 5,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Read Receipt Tracking Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    conversation_id UUID NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX idx_read_receipts_user ON message_read_receipts(user_id);
CREATE INDEX idx_read_receipts_conversation ON message_read_receipts(conversation_id);
CREATE UNIQUE INDEX idx_read_receipts_unique ON message_read_receipts(message_id, user_id);

-- ============================================================================
-- Typing Indicators Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS typing_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_typing_conversation ON typing_indicators(conversation_id);
CREATE INDEX idx_typing_expires ON typing_indicators(expires_at);
CREATE UNIQUE INDEX idx_typing_unique ON typing_indicators(conversation_id, user_id);

-- ============================================================================
-- Message Effectiveness Scores Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_effectiveness_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    score DECIMAL(3,2) NOT NULL,
    analysis JSONB NOT NULL,
    suggestions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_effectiveness_user ON message_effectiveness_scores(user_id);
CREATE INDEX idx_effectiveness_score ON message_effectiveness_scores(score);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
CREATE TRIGGER update_scheduled_messages_updated_at
    BEFORE UPDATE ON scheduled_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_response_templates_updated_at
    BEFORE UPDATE ON auto_response_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
    BEFORE UPDATE ON message_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_automation_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Cleanup Functions
-- ============================================================================

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    -- Clean expired smart replies
    DELETE FROM smart_reply_cache WHERE expires_at < NOW();

    -- Clean expired conversation starters
    DELETE FROM conversation_starters_cache WHERE expires_at < NOW();

    -- Clean expired typing indicators
    DELETE FROM typing_indicators WHERE expires_at < NOW();

    RAISE NOTICE 'Expired cache entries cleaned up';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data (Optional - for development)
-- ============================================================================

-- Insert sample message templates
INSERT INTO message_templates (name, content, category, tone, is_public, tags) VALUES
    ('Casual Greeting', 'Hey! How''s it going?', 'greeting', 'casual', true, ARRAY['greeting', 'casual']),
    ('Flirty Hello', 'Hey there! Your profile caught my eye 😊', 'greeting', 'flirty', true, ARRAY['greeting', 'flirty']),
    ('Follow-up Question', 'That''s really interesting! Tell me more about that.', 'followup', 'friendly', true, ARRAY['followup', 'question']),
    ('Weekend Plans', 'Any fun plans for the weekend?', 'icebreaker', 'casual', true, ARRAY['icebreaker', 'weekend'])
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE scheduled_messages IS 'Stores scheduled messages for future delivery';
COMMENT ON TABLE auto_response_templates IS 'User-defined auto-response templates';
COMMENT ON TABLE message_templates IS 'Reusable message templates';
COMMENT ON TABLE smart_reply_cache IS 'Caches AI-generated smart reply suggestions';
COMMENT ON TABLE conversation_starters_cache IS 'Caches conversation starter suggestions';
COMMENT ON TABLE automation_analytics IS 'Tracks automation feature usage and analytics';
COMMENT ON TABLE user_automation_preferences IS 'User preferences for automation features';
COMMENT ON TABLE message_read_receipts IS 'Tracks message read status';
COMMENT ON TABLE typing_indicators IS 'Real-time typing indicator tracking';
COMMENT ON TABLE message_effectiveness_scores IS 'Stores message effectiveness analysis results';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_scheduled_messages_user_status ON scheduled_messages(user_id, status);
CREATE INDEX idx_scheduled_messages_pending_due ON scheduled_messages(status, scheduled_at) WHERE status = 'pending';

-- Partial indexes for active templates
CREATE INDEX idx_auto_response_active ON auto_response_templates(user_id, enabled) WHERE enabled = true;

-- GIN indexes for JSONB columns (for faster JSON queries)
CREATE INDEX idx_message_templates_metadata ON message_templates USING GIN (metadata);
CREATE INDEX idx_automation_analytics_metadata ON automation_analytics USING GIN (metadata);

-- ============================================================================
-- Views
-- ============================================================================

-- View for active automation statistics
CREATE OR REPLACE VIEW automation_stats AS
SELECT
    user_id,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_messages,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_messages,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_messages,
    MAX(sent_at) as last_sent_at
FROM scheduled_messages
GROUP BY user_id;

COMMENT ON VIEW automation_stats IS 'Aggregated statistics for scheduled messages per user';

-- ============================================================================
-- Grants (adjust as needed for your security model)
-- ============================================================================

-- Grant appropriate permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO automation_service_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO automation_service_user;

-- ============================================================================
-- End of Schema
-- ============================================================================
