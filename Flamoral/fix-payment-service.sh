#!/bin/bash

cd "C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/payment-service"

# Fix index.ts
sed -i "s/import { createLogger } from '@flamoral\/shared';/import logger from '.\/utils\/logger';/g" src/index.ts
sed -i "s/const logger = createLogger('payment-service');//g" src/index.ts
sed -i "s/const PORT = process.env.PORT || 3006;/const PORT = process.env.PORT || 3005;/g" src/index.ts

# Fix user-service.client.ts
sed -i "s/import { ServiceClient } from '@flamoral\/shared';/import { ServiceClient } from '..\/..\/utils\/service-client';/g" src/infrastructure/clients/user-service.client.ts

# Fix notification-service.client.ts
sed -i "s/import { ServiceClient } from '@flamoral\/shared';/import { ServiceClient } from '..\/..\/utils\/service-client';/g" src/infrastructure/clients/notification-service.client.ts

# Fix Stripe API version in webhook.controller.ts
sed -i "s/apiVersion: '2024-12-18.acacia'/apiVersion: '2025-02-24.acacia'/g" src/api/controllers/webhook.controller.ts

# Fix Stripe API version in payment.service.ts
sed -i "s/apiVersion: '2024-12-18.acacia'/apiVersion: '2025-02-24.acacia'/g" src/domain/services/payment.service.ts

echo "Fixed all import and version issues"
