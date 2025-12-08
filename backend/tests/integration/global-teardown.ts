import { execSync } from 'child_process';
import path from 'path';

/**
 * Global teardown for integration tests
 * Stops test dependencies
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up integration test environment...');

  const useDockerCompose = process.env.USE_DOCKER_COMPOSE !== 'false';
  const useTestcontainers = process.env.USE_TESTCONTAINERS === 'true';

  if (useDockerCompose && !useTestcontainers) {
    try {
      console.log('🛑 Stopping Docker Compose services...');

      // Stop and remove test services
      execSync(
        'docker-compose -f docker-compose.test.yml down -v',
        {
          cwd: path.join(__dirname, '../../..'),
          stdio: 'inherit',
        }
      );

      console.log('✅ Docker Compose services stopped successfully');
    } catch (error) {
      console.error('❌ Failed to stop Docker Compose services:', error);
      // Don't throw - allow tests to complete
    }
  }

  console.log('✅ Integration test environment cleaned up');
}
