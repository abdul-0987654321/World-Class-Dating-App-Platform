# Advertising Service API Documentation

## Overview
The Advertising Service provides comprehensive ad serving, tracking, and billing capabilities for the Flamoral dating platform. It includes AI-powered targeting, creative optimization, and performance analytics.

## Base URL
```
http://localhost:3010/api
```

## Core Features

### 1. Ad Serving Endpoints

#### Serve Ads
```http
POST /api/ads/serve
```

Request body:
```json
{
  "user_id": "uuid",
  "placement": {
    "placement_id": "feed_main",
    "placement_type": "feed",
    "screen_name": "home_feed",
    "format_constraints": {
      "allowed_formats": ["native", "banner"]
    }
  },
  "device_type": "mobile",
  "user_context": {
    "age": 28,
    "gender": "female",
    "location": {
      "city": "New York",
      "country": "USA",
      "coordinates": { "lat": 40.7128, "lng": -74.0060 }
    },
    "interests": ["travel", "fitness", "foodie"],
    "subscription_tier": "free",
    "relationship_intent": "serious",
    "profile_completeness": 85,
    "activity_level": "high"
  },
  "max_ads": 3
}
```

Response:
```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "ad_id": "uuid",
        "campaign_id": "uuid",
        "creative_id": "uuid",
        "title": "Find Your Valentine",
        "description": "Get 50% off Premium - Limited Time!",
        "image_url": "https://example.com/ad.jpg",
        "cta_text": "Upgrade Now",
        "cta_url": "https://flamoral.com/upgrade",
        "ad_format": "native",
        "impression_token": "uuid",
        "tracking_urls": {
          "impression": "/api/tracking/impression/uuid",
          "click": "/api/tracking/click/uuid",
          "conversion": "/api/tracking/conversion/uuid"
        },
        "relevance_score": 0.87,
        "bid_amount": 4.50
      }
    ],
    "request_id": "uuid",
    "served_at": "2025-02-10T15:30:00Z",
    "targeting_score": 0.85
  }
}
```

#### Get Active Campaigns
```http
GET /api/ads/campaigns
```

#### Create Campaign
```http
POST /api/ads/campaigns
```

Request body:
```json
{
  "advertiser_id": "uuid",
  "name": "Valentine's Day Promotion",
  "description": "Premium subscription discount",
  "objective": "subscriptions",
  "budget": {
    "total_budget": 10000,
    "daily_budget": 500,
    "bid_strategy": "cpa",
    "max_bid": 5.0,
    "currency": "USD"
  },
  "status": "active",
  "start_date": "2025-02-01T00:00:00Z",
  "end_date": "2025-02-14T23:59:59Z"
}
```

#### Update Campaign
```http
PUT /api/ads/campaigns/:campaignId
```

#### Get Ad by ID
```http
GET /api/ads/:adId
```

#### Create Ad
```http
POST /api/ads
```

Request body:
```json
{
  "campaign_id": "uuid",
  "creative_id": "uuid",
  "title": "Find Your Perfect Match",
  "description": "Join millions finding love",
  "image_url": "https://example.com/ad.jpg",
  "cta_text": "Start Dating",
  "cta_url": "https://flamoral.com/signup",
  "ad_format": "native",
  "targeting_config": {
    "age_range": { "min": 22, "max": 45 },
    "gender": ["all"],
    "subscription_tier": ["free"],
    "interests": ["travel", "fitness"]
  },
  "budget_config": {
    "total_budget": 5000,
    "daily_budget": 250,
    "bid_strategy": "cpc",
    "max_bid": 2.5,
    "currency": "USD"
  },
  "status": "active"
}
```

#### Update Ad
```http
PUT /api/ads/:adId
```

---

### 2. Tracking Endpoints

#### Track Impression
```http
POST /api/tracking/impression/:impressionToken
```

Request body:
```json
{
  "ad_id": "uuid",
  "campaign_id": "uuid",
  "user_id": "uuid",
  "metadata": {
    "viewport_size": { "width": 375, "height": 812 },
    "ad_position": 2,
    "viewable": true,
    "view_duration_ms": 3500,
    "scroll_depth": 60
  }
}
```

#### Track Click
```http
POST /api/tracking/click/:impressionToken
```

Request body:
```json
{
  "ad_id": "uuid",
  "campaign_id": "uuid",
  "user_id": "uuid",
  "metadata": {
    "click_coordinates": { "x": 187, "y": 450 },
    "time_since_impression_ms": 2500,
    "destination_url": "https://flamoral.com/upgrade"
  }
}
```

#### Track Conversion
```http
POST /api/tracking/conversion/:clickToken
```

Request body:
```json
{
  "ad_id": "uuid",
  "campaign_id": "uuid",
  "user_id": "uuid",
  "conversion_type": "subscription",
  "conversion_value": 29.99,
  "metadata": {
    "time_since_click_hours": 24,
    "conversion_funnel_steps": ["landing", "signup", "payment"],
    "revenue": 29.99,
    "currency": "USD"
  }
}
```

#### Get Ad Statistics
```http
GET /api/tracking/stats/ad/:adId?start_date=2025-02-01&end_date=2025-02-14
```

Response:
```json
{
  "success": true,
  "data": {
    "ad_id": "uuid",
    "campaign_id": "uuid",
    "time_period": {
      "start": "2025-02-01T00:00:00Z",
      "end": "2025-02-14T23:59:59Z"
    },
    "impressions": 15000,
    "clicks": 1200,
    "conversions": 85,
    "unique_impressions": 12000,
    "unique_clicks": 950,
    "ctr": 0.08,
    "cvr": 0.071,
    "avg_view_duration_ms": 3500,
    "viewability_rate": 0.78
  }
}
```

#### Get Campaign Statistics
```http
GET /api/tracking/stats/campaign/:campaignId?start_date=2025-02-01&end_date=2025-02-14
```

#### Get Hourly Breakdown
```http
GET /api/tracking/stats/campaign/:campaignId/hourly?date=2025-02-10
```

Response:
```json
{
  "success": true,
  "data": [
    { "hour": 0, "impressions": 1500, "clicks": 120 },
    { "hour": 1, "impressions": 1200, "clicks": 96 },
    { "hour": 19, "impressions": 3200, "clicks": 280 }
  ]
}
```

#### Get User Engagement Metrics
```http
GET /api/tracking/engagement/user/:userId
```

#### Detect Fraud
```http
POST /api/tracking/fraud/detect
```

Request body:
```json
{
  "ad_id": "uuid",
  "user_id": "uuid"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "is_suspicious": false,
    "risk_score": 0.15,
    "reasons": []
  }
}
```

---

### 3. Billing Endpoints

#### Get Billing Account
```http
GET /api/billing/account/:advertiserId
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "advertiser_id": "uuid",
    "payment_method_id": "pm_12345",
    "billing_type": "prepaid",
    "balance": 5000.00,
    "currency": "USD",
    "credit_limit": 10000.00,
    "auto_recharge": {
      "enabled": true,
      "threshold": 1000.00,
      "recharge_amount": 5000.00,
      "payment_method_id": "pm_12345"
    },
    "status": "active"
  }
}
```

#### Create Billing Account
```http
POST /api/billing/account
```

Request body:
```json
{
  "advertiser_id": "uuid",
  "billing_type": "prepaid",
  "initial_balance": 5000.00
}
```

#### Update Balance
```http
POST /api/billing/balance/update
```

Request body:
```json
{
  "billing_account_id": "uuid",
  "amount": 1000.00,
  "transaction_type": "deposit",
  "description": "Account recharge"
}
```

#### Record Ad Spend
```http
POST /api/billing/spend/record
```

Request body:
```json
{
  "campaign_id": "uuid",
  "ad_id": "uuid",
  "billing_account_id": "uuid",
  "spend_type": "click",
  "quantity": 100,
  "unit_price": 2.50
}
```

#### Calculate Campaign Spend
```http
GET /api/billing/spend/campaign/:campaignId?start_date=2025-02-01&end_date=2025-02-14
```

#### Generate Invoice
```http
POST /api/billing/invoice/generate
```

Request body:
```json
{
  "billing_account_id": "uuid",
  "start_date": "2025-02-01T00:00:00Z",
  "end_date": "2025-02-28T23:59:59Z"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_number": "INV-1707609600000",
    "billing_period": {
      "start": "2025-02-01T00:00:00Z",
      "end": "2025-02-28T23:59:59Z"
    },
    "line_items": [
      {
        "campaign_id": "uuid",
        "description": "Valentine's Day Promotion - Ad Spend",
        "quantity": 45000,
        "unit_price": 0.10,
        "amount": 4500.00
      }
    ],
    "subtotal": 7300.00,
    "tax": 584.00,
    "total": 7884.00,
    "currency": "USD",
    "status": "issued",
    "due_date": "2025-03-30T23:59:59Z"
  }
}
```

#### Get Billing Report
```http
GET /api/billing/report/:billingAccountId?start_date=2025-02-01&end_date=2025-02-28
```

Response:
```json
{
  "success": true,
  "data": {
    "billing_account_id": "uuid",
    "period": {
      "start": "2025-02-01T00:00:00Z",
      "end": "2025-02-28T23:59:59Z"
    },
    "summary": {
      "total_spend": 7300.00,
      "total_impressions": 80000,
      "total_clicks": 6400,
      "total_conversions": 420,
      "avg_cpc": 1.14,
      "avg_cpm": 91.25,
      "avg_cpa": 17.38
    },
    "campaign_breakdown": [
      {
        "campaign_id": "uuid",
        "campaign_name": "Valentine's Day Promotion",
        "spend": 4500.00,
        "impressions": 45000,
        "clicks": 3600,
        "conversions": 240,
        "ctr": 0.08,
        "cvr": 0.067
      }
    ],
    "daily_spend": [
      {
        "date": "2025-02-01T00:00:00Z",
        "spend": 350.00,
        "impressions": 3500,
        "clicks": 280,
        "conversions": 18
      }
    ]
  }
}
```

#### Process Payment
```http
POST /api/billing/payment/process
```

Request body:
```json
{
  "billing_account_id": "uuid",
  "amount": 5000.00,
  "payment_method_id": "pm_12345"
}
```

#### Check Budget Availability
```http
POST /api/billing/budget/check
```

Request body:
```json
{
  "campaign_id": "uuid",
  "billing_account_id": "uuid",
  "required_amount": 500.00
}
```

Response:
```json
{
  "success": true,
  "data": {
    "has_budget": true,
    "available_balance": 5000.00,
    "required_amount": 500.00
  }
}
```

#### Get Transaction History
```http
GET /api/billing/transactions/:billingAccountId?limit=50
```

---

### 4. AI Targeting Endpoints

All existing targeting endpoints remain available under `/api/targeting`.

### 5. AI Creative Endpoints

All existing creative endpoints remain available under `/api/creative`.

### 6. Optimization Endpoints

All existing optimization endpoints remain available under `/api/optimization`.

### 7. Innovations Endpoints

All existing innovations endpoints remain available under `/api/innovations`.

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

---

## Database Schema

The service uses PostgreSQL with the following main tables:
- `campaigns` - Ad campaigns
- `ads` - Individual ads
- `impressions` - Ad impression events
- `clicks` - Ad click events
- `conversions` - Conversion events
- `billing_accounts` - Advertiser billing accounts
- `billing_transactions` - Financial transactions
- `ad_spend` - Ad spend tracking
- `invoices` - Generated invoices
- `invoice_line_items` - Invoice line items

See `migrations/001_create_advertising_tables.sql` for complete schema.

---

## Environment Variables

```env
PORT=3010
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_ads
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_URL=redis://localhost:6379
ANALYTICS_SERVICE_URL=http://localhost:3007
AD_IMPRESSION_TRACKING=true
AD_CLICK_TRACKING=true
DEFAULT_AD_BUDGET_LIMIT=1000
```
