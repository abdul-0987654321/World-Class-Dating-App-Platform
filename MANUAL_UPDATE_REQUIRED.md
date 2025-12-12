# Manual Updates Required - Payment System

These files need manual updates to complete the payment system implementation.

---

## Backend Updates Required

### 1. Update `backend/services/payment-service/src/index.ts`

**Add this import at the top with other route imports:**
```typescript
import iapRoutes from './api/routes/iap.routes';
```

**Add this route mounting after the existing payment routes:**
```typescript
// Mount payment routes
app.use('/api/payments', paymentRoutes);
app.use('/api/payments/iap', iapRoutes);  // ADD THIS LINE
```

**Full section should look like:**
```typescript
// Import routes
import paymentRoutes from './api/routes/payment.routes';
import webhookRoutes from './api/routes/webhook.routes';
import iapRoutes from './api/routes/iap.routes';  // ADD THIS

// ... middleware setup ...

// Mount payment routes
app.use('/api/payments', paymentRoutes);
app.use('/api/payments/iap', iapRoutes);  // ADD THIS
```

---

### 2. Update `backend/services/payment-service/package.json`

**Add to dependencies object:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "stripe": "^14.7.0",
    "pg": "^8.11.3",
    "knex": "^3.1.0",
    "winston": "^3.11.0",
    "axios": "^1.6.2",
    "joi": "^17.11.0",
    "googleapis": "^128.0.0"  // ADD THIS LINE
  }
}
```

**Then run:**
```bash
cd backend/services/payment-service
npm install
```

---

### 3. Update `backend/services/payment-service/.env`

**Add these environment variables:**
```bash
# Apple IAP Configuration
APPLE_IAP_SHARED_SECRET=your_app_specific_shared_secret_here
APPLE_BUNDLE_ID=com.flamoral.app

# Google Play Configuration
GOOGLE_PLAY_PACKAGE_NAME=com.flamoral.app
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
# OR as JSON string (recommended for production):
# GOOGLE_PLAY_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"..."}'
```

**Where to get these values:**

**Apple Shared Secret:**
1. Log in to App Store Connect
2. Go to My Apps > Your App > App Information
3. Under "App-Specific Shared Secret", click "Generate"
4. Copy the secret

**Google Service Account Key:**
1. Go to Google Cloud Console
2. Create a service account with "Android Publisher" role
3. Generate and download JSON key file
4. Store the file path or JSON content

---

### 4. Optional: Extend User Service Client

If you want to add the new IAP-specific methods to the user service client, update:
`backend/services/payment-service/src/infrastructure/clients/user-service.client.ts`

**Add these methods before the `mapTierName` method:**

```typescript
  /**
   * Get subscription status
   */
  async getSubscription(userId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}/subscription`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get subscription from user-service:', error.message);
      return { tier: 'free', status: 'inactive' };
    }
  }

  /**
   * Get wallet balance
   */
  async getWallet(userId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}/wallet`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get wallet from user-service:', error.message);
      return { coins: 0, gems: 0, bonusCoins: 0 };
    }
  }

  /**
   * Add boosts to user account
   */
  async addBoosts(data: {
    userId: string;
    amount: number;
    transactionId: string;
    provider: string;
  }): Promise<void> {
    try {
      await this.client.post('/api/internal/boosts/add', data);
      logger.info(`Added ${data.amount} boost(s) to user ${data.userId}`);
    } catch (error: any) {
      logger.error('Failed to add boosts in user-service:', error.message);
      throw new Error(`User service boost add failed: ${error.message}`);
    }
  }

  /**
   * Add super likes to user account
   */
  async addSuperLikes(data: {
    userId: string;
    amount: number;
    transactionId: string;
    provider: string;
  }): Promise<void> {
    try {
      await this.client.post('/api/internal/superlikes/add', data);
      logger.info(`Added ${data.amount} super like(s) to user ${data.userId}`);
    } catch (error: any) {
      logger.error('Failed to add super likes in user-service:', error.message);
      throw new Error(`User service super like add failed: ${error.message}`);
    }
  }
```

**Also update the interface definitions at the top:**

```typescript
interface AddCoinsDto {
  userId: string;
  amount: number;
  transactionType: 'purchase' | 'reward' | 'refund' | 'iap_purchase';  // ADD iap_purchase
  stripePaymentId?: string;  // Make optional
  productSku?: string;  // Make optional
  iapTransactionId?: string;  // ADD
  provider?: string;  // ADD
}

interface UpdateSubscriptionDto {
  userId: string;
  tier: 'free' | 'premium' | 'premium_plus';
  stripeSubscriptionId?: string;
  status?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'grace_period';
  currentPeriodEnd?: Date;
  gracePeriodEnd?: Date;
  provider?: string;  // ADD
  providerSubscriptionId?: string;  // ADD
}
```

**Update the tier mapping to include new tiers:**
```typescript
  mapTierName(tier: string): 'free' | 'premium' | 'premium_plus' {
    const tierMap: Record<string, 'free' | 'premium' | 'premium_plus'> = {
      'free': 'free',
      'basic': 'premium',
      'gold': 'premium',        // ADD
      'plus': 'premium',
      'premium': 'premium',
      'mid': 'premium',
      'platinum': 'premium_plus',  // ADD
      'diamond': 'premium_plus',   // ADD
      'ultra': 'premium_plus',
      'elite': 'premium_plus',
      'premium_plus': 'premium_plus',
    };
    return tierMap[tier.toLowerCase()] || 'free';
  }
```

---

## Mobile App Updates Required

### 1. Install Dependencies

```bash
cd apps/mobile-app
npm install react-native-iap expo-linear-gradient @expo/vector-icons expo-blur
```

If using iOS:
```bash
cd ios
pod install
cd ..
```

---

### 2. Update Navigation Configuration

Add these screens to your navigation stack (usually in a file like `App.tsx` or `navigation/index.tsx`):

```typescript
import SubscriptionPlansScreen from './screens/Subscription/SubscriptionPlansScreen';
import StoreScreen from './screens/Subscription/StoreScreen';
import PurchaseHistoryScreen from './screens/Subscription/PurchaseHistoryScreen';

// In your Stack.Navigator:
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

### 3. iOS Configuration

**Enable In-App Purchase capability in Xcode:**
1. Open `ios/YourApp.xcworkspace` in Xcode
2. Select your project target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "In-App Purchase"

**Verify Podfile includes:**
```ruby
pod 'RNIap', :path => '../node_modules/react-native-iap'
```

Run `pod install` if needed.

---

### 4. Android Configuration

**Update `android/app/src/main/AndroidManifest.xml`:**

Add this permission:
```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

**Verify `android/app/build.gradle` includes:**
```gradle
dependencies {
    implementation 'com.android.billingclient:billing:5.0.0'
}
```

---

## Store Configuration

### Apple App Store Connect

**1. Create Products:**
- Go to App Store Connect → Your App → Features → In-App Purchases
- Create each subscription and consumable product
- Use the SKUs from the documentation

**2. Create Subscription Groups:**
- Create groups for different tiers
- Configure pricing tiers
- Set up auto-renewal

**3. Get Shared Secret:**
- App Information → App-Specific Shared Secret
- Generate and copy
- Add to backend .env

---

### Google Play Console

**1. Create Products:**
- Go to Google Play Console → Your App → Monetize → Products
- Create subscription products
- Create in-app products (consumables)
- Use the SKUs from the documentation

**2. Create Service Account:**
- Go to Google Cloud Console
- Create service account with "Android Publisher" role
- Download JSON key
- Add to backend .env

**3. Configure Subscriptions:**
- Set up base plans
- Configure billing periods
- Set pricing
- Activate products

---

## Testing Setup

### Apple Sandbox Testing

**1. Create Sandbox Tester:**
- App Store Connect → Users and Access → Sandbox Testers
- Create test account with valid email format

**2. Test on Device:**
- Sign out of App Store on device
- Run app in development mode
- Make a purchase
- Sign in with sandbox account when prompted
- Purchases are free in sandbox

---

### Google Play Testing

**1. Create Test Track:**
- Play Console → Testing → Internal Testing
- Upload APK/AAB
- Add testers

**2. Add License Testers:**
- Play Console → Setup → License Testing
- Add test email addresses

**3. Test Purchases:**
- Install from internal testing link
- Use test payment methods
- Purchases are free for test accounts

---

## Verification Checklist

After making all updates, verify:

### Backend
- [ ] `npm install` ran successfully
- [ ] Service starts without errors
- [ ] IAP endpoints accessible: `GET /api/payments/iap/subscription`
- [ ] Apple receipt validation works (test with sandbox)
- [ ] Google receipt validation works (test with test account)

### Mobile App
- [ ] Dependencies installed successfully
- [ ] App builds on iOS without errors
- [ ] App builds on Android without errors
- [ ] Can navigate to subscription screen
- [ ] Products load from stores
- [ ] Purchase flow works (sandbox/test)
- [ ] Restore purchases works

### Stores
- [ ] All products created
- [ ] Products activated
- [ ] Pricing configured
- [ ] Test purchases work
- [ ] Receipt validation works

---

## Quick Commands

**Backend:**
```bash
cd backend/services/payment-service
npm install googleapis
npm run dev
```

**Mobile App:**
```bash
cd apps/mobile-app
npm install react-native-iap expo-linear-gradient @expo/vector-icons expo-blur
npm start
```

**iOS:**
```bash
cd apps/mobile-app/ios
pod install
cd ..
npm run ios
```

**Android:**
```bash
cd apps/mobile-app
npm run android
```

---

## Support

If you encounter issues:

1. Check the comprehensive documentation: `MOBILE_PAYMENTS_IMPLEMENTATION.md`
2. Review quick reference: `PAYMENTS_QUICK_REFERENCE.md`
3. Review this completion summary: `PAYMENT_SYSTEM_COMPLETE.md`
4. Check backend logs for errors
5. Test with sandbox/test accounts first
6. Verify environment variables are set correctly

---

**Summary:** 4 backend files to update, 2 mobile configuration tasks, store setup required.

All new files have been created. Only these manual updates are needed to complete the integration.
