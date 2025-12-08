#!/usr/bin/env node
/**
 * Node.js script to generate package-lock.json files for all backend services
 * This script uses child_process to run npm install in each service directory
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const services = [
  'advertising-service',
  'analytics-service',
  'api-gateway',
  'auth-service',
  'matching-service',
  'media-service',
  'messaging-service',
  'moderation-service',
  'notification-service',
  'payment-service',
  'user-service'
];

const servicesDir = path.join(__dirname, 'backend', 'services');
let successCount = 0;
let failCount = 0;
const results = [];

console.log('Generating package-lock.json files for backend services...\n');

services.forEach(service => {
  const servicePath = path.join(servicesDir, service);
  const packageJsonPath = path.join(servicePath, 'package.json');
  const packageLockPath = path.join(servicePath, 'package-lock.json');

  console.log(`Processing: ${service}`);

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    console.log(`  WARNING: package.json not found in ${servicePath}`);
    results.push(`  [SKIP] ${service} - package.json not found`);
    failCount++;
    return;
  }

  try {
    // Run npm install
    execSync('npm install', {
      cwd: servicePath,
      stdio: 'pipe'
    });

    // Check if package-lock.json was created
    if (fs.existsSync(packageLockPath)) {
      console.log(`  SUCCESS: Generated package-lock.json for ${service}`);
      results.push(`  [OK] ${service}`);
      successCount++;
    } else {
      console.log(`  ERROR: package-lock.json not created for ${service}`);
      results.push(`  [FAIL] ${service} - package-lock.json not created`);
      failCount++;
    }
  } catch (error) {
    console.log(`  ERROR: npm install failed for ${service}`);
    console.log(`  ${error.message}`);
    results.push(`  [FAIL] ${service} - npm install failed: ${error.message}`);
    failCount++;
  }

  console.log('');
});

// Print summary
console.log('======================================================================');
console.log('SUMMARY');
console.log('======================================================================');
console.log(`Total services processed: ${services.length}`);
console.log(`Successful: ${successCount}`);
console.log(`Failed: ${failCount}`);
console.log('\nDetails:');
results.forEach(result => console.log(result));
console.log('======================================================================');

if (failCount === 0) {
  console.log('\nAll package-lock.json files generated successfully!');
  process.exit(0);
} else {
  console.log('\nSome package-lock.json files failed to generate. Please review the errors above.');
  process.exit(1);
}
