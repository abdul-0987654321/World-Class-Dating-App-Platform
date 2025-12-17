-- Advertising Service Database Schema
-- Creates tables for campaigns, ads, impressions, clicks, conversions, and billing

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objective VARCHAR(50) NOT NULL CHECK (objective IN ('brand_awareness', 'app_installs', 'registrations', 'subscriptions', 'engagement', 'matches')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'archived')),

    -- Budget Configuration
    total_budget DECIMAL(10, 2) NOT NULL,
    daily_budget DECIMAL(10, 2) NOT NULL,
    bid_strategy VARCHAR(20) NOT NULL CHECK (bid_strategy IN ('cpc', 'cpm', 'cpa')),
    max_bid DECIMAL(6, 2) NOT NULL,
    min_bid DECIMAL(6, 2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Dates
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Performance Metrics (denormalized for quick access)
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10, 2) DEFAULT 0,

    -- Indexes
    INDEX idx_campaigns_advertiser (advertiser_id),
    INDEX idx_campaigns_status (status),
    INDEX idx_campaigns_dates (start_date, end_date)
);

-- Ads Table
CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creative_id UUID,

    -- Ad Content
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    video_url TEXT,
    cta_text VARCHAR(100) NOT NULL,
    cta_url TEXT NOT NULL,
    ad_format VARCHAR(50) NOT NULL CHECK (ad_format IN ('banner', 'interstitial', 'native', 'video', 'carousel', 'story')),

    -- Targeting Configuration (stored as JSONB)
    targeting_config JSONB NOT NULL DEFAULT '{}',

    -- Budget Configuration
    budget_config JSONB NOT NULL,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),

    -- Dates
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Performance Metrics (denormalized)
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10, 2) DEFAULT 0,

    -- Indexes
    INDEX idx_ads_campaign (campaign_id),
    INDEX idx_ads_status (status),
    INDEX idx_ads_format (ad_format)
);

-- Impressions Table
CREATE TABLE IF NOT EXISTS impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    impression_token UUID UNIQUE NOT NULL,

    -- Placement Info
    placement VARCHAR(100) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'desktop')),

    -- Metadata
    user_agent TEXT,
    ip_address INET,
    screen_resolution VARCHAR(20),
    viewport_width INTEGER,
    viewport_height INTEGER,
    ad_position INTEGER,

    -- Viewability Metrics
    viewable BOOLEAN DEFAULT TRUE,
    view_duration_ms INTEGER DEFAULT 0,
    scroll_depth INTEGER DEFAULT 0,

    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_impressions_ad (ad_id),
    INDEX idx_impressions_campaign (campaign_id),
    INDEX idx_impressions_user (user_id),
    INDEX idx_impressions_timestamp (timestamp),
    INDEX idx_impressions_token (impression_token)
);

-- Clicks Table
CREATE TABLE IF NOT EXISTS clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    impression_token UUID NOT NULL,
    click_token UUID UNIQUE NOT NULL,

    -- Metadata
    user_agent TEXT,
    ip_address INET,
    click_x INTEGER,
    click_y INTEGER,
    time_since_impression_ms INTEGER,
    referrer TEXT,
    destination_url TEXT,

    -- Fraud Detection
    is_suspicious BOOLEAN DEFAULT FALSE,
    fraud_score DECIMAL(3, 2) DEFAULT 0,

    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_clicks_ad (ad_id),
    INDEX idx_clicks_campaign (campaign_id),
    INDEX idx_clicks_user (user_id),
    INDEX idx_clicks_impression (impression_token),
    INDEX idx_clicks_timestamp (timestamp),
    INDEX idx_clicks_token (click_token)
);

-- Conversions Table
CREATE TABLE IF NOT EXISTS conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    click_token UUID NOT NULL,

    -- Conversion Info
    conversion_type VARCHAR(50) NOT NULL CHECK (conversion_type IN ('registration', 'subscription', 'profile_completion', 'first_match', 'first_message', 'app_install')),
    conversion_value DECIMAL(10, 2),

    -- Attribution
    attribution_model VARCHAR(50) DEFAULT 'last_click',
    time_since_click_hours INTEGER,
    conversion_funnel_steps JSONB,

    -- Revenue
    revenue DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_conversions_ad (ad_id),
    INDEX idx_conversions_campaign (campaign_id),
    INDEX idx_conversions_user (user_id),
    INDEX idx_conversions_click (click_token),
    INDEX idx_conversions_type (conversion_type),
    INDEX idx_conversions_timestamp (timestamp)
);

-- Billing Accounts Table
CREATE TABLE IF NOT EXISTS billing_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID UNIQUE NOT NULL,
    payment_method_id VARCHAR(255),

    -- Account Settings
    billing_type VARCHAR(20) NOT NULL CHECK (billing_type IN ('prepaid', 'postpaid', 'credit')),
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    credit_limit DECIMAL(10, 2),

    -- Auto Recharge
    auto_recharge_enabled BOOLEAN DEFAULT FALSE,
    auto_recharge_threshold DECIMAL(10, 2),
    auto_recharge_amount DECIMAL(10, 2),
    auto_recharge_payment_method_id VARCHAR(255),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_billing_accounts_advertiser (advertiser_id),
    INDEX idx_billing_accounts_status (status)
);

-- Billing Transactions Table
CREATE TABLE IF NOT EXISTS billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_account_id UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,

    -- Transaction Info
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('charge', 'refund', 'deposit', 'adjustment', 'credit')),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT NOT NULL,
    reference_id VARCHAR(255),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),

    -- Metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,

    -- Indexes
    INDEX idx_transactions_account (billing_account_id),
    INDEX idx_transactions_type (transaction_type),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_created (created_at)
);

-- Ad Spend Table
CREATE TABLE IF NOT EXISTS ad_spend (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    billing_account_id UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,

    -- Spend Info
    spend_type VARCHAR(20) NOT NULL CHECK (spend_type IN ('impression', 'click', 'conversion', 'flat_fee')),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(6, 4) NOT NULL,

    -- Billing Period
    billing_period VARCHAR(7) NOT NULL, -- Format: YYYY-MM

    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_spend_campaign (campaign_id),
    INDEX idx_spend_ad (ad_id),
    INDEX idx_spend_account (billing_account_id),
    INDEX idx_spend_period (billing_period),
    INDEX idx_spend_timestamp (timestamp)
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_account_id UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,

    -- Billing Period
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,

    -- Amounts
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'cancelled')),

    -- Timestamps
    issued_at TIMESTAMP,
    due_date TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_invoices_account (billing_account_id),
    INDEX idx_invoices_number (invoice_number),
    INDEX idx_invoices_status (status),
    INDEX idx_invoices_period (period_start, period_end)
);

-- Invoice Line Items Table
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),

    -- Item Details
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 4) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,

    -- Period
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,

    -- Indexes
    INDEX idx_line_items_invoice (invoice_id),
    INDEX idx_line_items_campaign (campaign_id)
);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_accounts_updated_at BEFORE UPDATE ON billing_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
