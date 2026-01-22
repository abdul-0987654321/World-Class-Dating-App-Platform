#!/usr/bin/env node
/**
 * Pre-build validation script for Flamoral mobile app
 *
 * Run this before EAS builds to catch common issues early and avoid wasted build credits.
 * Usage: node scripts/pre-build-check.js [--production]
 */

const fs = require('fs');
const path = require('path');

const isProduction =
  process.argv.includes('--production') || process.env.APP_VARIANT === 'production';
const appDir = path.resolve(__dirname, '..');

let hasErrors = false;
let hasWarnings = false;

function error(message) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
  hasErrors = true;
}

function warn(message) {
  console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`);
  hasWarnings = true;
}

function success(message) {
  console.log(`\x1b[32m[OK]\x1b[0m ${message}`);
}

function info(message) {
  console.log(`\x1b[36m[INFO]\x1b[0m ${message}`);
}

console.log('\n========================================');
console.log('  Flamoral Pre-Build Validation Check');
console.log('========================================\n');
info(`Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT/PREVIEW'}`);
console.log('');

// ============================================
// 1. Check required files exist
// ============================================
console.log('1. Checking required files...\n');

const requiredFiles = [
  { path: 'google-services.json', description: 'Android Firebase config' },
  { path: 'GoogleService-Info.plist', description: 'iOS Firebase config' },
  { path: 'assets/icon.png', description: 'App icon' },
  { path: 'assets/splash.png', description: 'Splash screen' },
  { path: 'assets/adaptive-icon.png', description: 'Android adaptive icon' },
];

for (const file of requiredFiles) {
  const filePath = path.join(appDir, file.path);
  if (fs.existsSync(filePath)) {
    success(`${file.description}: ${file.path}`);
  } else {
    error(`Missing ${file.description}: ${file.path}`);
  }
}

// ============================================
// 2. Check environment variables
// ============================================
console.log('\n2. Checking environment variables...\n');

const envVarsRequired = [{ name: 'EXPO_PUBLIC_EAS_PROJECT_ID', required: false }];

const envVarsProduction = [
  { name: 'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID', required: true },
  { name: 'EXPO_PUBLIC_ADMOB_IOS_APP_ID', required: true },
  { name: 'EXPO_PUBLIC_API_BASE_URL', required: false },
  { name: 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: false },
];

for (const envVar of envVarsRequired) {
  if (process.env[envVar.name]) {
    success(`${envVar.name} is set`);
  } else if (envVar.required) {
    error(`${envVar.name} is required but not set`);
  } else {
    warn(`${envVar.name} is not set (using default)`);
  }
}

if (isProduction) {
  console.log('\n   Production-only environment variables:\n');
  for (const envVar of envVarsProduction) {
    if (process.env[envVar.name]) {
      // Check for test IDs
      const value = process.env[envVar.name];
      if (value.includes('ca-app-pub-3940256099942544')) {
        error(`${envVar.name} is using TEST AdMob ID in production!`);
      } else {
        success(`${envVar.name} is set`);
      }
    } else if (envVar.required) {
      error(`${envVar.name} is required for production but not set`);
    } else {
      warn(`${envVar.name} is not set for production`);
    }
  }
}

// ============================================
// 3. Validate config files
// ============================================
console.log('\n3. Validating config files...\n');

// Check google-services.json
try {
  const googleServicesPath = path.join(appDir, 'google-services.json');
  if (fs.existsSync(googleServicesPath)) {
    const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));
    if (googleServices.project_info?.project_id) {
      success(
        `google-services.json has valid project_id: ${googleServices.project_info.project_id}`
      );
    } else {
      error('google-services.json missing project_id');
    }
  }
} catch (e) {
  error(`Failed to parse google-services.json: ${e.message}`);
}

// Check GoogleService-Info.plist exists and has content
try {
  const plistPath = path.join(appDir, 'GoogleService-Info.plist');
  if (fs.existsSync(plistPath)) {
    const plistContent = fs.readFileSync(plistPath, 'utf8');
    if (plistContent.includes('PROJECT_ID') && plistContent.includes('BUNDLE_ID')) {
      success('GoogleService-Info.plist has required keys');
    } else {
      error('GoogleService-Info.plist missing required keys');
    }
  }
} catch (e) {
  error(`Failed to read GoogleService-Info.plist: ${e.message}`);
}

// Check eas.json
try {
  const easPath = path.join(appDir, 'eas.json');
  if (fs.existsSync(easPath)) {
    const easConfig = JSON.parse(fs.readFileSync(easPath, 'utf8'));
    if (easConfig.build && easConfig.cli) {
      success('eas.json is valid');
    } else {
      error('eas.json missing required sections');
    }
  } else {
    error('eas.json not found');
  }
} catch (e) {
  error(`Failed to parse eas.json: ${e.message}`);
}

// ============================================
// 4. Check package.json dependencies
// ============================================
console.log('\n4. Checking dependencies...\n');

try {
  const packagePath = path.join(appDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  const criticalDeps = [
    'expo',
    'react-native',
    'react-native-screens',
    '@react-native-firebase/app',
  ];

  for (const dep of criticalDeps) {
    if (packageJson.dependencies?.[dep]) {
      success(`${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      error(`Missing critical dependency: ${dep}`);
    }
  }
} catch (e) {
  error(`Failed to check dependencies: ${e.message}`);
}

// ============================================
// Summary
// ============================================
console.log('\n========================================');
console.log('  Summary');
console.log('========================================\n');

if (hasErrors) {
  console.log('\x1b[31m[FAILED]\x1b[0m Pre-build check failed with errors.');
  console.log('         Fix the errors above before running EAS build.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\x1b[33m[PASSED WITH WARNINGS]\x1b[0m Pre-build check passed with warnings.');
  console.log('                        Review warnings above before building.\n');
  process.exit(0);
} else {
  console.log('\x1b[32m[PASSED]\x1b[0m All pre-build checks passed!');
  console.log('         Ready to run EAS build.\n');
  process.exit(0);
}
