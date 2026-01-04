/**
 * Flamoral Dating Platform - Payment Flow Load Test
 *
 * This K6 script tests the payment system under load including:
 * - Subscription plan retrieval
 * - Stripe payment intent creation
 * - Subscription creation
 * - Payment confirmation
 * - Subscription upgrades/downgrades
 * - Webhook processing simulation
 *
 * IMPORTANT: This test uses Stripe test mode and should never be run against
 * production Stripe credentials.
 *
 * Usage:
 *   k6 run --env BASE_URL=https://api.flamoral.com --env STRIPE_TEST_MODE=true payment.js
 */

import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const subscriptionCreated = new Counter('subscriptions_created');
const paymentIntentCreated = new Counter('payment_intents_created');
const paymentSuccess = new Counter('payments_successful');
const paymentFailure = new Counter('payments_failed');
const subscriptionUpgrade = new Counter('subscription_upgrades');
const subscriptionCancel = new Counter('subscription_cancellations');
const paymentIntentDuration = new Trend('payment_intent_duration_ms');
const subscriptionDuration = new Trend('subscription_creation_duration_ms');
const errorRate = new Rate('errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.flamoral.com';
const STRIPE_TEST_MODE = __ENV.STRIPE_TEST_MODE === 'true';

// Test Stripe tokens (test mode only)
const STRIPE_TEST_TOKENS = {
  visa: 'tok_visa',
  visa_debit: 'tok_visa_debit',
  mastercard: 'tok_mastercard',
  amex: 'tok_amex',
  declined: 'tok_chargeDeclined',
  declined_insufficient: 'tok_chargeDeclinedInsufficientFunds',
  expired: 'tok_chargeDeclinedExpiredCard',
};

// Subscription plans
const SUBSCRIPTION_PLANS = [
  { id: 'flamoral_plus_monthly', name: 'Flamoral Plus Monthly', price: 19.99 },
  { id: 'flamoral_plus_yearly', name: 'Flamoral Plus Yearly', price: 119.99 },
  { id: 'flamoral_elite_monthly', name: 'Flamoral Elite Monthly', price: 39.99 },
  { id: 'flamoral_elite_yearly', name: 'Flamoral Elite Yearly', price: 239.99 },
];

// Test options
export const options = {
  scenarios: {
    // Normal subscription flow
    normal_subscriptions: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '5m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'normal' },
    },
    // Peak hours simulation (e.g., after marketing campaign)
    peak_subscriptions: {
      executor: 'constant-arrival-rate',
      rate: 30,           // 30 new subscription attempts per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 200,
      startTime: '13m',
      tags: { scenario: 'peak' },
    },
    // Stress test for payment processing
    stress_payments: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 500,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '3m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 20 },
      ],
      startTime: '20m',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],                    // Payment APIs can be slower
    'http_req_duration{name:CreatePaymentIntent}': ['p(95)<3000'],       // Intent creation < 3s
    'http_req_duration{name:CreateSubscription}': ['p(95)<5000'],        // Subscription < 5s
    http_req_failed: ['rate<0.05'],                                       // Error rate < 5%
    errors: ['rate<0.1'],                                                 // Overall error rate < 10%
    payment_intent_duration_ms: ['p(95)<3000'],                          // Payment intent < 3s
    subscription_creation_duration_ms: ['p(95)<5000'],                   // Subscription < 5s
    'payments_failed': ['count<10'],                                      // Very few payment failures
  },
  tags: {
    environment: __ENV.ENVIRONMENT || 'load-test',
    service: 'payment-service',
    test_name: 'payment-flow',
  },
};

// Helper functions
function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Request-ID': `k6-pay-${randomString(16)}`,
    'X-Idempotency-Key': `idem-${randomString(32)}`,
  };
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Request-ID': `k6-pay-${randomString(16)}`,
  };
}

function getRandomPlan() {
  return SUBSCRIPTION_PLANS[randomIntBetween(0, SUBSCRIPTION_PLANS.length - 1)];
}

function getRandomPaymentMethod() {
  // 95% success, 5% various failures
  const rand = Math.random();
  if (rand < 0.95) {
    const successMethods = ['visa', 'visa_debit', 'mastercard', 'amex'];
    return STRIPE_TEST_TOKENS[successMethods[randomIntBetween(0, successMethods.length - 1)]];
  } else if (rand < 0.97) {
    return STRIPE_TEST_TOKENS.declined;
  } else if (rand < 0.99) {
    return STRIPE_TEST_TOKENS.declined_insufficient;
  } else {
    return STRIPE_TEST_TOKENS.expired;
  }
}

function generateTestUser() {
  return {
    email: `loadtest_payment_${randomString(12)}@test.flamoral.com`,
    password: 'LoadTest123!@#',
    firstName: `PayTest${randomString(6)}`,
    lastName: `User${randomString(6)}`,
  };
}

// Login or register user
function authenticateUser() {
  const user = generateTestUser();

  // Try to register
  const registerPayload = JSON.stringify({
    email: user.email,
    password: user.password,
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: '1990-01-01',
    gender: Math.random() > 0.5 ? 'male' : 'female',
    acceptedTerms: true,
    acceptedPrivacy: true,
  });

  const registerRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    registerPayload,
    { headers: getHeaders(), tags: { name: 'RegisterForPayment' } }
  );

  if (registerRes.status === 201) {
    try {
      const body = JSON.parse(registerRes.body);
      return {
        token: body.data.accessToken,
        userId: body.data.userId,
        email: user.email,
      };
    } catch (e) {
      console.log(`Registration parse error: ${e}`);
    }
  }

  // Fallback to test user login
  const loginPayload = JSON.stringify({
    email: 'payment_test@test.flamoral.com',
    password: 'LoadTest123!@#',
  });

  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    loginPayload,
    { headers: getHeaders(), tags: { name: 'LoginForPayment' } }
  );

  if (loginRes.status === 200) {
    try {
      const body = JSON.parse(loginRes.body);
      return {
        token: body.data.accessToken,
        userId: body.data.userId,
        email: 'payment_test@test.flamoral.com',
      };
    } catch (e) {
      console.log(`Login parse error: ${e}`);
    }
  }

  return null;
}

// Setup function
export function setup() {
  console.log(`Starting payment flow load test against ${BASE_URL}`);
  console.log(`Stripe Test Mode: ${STRIPE_TEST_MODE}`);

  if (!STRIPE_TEST_MODE) {
    fail('CRITICAL: Payment tests must run in Stripe test mode. Set STRIPE_TEST_MODE=true');
  }

  // Verify API is accessible
  const healthRes = http.get(`${BASE_URL}/health`, { headers: getHeaders() });

  if (healthRes.status !== 200) {
    fail('API health check failed. Aborting test.');
  }

  // Verify payment service is accessible
  const paymentHealthRes = http.get(`${BASE_URL}/api/v1/payments/health`, { headers: getHeaders() });

  console.log(`Payment service health: ${paymentHealthRes.status}`);

  return {
    healthy: true,
    stripeTestMode: STRIPE_TEST_MODE,
    startTime: new Date().toISOString(),
  };
}

// Main test function
export default function(data) {
  if (!data.healthy || !data.stripeTestMode) {
    console.error('Skipping payment test - not in test mode or unhealthy');
    sleep(10);
    return;
  }

  // Authenticate user
  const authData = authenticateUser();

  if (!authData) {
    console.log('Failed to authenticate user for payment test');
    errorRate.add(1);
    sleep(5);
    return;
  }

  const authToken = authData.token;
  const userId = authData.userId;

  // Get subscription plans
  group('Get Subscription Plans', function() {
    const plansRes = http.get(
      `${BASE_URL}/api/v1/payments/plans`,
      { headers: getAuthHeaders(authToken), tags: { name: 'GetPlans' } }
    );

    check(plansRes, {
      'get plans status is 200': (r) => r.status === 200,
      'get plans returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && Array.isArray(body.data.plans);
        } catch {
          return false;
        }
      },
    });
  });

  sleep(randomIntBetween(1, 3));

  // Check current subscription status
  group('Check Subscription Status', function() {
    const statusRes = http.get(
      `${BASE_URL}/api/v1/payments/subscription`,
      { headers: getAuthHeaders(authToken), tags: { name: 'GetSubscription' } }
    );

    check(statusRes, {
      'subscription status is 200': (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(randomIntBetween(1, 2));

  // Select a plan
  const selectedPlan = getRandomPlan();
  const paymentMethodToken = getRandomPaymentMethod();

  // Create payment intent
  group('Create Payment Intent', function() {
    const intentPayload = JSON.stringify({
      planId: selectedPlan.id,
      paymentMethodType: 'card',
    });

    const startTime = Date.now();

    const intentRes = http.post(
      `${BASE_URL}/api/v1/payments/intent`,
      intentPayload,
      { headers: getAuthHeaders(authToken), tags: { name: 'CreatePaymentIntent' } }
    );

    const duration = Date.now() - startTime;
    paymentIntentDuration.add(duration);

    const intentSuccess = check(intentRes, {
      'payment intent status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'payment intent returns client secret': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && (body.data.clientSecret || body.data.paymentIntentId);
        } catch {
          return false;
        }
      },
    });

    if (intentSuccess) {
      paymentIntentCreated.add(1);
    } else {
      errorRate.add(1);
      console.log(`Payment intent failed: ${intentRes.status} - ${intentRes.body}`);
    }
  });

  sleep(randomIntBetween(2, 4)); // User entering card details

  // Create subscription with payment
  group('Create Subscription', function() {
    const subscriptionPayload = JSON.stringify({
      planId: selectedPlan.id,
      paymentMethodToken: paymentMethodToken,
      billingDetails: {
        name: 'Load Test User',
        email: authData.email,
        address: {
          country: 'US',
          postalCode: '94102',
        },
      },
      metadata: {
        source: 'load_test',
        testId: randomString(16),
      },
    });

    const startTime = Date.now();

    const subscriptionRes = http.post(
      `${BASE_URL}/api/v1/payments/subscribe`,
      subscriptionPayload,
      { headers: getAuthHeaders(authToken), tags: { name: 'CreateSubscription' } }
    );

    const duration = Date.now() - startTime;
    subscriptionDuration.add(duration);

    const subscriptionSuccess = check(subscriptionRes, {
      'subscription status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'subscription returns subscription id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.subscriptionId;
        } catch {
          return false;
        }
      },
    });

    if (subscriptionSuccess) {
      subscriptionCreated.add(1);
      paymentSuccess.add(1);

      try {
        const body = JSON.parse(subscriptionRes.body);

        // Verify subscription is active
        sleep(randomIntBetween(1, 2));

        const verifyRes = http.get(
          `${BASE_URL}/api/v1/payments/subscription`,
          { headers: getAuthHeaders(authToken), tags: { name: 'VerifySubscription' } }
        );

        check(verifyRes, {
          'verify subscription is active': (r) => {
            try {
              const vBody = JSON.parse(r.body);
              return vBody.data && vBody.data.status === 'active';
            } catch {
              return false;
            }
          },
        });
      } catch (e) {
        console.log(`Error verifying subscription: ${e}`);
      }
    } else {
      // Check if it was a declined payment (expected sometimes)
      if (subscriptionRes.status === 402 || subscriptionRes.status === 400) {
        paymentFailure.add(1);
        console.log(`Expected payment decline: ${subscriptionRes.body}`);
      } else {
        errorRate.add(1);
        console.log(`Unexpected subscription error: ${subscriptionRes.status} - ${subscriptionRes.body}`);
      }
    }
  });

  sleep(randomIntBetween(2, 5));

  // Occasionally test subscription upgrade (20% of successful subscriptions)
  if (Math.random() < 0.2) {
    group('Subscription Upgrade', function() {
      // Find a higher tier plan
      const currentPlanIndex = SUBSCRIPTION_PLANS.findIndex(p => p.id === selectedPlan.id);
      const upgradePlan = SUBSCRIPTION_PLANS.find((p, i) => i > currentPlanIndex && p.price > selectedPlan.price);

      if (upgradePlan) {
        const upgradePayload = JSON.stringify({
          newPlanId: upgradePlan.id,
          prorationBehavior: 'create_prorations',
        });

        const upgradeRes = http.post(
          `${BASE_URL}/api/v1/payments/subscription/upgrade`,
          upgradePayload,
          { headers: getAuthHeaders(authToken), tags: { name: 'UpgradeSubscription' } }
        );

        const upgradeSuccess = check(upgradeRes, {
          'upgrade status is 200': (r) => r.status === 200,
        });

        if (upgradeSuccess) {
          subscriptionUpgrade.add(1);
        }
      }
    });

    sleep(randomIntBetween(1, 2));
  }

  // Get payment history
  group('Get Payment History', function() {
    const historyRes = http.get(
      `${BASE_URL}/api/v1/payments/history`,
      { headers: getAuthHeaders(authToken), tags: { name: 'GetPaymentHistory' } }
    );

    check(historyRes, {
      'payment history status is 200': (r) => r.status === 200,
    });
  });

  sleep(randomIntBetween(1, 2));

  // Get invoices
  group('Get Invoices', function() {
    const invoicesRes = http.get(
      `${BASE_URL}/api/v1/payments/invoices`,
      { headers: getAuthHeaders(authToken), tags: { name: 'GetInvoices' } }
    );

    check(invoicesRes, {
      'invoices status is 200': (r) => r.status === 200,
    });
  });

  sleep(randomIntBetween(1, 3));

  // Occasionally test subscription cancellation (5% of tests)
  if (Math.random() < 0.05) {
    group('Cancel Subscription', function() {
      const cancelPayload = JSON.stringify({
        reason: 'load_test_cleanup',
        cancelAtPeriodEnd: true, // Cancel at end of billing period
      });

      const cancelRes = http.post(
        `${BASE_URL}/api/v1/payments/subscription/cancel`,
        cancelPayload,
        { headers: getAuthHeaders(authToken), tags: { name: 'CancelSubscription' } }
      );

      const cancelSuccess = check(cancelRes, {
        'cancel status is 200': (r) => r.status === 200,
      });

      if (cancelSuccess) {
        subscriptionCancel.add(1);
      }
    });
  }

  // Final sleep between iterations
  sleep(randomIntBetween(5, 15));
}

// Webhook processing test scenario
export function webhookTest(data) {
  if (!data.healthy) {
    sleep(5);
    return;
  }

  // Simulate various Stripe webhook events
  const webhookEvents = [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed',
  ];

  const eventType = webhookEvents[randomIntBetween(0, webhookEvents.length - 1)];

  const webhookPayload = JSON.stringify({
    id: `evt_${randomString(24)}`,
    object: 'event',
    type: eventType,
    data: {
      object: {
        id: `test_${randomString(20)}`,
        customer: `cus_${randomString(14)}`,
        status: eventType.includes('succeeded') || eventType.includes('paid') ? 'succeeded' : 'failed',
        amount: randomIntBetween(1999, 23999),
        currency: 'usd',
      },
    },
    livemode: false,
    created: Math.floor(Date.now() / 1000),
  });

  // Note: In a real scenario, this would need a valid Stripe signature
  // For load testing, we test the webhook endpoint's throughput
  const webhookRes = http.post(
    `${BASE_URL}/api/v1/webhooks/stripe`,
    webhookPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': `t=${Math.floor(Date.now() / 1000)},v1=test_signature_${randomString(32)}`,
      },
      tags: { name: 'StripeWebhook' },
    }
  );

  // Webhook might return 400 due to invalid signature in test mode
  check(webhookRes, {
    'webhook processed': (r) => r.status === 200 || r.status === 400,
  });

  sleep(randomIntBetween(1, 3));
}

// Teardown function
export function teardown(data) {
  console.log('Payment flow load test completed');
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
}
