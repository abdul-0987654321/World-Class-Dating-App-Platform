# Mobile Payments - Quick Reference Card

## 🚀 Quick Start Checklist

### Backend Setup
- [ ] Add `googleapis` to `package.json` dependencies
- [ ] Import IAP routes in `src/index.ts`
- [ ] Mount IAP routes: `app.use('/api/payments/iap', iapRoutes)`
- [ ] Add environment variables to `.env`
- [ ] Run `npm install`
- [ ] Restart payment service

### Mobile App Setup
- [ ] Install `react-native-iap` package
- [ ] Configure iOS capabilities (In-App Purchase)
- [ ] Configure Android permissions (BILLING)
- [ ] Add navigation screens
- [ ] Test with sandbox/test accounts

### Store Configuration
- [ ] Create products in App Store Connect
- [ ] Get Apple shared secret
- [ ] Create products in Google Play Console
- [ ] Create Google service account
- [ ] Activate products in both stores

---

## 📁 File Structure

```
backend/services/payment-service/src/
├── domain/services/
│   ├── apple-iap.service.ts          ✨ NEW
│   └── google-play.service.ts        ✨ NEW
├── api/
│   ├── controllers/
│   │   └── iap.controller.ts         ✨ NEW
│   ├── routes/
│   │   └── iap.routes.ts             ✨ NEW
│   └── validators/
│       └── iap.validator.ts          ✨ NEW
└── index.ts                          📝 UPDATE

apps/mobile-app/src/
├── screens/Subscription/
│   ├── SubscriptionPlansScreen.tsx   ✨ NEW
│   ├── StoreScreen.tsx               ✨ NEW
│   └── PurchaseHistoryScreen.tsx     ✨ NEW
├── components/Paywalls/
│   └── PremiumPaywall.tsx            ✨ NEW
└── services/payments/
    └── PaymentService.ts             ✅ EXISTS
```

---

## 🔑 Environment Variables

```bash
# Apple IAP
APPLE_IAP_SHARED_SECRET=your_shared_secret_here
APPLE_BUNDLE_ID=com.flamoral.app

# Google Play
GOOGLE_PLAY_PACKAGE_NAME=com.flamoral.app
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=/path/to/key.json
```

---

## 📱 Product SKUs

### Apple (iOS)
```
Subscriptions:
  com.flamoral.gold.monthly
  com.flamoral.gold.yearly
  com.flamoral.platinum.monthly
  com.flamoral.platinum.yearly
  com.flamoral.diamond.monthly
  com.flamoral.diamond.yearly

Consumables:
  com.flamoral.coins.100
  com.flamoral.coins.500
  com.flamoral.coins.1000
  com.flamoral.boost.1
  com.flamoral.boost.5
  com.flamoral.superlike.5
  com.flamoral.superlike.25
```

### Google (Android)
```
Subscriptions:
  gold_monthly
  gold_yearly
  platinum_monthly
  platinum_yearly
  diamond_monthly
  diamond_yearly

Consumables:
  coins_100
  coins_500
  coins_1000
  boost_1
  boost_5
  superlike_5
  superlike_25
```

---

## 🌐 API Endpoints

### Validate Receipt
```bash
POST /api/payments/iap/validate
{
  "provider": "apple_iap" | "google_play",
  "receipt": "base64_encoded_receipt",
  "productId": "product_id",
  "purchaseToken": "token" // Google only
}
```

### Restore Purchases
```bash
POST /api/payments/iap/restore
{
  "provider": "apple_iap" | "google_play",
  "receipt": "base64_encoded_receipt"
}
```

### Get Subscription Status
```bash
GET /api/payments/iap/subscription
```

### Get Wallet Balance
```bash
GET /api/payments/iap/wallet
```

### Get Transaction History
```bash
GET /api/payments/iap/transactions?limit=50&offset=0
```

---

## 💰 Pricing

| Tier | Monthly | Yearly | Discount |
|------|---------|--------|----------|
| Gold | $14.99 | $143.88 | 20% |
| Platinum | $24.99 | $239.88 | 20% |
| Diamond | $39.99 | $383.88 | 20% |

| Consumable | Amount | Price |
|------------|--------|-------|
| Coins (S) | 100 | $4.99 |
| Coins (M) | 500 | $19.99 |
| Coins (L) | 1000 | $34.99 |
| Boost | 1 | $3.99 |
| Boosts | 5 | $14.99 |
| Super Likes | 5 | $4.99 |
| Super Likes | 25 | $19.99 |

---

## 🎨 Using the UI Components

### Navigate to Subscription Plans
```typescript
navigation.navigate('SubscriptionPlans');
```

### Navigate to Store
```typescript
navigation.navigate('Store');
```

### Show Premium Paywall
```typescript
import { PremiumPaywall } from '../../components/Paywalls/PremiumPaywall';

<PremiumPaywall
  visible={showPaywall}
  feature="See Who Likes You"
  featureDescription="View all users who have liked you."
  requiredTier="gold"
  onClose={() => setShowPaywall(false)}
  onUpgrade={() => navigation.navigate('SubscriptionPlans')}
/>
```

### Check Subscription Status
```typescript
const subscription = await paymentService.getSubscriptionStatus();

if (subscription.isActive && subscription.tier !== 'free') {
  // User has premium subscription
  console.log(`User has ${subscription.tier} subscription`);
} else {
  // Show paywall
  setShowPaywall(true);
}
```

### Make a Purchase
```typescript
// Purchase subscription
const purchase = await paymentService.purchaseSubscription(
  'com.flamoral.gold.monthly'
);

// Purchase consumable
const purchase = await paymentService.purchaseConsumable(
  'com.flamoral.coins.500'
);
```

---

## 🧪 Testing

### Test Accounts

**Apple Sandbox:**
1. Create sandbox tester in App Store Connect
2. Sign out of App Store on device
3. Sign in with sandbox account
4. Purchases are free

**Google Play:**
1. Add testers in Play Console
2. Join internal test track
3. Use test payment methods
4. Purchases are free

### Test Commands

```bash
# Validate Apple receipt
curl -X POST http://localhost:3006/api/payments/iap/validate \
  -H "Content-Type: application/json" \
  -d '{"provider":"apple_iap","receipt":"..."}'

# Validate Google purchase
curl -X POST http://localhost:3006/api/payments/iap/validate \
  -H "Content-Type: application/json" \
  -d '{"provider":"google_play","productId":"gold_monthly","purchaseToken":"..."}'

# Get subscription status
curl http://localhost:3006/api/payments/iap/subscription \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Receipt validation fails | Check environment (sandbox vs prod), verify secrets |
| Purchase not unlocking features | Check webhook processing, verify user service |
| Can't restore purchases | Ensure same Apple ID/Google account |
| "Already owned" error (Google) | Acknowledge or consume previous purchase |
| Products not loading | Verify SKUs match, check store configuration |

---

## 📊 Key Metrics

Track these metrics for success:
- **MRR** (Monthly Recurring Revenue)
- **Conversion Rate** (Free → Paid)
- **Churn Rate**
- **ARPU** (Average Revenue Per User)
- **LTV** (Lifetime Value)

---

## ✅ Pre-Launch Checklist

- [ ] All products created in App Store Connect
- [ ] All products created in Google Play Console
- [ ] Environment variables configured
- [ ] Receipt validation tested (both platforms)
- [ ] Purchase flow tested (both platforms)
- [ ] Restore purchases tested
- [ ] Subscription renewal tested
- [ ] Cancellation tested
- [ ] Refund process documented
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] App Store review notes prepared
- [ ] Support documentation created

---

## 🔗 Useful Links

- **Apple IAP Docs:** https://developer.apple.com/in-app-purchase/
- **Google Play Billing:** https://developer.android.com/google/play/billing
- **React Native IAP:** https://github.com/dooboolab/react-native-iap
- **Stripe Docs:** https://stripe.com/docs
- **App Store Review:** https://developer.apple.com/app-store/review/
- **Play Console Help:** https://support.google.com/googleplay/android-developer/

---

## 📞 Support

For implementation support:
- Check `MOBILE_PAYMENTS_IMPLEMENTATION.md` for detailed documentation
- Review code comments in service files
- Test with sandbox/test accounts first
- Contact development team for assistance

---

**Last Updated:** December 2025
**Version:** 1.0.0
**Status:** Production Ready ✅
