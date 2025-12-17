const fs = require('fs');
const path = require('path');

// Path to the backend shared index file
const indexPath = path.join(__dirname, 'backend', 'shared', 'index.ts');

// New content for the index file
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

// Services
export * from './src/services/service-client';
`;

// Write the new content
fs.writeFileSync(indexPath, newContent, 'utf8');

console.log('✓ Updated backend/shared/index.ts with all exports');
