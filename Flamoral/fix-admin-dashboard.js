const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Admin Dashboard Issues...\n');

// Fix 1: Add AdminController to controllers.module.ts
const controllersModulePath = path.join(__dirname, 'backend/services/api-gateway/src/controllers/controllers.module.ts');
console.log('📝 Fix 1: Adding AdminController to controllers.module.ts');

let controllersModule = fs.readFileSync(controllersModulePath, 'utf8');

// Add import if not exists
if (!controllersModule.includes("import { AdminController } from './admin.controller'")) {
  controllersModule = controllersModule.replace(
    "import { SafetyController } from './safety.controller';",
    "import { SafetyController } from './safety.controller';\nimport { AdminController } from './admin.controller';"
  );
}

// Add to controllers array
if (!controllersModule.includes('AdminController,')) {
  controllersModule = controllersModule.replace(
    '    SafetyController,\n  ],',
    '    SafetyController,\n    AdminController,\n  ],'
  );
}

fs.writeFileSync(controllersModulePath, controllersModule);
console.log('✅ AdminController added to controllers.module.ts\n');

// Fix 2: Add adminService to configuration.ts
const configPath = path.join(__dirname, 'backend/services/api-gateway/src/config/configuration.ts');
console.log('📝 Fix 2: Adding adminService to configuration.ts');

let config = fs.readFileSync(configPath, 'utf8');

// Add adminService if not exists
if (!config.includes('adminService:')) {
  config = config.replace(
    "    advertisingService: process.env.ADVERTISING_SERVICE_URL || 'http://localhost:3010',",
    "    advertisingService: process.env.ADVERTISING_SERVICE_URL || 'http://localhost:3011',\n    adminService: process.env.ADMIN_SERVICE_URL || 'http://localhost:3010',"
  );
}

fs.writeFileSync(configPath, config);
console.log('✅ adminService added to configuration.ts\n');

// Fix 3: Update admin.controller.ts to remove double /api prefix
const adminControllerPath = path.join(__dirname, 'backend/services/api-gateway/src/controllers/admin.controller.ts');
console.log('📝 Fix 3: Fixing admin controller API paths');

let adminController = fs.readFileSync(adminControllerPath, 'utf8');

// Replace /api/admin with just / since the controller already has @Controller('admin')
adminController = adminController.replace(/\/api\/admin\//g, '/');

fs.writeFileSync(adminControllerPath, adminController);
console.log('✅ Admin controller API paths fixed\n');

// Fix 4: Update .env to ensure correct port
const envPath = path.join(__dirname, 'backend/services/api-gateway/.env');
console.log('📝 Fix 4: Checking .env configuration');

let env = fs.readFileSync(envPath, 'utf8');

// Ensure ADMIN_SERVICE_URL is set correctly
if (!env.includes('ADMIN_SERVICE_URL=http://localhost:3010')) {
  if (env.includes('ADMIN_SERVICE_URL=')) {
    env = env.replace(/ADMIN_SERVICE_URL=.*/g, 'ADMIN_SERVICE_URL=http://localhost:3010');
  } else {
    env += '\nADMIN_SERVICE_URL=http://localhost:3010\n';
  }
  fs.writeFileSync(envPath, env);
  console.log('✅ ADMIN_SERVICE_URL configured in .env');
} else {
  console.log('✅ ADMIN_SERVICE_URL already configured correctly');
}

console.log('\n🎉 Admin Dashboard fixes complete!');
console.log('\nNext steps:');
console.log('1. Restart the API Gateway service');
console.log('2. Ensure Admin Service is running on port 3010');
console.log('3. Test the endpoint: GET /api/v1/api/admin/users');
console.log('   (Note: The path will be /api/v1/api/admin/* due to global prefix)');
