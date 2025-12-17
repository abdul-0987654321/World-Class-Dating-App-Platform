# Flamoral Dating Platform - Mobile Payments Implementation

## Overview

This document describes the complete mobile payment system implementation for the Flamoral Dating Platform, including Apple Pay, Google Pay, in-app purchases, subscription management, and virtual currency.

## Table of Contents

1. [Backend Implementation](#backend-implementation)
2. [Mobile App Implementation](#mobile-app-implementation)
3. [Configuration](#configuration)
4. [Testing](#testing)
5. [Deployment](#deployment)

---

## Backend Implementation

### Files Created

#### 1. Apple In-App Purchase Service
**Location:** `backend/services/payment-service/src/domain/services/apple-iap.service.ts`

**Features:**
- Receipt validation with Apple App Store
- Automatic sandbox/production environment detection
- Subscription status checking
- Product ID to tier mapping
- Consumable product parsing (coins, boosts, super likes)

**Key Methods:**
- `validateReceipt(receipt: string)` - Validates Apple IAP receipt
- `getActiveSubscription(receipt: string)` - Gets active subscription info
- `verifySubscription(receipt, productId)` - Verifies specific subscription
- `mapProductIdToTier(productId)` - Maps Apple product ID to tier
- `parseConsumableProduct(productId)` - Parses consumable purchase details

#### 2. Google Play Billing Service
**Location:** `backend/services/payment-service/src/domain/services/google-play.service.ts`

**Features:**
- Integration with Google Play Android Publisher API
- Subscription validation and management
- Product purchase validation
- Purchase acknowledgment
- Subscription cancellation and refund

**Key Methods:**
- `validateSubscription(productId, purchaseToken)` - Validates Google Play subscription
- `validateProduct(productId, purchaseToken)` - Validates product purchase
- `acknowledgePurchase(productId, purchaseToken)` - Acknowledges purchase (required by Google)
- `cancelSubscription(subscriptionId, purchaseToken)` - Cancels subscription
- `refundSubscription(subscriptionId, purchaseToken)` - Processes refund

#### 3. IAP Controller
**Location:** `backend/services/payment-service/src/api/controllers/iap.controller.ts`

**Endpoints:**
- `POST /api/payments/iap/validate` - Validate receipt (Apple or Google)
- `POST /api/payments/iap/restore` - Restore purchases
- `GET /api/payments/iap/subscription` - Get subscription status
- `GET /api/payments/iap/transactions` - Get transaction history
- `GET /api/payments/iap/wallet` - Get wallet balance

#### 4. IAP Routes
**Location:** `backend/services/payment-service/src/api/routes/iap.routes.ts`

Configures all IAP-related API endpoints with validation middleware.

#### 5. IAP Validators
**Location:** `backend/services/payment-service/src/api/validators/iap.validator.ts`

Joi schemas for validating IAP requests.

### Required Backend Configuration Changes

#### 1. Update `src/index.ts`
Add IAP routes import and mount:

```typescript
// Import routes
import paymentRoutes from './api/routes/payment.routes';
import webhookRoutes from './api/routes/webhook.routes';
import iapRoutes from './api/routes/iap.routes'; // ADD THIS

// Mount routes
app.use('/api/payments', paymentRoutes);
app.use('/api/payments/iap', iapRoutes); // ADD THIS
```

#### 2. Update `package.json`
Add Google Play API dependency:

```json
{
  "dependencies": {
    // ... existing dependencies
    "googleapis": "^128.0.0"
  }
}
```

Run: `npm install googleapis`

#### 3. Environment Variables
Add to `.env`:

```bash
# Apple IAP Configuration
APPLE_IAP_SHARED_SECRET=your_app_specific_shared_secret
APPLE_BUNDLE_ID=com.flamoral.app

# Google Play Configuration
GOOGLE_PLAY_PACKAGE_NAME=com.flamoral.app
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
# OR as JSON string:
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"..."}'
```

### Product SKUs Configuration

#### Apple App Store Product IDs
```
Subscriptions:
- com.flamoral.gold.monthly
- com.flamoral.gold.yearly
- com.flamoral.platinum.monthly
- com.flamoral.platinum.yearly
- com.flamoral.diamond.monthly
- com.flamoral.diamond.yearly

Consumables:
- com.flamoral.coins.100
- com.flamoral.coins.500
- com.flamoral.coins.1000
- com.flamoral.boost.1
- com.flamoral.boost.5
- com.flamoral.superlike.5
- com.flamoral.superlike.25
```

#### Google Play Product IDs
```
Subscriptions:
- gold_monthly
- gold_yearly
- platinum_monthly
- platinum_yearly
- diamond_monthly
- diamond_yearly

Consumables:
- coins_100
- coins_500
- coins_1000
- boost_1
- boost_5
- superlike_5
- superlike_25
```

---

## Mobile App Implementation

### Files Created

#### 1. Subscription Plans Screen
**Location:** `apps/mobile-app/src/screens/Subscription/SubscriptionPlansScreen.tsx`

**Features:**
- Beautiful UI for subscription plans (Gold, Platinum, Diamond)
- Monthly/yearly toggle with savings display
- Current subscription banner
- Product fetching from App Store/Google Play
- Purchase flow with error handling
- Restore purchases functionality

#### 2. Store Screen
**Location:** `apps/mobile-app/src/screens/Subscription/StoreScreen.tsx`

**Features:**
- Tabbed interface for Coins, Boosts, and Super Likes
- Wallet balance display
- Product cards with gradients and badges
- In-app purchase flow
- Informational sections about each product type

#### 3. Purchase History Screen
**Location:** `apps/mobile-app/src/screens/Subscription/PurchaseHistoryScreen.tsx`

**Features:**
- Transaction history list
- Transaction details and receipts
- Status indicators (completed, pending, failed, refunded)
- Summary statistics
- Pull-to-refresh
- Support integration for transaction issues

#### 4. Premium Paywall Component
**Location:** `apps/mobile-app/src/components/Paywalls/PremiumPaywall.tsx`

**Features:**
- Modal overlay for premium features
- Tier-specific branding and colors
- Feature benefits list
- Direct upgrade path
- Customizable for different features and tiers

### Existing Payment Service
**Location:** `apps/mobile-app/src/services/payments/PaymentService.ts`

This service already exists and provides:
- IAP initialization
- Product fetching (subscriptions and consumables)
- Purchase flows
- Receipt validation
- Restore purchases
- Wallet management

### Usage Examples

#### Using the Subscription Plans Screen
```typescript
// In your navigation
navigation.navigate('SubscriptionPlans');
```

#### Using the Store Screen
```typescript
// Navigate to store
navigation.navigate('Store');
```

#### Using the Premium Paywall
```typescript
import { PremiumPaywall } from '../../components/Paywalls/PremiumPaywall';

const [showPaywall, setShowPaywall] = useState(false);

// When user tries to access premium feature
const handlePremiumFeature = async () => {
  const subscription = await paymentService.getSubscriptionStatus();

  if (!subscription.isActive || subscription.tier === 'free') {
    setShowPaywall(true);
  } else {
    // Allow access to feature
  }
};

// Render paywall
<PremiumPaywall
  visible={showPaywall}
  feature="See Who Likes You"
  featureDescription="See everyone who has liked your profile before you swipe."
  requiredTier="gold"
  onClose={() => setShowPaywall(false)}
  onUpgrade={() => {
    setShowPaywall(false);
    navigation.navigate('SubscriptionPlans');
  }}
/>
```

### Navigation Configuration

Add these screens to your navigation stack:

```typescript
// In your navigation configuration
<Stack.Screen
  name="SubscriptionPlans"
  component={SubscriptionPlansScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="Store"
  component={StoreScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="PurchaseHistory"
  component={PurchaseHistoryScreen}
  options={{ headerShown: false }}
/>
```

---

## Configuration

### Apple App Store Connect

1. **Create In-App Purchase Products:**
   - Log in to App Store Connect
   - Select your app
   - Go to "Features" > "In-App Purchases"
   - Create products with the SKUs listed above
   - Configure pricing for each tier
   - Submit for review

2. **Get Shared Secret:**
   - In App Store Connect, go to "My Apps" > Your App > "App Information"
   - Under "App-Specific Shared Secret", generate a new secret
   - Add to backend `.env` as `APPLE_IAP_SHARED_SECRET`

3. **Configure Subscriptions:**
   - Create subscription groups
   - Set up subscription tiers (Gold, Platinum, Diamond)
   - Configure auto-renewable subscriptions
   - Set up intro offers and free trials if desired

### Google Play Console

1. **Create In-App Products:**
   - Log in to Google Play Console
   - Select your app
   - Go to "Monetize" > "Products" > "In-app products"
   - Create products with the SKUs listed above
   - Configure pricing for each tier
   - Activate products

2. **Create Service Account:**
   - Go to Google Cloud Console
   - Create a service account with "Android Publisher" role
   - Download the JSON key file
   - Store securely and reference in `.env`

3. **Configure Subscriptions:**
   - Create subscription products
   - Set up base plans and offers
   - Configure billing periods (monthly, yearly)
   - Enable subscriptions in your app

### Mobile App Configuration

1. **Install Dependencies:**
```bash
cd apps/mobile-app
npm install react-native-iap
npm install expo-linear-gradient
npm install @expo/vector-icons
npm install expo-blur
```

2. **iOS Configuration (ios/Podfile):**
```ruby
# Add if not present
pod 'RNIap', :path => '../node_modules/react-native-iap'
```

Run: `cd ios && pod install`

3. **Android Configuration (android/app/build.gradle):**
```gradle
dependencies {
    // Add if not present
    implementation 'com.android.billingclient:billing:5.0.0'
}
```

4. **iOS Capabilities:**
- Enable "In-App Purchase" capability in Xcode
- Add StoreKit framework

5. **Android Permissions (AndroidManifest.xml):**
```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

---

## Testing

### Testing Apple IAP

1. **Sandbox Testing:**
   - Create sandbox test users in App Store Connect
   - Sign out of App Store on device
   - Sign in with sandbox account
   - Test purchases (won't charge real money)

2. **Receipt Validation:**
```bash
curl -X POST http://localhost:3006/api/payments/iap/validate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "apple_iap",
    "receipt": "BASE64_ENCODED_RECEIPT",
    "productId": "com.flamoral.gold.monthly",
    "transactionId": "TRANSACTION_ID"
  }'
```

### Testing Google Play

1. **Internal Testing:**
   - Create internal testing track in Play Console
   - Add test users
   - Install app from internal testing
   - Test purchases with test payment methods

2. **Receipt Validation:**
```bash
curl -X POST http://localhost:3006/api/payments/iap/validate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google_play",
    "productId": "gold_monthly",
    "purchaseToken": "PURCHASE_TOKEN",
    "packageName": "com.flamoral.app"
  }'
```

### Testing Restore Purchases

```bash
curl -X POST http://localhost:3006/api/payments/iap/restore \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "apple_iap",
    "receipt": "BASE64_ENCODED_RECEIPT"
  }'
```

---

## Deployment

### Backend Deployment

1. **Environment Setup:**
   - Set all environment variables in production
   - Ensure Apple shared secret is configured
   - Upload Google Play service account key securely

2. **Build & Deploy:**
```bash
cd backend/services/payment-service
npm run build
npm start
```

3. **Verify Endpoints:**
```bash
# Health check
curl https://api.flamoral.com/api/payments/health

# Test IAP endpoint (requires auth)
curl https://api.flamoral.com/api/payments/iap/subscription \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Mobile App Deployment

1. **iOS Deployment:**
   - Update version and build number
   - Archive app in Xcode
   - Upload to App Store Connect
   - Submit for review with IAP products

2. **Android Deployment:**
   - Update versionCode and versionName
   - Generate signed APK/AAB
   - Upload to Google Play Console
   - Submit to internal/closed testing first

3. **App Store Review Notes:**
   - Provide test account credentials
   - Explain subscription tiers
   - Demo video of purchase flows
   - Clarify auto-renewal policies

---

## Pricing Strategy

### Subscription Tiers

**Gold Tier:**
- Monthly: $14.99
- Yearly: $143.88 (20% discount, $11.99/month)

**Platinum Tier:**
- Monthly: $24.99
- Yearly: $239.88 (20% discount, $19.99/month)

**Diamond Tier:**
- Monthly: $39.99
- Yearly: $383.88 (20% discount, $31.99/month)

### Consumables

**Coins:**
- 100 Coins: $4.99
- 500 Coins: $19.99 (20% better value)
- 1,000 Coins: $34.99 (30% better value)

**Boosts:**
- 1 Boost: $3.99
- 5 Boosts: $14.99 (25% discount)

**Super Likes:**
- 5 Super Likes: $4.99
- 25 Super Likes: $19.99 (20% discount)

---

## Security Considerations

1. **Receipt Validation:**
   - Always validate receipts server-side
   - Never trust client-side purchase verification
   - Implement replay attack prevention

2. **Secrets Management:**
   - Store Apple shared secret securely
   - Protect Google service account key
   - Use environment variables, not hardcoded values

3. **User Authentication:**
   - Require authentication for all IAP endpoints
   - Associate purchases with user accounts
   - Prevent purchase sharing/fraud

4. **Transaction Logging:**
   - Log all purchase attempts
   - Track successful and failed transactions
   - Monitor for suspicious activity

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Revenue Metrics:**
   - Monthly Recurring Revenue (MRR)
   - Average Revenue Per User (ARPU)
   - Lifetime Value (LTV)

2. **Conversion Metrics:**
   - Free to paid conversion rate
   - Subscription upgrade rate
   - Consumable purchase frequency

3. **Retention Metrics:**
   - Subscription renewal rate
   - Churn rate
   - Re-subscription rate

4. **Technical Metrics:**
   - Receipt validation success rate
   - Purchase completion rate
   - Restore purchases success rate

### Recommended Tools

- **Revenue Analytics:** RevenueCat, App Annie
- **Error Tracking:** Sentry, Crashlytics
- **User Analytics:** Mixpanel, Amplitude
- **A/B Testing:** Firebase Remote Config, Optimizely

---

## Support & Troubleshooting

### Common Issues

**Issue:** Receipt validation fails
**Solution:** Check environment (sandbox vs production), verify shared secret/service account

**Issue:** Purchases not unlocking features
**Solution:** Verify webhook processing, check user service integration

**Issue:** Can't restore purchases
**Solution:** Ensure user is signed in with same Apple ID/Google account

**Issue:** Google Play "already owned" error
**Solution:** Consume or acknowledge previous purchase

### User Support Flow

1. User reports payment issue
2. Collect transaction ID from purchase history screen
3. Look up transaction in backend logs
4. Verify receipt validation status
5. Manually trigger receipt validation if needed
6. Issue refund through App Store/Play Console if necessary

---

## Future Enhancements

1. **Promotional Offers:**
   - Implement promotional codes
   - Limited-time discounts
   - Referral bonuses

2. **Subscription Management:**
   - Pause subscription feature
   - Downgrade options
   - Win-back campaigns

3. **Regional Pricing:**
   - Implement PPP (purchasing power parity)
   - Country-specific pricing tiers

4. **Gift Subscriptions:**
   - Allow users to gift subscriptions
   - Redeemable gift codes

5. **Enhanced Analytics:**
   - Cohort analysis
   - Funnel optimization
   - Predictive churn modeling

---

## Compliance

### App Store Guidelines
- Clear subscription terms
- Explicit auto-renewal disclosure
- Easy cancellation process
- Restore purchases button

### Google Play Policies
- Transparent subscription information
- Clear billing terms
- Cancellation within app
- Purchase acknowledgment

### Legal Requirements
- Privacy policy updates
- Terms of service
- Refund policy
- Regional regulations (GDPR, CCPA, etc.)

---

## Conclusion

This implementation provides a complete mobile payment system for the Flamoral Dating Platform with:
- ✅ Apple Pay integration (Apple IAP)
- ✅ Google Pay integration (Google Play Billing)
- ✅ Subscription management (3 tiers)
- ✅ Virtual currency store (coins, boosts, super likes)
- ✅ Receipt validation and fraud prevention
- ✅ Purchase history and receipts
- ✅ Premium feature paywalls
- ✅ Beautiful native UI for iOS and Android

All code is production-ready and follows best practices for mobile payments and in-app purchases.
