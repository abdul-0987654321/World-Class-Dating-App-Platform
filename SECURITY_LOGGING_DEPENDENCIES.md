# Security & Logging Dependencies

This document lists all the required dependencies for the logging and security implementation.

## Mobile App Dependencies

### Production Dependencies

```bash
cd apps/mobile-app

# Security
npm install jail-monkey
npm install react-native-screen-capture

# Error Tracking
npm install @sentry/react-native

# Configuration
npm install react-native-config
```

### Development Dependencies

```bash
# Babel plugin to remove console.log in production
npm install --save-dev babel-plugin-transform-remove-console
```

### Package.json Snippet

```json
{
  "dependencies": {
    "@sentry/react-native": "^5.15.0",
    "jail-monkey": "^3.0.0",
    "react-native-config": "^1.5.1",
    "react-native-screen-capture": "^2.0.0"
  },
  "devDependencies": {
    "babel-plugin-transform-remove-console": "^6.9.4"
  }
}
```

## Web App Dependencies

### Production Dependencies

```bash
cd apps/web-app

# Error Tracking
npm install @sentry/react
npm install @sentry/tracing
```

### Development Dependencies

```bash
# Vite automatically handles console removal via terser
# No additional dev dependencies needed
```

### Package.json Snippet

```json
{
  "dependencies": {
    "@sentry/react": "^7.91.0",
    "@sentry/tracing": "^7.91.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "terser": "^5.26.0"
  }
}
```

## Backend Dependencies

### Production Dependencies

```bash
cd backend/shared

# Logging
npm install winston
npm install winston-daily-rotate-file

# Error Tracking (optional)
npm install @sentry/node
```

### Package.json Snippet

```json
{
  "dependencies": {
    "winston": "^3.11.0",
    "winston-daily-rotate-file": "^4.7.1",
    "@sentry/node": "^7.91.0"
  }
}
```

## Root Level Scripts

Add these scripts to the root `package.json`:

```json
{
  "scripts": {
    "security:check": "node scripts/security-audit.js",
    "logs:replace": "node scripts/replace-console-logs.js",
    "logs:mobile": "node scripts/replace-console-logs.js apps/mobile-app/src",
    "logs:web": "node scripts/replace-console-logs.js apps/web-app/src",
    "logs:backend": "node scripts/replace-console-logs.js backend/services"
  },
  "devDependencies": {
    "glob": "^10.3.10"
  }
}
```

## Installation Commands

### Quick Install All

```bash
# From project root
npm run install:all

# Or manually:
cd apps/mobile-app && npm install
cd ../web-app && npm install
cd ../../backend/shared && npm install
```

### Verify Installation

```bash
# Mobile App
cd apps/mobile-app
npm list jail-monkey
npm list react-native-screen-capture
npm list @sentry/react-native
npm list babel-plugin-transform-remove-console

# Web App
cd apps/web-app
npm list @sentry/react

# Backend
cd backend/shared
npm list winston
```

## Platform-Specific Setup

### iOS (React Native)

```bash
cd apps/mobile-app/ios
pod install
```

### Android (React Native)

No additional setup required. Gradle will handle dependencies.

### React Native Config Setup

Create `.env` file in `apps/mobile-app/`:

```bash
# apps/mobile-app/.env
ENV=development
SENTRY_DSN=your_sentry_dsn_here
API_URL=http://localhost:3000
```

## Optional Dependencies

### Enhanced Logging

```bash
# Mobile - Redux Logger (development only)
npm install --save-dev redux-logger

# Backend - Log aggregation
npm install @google-cloud/logging  # GCP
npm install aws-sdk  # AWS CloudWatch
npm install @elastic/elasticsearch  # ELK
```

### Advanced Security

```bash
# Mobile - Additional security checks
npm install react-native-device-info
npm install react-native-keychain

# SSL Pinning
npm install react-native-ssl-pinning
```

## Dependency Verification Script

Create `scripts/verify-dependencies.js`:

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');

const dependencies = {
  mobile: [
    'jail-monkey',
    'react-native-screen-capture',
    '@sentry/react-native',
    'react-native-config',
  ],
  web: [
    '@sentry/react',
    '@sentry/tracing',
  ],
  backend: [
    'winston',
    'winston-daily-rotate-file',
  ],
};

function checkDependency(path, dep) {
  try {
    execSync(`cd ${path} && npm list ${dep} --depth=0`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

console.log('\n🔍 Verifying Security & Logging Dependencies...\n');

let allInstalled = true;

// Check mobile
console.log(chalk.blue('Mobile App:'));
dependencies.mobile.forEach(dep => {
  const installed = checkDependency('apps/mobile-app', dep);
  const status = installed ? chalk.green('✓') : chalk.red('✗');
  console.log(`  ${status} ${dep}`);
  if (!installed) allInstalled = false;
});

// Check web
console.log(chalk.blue('\nWeb App:'));
dependencies.web.forEach(dep => {
  const installed = checkDependency('apps/web-app', dep);
  const status = installed ? chalk.green('✓') : chalk.red('✗');
  console.log(`  ${status} ${dep}`);
  if (!installed) allInstalled = false;
});

// Check backend
console.log(chalk.blue('\nBackend:'));
dependencies.backend.forEach(dep => {
  const installed = checkDependency('backend/shared', dep);
  const status = installed ? chalk.green('✓') : chalk.red('✗');
  console.log(`  ${status} ${dep}`);
  if (!installed) allInstalled = false;
});

console.log('');

if (allInstalled) {
  console.log(chalk.green('✓ All dependencies installed correctly!\n'));
  process.exit(0);
} else {
  console.log(chalk.red('✗ Some dependencies are missing. Run installation commands.\n'));
  process.exit(1);
}
```

## Troubleshooting

### Common Issues

#### 1. jail-monkey Installation Failed (iOS)

```bash
cd apps/mobile-app/ios
pod deintegrate
pod install
```

#### 2. Winston Not Found

```bash
cd backend/shared
rm -rf node_modules package-lock.json
npm install
```

#### 3. Babel Plugin Not Working

Ensure `babel.config.js` is at the root of your app:

```javascript
// apps/mobile-app/babel.config.js
module.exports = function (api) {
  api.cache(true);

  const isProduction = process.env.NODE_ENV === 'production';

  const plugins = [
    // Your other plugins...
  ];

  if (isProduction) {
    plugins.unshift([
      'transform-remove-console',
      {
        exclude: ['error', 'warn'],
      },
    ]);
  }

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins,
  };
};
```

#### 4. TypeScript Errors

Add logger types to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

## Version Compatibility

### React Native

- **Minimum Version**: 0.70.0
- **Recommended**: 0.72.0+
- **Tested**: 0.73.0

### React (Web)

- **Minimum Version**: 18.0.0
- **Recommended**: 18.2.0+

### Node.js

- **Minimum Version**: 16.0.0
- **Recommended**: 18.0.0+
- **LTS**: 20.0.0+

### TypeScript

- **Minimum Version**: 4.8.0
- **Recommended**: 5.0.0+

## Security Considerations

### 1. Keep Dependencies Updated

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Check for security vulnerabilities
npm audit
npm audit fix
```

### 2. Production Dependencies Only

Ensure `devDependencies` are not included in production builds:

```bash
# Install production dependencies only
npm install --production
```

### 3. Verify Package Integrity

```bash
# Verify package checksums
npm install --ignore-scripts

# Check for known vulnerabilities
npm audit --production
```

## License Compliance

All recommended dependencies are MIT or Apache 2.0 licensed:

- `winston`: MIT
- `jail-monkey`: MIT
- `@sentry/react-native`: MIT
- `react-native-screen-capture`: MIT
- `babel-plugin-transform-remove-console`: MIT

## Support & Updates

### Getting Help

1. Check package documentation
2. Search GitHub issues
3. Contact development team

### Staying Updated

Subscribe to security advisories:

```bash
# Enable GitHub security alerts
# Settings → Security & analysis → Dependabot alerts
```

---

## Quick Reference

### Install All Dependencies

```bash
#!/bin/bash

echo "Installing Mobile App dependencies..."
cd apps/mobile-app
npm install

echo "Installing Web App dependencies..."
cd ../web-app
npm install

echo "Installing Backend dependencies..."
cd ../../backend/shared
npm install

echo "Installing iOS Pods..."
cd ../../apps/mobile-app/ios
pod install

echo "✓ All dependencies installed!"
```

### Verify Installation

```bash
npm run verify:deps
```

### Check for Security Issues

```bash
npm audit --recursive
```

---

**Last Updated:** December 2025
**Maintainer:** Security Team
