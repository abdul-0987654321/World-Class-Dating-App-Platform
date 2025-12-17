#!/usr/bin/env ts-node

/**
 * Database Migration Runner
 * Runs migrations across all services or specific services
 */

import knex, { Knex } from 'knex';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

interface MigrationResult {
  service: string;
  success: boolean;
  batch?: number;
  migrations?: string[];
  error?: string;
}

interface ServiceConfig {
  name: string;
  knexfilePath: string;
  databaseName?: string;
}

// Service configurations
const SERVICES: ServiceConfig[] = [
  {
    name: 'user-service',
    knexfilePath: 'backend/services/user-service/src/infrastructure/database/knexfile.ts',
    databaseName: 'flamoral_users',
  },
  {
    name: 'matching-service',
    knexfilePath: 'backend/services/matching-service/src/infrastructure/database/knexfile.ts',
    databaseName: 'matching_service_dev',
  },
  {
    name: 'media-service',
    knexfilePath: 'backend/services/media-service/src/infrastructure/database/knexfile.ts',
    databaseName: 'media_service_dev',
  },
  {
    name: 'notification-service',
    knexfilePath: 'backend/services/notification-service/src/config/database.ts',
    databaseName: 'flamoral_notifications',
  },
  {
    name: 'payment-service',
    knexfilePath: 'backend/services/payment-service/src/infrastructure/database/connection.ts',
    databaseName: 'flamoral_payments',
  },
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string): void {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string): void {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string): void {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message: string): void {
  log(`⚠️  ${message}`, colors.yellow);
}

async function loadKnexConfig(configPath: string): Promise<Knex.Config | null> {
  try {
    const absolutePath = path.resolve(process.cwd(), configPath);

    if (!fs.existsSync(absolutePath)) {
      logError(`Config file not found: ${absolutePath}`);
      return null;
    }

    // Dynamic import for TypeScript files
    const configModule = await import(absolutePath);
    const config = configModule.default || configModule;

    // Get environment-specific config
    const env = process.env.NODE_ENV || 'development';

    if (typeof config === 'object' && config[env]) {
      return config[env];
    }

    return config;
  } catch (error) {
    logError(`Error loading config from ${configPath}: ${error}`);
    return null;
  }
}

async function runMigrations(
  service: ServiceConfig,
  action: 'latest' | 'rollback' | 'status' = 'latest'
): Promise<MigrationResult> {
  try {
    logInfo(`Running migrations for ${service.name}...`);

    const config = await loadKnexConfig(service.knexfilePath);

    if (!config) {
      return {
        service: service.name,
        success: false,
        error: 'Failed to load configuration',
      };
    }

    const db = knex(config);

    try {
      if (action === 'latest') {
        const [batch, migrations] = await db.migrate.latest();

        if (migrations.length === 0) {
          logInfo(`  No pending migrations for ${service.name}`);
        } else {
          logSuccess(`  Ran ${migrations.length} migration(s) for ${service.name}`);
          migrations.forEach((migration) => {
            console.log(`    - ${migration}`);
          });
        }

        return {
          service: service.name,
          success: true,
          batch,
          migrations,
        };
      } else if (action === 'rollback') {
        const [batch, migrations] = await db.migrate.rollback();

        if (migrations.length === 0) {
          logInfo(`  No migrations to rollback for ${service.name}`);
        } else {
          logSuccess(`  Rolled back ${migrations.length} migration(s) for ${service.name}`);
          migrations.forEach((migration) => {
            console.log(`    - ${migration}`);
          });
        }

        return {
          service: service.name,
          success: true,
          batch,
          migrations,
        };
      } else if (action === 'status') {
        const [completed, pending] = await Promise.all([
          db.migrate.list(),
          db.migrate.list(),
        ]);

        const completedMigrations = completed[0] || [];
        const pendingMigrations = completed[1] || [];

        console.log(`\n  ${service.name}:`);
        console.log(`    Completed: ${completedMigrations.length}`);
        console.log(`    Pending: ${pendingMigrations.length}`);

        return {
          service: service.name,
          success: true,
          migrations: [...completedMigrations, ...pendingMigrations],
        };
      }

      return {
        service: service.name,
        success: false,
        error: 'Unknown action',
      };
    } finally {
      await db.destroy();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`  Failed for ${service.name}: ${errorMessage}`);

    return {
      service: service.name,
      success: false,
      error: errorMessage,
    };
  }
}

async function runAllMigrations(
  services: ServiceConfig[],
  action: 'latest' | 'rollback' | 'status' = 'latest'
): Promise<void> {
  log('\n' + '='.repeat(80), colors.cyan);
  log('DATABASE MIGRATION RUNNER', colors.bright + colors.cyan);
  log('='.repeat(80) + '\n', colors.cyan);

  logInfo(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logInfo(`Action: ${action}`);
  logInfo(`Services: ${services.length}\n`);

  const results: MigrationResult[] = [];

  for (const service of services) {
    const result = await runMigrations(service, action);
    results.push(result);
  }

  // Summary
  log('\n' + '='.repeat(80), colors.cyan);
  log('MIGRATION SUMMARY', colors.bright + colors.cyan);
  log('='.repeat(80) + '\n', colors.cyan);

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  logSuccess(`Successful: ${successful.length}/${results.length}`);

  if (failed.length > 0) {
    logError(`Failed: ${failed.length}/${results.length}`);
    console.log('\nFailed services:');
    failed.forEach((result) => {
      console.log(`  - ${result.service}: ${result.error}`);
    });
  }

  log('\n' + '='.repeat(80) + '\n', colors.cyan);

  if (failed.length > 0) {
    process.exit(1);
  }
}

// CLI argument parsing
async function main() {
  const args = process.argv.slice(2);
  const action = (args[0] as 'latest' | 'rollback' | 'status') || 'latest';
  const serviceFilter = args[1];

  let servicesToRun = SERVICES;

  if (serviceFilter) {
    servicesToRun = SERVICES.filter(
      (s) => s.name.toLowerCase().includes(serviceFilter.toLowerCase())
    );

    if (servicesToRun.length === 0) {
      logError(`No services found matching: ${serviceFilter}`);
      logInfo('Available services:');
      SERVICES.forEach((s) => console.log(`  - ${s.name}`));
      process.exit(1);
    }
  }

  await runAllMigrations(servicesToRun, action);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logError('Unhandled rejection:');
  console.error(error);
  process.exit(1);
});

// Run
if (require.main === module) {
  main();
}

export { runAllMigrations, runMigrations };
