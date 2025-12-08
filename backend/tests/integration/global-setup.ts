import { config } from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Global setup for integration tests
 * Starts test dependencies using Docker Compose
 */

export default async function globalSetup() {
  console.log('🚀 Starting integration test environment...');

  // Load test environment variables
  config({ path: path.join(__dirname, '../.env.test') });

  const useDockerCompose = process.env.USE_DOCKER_COMPOSE !== 'false';
  const useTestcontainers = process.env.USE_TESTCONTAINERS === 'true';

  if (useDockerCompose && !useTestcontainers) {
    try {
      console.log('📦 Starting Docker Compose services...');

      // Start test services
      execSync(
        'docker-compose -f docker-compose.test.yml up -d --wait',
        {
          cwd: path.join(__dirname, '../../..'),
          stdio: 'inherit',
        }
      );

      console.log('✅ Docker Compose services started successfully');

      // Wait for services to be healthy
      console.log('⏳ Waiting for services to be healthy...');
      await waitForServices();
      console.log('✅ All services are healthy');
    } catch (error) {
      console.error('❌ Failed to start Docker Compose services:', error);
      throw error;
    }
  } else if (useTestcontainers) {
    console.log('📦 Using Testcontainers (containers will be started per test suite)');
  } else {
    console.log('⚠️  Skipping Docker Compose and Testcontainers - using existing services');
  }

  // Additional setup can be added here
  console.log('✅ Integration test environment ready');
}

/**
 * Wait for Docker Compose services to be healthy
 */
async function waitForServices(maxRetries = 30, interval = 2000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { Client } = require('pg');
      const Redis = require('ioredis').default;

      // Test PostgreSQL
      const pgClient = new Client({
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5433'),
        database: 'postgres',
        user: process.env.TEST_DB_USER || 'postgres',
        password: process.env.TEST_DB_PASSWORD || 'test_password',
      });

      await pgClient.connect();
      await pgClient.end();

      // Test Redis
      const redisClient = new Redis({
        host: process.env.TEST_REDIS_HOST || 'localhost',
        port: parseInt(process.env.TEST_REDIS_PORT || '6380'),
      });

      await redisClient.ping();
      await redisClient.quit();

      return; // All services are healthy
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error('Services did not become healthy in time');
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
}
