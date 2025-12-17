/**
 * Global Setup for Contract Tests
 * Runs once before all contract tests
 */

export default async function globalSetup() {
  console.log('Contract tests global setup starting...');

  // Set environment variables
  process.env.PACT_BROKER_BASE_URL = process.env.PACT_BROKER_BASE_URL || 'http://localhost:9292';
  process.env.PACT_LOG_LEVEL = 'info';

  console.log('Contract tests global setup complete.');
}
