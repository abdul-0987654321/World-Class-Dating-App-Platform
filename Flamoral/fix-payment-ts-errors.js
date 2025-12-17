const fs = require('fs');
const path = require('path');

const baseDir = 'C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/payment-service/src';

// Fix index.ts
const indexPath = path.join(baseDir, 'index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');
indexContent = indexContent.replace(
  "import { createLogger } from '@flamoral/shared';",
  "import logger from './utils/logger';"
);
indexContent = indexContent.replace(
  "const logger = createLogger('payment-service');",
  ""
);
indexContent = indexContent.replace(
  "const PORT = process.env.PORT || 3006;",
  "const PORT = process.env.PORT || 3005;"
);
fs.writeFileSync(indexPath, indexContent);
console.log('Fixed index.ts');

// Fix user-service.client.ts
const userServicePath = path.join(baseDir, 'infrastructure/clients/user-service.client.ts');
let userServiceContent = fs.readFileSync(userServicePath, 'utf8');
userServiceContent = userServiceContent.replace(
  "import { ServiceClient } from '@flamoral/shared';",
  "import { ServiceClient } from '../../utils/service-client';"
);
fs.writeFileSync(userServicePath, userServiceContent);
console.log('Fixed user-service.client.ts');

// Fix notification-service.client.ts
const notificationServicePath = path.join(baseDir, 'infrastructure/clients/notification-service.client.ts');
let notificationServiceContent = fs.readFileSync(notificationServicePath, 'utf8');
notificationServiceContent = notificationServiceContent.replace(
  "import { ServiceClient } from '@flamoral/shared';",
  "import { ServiceClient } from '../../utils/service-client';"
);
fs.writeFileSync(notificationServicePath, notificationServiceContent);
console.log('Fixed notification-service.client.ts');

// Fix webhook.controller.ts
const webhookControllerPath = path.join(baseDir, 'api/controllers/webhook.controller.ts');
let webhookContent = fs.readFileSync(webhookControllerPath, 'utf8');
webhookContent = webhookContent.replace(
  "apiVersion: '2024-12-18.acacia'",
  "apiVersion: '2025-02-24.acacia'"
);
fs.writeFileSync(webhookControllerPath, webhookContent);
console.log('Fixed webhook.controller.ts');

// Fix payment.service.ts
const paymentServicePath = path.join(baseDir, 'domain/services/payment.service.ts');
let paymentServiceContent = fs.readFileSync(paymentServicePath, 'utf8');
paymentServiceContent = paymentServiceContent.replace(
  "apiVersion: '2024-12-18.acacia'",
  "apiVersion: '2025-02-24.acacia'"
);
fs.writeFileSync(paymentServicePath, paymentServiceContent);
console.log('Fixed payment.service.ts');

console.log('All fixes applied successfully!');
