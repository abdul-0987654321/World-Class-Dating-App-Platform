/**
 * Configuration Validation Script
 * Run this to validate your notification service configuration
 */

import dotenv from 'dotenv';
import { config } from '../src/config';

dotenv.config();

interface ValidationResult {
  category: string;
  status: 'OK' | 'WARNING' | 'ERROR' | 'SKIPPED';
  message: string;
  details?: string;
}

const results: ValidationResult[] = [];

function validate(
  category: string,
  condition: boolean,
  errorMessage: string,
  warningMessage?: string,
  optional: boolean = false
): void {
  if (condition) {
    results.push({
      category,
      status: 'OK',
      message: `${category} configured correctly`,
    });
  } else if (optional) {
    results.push({
      category,
      status: 'SKIPPED',
      message: `${category} not configured (optional)`,
      details: warningMessage,
    });
  } else {
    results.push({
      category,
      status: 'ERROR',
      message: errorMessage,
      details: warningMessage,
    });
  }
}

function validateWarning(
  category: string,
  condition: boolean,
  message: string,
  details?: string
): void {
  results.push({
    category,
    status: condition ? 'OK' : 'WARNING',
    message,
    details,
  });
}

console.log('\n🔍 Validating Notification Service Configuration...\n');

// 1. Basic Configuration
validate(
  'Environment',
  !!config.nodeEnv,
  'NODE_ENV not set',
  'Set to "development" or "production"'
);

validate(
  'Port',
  !!config.port,
  'PORT not configured',
  'Using default port 3012'
);

validate(
  'Web App URL',
  !!config.webAppUrl,
  'WEB_APP_URL not configured',
  'Required for email unsubscribe links and deep links'
);

// 2. Database Configuration
validate(
  'Database Host',
  !!config.database.host,
  'Database host not configured'
);

validate(
  'Database Name',
  !!config.database.database,
  'Database name not configured'
);

validate(
  'Database User',
  !!config.database.user,
  'Database user not configured'
);

validateWarning(
  'Database Security',
  config.database.password !== 'postgres',
  'Using default database password',
  'Change password in production'
);

// 3. Redis Configuration
validate(
  'Redis Host',
  !!config.redis.host,
  'Redis host not configured'
);

validate(
  'Redis Port',
  !!config.redis.port,
  'Redis port not configured'
);

validateWarning(
  'Redis Security',
  !!config.redis.password || config.nodeEnv === 'development',
  'Redis password not set',
  'Recommended for production'
);

// 4. Email Configuration
const hasEmailProvider =
  !!config.sendgrid.apiKey ||
  !!process.env.AWS_SES_REGION ||
  !!process.env.SMTP_HOST;

validate(
  'Email Provider',
  hasEmailProvider,
  'No email provider configured',
  'Configure SendGrid, AWS SES, or SMTP',
  true
);

if (config.sendgrid.apiKey) {
  validate(
    'SendGrid API Key',
    config.sendgrid.apiKey !== 'your-sendgrid-api-key',
    'SendGrid API key is placeholder',
    'Update with real API key'
  );

  validate(
    'Email From Address',
    !!config.sendgrid.fromEmail,
    'Email from address not configured'
  );
}

if (process.env.AWS_SES_REGION) {
  validate(
    'AWS SES Region',
    !!process.env.AWS_SES_REGION,
    'AWS SES region not configured'
  );

  validate(
    'AWS Credentials',
    !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    'AWS credentials not configured',
    'Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY'
  );
}

if (process.env.SMTP_HOST) {
  validate(
    'SMTP Host',
    !!process.env.SMTP_HOST,
    'SMTP host not configured'
  );

  validate(
    'SMTP Port',
    !!process.env.SMTP_PORT,
    'SMTP port not configured'
  );
}

// 5. Push Notification Configuration
const hasFirebase =
  !!config.firebase.serviceAccountPath ||
  !!config.firebase.serviceAccountJson;

validate(
  'Firebase (FCM)',
  hasFirebase,
  'Firebase not configured',
  'Configure for Android/Web push notifications',
  true
);

const hasAPNs =
  !!(config.apns.keyId && config.apns.teamId);

validate(
  'APNs (iOS)',
  hasAPNs,
  'APNs not configured',
  'Configure for iOS push notifications',
  true
);

if (hasAPNs) {
  validate(
    'APNs Key',
    !!(config.apns.keyPath || config.apns.key),
    'APNs key not configured',
    'Set APNS_KEY_PATH or APNS_KEY'
  );

  validate(
    'APNs Bundle ID',
    !!config.apns.bundleId,
    'APNs bundle ID not configured'
  );
}

// 6. SMS Configuration
const hasTwilio =
  !!(config.twilio.accountSid && config.twilio.authToken);

validate(
  'Twilio (SMS)',
  hasTwilio,
  'Twilio not configured',
  'Configure for SMS notifications',
  true
);

if (hasTwilio) {
  validate(
    'Twilio Account SID',
    config.twilio.accountSid !== 'your-twilio-account-sid',
    'Twilio Account SID is placeholder'
  );

  validate(
    'Twilio From Number',
    !!config.twilio.fromNumber,
    'Twilio from number not configured'
  );
}

// 7. Security Configuration
validate(
  'JWT Secret',
  !!process.env.JWT_SECRET,
  'JWT_SECRET not configured',
  'Required for authentication'
);

validateWarning(
  'JWT Secret Strength',
  !process.env.JWT_SECRET?.includes('change-in-production'),
  'Using default JWT secret',
  'Change JWT_SECRET in production'
);

// 8. Queue Configuration
validateWarning(
  'Queue Concurrency',
  parseInt(process.env.NOTIFICATION_QUEUE_CONCURRENCY || '10') >= 5,
  'Queue concurrency is low',
  'Consider increasing for high-volume scenarios'
);

// Print Results
console.log('═'.repeat(80));
console.log('  VALIDATION RESULTS');
console.log('═'.repeat(80));

let okCount = 0;
let warningCount = 0;
let errorCount = 0;
let skippedCount = 0;

const statusIcons = {
  OK: '✅',
  WARNING: '⚠️',
  ERROR: '❌',
  SKIPPED: '⏭️',
};

results.forEach((result) => {
  const icon = statusIcons[result.status];
  console.log(`\n${icon} ${result.category}`);
  console.log(`   ${result.message}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }

  switch (result.status) {
    case 'OK':
      okCount++;
      break;
    case 'WARNING':
      warningCount++;
      break;
    case 'ERROR':
      errorCount++;
      break;
    case 'SKIPPED':
      skippedCount++;
      break;
  }
});

console.log('\n' + '═'.repeat(80));
console.log('  SUMMARY');
console.log('═'.repeat(80));
console.log(`✅ OK:       ${okCount}`);
console.log(`⚠️  WARNING:  ${warningCount}`);
console.log(`❌ ERROR:    ${errorCount}`);
console.log(`⏭️  SKIPPED:  ${skippedCount}`);
console.log('═'.repeat(80));

if (errorCount > 0) {
  console.log('\n❌ Configuration has errors. Please fix before starting the service.');
  process.exit(1);
} else if (warningCount > 0) {
  console.log('\n⚠️  Configuration has warnings. Review before deploying to production.');
  process.exit(0);
} else {
  console.log('\n✅ Configuration is valid! Service ready to start.');
  process.exit(0);
}
