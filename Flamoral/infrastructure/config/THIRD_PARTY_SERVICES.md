# Third-Party Services Configuration Guide

## Overview

This document provides detailed configuration instructions for all third-party services used in the Flamoral Dating Platform.

## Table of Contents

1. [Payment Services](#payment-services)
2. [Communication Services](#communication-services)
3. [Cloud Storage](#cloud-storage)
4. [Authentication Providers](#authentication-providers)
5. [AI/ML Services](#aiml-services)
6. [Video/Voice Services](#videovoice-services)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Geolocation Services](#geolocation-services)
9. [Support & Helpdesk](#support--helpdesk)

---

## Payment Services

### Stripe

**Purpose**: Payment processing and subscription management

**Required Environment Variables**:
- `STRIPE_SECRET_KEY` (secret)
- `STRIPE_PUBLISHABLE_KEY` (public)
- `STRIPE_WEBHOOK_SECRET` (secret)

#### Setup Instructions

1. **Create Stripe Account**
   - Visit: https://dashboard.stripe.com/register
   - Complete business verification for production

2. **Get API Keys**
   - Development: https://dashboard.stripe.com/test/apikeys
   - Production: https://dashboard.stripe.com/apikeys
   - Copy Secret key (`sk_test_*` or `sk_live_*`)
   - Copy Publishable key (`pk_test_*` or `pk_live_*`)

3. **Configure Webhooks**
   ```bash
   # Development webhook endpoint
   https://api-dev.flamoral.app/webhooks/stripe

   # Production webhook endpoint
   https://api.flamoral.app/webhooks/stripe
   ```

   **Events to Subscribe**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. **Get Webhook Secret**
   - After creating webhook, copy the signing secret (`whsec_*`)

5. **Testing**
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login
   stripe login

   # Forward webhooks to local dev
   stripe listen --forward-to localhost:3000/webhooks/stripe
   ```

**Cost**: 2.9% + $0.30 per successful card charge

---

## Communication Services

### SendGrid (Email)

**Purpose**: Transactional and marketing emails

**Required Environment Variables**:
- `SENDGRID_API_KEY` (secret)
- `SENDGRID_FROM_EMAIL`
- `SENDGRID_FROM_NAME`

#### Setup Instructions

1. **Create SendGrid Account**
   - Visit: https://signup.sendgrid.com/
   - Free tier: 100 emails/day

2. **Create API Key**
   - Navigate to: Settings > API Keys
   - Click "Create API Key"
   - Name: `Flamoral Production` (or environment name)
   - Permissions: "Full Access" or "Restricted Access" (Mail Send only)
   - Copy the API key immediately (shown only once)

3. **Verify Sender Identity**
   - Single Sender: Settings > Sender Authentication > Verify Single Sender
   - Or Domain Authentication (recommended for production)

4. **Create Email Templates**
   - Navigate to: Email API > Dynamic Templates
   - Create templates for:
     - Welcome email
     - Email verification
     - Password reset
     - Match notifications
     - Message notifications

5. **Configure Domain Authentication (Production)**
   ```bash
   # DNS records to add (provided by SendGrid)
   TXT record: @ -> v=spf1 include:sendgrid.net ~all
   CNAME: em1234.flamoral.com -> u1234.wl.sendgrid.net
   CNAME: s1._domainkey.flamoral.com -> s1.domainkey.u1234.wl.sendgrid.net
   CNAME: s2._domainkey.flamoral.com -> s2.domainkey.u1234.wl.sendgrid.net
   ```

**Cost**:
- Free: 100 emails/day
- Essentials: $19.95/month for 50K emails
- Pro: $89.95/month for 100K emails

### Twilio (SMS/Voice)

**Purpose**: SMS verification, notifications, and voice calls

**Required Environment Variables**:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN` (secret)
- `TWILIO_PHONE_NUMBER`
- `TWILIO_VERIFY_SERVICE_SID`

#### Setup Instructions

1. **Create Twilio Account**
   - Visit: https://www.twilio.com/try-twilio
   - Verify your phone number

2. **Get Account Credentials**
   - Dashboard: https://console.twilio.com/
   - Copy Account SID
   - Copy Auth Token (click to reveal)

3. **Purchase Phone Number**
   - Phone Numbers > Buy a Number
   - Select country and capabilities (SMS, Voice)
   - Purchase number

4. **Set up Verify Service (for OTP)**
   - Navigate to: Verify > Services
   - Create new service: "Flamoral Verification"
   - Copy Service SID

5. **Configure Webhooks**
   - Set Status Callback URL for SMS delivery receipts
   - Development: `https://api-dev.flamoral.app/webhooks/twilio/sms`
   - Production: `https://api.flamoral.app/webhooks/twilio/sms`

6. **Testing**
   ```bash
   # Test numbers (development)
   +15005550006  # Valid test number
   +15005550001  # Invalid test number
   ```

**Cost**:
- SMS: $0.0075 per message (US)
- Voice: $0.013 per minute (US)
- Verify: $0.05 per verification

---

## Cloud Storage

### Azure Storage Account

**Purpose**: Photo, video, and document storage with CDN

**Required Environment Variables**:
- `AZURE_STORAGE_ACCOUNT`
- `AZURE_STORAGE_KEY` (secret)
- `AZURE_STORAGE_CONNECTION_STRING` (secret)
- `AZURE_STORAGE_CDN_ENDPOINT`

#### Setup Instructions

1. **Create Storage Account**
   ```bash
   az storage account create \
     --name flamoralprodst \
     --resource-group flamoral-prod-rg \
     --location eastus \
     --sku Standard_GRS \
     --kind StorageV2 \
     --access-tier Hot
   ```

2. **Get Connection String**
   ```bash
   az storage account show-connection-string \
     --name flamoralprodst \
     --resource-group flamoral-prod-rg \
     --query connectionString \
     --output tsv
   ```

3. **Create Blob Containers**
   ```bash
   az storage container create \
     --name photos \
     --account-name flamoralprodst \
     --public-access off

   az storage container create \
     --name videos \
     --account-name flamoralprodst \
     --public-access off
   ```

4. **Enable CDN** (Optional but recommended)
   ```bash
   az cdn profile create \
     --name flamoral-cdn \
     --resource-group flamoral-prod-rg \
     --sku Standard_Microsoft

   az cdn endpoint create \
     --name flamoral-media \
     --profile-name flamoral-cdn \
     --resource-group flamoral-prod-rg \
     --origin flamoralprodst.blob.core.windows.net
   ```

5. **Configure CORS** (if needed for direct uploads)
   ```bash
   az storage cors add \
     --account-name flamoralprodst \
     --services b \
     --methods GET POST PUT \
     --origins https://flamoral.app \
     --allowed-headers "*" \
     --max-age 3600
   ```

**Cost**: ~$0.018 per GB/month (Hot tier, GRS)

---

## Authentication Providers

### Google OAuth

**Required Environment Variables**:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` (secret)
- `GOOGLE_CALLBACK_URL`

#### Setup Instructions

1. **Create Google Cloud Project**
   - Visit: https://console.cloud.google.com/
   - Create new project: "Flamoral"

2. **Enable Google+ API**
   - APIs & Services > Library
   - Search for "Google+ API"
   - Click Enable

3. **Create OAuth Credentials**
   - APIs & Services > Credentials
   - Create Credentials > OAuth client ID
   - Application type: Web application
   - Name: "Flamoral Production"

4. **Configure Redirect URIs**
   ```
   Development: http://localhost:3000/auth/google/callback
   Production: https://api.flamoral.app/auth/google/callback
   ```

5. **Copy Credentials**
   - Client ID: `*.apps.googleusercontent.com`
   - Client Secret: Copy and store securely

**Cost**: Free

### Facebook OAuth

**Required Environment Variables**:
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET` (secret)
- `FACEBOOK_CALLBACK_URL`

#### Setup Instructions

1. **Create Facebook App**
   - Visit: https://developers.facebook.com/apps/
   - Create App > Consumer
   - Display Name: "Flamoral"

2. **Add Facebook Login Product**
   - Dashboard > Add Product
   - Select "Facebook Login"
   - Choose "Web"

3. **Configure OAuth Redirect URIs**
   ```
   Valid OAuth Redirect URIs:
   https://api.flamoral.app/auth/facebook/callback
   ```

4. **Get App Credentials**
   - Settings > Basic
   - Copy App ID
   - Copy App Secret

5. **Configure App for Production**
   - App Review > Request Permissions
   - Required: `email`, `public_profile`
   - Submit for review

**Cost**: Free

### Apple Sign In

**Required Environment Variables**:
- `APPLE_CLIENT_ID`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY` (secret)

#### Setup Instructions

1. **Apple Developer Account Required**
   - Enroll at: https://developer.apple.com/programs/

2. **Create App ID**
   - Certificates, IDs & Profiles > Identifiers
   - Register a new identifier > App IDs
   - Enable "Sign in with Apple"

3. **Create Services ID**
   - Register a new identifier > Services IDs
   - Identifier: `com.flamoral.app`
   - Configure "Sign in with Apple"
   - Return URLs: `https://api.flamoral.app/auth/apple/callback`

4. **Create Key**
   - Keys > Create a new key
   - Enable "Sign in with Apple"
   - Download the key file (`.p8`)
   - Note the Key ID

5. **Extract Required Values**
   - Client ID: Services ID (`com.flamoral.app`)
   - Team ID: From membership details
   - Key ID: From created key
   - Private Key: Contents of `.p8` file

**Cost**: $99/year (Apple Developer Program)

---

## AI/ML Services

### OpenAI API

**Purpose**: GPT-4 for dating coach, content generation

**Required Environment Variables**:
- `OPENAI_API_KEY` (secret)
- `OPENAI_ORGANIZATION_ID`

#### Setup Instructions

1. **Create OpenAI Account**
   - Visit: https://platform.openai.com/signup

2. **Get API Key**
   - https://platform.openai.com/api-keys
   - Create new secret key
   - Copy immediately (shown only once)

3. **Set Usage Limits** (Recommended)
   - Settings > Billing > Usage limits
   - Set monthly budget cap

4. **Choose Model**
   - GPT-4 Turbo: Best quality, higher cost
   - GPT-3.5 Turbo: Good quality, lower cost

**Cost**:
- GPT-4 Turbo: $0.01 per 1K input tokens, $0.03 per 1K output tokens
- GPT-3.5 Turbo: $0.0005 per 1K input tokens, $0.0015 per 1K output tokens

### Azure Cognitive Services

**Purpose**: Face verification, content moderation, computer vision

**Required Environment Variables**:
- `AZURE_FACE_API_KEY` (secret)
- `AZURE_FACE_API_ENDPOINT`
- `AZURE_CONTENT_MODERATOR_KEY` (secret)
- `AZURE_CONTENT_MODERATOR_ENDPOINT`

#### Setup Instructions

1. **Create Face API Resource**
   ```bash
   az cognitiveservices account create \
     --name flamoral-face-api \
     --resource-group flamoral-prod-rg \
     --kind Face \
     --sku S0 \
     --location eastus \
     --yes
   ```

2. **Get Face API Keys**
   ```bash
   az cognitiveservices account keys list \
     --name flamoral-face-api \
     --resource-group flamoral-prod-rg
   ```

3. **Create Content Moderator**
   ```bash
   az cognitiveservices account create \
     --name flamoral-moderator \
     --resource-group flamoral-prod-rg \
     --kind ContentModerator \
     --sku S0 \
     --location eastus \
     --yes
   ```

**Cost**: Pay-per-transaction, pricing varies by service

---

## Video/Voice Services

### Agora

**Purpose**: Video and voice calling

**Required Environment Variables**:
- `AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE` (secret)
- `AGORA_CUSTOMER_KEY` (secret)
- `AGORA_CUSTOMER_SECRET` (secret)

#### Setup Instructions

1. **Create Agora Account**
   - Visit: https://console.agora.io/

2. **Create Project**
   - Projects > Create
   - Name: "Flamoral Production"
   - Use Case: Social
   - Enable App Certificate

3. **Get Credentials**
   - App ID: From project dashboard
   - App Certificate: Enable and copy
   - Customer ID & Secret: For REST API access

4. **Configure Features**
   - Enable: Audio, Video, Recording
   - Set region: Based on your users
   - Configure TURN servers for firewall traversal

**Cost**:
- Free: 10,000 minutes/month
- Pay-as-you-go: $0.99 per 1000 minutes (video HD)

---

## Monitoring & Analytics

### Sentry

**Purpose**: Error tracking and performance monitoring

**Required Environment Variables**:
- `SENTRY_DSN` (secret)
- `SENTRY_ENVIRONMENT`

#### Setup Instructions

1. **Create Sentry Account**
   - Visit: https://sentry.io/signup/

2. **Create Project**
   - Projects > Create Project
   - Platform: Node.js
   - Name: "Flamoral Production"

3. **Get DSN**
   - Settings > Projects > Flamoral Production
   - Client Keys (DSN)
   - Copy DSN URL

4. **Configure Releases**
   ```bash
   sentry-cli releases new -p flamoral-production 1.0.0
   sentry-cli releases set-commits 1.0.0 --auto
   sentry-cli releases finalize 1.0.0
   ```

**Cost**:
- Developer: Free (5K errors/month)
- Team: $26/month (50K errors/month)

### Mixpanel

**Purpose**: Product analytics and user tracking

**Required Environment Variables**:
- `MIXPANEL_TOKEN` (secret)

#### Setup Instructions

1. **Create Mixpanel Account**
   - Visit: https://mixpanel.com/register/

2. **Create Project**
   - Organization Settings > Projects
   - Create new project: "Flamoral Production"

3. **Get Project Token**
   - Project Settings > Project Token
   - Copy token

4. **Set up Events**
   - Define key events to track
   - Set up funnel analysis
   - Configure cohorts

**Cost**:
- Free: 100K monthly tracked users
- Growth: $25/month for 1M events

---

## Geolocation Services

### Google Maps API

**Purpose**: Geocoding, distance calculation, map display

**Required Environment Variables**:
- `GOOGLE_MAPS_API_KEY` (secret)

#### Setup Instructions

1. **Enable APIs**
   - Google Cloud Console
   - Enable: Maps JavaScript API, Geocoding API, Distance Matrix API

2. **Create API Key**
   - Credentials > Create Credentials > API Key
   - Restrict key to specific APIs
   - Add application restrictions (HTTP referrers)

3. **Set Usage Limits**
   - Quotas > Set limits to prevent abuse

**Cost**:
- $200 free credit/month
- Maps: $7 per 1000 loads
- Geocoding: $5 per 1000 requests

---

## Support & Helpdesk

### Zendesk

**Purpose**: Customer support ticketing

**Required Environment Variables**:
- `ZENDESK_SUBDOMAIN`
- `ZENDESK_API_TOKEN` (secret)
- `ZENDESK_EMAIL`

#### Setup Instructions

1. **Create Zendesk Account**
   - Visit: https://www.zendesk.com/register/

2. **Get API Token**
   - Admin > Channels > API
   - Enable Token Access
   - Add API token

3. **Configure Webhooks**
   - Extensions > Webhooks
   - Create webhook for new tickets

**Cost**:
- Suite Team: $49 per agent/month
- Suite Growth: $79 per agent/month

---

## Summary Checklist

Before going to production, ensure:

- [ ] All API keys generated
- [ ] Secrets stored in Azure Key Vault
- [ ] Webhooks configured and tested
- [ ] Production vs test credentials verified
- [ ] Rate limits and quotas configured
- [ ] Billing alerts set up
- [ ] Contact information updated
- [ ] Documentation reviewed
- [ ] Backup credentials stored securely

---

**Last Updated**: 2025-12-11
**Maintained By**: DevOps Team
