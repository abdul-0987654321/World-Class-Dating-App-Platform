#!/usr/bin/env ts-node

/**
 * Configuration Checker for Payment Service
 *
 * Validates all required environment variables and configurations
 * Run with: ts-node scripts/check-config.ts
 */

import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  critical: boolean;
}

const checks: CheckResult[] = [];

/**
 * Add a check result
 */
function addCheck(name: string, status: 'pass' | 'fail' | 'warn', message: string, critical: boolean = false) {
  checks.push({ name, status, message, critical });
}

/**
 * Check environment variable
 */
function checkEnvVar(name: string, required: boolean = true, validator?: (value: string) => boolean): boolean {
  const value = process.env[name];

  if (!value) {
    if (required) {
      addCheck(name, 'fail', `Missing required environment variable: ${name}`, true);
      return false;
    } else {
      addCheck(name, 'warn', `Optional environment variable not set: ${name}`);
      return true;
    }
  }

  if (validator && !validator(value)) {
    addCheck(name, 'fail', `Invalid value for ${name}`, true);
    return false;
  }

  addCheck(name, 'pass', `${name} is configured`);
  return true;
}

/**
 * Check Stripe configuration
 */
async function checkStripeConfig(): Promise<void> {
  console.log('\n🔐 Checking Stripe Configuration...');

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Check secret key format
  if (secretKey) {
    if (secretKey.startsWith('sk_test_')) {
      addCheck('STRIPE_SECRET_KEY', 'pass', 'Stripe secret key configured (test mode)');
    } else if (secretKey.startsWith('sk_live_')) {
      addCheck('STRIPE_SECRET_KEY', 'pass', 'Stripe secret key configured (live mode)');
    } else {
      addCheck('STRIPE_SECRET_KEY', 'fail', 'Invalid Stripe secret key format', true);
      return;
    }

    // Test Stripe API connection
    try {
      const stripe = new Stripe(secretKey, {
        apiVersion: '2024-12-18.acacia',
      });

      const balance = await stripe.balance.retrieve();
      addCheck('Stripe API', 'pass', `Stripe API connection successful (${balance.available[0]?.currency || 'N/A'})`);
    } catch (error: any) {
      addCheck('Stripe API', 'fail', `Stripe API connection failed: ${error.message}`, true);
    }
  }

  // Check webhook secret format
  if (webhookSecret) {
    if (webhookSecret.startsWith('whsec_')) {
      addCheck('STRIPE_WEBHOOK_SECRET', 'pass', 'Webhook secret configured');
    } else {
      addCheck('STRIPE_WEBHOOK_SECRET', 'fail', 'Invalid webhook secret format', true);
    }
  }

  checkEnvVar('STRIPE_PUBLISHABLE_KEY', false);
  checkEnvVar('STRIPE_API_VERSION', false);
}

/**
 * Check database configuration
 */
async function checkDatabaseConfig(): Promise<void> {
  console.log('\n🗄️  Checking Database Configuration...');

  checkEnvVar('DB_HOST', true);
  checkEnvVar('DB_PORT', true, (val) => !isNaN(parseInt(val)));
  checkEnvVar('DB_NAME', true);
  checkEnvVar('DB_USER', true);
  checkEnvVar('DB_PASSWORD', true);
  checkEnvVar('DB_SSL', false);
  checkEnvVar('DB_POOL_MIN', false);
  checkEnvVar('DB_POOL_MAX', false);

  // Test database connection
  try {
    const { testConnection } = await import('../src/infrastructure/database/connection');
    const connected = await testConnection();

    if (connected) {
      addCheck('Database Connection', 'pass', 'Database connection successful');
    } else {
      addCheck('Database Connection', 'fail', 'Database connection failed', true);
    }
  } catch (error: any) {
    addCheck('Database Connection', 'fail', `Database connection error: ${error.message}`, true);
  }
}

/**
 * Check service URLs
 */
function checkServiceUrls(): void {
  console.log('\n🌐 Checking Service URLs...');

  checkEnvVar('USER_SERVICE_URL', true, (val) => val.startsWith('http'));
  checkEnvVar('NOTIFICATION_SERVICE_URL', true, (val) => val.startsWith('http'));
  checkEnvVar('AUTH_SERVICE_URL', false, (val) => val.startsWith('http'));
  checkEnvVar('ANALYTICS_SERVICE_URL', false, (val) => val.startsWith('http'));
}

/**
 * Check CORS configuration
 */
function checkCorsConfig(): void {
  console.log('\n🔒 Checking CORS Configuration...');

  checkEnvVar('CORS_ORIGINS', true);

  const origins = process.env.CORS_ORIGINS?.split(',');
  if (origins && origins.length > 0) {
    addCheck('CORS Origins', 'pass', `${origins.length} origin(s) configured`);
  } else {
    addCheck('CORS Origins', 'warn', 'No CORS origins configured');
  }
}

/**
 * Check general configuration
 */
function checkGeneralConfig(): void {
  console.log('\n⚙️  Checking General Configuration...');

  checkEnvVar('NODE_ENV', false);
  checkEnvVar('PORT', false, (val) => !isNaN(parseInt(val)));
  checkEnvVar('LOG_LEVEL', false);
  checkEnvVar('SERVICE_NAME', false);

  // Check JWT configuration
  checkEnvVar('JWT_ACCESS_SECRET', false);
  checkEnvVar('JWT_REFRESH_SECRET', false);

  // Check feature flags
  checkEnvVar('ENABLE_SUBSCRIPTIONS', false);
  checkEnvVar('ENABLE_COIN_PURCHASES', false);
  checkEnvVar('ENABLE_BOOST_PURCHASES', false);
  checkEnvVar('ENABLE_REFUNDS', false);
}

/**
 * Check webhook configuration
 */
function checkWebhookConfig(): void {
  console.log('\n🪝 Checking Webhook Configuration...');

  checkEnvVar('WEBHOOK_MAX_RETRIES', false);
  checkEnvVar('WEBHOOK_RETRY_DELAYS', false);
  checkEnvVar('WEBHOOK_EVENT_RETENTION_DAYS', false);
  checkEnvVar('PAYMENT_GRACE_PERIOD_DAYS', false);
}

/**
 * Print results
 */
function printResults(): void {
  console.log('\n' + '='.repeat(80));
  console.log('📋 Configuration Check Results');
  console.log('='.repeat(80));

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  let criticalFailures: CheckResult[] = [];

  checks.forEach((check) => {
    let icon = '';
    let color = '';

    switch (check.status) {
      case 'pass':
        icon = '✅';
        color = '\x1b[32m'; // Green
        passCount++;
        break;
      case 'fail':
        icon = '❌';
        color = '\x1b[31m'; // Red
        failCount++;
        if (check.critical) {
          criticalFailures.push(check);
        }
        break;
      case 'warn':
        icon = '⚠️';
        color = '\x1b[33m'; // Yellow
        warnCount++;
        break;
    }

    console.log(`${icon} ${color}${check.name}\x1b[0m: ${check.message}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('Summary:');
  console.log(`  ✅ Passed: ${passCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  ⚠️  Warnings: ${warnCount}`);
  console.log('='.repeat(80));

  if (criticalFailures.length > 0) {
    console.log('\n❌ Critical failures detected:');
    criticalFailures.forEach((check) => {
      console.log(`  • ${check.name}: ${check.message}`);
    });
    console.log('\n⚠️  The service may not start properly with these critical failures!');
    process.exit(1);
  } else if (failCount > 0) {
    console.log('\n⚠️  Some checks failed, but the service should still run.');
    process.exit(0);
  } else if (warnCount > 0) {
    console.log('\n✅ Configuration is valid with some warnings.');
    process.exit(0);
  } else {
    console.log('\n✅ All configuration checks passed!');
    process.exit(0);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Payment Service Configuration Checker\n');

  checkGeneralConfig();
  await checkStripeConfig();
  await checkDatabaseConfig();
  checkServiceUrls();
  checkCorsConfig();
  checkWebhookConfig();

  printResults();
}

// Run the checker
main().catch((error) => {
  console.error('\n❌ Configuration check failed:', error.message);
  process.exit(1);
});
