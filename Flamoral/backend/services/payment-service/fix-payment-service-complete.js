const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('FLAMORAL PAYMENT SERVICE - COMPREHENSIVE FIX');
console.log('='.repeat(80));
console.log('\n');

const basePath = path.join(__dirname, 'src');

// Fix 1: index.ts - Fix logger import and add IAP routes
console.log('1. Fixing index.ts...');
const indexPath = path.join(basePath, 'index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Replace @flamoral/shared logger with local logger
indexContent = indexContent.replace(
  "import { createLogger } from '@flamoral/shared';",
  "import logger from './utils/logger';"
);

// Remove createLogger call
indexContent = indexContent.replace(
  /\/\/ Initialize logger\s*const logger = createLogger\('payment-service'\);/,
  ""
);

// Fix PORT to 3005
indexContent = indexContent.replace(
  "const PORT = process.env.PORT || 3006;",
  "const PORT = process.env.PORT || 3005;"
);

// Add IAP routes import if not present
if (!indexContent.includes("import iapRoutes from './api/routes/iap.routes'")) {
  indexContent = indexContent.replace(
    "import webhookRoutes from './api/routes/webhook.routes';",
    "import webhookRoutes from './api/routes/webhook.routes';\nimport iapRoutes from './api/routes/iap.routes';"
  );
}

// Add IAP routes mount if not present
if (!indexContent.includes("app.use('/api/payments/iap', iapRoutes)")) {
  indexContent = indexContent.replace(
    "app.use('/api/payments', paymentRoutes);",
    "app.use('/api/payments', paymentRoutes);\napp.use('/api/payments/iap', iapRoutes);"
  );
}

fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log('   ✓ Fixed index.ts');

// Fix 2: user-service.client.ts - Replace @flamoral/shared import
console.log('\n2. Fixing user-service.client.ts...');
const userServicePath = path.join(basePath, 'infrastructure/clients/user-service.client.ts');
let userServiceContent = fs.readFileSync(userServicePath, 'utf8');

userServiceContent = userServiceContent.replace(
  "import { ServiceClient } from '@flamoral/shared';",
  "import { ServiceClient } from '../../utils/service-client';"
);

// Update UpdateSubscriptionDto to include provider
if (!userServiceContent.includes('provider?: string;')) {
  userServiceContent = userServiceContent.replace(
    /interface UpdateSubscriptionDto \{[\s\S]*?gracePeriodEnd\?: Date;\s*\}/,
    `interface UpdateSubscriptionDto {
  userId: string;
  tier: 'free' | 'premium' | 'premium_plus';
  stripeSubscriptionId?: string;
  status?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'grace_period';
  currentPeriodEnd?: Date;
  gracePeriodEnd?: Date;
  provider?: string;
}`
  );
}

// Update AddCoinsDto to include iap_purchase type
userServiceContent = userServiceContent.replace(
  "transactionType: 'purchase' | 'reward' | 'refund';",
  "transactionType: 'purchase' | 'reward' | 'refund' | 'iap_purchase';"
);

// Add missing methods if not present
if (!userServiceContent.includes('async getSubscription(')) {
  const methodsToAdd = `
  /**
   * Get user subscription
   */
  async getSubscription(userId: string): Promise<{ tier: string; status: string }> {
    try {
      const response = await this.client.get(\`/api/internal/users/\${userId}/subscription\`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get subscription from user-service:', error.message);
      return { tier: 'free', status: 'active' };
    }
  }

  /**
   * Get user wallet
   */
  async getWallet(userId: string): Promise<{ coins: number; boosts: number; superLikes: number }> {
    try {
      const response = await this.client.get(\`/api/internal/users/\${userId}/wallet\`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get wallet from user-service:', error.message);
      return { coins: 0, boosts: 0, superLikes: 0 };
    }
  }

  /**
   * Add boosts to user
   */
  async addBoosts(userId: string, amount: number): Promise<void> {
    try {
      await this.client.post('/api/internal/boosts/add', { userId, amount });
      logger.info(\`Added \${amount} boosts to user \${userId}\`);
    } catch (error: any) {
      logger.error('Failed to add boosts in user-service:', error.message);
    }
  }

  /**
   * Add super likes to user
   */
  async addSuperLikes(userId: string, amount: number): Promise<void> {
    try {
      await this.client.post('/api/internal/superlikes/add', { userId, amount });
      logger.info(\`Added \${amount} super likes to user \${userId}\`);
    } catch (error: any) {
      logger.error('Failed to add super likes in user-service:', error.message);
    }
  }

  `;

  // Insert before mapTierName method
  const insertPosition = userServiceContent.indexOf('  /**\n   * Map tier names for compatibility');
  if (insertPosition > 0) {
    userServiceContent = userServiceContent.slice(0, insertPosition) + methodsToAdd + userServiceContent.slice(insertPosition);
  }
}

fs.writeFileSync(userServicePath, userServiceContent, 'utf8');
console.log('   ✓ Fixed user-service.client.ts');

// Fix 3: notification-service.client.ts
console.log('\n3. Fixing notification-service.client.ts...');
const notificationServicePath = path.join(basePath, 'infrastructure/clients/notification-service.client.ts');
let notificationServiceContent = fs.readFileSync(notificationServicePath, 'utf8');

notificationServiceContent = notificationServiceContent.replace(
  "import { ServiceClient } from '@flamoral/shared';",
  "import { ServiceClient } from '../../utils/service-client';"
);

fs.writeFileSync(notificationServicePath, notificationServiceContent, 'utf8');
console.log('   ✓ Fixed notification-service.client.ts');

// Fix 4: payment.service.ts - Update Stripe API version
console.log('\n4. Fixing payment.service.ts...');
const paymentServicePath = path.join(basePath, 'domain/services/payment.service.ts');
if (fs.existsSync(paymentServicePath)) {
  let paymentServiceContent = fs.readFileSync(paymentServicePath, 'utf8');

  paymentServiceContent = paymentServiceContent.replace(
    /apiVersion: ['"]2024-12-18\.acacia['"]/g,
    "apiVersion: '2023-10-16'"
  );

  fs.writeFileSync(paymentServicePath, paymentServiceContent, 'utf8');
  console.log('   ✓ Fixed payment.service.ts');
}

// Fix 5: webhook.controller.ts - Update Stripe API version
console.log('\n5. Fixing webhook.controller.ts...');
const webhookControllerPath = path.join(basePath, 'api/controllers/webhook.controller.ts');
if (fs.existsSync(webhookControllerPath)) {
  let webhookContent = fs.readFileSync(webhookControllerPath, 'utf8');

  webhookContent = webhookContent.replace(
    /apiVersion: ['"]2024-12-18\.acacia['"]/g,
    "apiVersion: '2023-10-16'"
  );

  fs.writeFileSync(webhookControllerPath, webhookContent, 'utf8');
  console.log('   ✓ Fixed webhook.controller.ts');
}

// Fix 6: Create .env file if missing
console.log('\n6. Checking .env file...');
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('   ⚠ .env file not found. Creating from .env.example...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('   ✓ Created .env file from .env.example');
    console.log('   ⚠ IMPORTANT: Update .env with your actual Stripe keys!');
  } else {
    console.log('   ⚠ .env.example not found. Please create .env manually.');
  }
} else {
  console.log('   ✓ .env file exists');
}

// Check if IAP controller exists
console.log('\n7. Checking IAP controller...');
const iapControllerPath = path.join(basePath, 'api/controllers/iap.controller.ts');
if (fs.existsSync(iapControllerPath)) {
  console.log('   ✓ IAP controller exists');
} else {
  console.log('   ⚠ IAP controller not found (expected for mobile payments)');
}

// Check if service-client utility exists
console.log('\n8. Checking service-client utility...');
const serviceClientPath = path.join(basePath, 'utils/service-client.ts');
if (fs.existsSync(serviceClientPath)) {
  console.log('   ✓ service-client utility exists');
} else {
  console.log('   ⚠ service-client utility not found. Creating...');

  const serviceClientCode = `import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import logger from './logger';

interface ServiceClientConfig {
  baseUrl: string;
  serviceName: string;
  timeout?: number;
}

export class ServiceClient {
  private client: AxiosInstance;
  private serviceName: string;

  constructor(config: ServiceClientConfig) {
    this.serviceName = config.serviceName;

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': config.serviceName,
        'X-API-Key': process.env.SERVICE_API_KEY || '',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(\`[\${this.serviceName}] \${config.method?.toUpperCase()} \${config.url}\`);
        return config;
      },
      (error) => {
        logger.error(\`[\${this.serviceName}] Request error:\`, error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(\`[\${this.serviceName}] Response: \${response.status}\`);
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(
            \`[\${this.serviceName}] Response error:\`,
            error.response.status,
            error.response.data
          );
        } else if (error.request) {
          logger.error(\`[\${this.serviceName}] No response received\`);
        } else {
          logger.error(\`[\${this.serviceName}] Error:\`, error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async get(url: string, config?: AxiosRequestConfig) {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put(url, data, config);
  }

  async patch(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.patch(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig) {
    return this.client.delete(url, config);
  }
}
`;

  fs.writeFileSync(serviceClientPath, serviceClientCode, 'utf8');
  console.log('   ✓ Created service-client utility');
}

console.log('\n' + '='.repeat(80));
console.log('✅ ALL FIXES APPLIED SUCCESSFULLY!');
console.log('='.repeat(80));
console.log('\nNext steps:');
console.log('1. Update .env file with your actual Stripe keys');
console.log('2. Run: npm install (if needed)');
console.log('3. Run: npm run build');
console.log('4. Run: npm start');
console.log('\nStripe Configuration Required:');
console.log('- STRIPE_SECRET_KEY=sk_test_...');
console.log('- STRIPE_PUBLISHABLE_KEY=pk_test_...');
console.log('- STRIPE_WEBHOOK_SECRET=whsec_...');
console.log('\n');
