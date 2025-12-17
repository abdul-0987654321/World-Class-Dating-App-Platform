#!/usr/bin/env ts-node
/**
 * Database Configuration Validation Script
 *
 * This script validates database and Redis configurations for all environments
 * Run before deployment to ensure all required environment variables are set
 *
 * Usage:
 *   npm run validate:db-config
 *   NODE_ENV=production npm run validate:db-config
 */

import * as dotenv from 'dotenv';
import knex from 'knex';
import { createClient } from 'redis';

// Load environment variables
dotenv.config();

interface ValidationResult {
  service: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

const results: ValidationResult[] = [];

/**
 * Validate PostgreSQL configuration
 */
async function validatePostgresConfig(serviceName: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    service: `PostgreSQL - ${serviceName}`,
    passed: true,
    errors: [],
    warnings: [],
  };

  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  const isStaging = env === 'staging';

  // Check required environment variables
  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      if (isProduction || isStaging) {
        result.errors.push(`Missing required environment variable: ${varName}`);
        result.passed = false;
      } else {
        result.warnings.push(`Missing ${varName} (using default for ${env})`);
      }
    }
  }

  // Validate SSL configuration for production/staging
  if (isProduction || isStaging) {
    if (process.env.DB_SSL !== 'true') {
      result.errors.push('DB_SSL must be enabled (true) in production/staging');
      result.passed = false;
    }

    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      result.errors.push('Either DATABASE_URL or DB_HOST must be set');
      result.passed = false;
    }
  }

  // Validate pool configuration
  const poolMin = parseInt(process.env.DB_POOL_MIN || '0');
  const poolMax = parseInt(process.env.DB_POOL_MAX || '0');

  if (poolMax > 0 && poolMin > poolMax) {
    result.errors.push(`DB_POOL_MIN (${poolMin}) cannot be greater than DB_POOL_MAX (${poolMax})`);
    result.passed = false;
  }

  if (isProduction && poolMax < 10) {
    result.warnings.push(`DB_POOL_MAX is ${poolMax}. Consider increasing for production (recommended: 20-50)`);
  }

  // Test connection if not in CI/CD
  if (process.env.TEST_CONNECTION !== 'false') {
    try {
      const db = knex({
        client: 'postgresql',
        connection: process.env.DATABASE_URL || {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'postgres',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          } : false,
        },
      });

      await db.raw('SELECT 1');
      console.log(`✓ Database connection test passed for ${serviceName}`);
      await db.destroy();
    } catch (error) {
      result.errors.push(`Database connection test failed: ${error.message}`);
      result.passed = false;
    }
  }

  return result;
}

/**
 * Validate Redis configuration
 */
async function validateRedisConfig(): Promise<ValidationResult> {
  const result: ValidationResult = {
    service: 'Redis Cache',
    passed: true,
    errors: [],
    warnings: [],
  };

  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  const isStaging = env === 'staging';

  // Check Redis configuration
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    if (isProduction || isStaging) {
      result.errors.push('Either REDIS_URL or REDIS_HOST must be set');
      result.passed = false;
    } else {
      result.warnings.push('REDIS_HOST not set (using default: localhost)');
    }
  }

  // Validate TLS for production
  if (isProduction || isStaging) {
    if (process.env.REDIS_TLS !== 'true') {
      result.warnings.push('REDIS_TLS should be enabled for production/staging (Azure Cache requires TLS)');
    }

    if (process.env.REDIS_PORT === '6379' && isProduction) {
      result.warnings.push('Using non-TLS Redis port 6379. Azure Cache uses 6380 for TLS.');
    }
  }

  // Validate password
  if ((isProduction || isStaging) && !process.env.REDIS_PASSWORD) {
    result.errors.push('REDIS_PASSWORD is required for production/staging');
    result.passed = false;
  }

  // Test connection if not in CI/CD
  if (process.env.TEST_CONNECTION !== 'false') {
    try {
      const redisConfig = process.env.REDIS_URL ? {
        url: process.env.REDIS_URL,
      } : {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          tls: process.env.REDIS_TLS === 'true',
        },
        password: process.env.REDIS_PASSWORD || undefined,
      };

      const client = createClient(redisConfig);

      await client.connect();
      await client.ping();
      console.log('✓ Redis connection test passed');
      await client.disconnect();
    } catch (error) {
      result.warnings.push(`Redis connection test failed: ${error.message}`);
      // Don't fail validation on Redis - some services can work without it
    }
  }

  return result;
}

/**
 * Main validation function
 */
async function main() {
  console.log('\n=================================');
  console.log('Database Configuration Validation');
  console.log('=================================\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Validate PostgreSQL for main database
  results.push(await validatePostgresConfig('Main Database'));

  // Validate PostgreSQL for services
  const services = ['user-service', 'matching-service', 'media-service'];
  for (const service of services) {
    results.push(await validatePostgresConfig(service));
  }

  // Validate Redis
  results.push(await validateRedisConfig());

  // Print results
  console.log('\n=================================');
  console.log('Validation Results');
  console.log('=================================\n');

  let allPassed = true;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    console.log(`${icon} ${result.service}`);

    if (result.errors.length > 0) {
      console.log('  Errors:');
      result.errors.forEach(err => console.log(`    - ${err}`));
      totalErrors += result.errors.length;
    }

    if (result.warnings.length > 0) {
      console.log('  Warnings:');
      result.warnings.forEach(warn => console.log(`    - ${warn}`));
      totalWarnings += result.warnings.length;
    }

    if (!result.passed) {
      allPassed = false;
    }

    console.log('');
  }

  // Summary
  console.log('=================================');
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Total Warnings: ${totalWarnings}`);
  console.log('=================================\n');

  if (!allPassed) {
    console.error('❌ Validation FAILED. Please fix the errors above before deployment.');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.warn('⚠️  Validation PASSED with warnings. Review warnings above.');
    process.exit(0);
  } else {
    console.log('✅ All validations PASSED!');
    process.exit(0);
  }
}

// Run validation
main().catch(error => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
