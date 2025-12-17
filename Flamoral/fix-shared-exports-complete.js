const fs = require('fs');
const path = require('path');

// Path to the backend shared index file
const indexPath = path.join(__dirname, 'backend', 'shared', 'index.ts');

// New complete content for the index file
const newContent = `// Types
export * from './types/user.types';
export * from './types/match.types';
export * from './types/message.types';

// Utils
export { default as createLogger } from './utils/logger';
export { sanitize } from './utils/logger';
export * from './utils/validation';
export * from './utils/encryption';
export * from './utils/circuit-breaker';
export * from './utils/api-cache';
export * from './utils/graceful-degradation';
export * from './utils/request-batcher';
export * from './utils/subscription-tiers';

// Constants
export * from './constants/app.constants';

// Config
export * from './config/environment';
export * from './config/cost-optimization';

// Database
export * from './database/connection-pool-config';
export * from './database/cost-optimized-config';
export * from './database/performance-monitoring';
export * from './database/read-replica-config';

// Middleware
export * from './middleware/rate-limiter';

// Services
export * from './src/services/service-client';
`;

// Backup the old file
const backupPath = indexPath + '.backup';
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, backupPath);
  console.log('✓ Created backup at:', backupPath);
}

// Write the new content
fs.writeFileSync(indexPath, newContent, 'utf8');

console.log('✓ Updated backend/shared/index.ts with all exports');
console.log('\nExported modules:');
console.log('  - Types: user, match, message');
console.log('  - Utils: logger, validation, encryption, circuit-breaker, api-cache,');
console.log('           graceful-degradation, request-batcher, subscription-tiers');
console.log('  - Constants: app.constants');
console.log('  - Config: environment, cost-optimization');
console.log('  - Database: connection-pool, cost-optimized, performance-monitoring, read-replica');
console.log('  - Middleware: rate-limiter');
console.log('  - Services: service-client');
console.log('\nNext steps:');
console.log('  1. cd backend/shared');
console.log('  2. npm run build');
console.log('  3. Verify no TypeScript errors');
