#!/usr/bin/env node

/**
 * Messaging Service Verification Script
 * Checks all components and configurations
 */

const fs = require('fs');
const path = require('path');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  MESSAGING SERVICE VERIFICATION');
console.log('═══════════════════════════════════════════════════════════\n');

let allChecks = true;

// Helper functions
function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✓' : '✗'} ${description}`);
  if (!exists) {
    console.log(`  Missing: ${filePath}`);
    allChecks = false;
  }
  return exists;
}

function checkFileContains(filePath, searchString, description) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`✗ ${description}`);
    console.log(`  File not found: ${filePath}`);
    allChecks = false;
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const contains = content.includes(searchString);
  console.log(`${contains ? '✓' : '✗'} ${description}`);
  if (!contains) {
    console.log(`  Missing in ${filePath}: ${searchString.substring(0, 50)}...`);
    allChecks = false;
  }
  return contains;
}

// 1. Core Files
console.log('1. CORE SERVICE FILES');
console.log('─────────────────────────────────────────────────────────\n');

checkFile('src/index.ts', 'Main service entry point');
checkFile('package.json', 'Package configuration');
checkFile('tsconfig.json', 'TypeScript configuration');
checkFile('.env.example', 'Environment variables template');

// 2. Infrastructure
console.log('\n2. INFRASTRUCTURE');
console.log('─────────────────────────────────────────────────────────\n');

checkFile('src/infrastructure/database/cosmos-client.ts', 'CosmosDB client');
checkFile('src/infrastructure/cache/redis.ts', 'Redis client');
checkFile('src/socket/socket-manager.ts', 'WebSocket manager');

// Check Cosmos containers
checkFileContains(
  'src/infrastructure/database/cosmos-client.ts',
  'reactionsContainer',
  'Reactions container configured'
);

// 3. Routes
console.log('\n3. API ROUTES');
console.log('─────────────────────────────────────────────────────────\n');

checkFile('src/api/routes/index.ts', 'Routes index');
checkFile('src/api/routes/message.routes.ts', 'Message routes');
checkFile('src/api/routes/conversation.routes.ts', 'Conversation routes');
checkFile('src/api/routes/enhanced-messaging.routes.ts', 'Enhanced messaging routes');

// Check if enhanced routes are registered
const routesRegistered = checkFileContains(
  'src/api/routes/index.ts',
  "import enhancedMessagingRoutes from './enhanced-messaging.routes'",
  'Enhanced routes imported'
);

checkFileContains(
  'src/api/routes/index.ts',
  "router.use('/', enhancedMessagingRoutes)",
  'Enhanced routes registered'
);

// 4. Controllers
console.log('\n4. CONTROLLERS');
console.log('─────────────────────────────────────────────────────────\n');

checkFile('src/api/controllers/message.controller.ts', 'Message controller');
checkFile('src/api/controllers/conversation.controller.ts', 'Conversation controller');
checkFile('src/api/controllers/enhanced-messaging.controller.ts', 'Enhanced messaging controller');

// 5. Enhanced Messaging Services
console.log('\n5. ENHANCED MESSAGING SERVICES');
console.log('─────────────────────────────────────────────────────────\n');

const services = [
  ['enhanced-reactions.service.ts', 'Message reactions'],
  ['pinned-messages.service.ts', 'Pinned messages'],
  ['message-search.service.ts', 'Message search'],
  ['gif-integration.service.ts', 'GIF integration'],
  ['voice-message.service.ts', 'Voice messages'],
  ['photo-sharing.service.ts', 'Photo sharing'],
  ['chat-export.service.ts', 'Chat export'],
  ['icebreaker.service.ts', 'Icebreakers'],
];

services.forEach(([file, desc]) => {
  checkFile(`src/services/${file}`, desc);
});

// 6. Encryption & Security
console.log('\n6. ENCRYPTION & SECURITY');
console.log('─────────────────────────────────────────────────────────\n');

checkFile('src/services/encryption.service.ts', 'Encryption service');
checkFile('src/api/middleware/auth.middleware.ts', 'Authentication middleware');
checkFile('src/services/key-management.service.ts', 'Key management service');

// 7. Real-time Features
console.log('\n7. REAL-TIME FEATURES');
console.log('─────────────────────────────────────────────────────────\n');

checkFileContains(
  'src/socket/socket-manager.ts',
  'message:send',
  'Message sending via WebSocket'
);

checkFileContains(
  'src/socket/socket-manager.ts',
  'message:read',
  'Read receipts via WebSocket'
);

checkFileContains(
  'src/socket/socket-manager.ts',
  'typing:start',
  'Typing indicators via WebSocket'
);

// 8. Environment Configuration
console.log('\n8. ENVIRONMENT CONFIGURATION');
console.log('─────────────────────────────────────────────────────────\n');

const envVars = [
  ['PORT', 'Service port'],
  ['COSMOS_ENDPOINT', 'CosmosDB endpoint'],
  ['COSMOS_KEY', 'CosmosDB key'],
  ['REDIS_HOST', 'Redis host'],
  ['ENCRYPTION_KEY', 'Encryption key'],
  ['JWT_ACCESS_SECRET', 'JWT secret'],
];

envVars.forEach(([envVar, desc]) => {
  checkFileContains('.env.example', envVar, `${desc} in .env.example`);
});

// 9. Documentation
console.log('\n9. DOCUMENTATION');
console.log('─────────────────────────────────────────────────────────\n');

checkFile('REALTIME_INTEGRATION_GUIDE.md', 'Real-time integration guide');
checkFile('E2E_ENCRYPTION_IMPLEMENTATION.md', 'Encryption implementation');
checkFile('IMPLEMENTATION_CHECKLIST.md', 'Implementation checklist');

// Summary
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  VERIFICATION SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

if (allChecks) {
  console.log('✓ All checks passed! Messaging service is properly configured.\n');

  if (!routesRegistered) {
    console.log('⚠ WARNING: Enhanced messaging routes are NOT registered!');
    console.log('  Run: node fix-routes.js');
    console.log('  Or see: APPLY_FIX.md\n');
  } else {
    console.log('✓ Enhanced messaging routes are properly registered.\n');
  }
} else {
  console.log('✗ Some checks failed. Please review the issues above.\n');
  process.exit(1);
}

// Recommendations
console.log('═══════════════════════════════════════════════════════════');
console.log('  RECOMMENDATIONS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('1. Ensure all environment variables are set');
console.log('2. Configure Tenor and Giphy API keys for GIF integration');
console.log('3. Set up CosmosDB with proper containers');
console.log('4. Configure Redis for real-time features');
console.log('5. Test WebSocket connection at ws://localhost:3004');
console.log('6. Review MESSAGING_SERVICE_FIX_REPORT.md for details\n');

process.exit(allChecks && routesRegistered ? 0 : 1);
