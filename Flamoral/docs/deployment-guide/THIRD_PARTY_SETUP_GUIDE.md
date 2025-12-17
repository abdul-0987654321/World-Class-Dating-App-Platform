# Third-Party Services Setup Guide

> Complete step-by-step instructions for setting up all third-party integrations

---

## Table of Contents

1. [Stripe (Payments)](#1-stripe-payments)
2. [Apple Developer (iOS)](#2-apple-developer-ios)
3. [Google Play (Android)](#3-google-play-android)
4. [Firebase (Push Notifications)](#4-firebase-push-notifications)
5. [Agora (Video Calling)](#5-agora-video-calling)
6. [Google OAuth](#6-google-oauth)
7. [Facebook Login](#7-facebook-login)
8. [Twilio (SMS)](#8-twilio-sms)
9. [SendGrid (Email)](#9-sendgrid-email)
10. [Azure Cognitive Services](#10-azure-cognitive-services)
11. [OpenAI](#11-openai)
12. [Tenor/Giphy (GIFs)](#12-tenorgiphy-gifs)

---

## 1. Stripe (Payments)

### Setup Steps

1. **Create Account**
   - Go to https://stripe.com
   - Click "Start now" and create account
   - Verify email and phone number

2. **Get API Keys**
   ```
   Dashboard > Developers > API keys

   Copy:
   - Publishable key (pk_live_xxx or pk_test_xxx)
   - Secret key (sk_live_xxx or sk_test_xxx)
   ```

3. **Create Products**
   ```
   Dashboard > Products > Add product

   Create these products:

   1. Gold Monthly
      - Name: Gold Monthly
      - Price: $14.99 USD / month
      - Recurring

   2. Gold Yearly
      - Name: Gold Yearly
      - Price: $143.88 USD / year
      - Recurring

   3. Platinum Monthly
      - Name: Platinum Monthly
      - Price: $24.99 USD / month
      - Recurring

   4. Platinum Yearly
      - Name: Platinum Yearly
      - Price: $239.88 USD / year
      - Recurring

   5. Diamond Monthly
      - Name: Diamond Monthly
      - Price: $39.99 USD / month
      - Recurring

   6. Diamond Yearly
      - Name: Diamond Yearly
      - Price: $383.88 USD / year
      - Recurring
   ```

4. **Configure Webhook**
   ```
   Dashboard > Developers > Webhooks > Add endpoint

   Endpoint URL: https://api.flamoral.com/api/payments/webhook

   Events to select:
   - checkout.session.completed
   - checkout.session.expired
   - customer.created
   - customer.updated
   - customer.deleted
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - customer.subscription.trial_will_end
   - invoice.created
   - invoice.paid
   - invoice.payment_failed
   - invoice.payment_succeeded
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.refunded
   - charge.dispute.created
   ```

5. **Copy Webhook Secret**
   ```
   After creating webhook, copy the signing secret:
   whsec_xxx
   ```

### Environment Variables
```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 2. Apple Developer (iOS)

### Setup Steps

1. **Create Account**
   - Go to https://developer.apple.com
   - Click "Account" > "Enroll"
   - Pay $99/year enrollment fee
   - Wait for approval (1-2 days)

2. **Create App ID**
   ```
   Certificates, IDs & Profiles > Identifiers > App IDs

   - Description: Flamoral Dating App
   - Bundle ID: com.flamoral.app (Explicit)

   Capabilities to enable:
   - Push Notifications
   - Sign In with Apple
   - In-App Purchase
   - Associated Domains
   ```

3. **Create APNs Key (for Push Notifications)**
   ```
   Certificates, IDs & Profiles > Keys > Create a Key

   - Key Name: Flamoral APNs Key
   - Enable: Apple Push Notifications service (APNs)

   Download .p8 file and note:
   - Key ID: XXXXXXXXXX
   - Team ID: XXXXXXXXXX (from Membership page)
   ```

4. **Create Sign In with Apple Key**
   ```
   Certificates, IDs & Profiles > Keys > Create a Key

   - Key Name: Flamoral Sign In with Apple
   - Enable: Sign In with Apple
   - Configure: Select your App ID

   Download .p8 file and note Key ID
   ```

5. **Create Services ID (for Web)**
   ```
   Certificates, IDs & Profiles > Identifiers > Services IDs

   - Description: Flamoral Web Sign In
   - Identifier: com.flamoral.web

   Configure Sign In with Apple:
   - Primary App ID: com.flamoral.app
   - Domains: flamoral.com, www.flamoral.com
   - Return URLs: https://api.flamoral.com/api/auth/apple/callback
   ```

6. **Configure App Store Connect**
   ```
   https://appstoreconnect.apple.com

   My Apps > + New App
   - Platform: iOS
   - Name: Flamoral
   - Primary Language: English (U.S.)
   - Bundle ID: Select com.flamoral.app
   - SKU: flamoral-ios
   ```

7. **Create In-App Purchases**
   ```
   App Store Connect > Your App > In-App Purchases

   Auto-Renewable Subscriptions:

   1. Create Subscription Group: "Flamoral Premium"

   2. Add subscriptions:
      - flamoral.gold.monthly ($14.99/month)
      - flamoral.gold.yearly ($143.88/year)
      - flamoral.platinum.monthly ($24.99/month)
      - flamoral.platinum.yearly ($239.88/year)
      - flamoral.diamond.monthly ($39.99/month)
      - flamoral.diamond.yearly ($383.88/year)

   Consumable Products:
   - flamoral.coins.100 ($0.99)
   - flamoral.coins.500 ($3.99)
   - flamoral.coins.1000 ($6.99)
   - flamoral.boost.1 ($2.99)
   - flamoral.boost.5 ($9.99)
   - flamoral.superlike.5 ($4.99)
   - flamoral.superlike.25 ($19.99)
   ```

8. **Get Shared Secret**
   ```
   App Store Connect > Your App > In-App Purchases > App-Specific Shared Secret

   Generate and copy the secret
   ```

### Environment Variables
```env
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_CLIENT_ID=com.flamoral.app
APPLE_SERVICES_ID=com.flamoral.web
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTxxx...\n-----END PRIVATE KEY-----"
APPLE_SHARED_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APNS_KEY_ID=XXXXXXXXXX
APNS_KEY_FILE=/path/to/AuthKey_XXXXXXXX.p8
```

---

## 3. Google Play (Android)

### Setup Steps

1. **Create Developer Account**
   - Go to https://play.google.com/console
   - Pay $25 one-time registration fee
   - Complete account details

2. **Create App**
   ```
   All apps > Create app

   - App name: Flamoral
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free (with in-app purchases)
   ```

3. **Configure App Signing**
   ```
   Release > Setup > App signing

   Choose "Let Google manage and protect your app signing key"

   Upload your upload key or let Google generate one
   ```

4. **Create In-App Products**
   ```
   Monetize > Products > In-app products

   Subscriptions (create subscription group first):
   - flamoral.gold.monthly ($14.99/month)
   - flamoral.gold.yearly ($143.88/year)
   - flamoral.platinum.monthly ($24.99/month)
   - flamoral.platinum.yearly ($239.88/year)
   - flamoral.diamond.monthly ($39.99/month)
   - flamoral.diamond.yearly ($383.88/year)

   Managed products (consumables):
   - flamoral.coins.100 ($0.99)
   - flamoral.coins.500 ($3.99)
   - flamoral.coins.1000 ($6.99)
   - flamoral.boost.1 ($2.99)
   - flamoral.boost.5 ($9.99)
   - flamoral.superlike.5 ($4.99)
   - flamoral.superlike.25 ($19.99)
   ```

5. **Create Service Account**
   ```
   Settings > Developer account > API access

   1. Link to Google Cloud project or create new
   2. Create new service account
   3. Grant "Financial" permissions
   4. Download JSON key file
   ```

6. **Configure OAuth for Google Sign In**
   - See Google OAuth section below

### Environment Variables
```env
GOOGLE_PLAY_PACKAGE_NAME=com.flamoral.app
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PLAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQxxx...\n-----END PRIVATE KEY-----"
```

---

## 4. Firebase (Push Notifications)

### Setup Steps

1. **Create Project**
   - Go to https://console.firebase.google.com
   - Click "Add project"
   - Project name: flamoral-app
   - Disable Google Analytics (or enable if needed)

2. **Add iOS App**
   ```
   Project Overview > Add app > iOS

   - Bundle ID: com.flamoral.app
   - App nickname: Flamoral iOS

   Download GoogleService-Info.plist
   ```

3. **Add Android App**
   ```
   Project Overview > Add app > Android

   - Package name: com.flamoral.app
   - App nickname: Flamoral Android
   - SHA-1: Get from your keystore

   Download google-services.json
   ```

4. **Configure Cloud Messaging**
   ```
   Project Settings > Cloud Messaging

   For iOS:
   - Upload APNs Authentication Key (.p8 file)
   - Or upload APNs Certificates
   ```

5. **Generate Service Account**
   ```
   Project Settings > Service accounts

   Click "Generate new private key"
   Download JSON file
   ```

### Environment Variables
```env
FIREBASE_PROJECT_ID=flamoral-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@flamoral-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQxxx...\n-----END PRIVATE KEY-----"
```

---

## 5. Agora (Video Calling)

### Setup Steps

1. **Create Account**
   - Go to https://console.agora.io
   - Sign up with email
   - Verify account

2. **Create Project**
   ```
   Project Management > Create

   - Project name: Flamoral
   - Authentication: APP ID + Token (Secured mode)
   ```

3. **Get Credentials**
   ```
   Project > Config

   Copy:
   - App ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   - App Certificate: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. **Configure Cloud Recording (Optional)**
   ```
   Products > Cloud Recording > Enable

   Configure storage:
   - AWS S3 or Azure Blob Storage
   - Access credentials
   ```

### Environment Variables
```env
AGORA_APP_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGORA_APP_CERTIFICATE=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 6. Google OAuth

### Setup Steps

1. **Create Project**
   - Go to https://console.cloud.google.com
   - Create new project: "Flamoral"

2. **Configure OAuth Consent Screen**
   ```
   APIs & Services > OAuth consent screen

   - User Type: External
   - App name: Flamoral
   - User support email: support@flamoral.com
   - App logo: Upload logo
   - Application home page: https://flamoral.com
   - Application privacy policy: https://flamoral.com/privacy
   - Application terms of service: https://flamoral.com/terms
   - Authorized domains: flamoral.com

   Scopes:
   - email
   - profile
   - openid
   ```

3. **Create OAuth Credentials**
   ```
   APIs & Services > Credentials > Create Credentials > OAuth client ID

   For Web:
   - Application type: Web application
   - Name: Flamoral Web
   - Authorized JavaScript origins:
     - https://flamoral.com
     - https://www.flamoral.com
   - Authorized redirect URIs:
     - https://api.flamoral.com/api/auth/google/callback

   For iOS:
   - Application type: iOS
   - Name: Flamoral iOS
   - Bundle ID: com.flamoral.app

   For Android:
   - Application type: Android
   - Name: Flamoral Android
   - Package name: com.flamoral.app
   - SHA-1 certificate fingerprint: (get from keystore)
   ```

### Environment Variables
```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com
```

---

## 7. Facebook Login

### Setup Steps

1. **Create App**
   - Go to https://developers.facebook.com
   - My Apps > Create App
   - App Type: Consumer
   - App name: Flamoral

2. **Add Facebook Login**
   ```
   Add Product > Facebook Login > Set Up

   Settings:
   - Client OAuth Login: Yes
   - Web OAuth Login: Yes
   - Enforce HTTPS: Yes
   - Valid OAuth Redirect URIs:
     - https://api.flamoral.com/api/auth/facebook/callback
   ```

3. **Configure Platforms**
   ```
   Settings > Basic > Add Platform

   iOS:
   - Bundle ID: com.flamoral.app

   Android:
   - Package Name: com.flamoral.app
   - Class Name: com.flamoral.app.MainActivity
   - Key Hashes: (generate from keystore)

   Website:
   - Site URL: https://flamoral.com
   ```

4. **Get Credentials**
   ```
   Settings > Basic

   Copy:
   - App ID
   - App Secret
   ```

5. **Submit for Review**
   ```
   App Review > Permissions and Features

   Request:
   - public_profile
   - email

   Provide:
   - Privacy Policy URL
   - Terms of Service URL
   - App verification
   ```

### Environment Variables
```env
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 8. Twilio (SMS)

### Setup Steps

1. **Create Account**
   - Go to https://twilio.com
   - Sign up for account
   - Verify phone number

2. **Get a Phone Number**
   ```
   Phone Numbers > Manage > Buy a number

   Select number with SMS capability
   ```

3. **Get Credentials**
   ```
   Console Dashboard

   Copy:
   - Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   - Auth Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. **Verify for Production**
   ```
   For production:
   - Upgrade from trial account
   - Complete business verification
   - Register for A2P 10DLC (US)
   ```

### Environment Variables
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 9. SendGrid (Email)

### Setup Steps

1. **Create Account**
   - Go to https://sendgrid.com
   - Sign up for account
   - Choose plan (Free tier: 100 emails/day)

2. **Verify Domain**
   ```
   Settings > Sender Authentication > Domain Authentication

   Add DNS records to your domain
   ```

3. **Create API Key**
   ```
   Settings > API Keys > Create API Key

   - Name: Flamoral Production
   - Permissions: Full Access or Restricted (Mail Send)

   Copy API key (shown only once)
   ```

4. **Create Templates (Optional)**
   ```
   Email API > Dynamic Templates

   Create templates for:
   - Welcome email
   - Password reset
   - Match notification
   - Message notification
   ```

### Environment Variables
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@flamoral.com
SENDGRID_FROM_NAME=Flamoral
```

---

## 10. Azure Cognitive Services

### Setup Steps

1. **Create Face API**
   ```
   Azure Portal > Create Resource > Face

   - Name: flamoral-face-api
   - Region: East US
   - Pricing tier: S0
   ```

2. **Create Content Moderator**
   ```
   Azure Portal > Create Resource > Content Moderator

   - Name: flamoral-content-moderator
   - Region: East US
   - Pricing tier: S0
   ```

3. **Get Keys**
   ```
   Each resource > Keys and Endpoint

   Copy:
   - KEY 1
   - Endpoint
   ```

### Environment Variables
```env
AZURE_FACE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_FACE_ENDPOINT=https://eastus.api.cognitive.microsoft.com
AZURE_CONTENT_MODERATOR_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_CONTENT_MODERATOR_ENDPOINT=https://eastus.api.cognitive.microsoft.com
```

---

## 11. OpenAI

### Setup Steps

1. **Create Account**
   - Go to https://platform.openai.com
   - Sign up or log in

2. **Get API Key**
   ```
   API Keys > Create new secret key

   - Name: Flamoral Production

   Copy key (shown only once)
   ```

3. **Set Usage Limits**
   ```
   Settings > Limits

   Set monthly budget to prevent overages
   ```

### Environment Variables
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 12. Tenor/Giphy (GIFs)

### Tenor Setup

1. **Create Account**
   - Go to https://tenor.com/developer/dashboard
   - Sign up with Google account

2. **Create App**
   ```
   Create new app

   - App name: Flamoral
   - Description: Dating app GIF integration
   ```

3. **Get API Key**
   ```
   Copy API key from dashboard
   ```

### Giphy Setup (Alternative)

1. **Create Account**
   - Go to https://developers.giphy.com
   - Sign up for account

2. **Create App**
   ```
   Create an App > API

   - App name: Flamoral
   - Description: Dating app GIF integration
   ```

3. **Get API Key**
   ```
   Copy API key from dashboard
   ```

### Environment Variables
```env
TENOR_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
GIPHY_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Quick Setup Checklist

```
[ ] Stripe account created
[ ] Stripe products configured
[ ] Stripe webhook configured
[ ] Apple Developer account created ($99)
[ ] Apple App ID created
[ ] Apple APNs key created
[ ] Apple Sign In configured
[ ] App Store Connect app created
[ ] iOS in-app purchases created
[ ] Apple shared secret obtained
[ ] Google Play account created ($25)
[ ] Google Play app created
[ ] Android in-app products created
[ ] Google Play service account created
[ ] Firebase project created
[ ] Firebase iOS app added
[ ] Firebase Android app added
[ ] Firebase service account downloaded
[ ] Agora project created
[ ] Agora credentials obtained
[ ] Google OAuth credentials created
[ ] Facebook app created
[ ] Facebook login configured
[ ] Facebook app submitted for review
[ ] Twilio account created
[ ] Twilio phone number purchased
[ ] SendGrid account created
[ ] SendGrid domain verified
[ ] Azure Face API created
[ ] Azure Content Moderator created
[ ] OpenAI API key created
[ ] Tenor/Giphy API key created
```

---

*Document maintained by Flamoral Engineering Team*
