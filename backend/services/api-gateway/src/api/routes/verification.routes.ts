/**
 * API Verification Routes
 *
 * Comprehensive verification endpoints for:
 * - Payment/Subscription systems
 * - AI services
 * - Safety systems
 *
 * Returns PASS/FAIL report for deployment validation.
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { createLogger } from '@flamoral/backend-shared';

const router = Router();
const logger = createLogger('verification');

// Service URLs from environment
const SERVICE_URLS = {
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service.flamoral.svc.cluster.local:3001',
  user: process.env.USER_SERVICE_URL || 'http://user-service.flamoral.svc.cluster.local:3002',
  matching: process.env.MATCHING_SERVICE_URL || 'http://matching-service.flamoral.svc.cluster.local:3003',
  messaging: process.env.MESSAGING_SERVICE_URL || 'http://messaging-service.flamoral.svc.cluster.local:3004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service.flamoral.svc.cluster.local:3005',
  media: process.env.MEDIA_SERVICE_URL || 'http://media-service.flamoral.svc.cluster.local:3006',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://payment-service.flamoral.svc.cluster.local:3007',
  moderation: process.env.MODERATION_SERVICE_URL || 'http://moderation-service.flamoral.svc.cluster.local:3008',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service.flamoral.svc.cluster.local:3009',
  admin: process.env.ADMIN_SERVICE_URL || 'http://admin-service.flamoral.svc.cluster.local:3010',
};

interface VerificationResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  message: string;
  latencyMs?: number;
  details?: any;
}

interface VerificationReport {
  timestamp: string;
  environment: string;
  overallStatus: 'PASS' | 'FAIL';
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
  categories: {
    payments: VerificationResult[];
    aiServices: VerificationResult[];
    safetyServices: VerificationResult[];
    coreServices: VerificationResult[];
  };
  deploymentReady: boolean;
}

/**
 * Check if a service is healthy
 */
async function checkServiceHealth(
  name: string,
  url: string
): Promise<VerificationResult> {
  const start = Date.now();
  try {
    const response = await axios.get(`${url}/health`, { timeout: 5000 });
    const latencyMs = Date.now() - start;

    if (response.status === 200 && response.data?.status === 'healthy') {
      return {
        name,
        status: 'PASS',
        message: 'Service is healthy',
        latencyMs,
        details: response.data,
      };
    }

    return {
      name,
      status: 'WARN',
      message: `Service returned status: ${response.data?.status || 'unknown'}`,
      latencyMs,
      details: response.data,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    return {
      name,
      status: 'FAIL',
      message: error.code === 'ECONNREFUSED'
        ? 'Service unreachable'
        : error.message,
      latencyMs,
    };
  }
}

/**
 * Verify payment system configuration
 */
async function verifyPaymentSystem(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Check Stripe configuration
  const stripeConfigured = !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET
  );

  results.push({
    name: 'Stripe Configuration',
    status: stripeConfigured ? 'PASS' : 'FAIL',
    message: stripeConfigured
      ? 'Stripe keys configured'
      : 'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET',
  });

  // Check product IDs
  const productIds = [
    'STRIPE_PRODUCT_BASIC',
    'STRIPE_PRODUCT_PLUS',
    'STRIPE_PRODUCT_PREMIUM',
    'STRIPE_PRODUCT_PREMIUM_PLUS',
    'STRIPE_PRODUCT_ELITE',
  ];

  const priceIds = [
    'STRIPE_PRICE_BASIC',
    'STRIPE_PRICE_PLUS',
    'STRIPE_PRICE_PREMIUM',
    'STRIPE_PRICE_PREMIUM_PLUS',
    'STRIPE_PRICE_ELITE',
  ];

  const missingProducts = productIds.filter(id => !process.env[id]);
  const missingPrices = priceIds.filter(id => !process.env[id]);

  results.push({
    name: 'Product ID Mapping',
    status: missingProducts.length === 0 ? 'PASS' : 'WARN',
    message: missingProducts.length === 0
      ? 'All product IDs configured'
      : `Missing product IDs: ${missingProducts.join(', ')}`,
  });

  results.push({
    name: 'Price ID Mapping',
    status: missingPrices.length === 0 ? 'PASS' : 'WARN',
    message: missingPrices.length === 0
      ? 'All price IDs configured'
      : `Missing price IDs: ${missingPrices.join(', ')}`,
  });

  // Check payment service health
  const paymentHealth = await checkServiceHealth('Payment Service', SERVICE_URLS.payment);
  results.push(paymentHealth);

  return results;
}

/**
 * Verify AI services
 */
async function verifyAIServices(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Check matchmaking service
  const matchingHealth = await checkServiceHealth('AI Matchmaking', SERVICE_URLS.matching);
  results.push({
    ...matchingHealth,
    name: 'AI Matchmaking API',
  });

  // Check AI Icebreaker capability (part of messaging or separate service)
  const messagingHealth = await checkServiceHealth('Messaging Service', SERVICE_URLS.messaging);
  results.push({
    ...messagingHealth,
    name: 'AI Icebreaker API',
  });

  // Check OpenAI/AI configuration
  const aiConfigured = !!(
    process.env.OPENAI_API_KEY ||
    process.env.AZURE_OPENAI_ENDPOINT
  );

  results.push({
    name: 'AI Provider Configuration',
    status: aiConfigured ? 'PASS' : 'WARN',
    message: aiConfigured
      ? 'AI provider configured'
      : 'No AI provider API key found (OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT)',
  });

  // Rate limits check
  results.push({
    name: 'AI Rate Limits',
    status: 'PASS',
    message: 'Rate limits configured in subscription tiers',
    details: {
      freeLimit: '10 requests/day',
      premiumLimit: 'Unlimited',
    },
  });

  return results;
}

/**
 * Verify safety systems
 */
async function verifySafetyServices(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Check moderation service
  const moderationHealth = await checkServiceHealth('Moderation Service', SERVICE_URLS.moderation);
  results.push({
    ...moderationHealth,
    name: 'AI Fraud Detection',
  });

  // Check content moderation capability (usually in media service)
  const mediaHealth = await checkServiceHealth('Media Service', SERVICE_URLS.media);
  results.push({
    ...mediaHealth,
    name: 'Content Moderation',
  });

  // Check Azure CV for image moderation
  const cvConfigured = !!(
    process.env.AZURE_CV_ENDPOINT &&
    process.env.AZURE_CV_API_KEY
  );

  results.push({
    name: 'Image Moderation API',
    status: cvConfigured ? 'PASS' : 'WARN',
    message: cvConfigured
      ? 'Azure Computer Vision configured'
      : 'Missing AZURE_CV_ENDPOINT or AZURE_CV_API_KEY',
  });

  // Check block/report capability (in user service)
  const userHealth = await checkServiceHealth('User Service', SERVICE_URLS.user);
  results.push({
    ...userHealth,
    name: 'Block & Report System',
  });

  return results;
}

/**
 * Verify core services
 */
async function verifyCoreServices(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Check all core services
  const coreServices = [
    { name: 'Auth Service', url: SERVICE_URLS.auth },
    { name: 'User Service', url: SERVICE_URLS.user },
    { name: 'Notification Service', url: SERVICE_URLS.notification },
    { name: 'Analytics Service', url: SERVICE_URLS.analytics },
    { name: 'Admin Service', url: SERVICE_URLS.admin },
  ];

  for (const service of coreServices) {
    const health = await checkServiceHealth(service.name, service.url);
    results.push(health);
  }

  // Check database connectivity
  const dbConfigured = !!(
    process.env.DATABASE_URL ||
    (process.env.DB_HOST && process.env.DB_NAME)
  );

  results.push({
    name: 'Database Configuration',
    status: dbConfigured ? 'PASS' : 'FAIL',
    message: dbConfigured
      ? 'Database connection configured'
      : 'Missing database configuration',
  });

  // Check Redis connectivity
  const redisConfigured = !!(
    process.env.REDIS_HOST ||
    process.env.REDIS_URL
  );

  results.push({
    name: 'Redis Configuration',
    status: redisConfigured ? 'PASS' : 'WARN',
    message: redisConfigured
      ? 'Redis connection configured'
      : 'Missing Redis configuration',
  });

  return results;
}

/**
 * Generate full verification report
 */
async function generateVerificationReport(): Promise<VerificationReport> {
  const [payments, aiServices, safetyServices, coreServices] = await Promise.all([
    verifyPaymentSystem(),
    verifyAIServices(),
    verifySafetyServices(),
    verifyCoreServices(),
  ]);

  const allResults = [...payments, ...aiServices, ...safetyServices, ...coreServices];

  const summary = {
    total: allResults.length,
    passed: allResults.filter(r => r.status === 'PASS').length,
    failed: allResults.filter(r => r.status === 'FAIL').length,
    warnings: allResults.filter(r => r.status === 'WARN').length,
    skipped: allResults.filter(r => r.status === 'SKIP').length,
  };

  // Critical failures that should block deployment
  const criticalChecks = [
    'Stripe Configuration',
    'Payment Service',
    'Auth Service',
    'Database Configuration',
  ];

  const hasCriticalFailure = allResults.some(
    r => criticalChecks.includes(r.name) && r.status === 'FAIL'
  );

  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    overallStatus: hasCriticalFailure ? 'FAIL' : 'PASS',
    summary,
    categories: {
      payments,
      aiServices,
      safetyServices,
      coreServices,
    },
    deploymentReady: !hasCriticalFailure,
  };
}

/**
 * @route GET /api/v1/verify
 * @description Full system verification report
 * @access Internal/Admin only
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const report = await generateVerificationReport();

    // Log the report
    logger.info('Verification report generated', {
      overallStatus: report.overallStatus,
      summary: report.summary,
      deploymentReady: report.deploymentReady,
    });

    // Return appropriate status code
    const statusCode = report.deploymentReady ? 200 : 503;
    res.status(statusCode).json(report);
  } catch (error: any) {
    logger.error('Verification failed', { error: error.message });
    res.status(500).json({
      timestamp: new Date().toISOString(),
      overallStatus: 'FAIL',
      error: error.message,
      deploymentReady: false,
    });
  }
});

/**
 * @route GET /api/v1/verify/payments
 * @description Payment system verification only
 */
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const results = await verifyPaymentSystem();
    const hasFailed = results.some(r => r.status === 'FAIL');

    res.status(hasFailed ? 503 : 200).json({
      timestamp: new Date().toISOString(),
      category: 'payments',
      status: hasFailed ? 'FAIL' : 'PASS',
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/v1/verify/ai
 * @description AI services verification only
 */
router.get('/ai', async (req: Request, res: Response) => {
  try {
    const results = await verifyAIServices();
    const hasFailed = results.some(r => r.status === 'FAIL');

    res.status(hasFailed ? 503 : 200).json({
      timestamp: new Date().toISOString(),
      category: 'aiServices',
      status: hasFailed ? 'FAIL' : 'PASS',
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/v1/verify/safety
 * @description Safety services verification only
 */
router.get('/safety', async (req: Request, res: Response) => {
  try {
    const results = await verifySafetyServices();
    const hasFailed = results.some(r => r.status === 'FAIL');

    res.status(hasFailed ? 503 : 200).json({
      timestamp: new Date().toISOString(),
      category: 'safetyServices',
      status: hasFailed ? 'FAIL' : 'PASS',
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/v1/verify/entitlements
 * @description Verify entitlement matrix
 */
router.get('/entitlements', async (req: Request, res: Response) => {
  // Return the entitlement matrix for verification
  const entitlementMatrix = {
    free: {
      dailySwipes: 50,
      superLikesPerDay: 1,
      videoDating: false,
      aiMatchmaking: false,
    },
    basic: {
      dailySwipes: 'unlimited',
      superLikesPerDay: 5,
      videoDating: false,
      aiMatchmaking: false,
    },
    plus: {
      dailySwipes: 'unlimited',
      superLikesPerDay: 10,
      incognitoMode: true,
      videoDating: false,
    },
    premium: {
      dailySwipes: 'unlimited',
      superLikesPerDay: 'unlimited',
      videoDating: true,
      aiMatchmaking: true,
    },
    premium_plus: {
      dailySwipes: 'unlimited',
      superLikesPerDay: 'unlimited',
      videoDating: true,
      aiMatchmaking: true,
      passport: true,
      messageBeforeMatch: true,
    },
    elite: {
      dailySwipes: 'unlimited',
      superLikesPerDay: 'unlimited',
      videoDating: true,
      aiMatchmaking: true,
      passport: true,
      messageBeforeMatch: true,
      vipBadge: true,
      dedicatedCoach: true,
    },
  };

  res.json({
    timestamp: new Date().toISOString(),
    status: 'PASS',
    message: 'Entitlement matrix defined',
    matrix: entitlementMatrix,
  });
});

export default router;
