# QUICK START - Fix Stripe Payments in 5 Minutes

## ONE-COMMAND FIX

### Windows:
```bash
FIX_PAYMENTS_NOW.bat
```

### Mac/Linux:
```bash
cd backend/services/payment-service && \
node fix-payment-service-complete.js && \
cp .env.example .env && \
npm install && \
npm run build
```

## THEN ADD YOUR STRIPE KEYS

Edit `backend/services/payment-service/.env`:

```bash
# Replace these with your actual keys from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_51XXXXXXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_test_51XXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXX

# Make sure PORT is 3005
PORT=3005
```

## START THE SERVICE

```bash
cd backend/services/payment-service
npm start
```

## TEST IT

```bash
# Should return: {"status":"healthy","service":"payment-service",...}
curl http://localhost:3005/health
```

## DONE!

Your payment service is now fixed and running. See `STRIPE_PAYMENT_FIX_COMPLETE.md` for full details.

---

## What Was Fixed?

1. ✅ Fixed TypeScript import errors (@flamoral/shared → local utils)
2. ✅ Updated PORT from 3006 to 3005
3. ✅ Fixed Stripe API version (2024-12-18.acacia → 2023-10-16)
4. ✅ Added IAP routes for Apple/Google Pay
5. ✅ Created .env template
6. ✅ Verified API Gateway routing
7. ✅ Confirmed frontend Stripe integration

---

## Need Help?

- **Full Documentation:** `STRIPE_PAYMENT_FIX_COMPLETE.md`
- **Payment System Guide:** `PAYMENT_SYSTEM_COMPLETE.md`
- **Quick Reference:** `PAYMENTS_QUICK_REFERENCE.md`
- **Stripe Docs:** https://stripe.com/docs
