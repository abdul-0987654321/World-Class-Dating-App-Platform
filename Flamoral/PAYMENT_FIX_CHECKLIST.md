# PAYMENT FIX IMPLEMENTATION CHECKLIST

## PHASE 1: APPLY FIXES (5-10 minutes)

### Step 1: Run Automated Fix
- [ ] Open terminal in project root
- [ ] Run: `cd backend/services/payment-service`
- [ ] Run: `node fix-payment-service-complete.js`
- [ ] Verify all fixes applied (script will show checkmarks)

### Step 2: Create Environment File
- [ ] Run: `cp .env.example .env` (or copy manually)
- [ ] Verify .env file was created

### Step 3: Add Stripe Keys
- [ ] Go to https://dashboard.stripe.com/apikeys
- [ ] Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
- [ ] Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
- [ ] Go to https://dashboard.stripe.com/webhooks
- [ ] Get your **Webhook Secret** (starts with `whsec_`)
- [ ] Open `backend/services/payment-service/.env`
- [ ] Update these lines:
  ```env
  STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
  STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
  STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
  ```
- [ ] Save the file

### Step 4: Install Dependencies
- [ ] Run: `npm install`
- [ ] Wait for completion (should take 1-2 minutes)

### Step 5: Build TypeScript
- [ ] Run: `npm run build`
- [ ] Verify build completes without errors
- [ ] Check `dist` folder was created

---

## PHASE 2: TEST LOCALLY (5 minutes)

### Step 6: Start Payment Service
- [ ] Run: `npm start`
- [ ] Verify console shows:
  - "Payment Service running on port 3005"
  - No error messages
- [ ] Keep this terminal open

### Step 7: Test Health Endpoint
- [ ] Open new terminal
- [ ] Run: `curl http://localhost:3005/health`
- [ ] Expected response:
  ```json
  {
    "status": "healthy",
    "service": "payment-service",
    "timestamp": "..."
  }
  ```

### Step 8: Test Service Info
- [ ] Run: `curl http://localhost:3005/`
- [ ] Expected response:
  ```json
  {
    "service": "Flamoral Payment Service",
    "version": "1.0.0",
    "status": "running"
  }
  ```

### Step 9: Start API Gateway
- [ ] Open new terminal
- [ ] Run: `cd backend/services/api-gateway`
- [ ] Run: `npm start`
- [ ] Verify it starts on port 4000

### Step 10: Test via Gateway
- [ ] Run: `curl http://localhost:4000/api/v1/payments/plans` (or similar endpoint)
- [ ] Verify request routes to payment service

---

## PHASE 3: VERIFY STRIPE INTEGRATION (5 minutes)

### Step 11: Test Payment Intent Creation
- [ ] Get a valid JWT token (login to get one)
- [ ] Run:
  ```bash
  curl -X POST http://localhost:3005/api/payments/create-intent \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d '{
      "amount": 1999,
      "currency": "usd",
      "productType": "subscription"
    }'
  ```
- [ ] Verify you get a `clientSecret` in response
- [ ] Check Stripe Dashboard for the payment intent

### Step 12: Test Webhook Endpoint
- [ ] Install Stripe CLI: https://stripe.com/docs/stripe-cli
- [ ] Run: `stripe listen --forward-to localhost:3005/api/webhooks/stripe`
- [ ] Copy the webhook signing secret
- [ ] Update .env with the new secret
- [ ] Restart payment service
- [ ] In new terminal: `stripe trigger payment_intent.succeeded`
- [ ] Verify webhook was received and processed

---

## PHASE 4: FRONTEND INTEGRATION (5 minutes)

### Step 13: Update Web App Environment
- [ ] Open `apps/web-app/.env.development`
- [ ] Verify:
  ```env
  VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
  VITE_API_URL=http://localhost:4000/api/v1
  ```
- [ ] Save file

### Step 14: Start Web App
- [ ] Open new terminal
- [ ] Run: `cd apps/web-app`
- [ ] Run: `npm run dev`
- [ ] Open http://localhost:5173

### Step 15: Test Payment UI
- [ ] Navigate to subscription page
- [ ] Click "Upgrade" or "Subscribe"
- [ ] Verify Stripe payment form loads
- [ ] Use test card: 4242 4242 4242 4242
- [ ] Verify payment completes successfully

---

## PHASE 5: STRIPE DASHBOARD SETUP (10 minutes)

### Step 16: Create Products
- [ ] Go to https://dashboard.stripe.com/products
- [ ] Click "Add product"
- [ ] Create **Gold Subscription**:
  - Name: Gold Subscription
  - Description: Unlimited likes, See who likes you
  - Pricing: $14.99/month, $143.88/year
- [ ] Create **Platinum Subscription**:
  - Name: Platinum Subscription
  - Description: Everything in Gold + Message before match
  - Pricing: $24.99/month, $239.88/year
- [ ] Create **Diamond Subscription**:
  - Name: Diamond Subscription
  - Description: Everything in Platinum + Verified badge
  - Pricing: $39.99/month, $383.88/year
- [ ] Save Product IDs for backend configuration

### Step 17: Configure Webhook Endpoint
- [ ] Go to https://dashboard.stripe.com/webhooks
- [ ] Click "Add endpoint"
- [ ] URL: `https://api.flamoral.com/api/v1/webhooks/stripe` (for production)
- [ ] URL: `http://localhost:3005/api/webhooks/stripe` (for development with Stripe CLI)
- [ ] Select events:
  - [x] payment_intent.succeeded
  - [x] payment_intent.payment_failed
  - [x] customer.subscription.created
  - [x] customer.subscription.updated
  - [x] customer.subscription.deleted
  - [x] invoice.paid
  - [x] invoice.payment_failed
  - [x] charge.refunded
- [ ] Save endpoint
- [ ] Copy webhook signing secret
- [ ] Update .env with secret

---

## PHASE 6: PRODUCTION DEPLOYMENT (when ready)

### Step 18: Azure Key Vault Setup
- [ ] Create Azure Key Vault secrets:
  - STRIPE-SECRET-KEY
  - STRIPE-PUBLISHABLE-KEY
  - STRIPE-WEBHOOK-SECRET
- [ ] Configure App Service to read from Key Vault
- [ ] Update environment variables

### Step 19: Update Production Web App
- [ ] Update `apps/web-app/.env.production`:
  ```env
  VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY
  VITE_API_URL=https://api.flamoral.com/api/v1
  ```
- [ ] Build for production: `npm run build`

### Step 20: Deploy Payment Service
- [ ] Build: `npm run build`
- [ ] Deploy to Azure App Service
- [ ] Verify environment variables are injected
- [ ] Test health endpoint: `https://api.flamoral.com/api/v1/payments/health`

### Step 21: Update Stripe Webhook
- [ ] Update webhook URL to production
- [ ] Test webhook delivery
- [ ] Monitor webhook logs

---

## PHASE 7: VERIFICATION (5 minutes)

### Step 22: End-to-End Test
- [ ] Create test subscription
- [ ] Verify subscription created in Stripe
- [ ] Verify user gets premium features
- [ ] Test subscription cancellation
- [ ] Verify refund works
- [ ] Test webhook processing

### Step 23: Monitor Circuit Breaker
- [ ] Check API Gateway health
- [ ] Verify circuit breaker is closed
- [ ] No failure logs

### Step 24: Check Logs
- [ ] Payment service logs show no errors
- [ ] Stripe API calls succeeding
- [ ] Webhooks processing correctly

---

## TROUBLESHOOTING

If you encounter issues, check:

| Issue | Solution |
|-------|----------|
| Build fails | Check TypeScript errors, run fix script again |
| Service won't start | Check .env file, verify Stripe keys |
| Health check fails | Check port 3005 not in use, service running |
| Payment intent fails | Verify Stripe secret key is correct |
| Webhook fails | Check webhook secret, restart service |
| Frontend error | Check publishable key, CORS settings |
| Circuit breaker open | Check service health, wait 5 minutes |

---

## SUCCESS CRITERIA

All checks should pass:

- ✅ Payment service starts without errors
- ✅ Health endpoint returns 200 OK
- ✅ Can create payment intent
- ✅ Stripe Elements loads in frontend
- ✅ Test payment succeeds
- ✅ Webhooks process correctly
- ✅ Subscriptions work end-to-end
- ✅ Circuit breaker closed
- ✅ No errors in logs

---

## COMPLETION

When all checkboxes are marked:

- [ ] All fixes applied
- [ ] Service running locally
- [ ] Stripe integration working
- [ ] Frontend tested
- [ ] Webhooks configured
- [ ] Ready for production (or deployed)

**Time to Complete:** 30-45 minutes total
**Difficulty:** Easy (mostly automated)

---

## NEXT ACTIONS

After completion:

1. **Monitor:** Watch logs for first 24 hours
2. **Test:** Run test transactions regularly
3. **Document:** Note any issues or improvements
4. **Scale:** When ready, switch to production Stripe keys
5. **Optimize:** Review payment flows, add analytics

---

## SUPPORT RESOURCES

- **Full Documentation:** `STRIPE_PAYMENT_FIX_COMPLETE.md`
- **Quick Start:** `QUICK_START_PAYMENTS.md`
- **Summary:** `PAYMENT_FIX_SUMMARY.md`
- **Stripe Docs:** https://stripe.com/docs
- **Stripe Testing:** https://stripe.com/docs/testing

---

**Ready to start?**

1. Print this checklist
2. Run `FIX_PAYMENTS_NOW.bat` or manual commands
3. Check off each item as you complete it
4. You'll be done in 30-45 minutes!

---

**Last Updated:** December 15, 2025
**Version:** 1.0
