#!/bin/bash

# Fix API Gateway Route Path Issues
# This script fixes the double /api/ prefix issue in controller decorators
# Routes are: /api/v1/{controller-path} due to global prefix in main.ts
# Controllers should NOT have 'api/' in their @Controller() decorator

echo "Fixing API Gateway route path issues..."

API_GATEWAY_CONTROLLERS="C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/api-gateway/src/controllers"

# Fix auth.controller.ts - Change @Controller('api/auth') to @Controller('auth')
if [ -f "$API_GATEWAY_CONTROLLERS/auth.controller.ts" ]; then
  echo "Fixing auth.controller.ts..."
  sed -i "s/@Controller('api\/auth')/@Controller('auth')/g" "$API_GATEWAY_CONTROLLERS/auth.controller.ts"
  # Also change POST to GET for verify-email endpoint
  sed -i 's/@Post('\''verify-email'\'')/@Get('\''verify-email'\'')/g' "$API_GATEWAY_CONTROLLERS/auth.controller.ts"
fi

# Fix auth.controller.secure.ts - Change @Controller('api/auth') to @Controller('auth')
if [ -f "$API_GATEWAY_CONTROLLERS/auth.controller.secure.ts" ]; then
  echo "Fixing auth.controller.secure.ts..."
  sed -i "s/@Controller('api\/auth')/@Controller('auth')/g" "$API_GATEWAY_CONTROLLERS/auth.controller.secure.ts"
  # Also change POST to GET for verify-email endpoint
  sed -i 's/@Post('\''verify-email'\'')/@Get('\''verify-email'\'')/g' "$API_GATEWAY_CONTROLLERS/auth.controller.secure.ts"
fi

# Fix safety.controller.ts - Change @Controller('api/safety') to @Controller('safety')
if [ -f "$API_GATEWAY_CONTROLLERS/safety.controller.ts" ]; then
  echo "Fixing safety.controller.ts..."
  sed -i "s/@Controller('api\/safety')/@Controller('safety')/g" "$API_GATEWAY_CONTROLLERS/safety.controller.ts"
fi

# Update controllers.module.ts to include new controllers
echo "Updating controllers.module.ts..."
cat > "$API_GATEWAY_CONTROLLERS/controllers.module.ts" << 'EOF'
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { MatchingController } from './matching.controller';
import { MessagingController } from './messaging.controller';
import { PaymentController } from './payment.controller';
import { MediaController } from './media.controller';
import { NotificationController } from './notification.controller';
import { ModerationController } from './moderation.controller';
import { AnalyticsController } from './analytics.controller';
import { CsrfController } from './csrf.controller';
import { SafetyController } from './safety.controller';
import { ProfilesController } from './profiles.controller';
import { AdminController } from './admin.controller';
import { AdvertisingController } from './advertising.controller';
import { AIController } from './ai.controller';

@Module({
  controllers: [
    AuthController,
    UserController,
    MatchingController,
    MessagingController,
    PaymentController,
    MediaController,
    NotificationController,
    ModerationController,
    AnalyticsController,
    CsrfController,
    SafetyController,
    ProfilesController,
    AdminController,
    AdvertisingController,
    AIController,
  ],
})
export class ControllersModule {}
EOF

echo ""
echo "Route path fixes completed!"
echo ""
echo "Summary of changes:"
echo "  - Fixed @Controller('api/auth') -> @Controller('auth') in auth controllers"
echo "  - Fixed @Controller('api/safety') -> @Controller('safety') in safety controller"
echo "  - Changed verify-email from POST to GET endpoint"
echo "  - Added ProfilesController for /api/v1/profiles routes"
echo "  - Added AdminController for /api/v1/admin/* routes"
echo "  - Added AdvertisingController for /api/v1/advertising routes"
echo "  - Added AIController for /api/v1/ai routes"
echo ""
echo "Routes will now be accessible at:"
echo "  - /api/v1/auth/* (was /api/v1/api/auth/*)"
echo "  - /api/v1/safety/* (was /api/v1/api/safety/*)"
echo "  - /api/v1/profiles"
echo "  - /api/v1/messages (via MessagingController)"
echo "  - /api/v1/media"
echo "  - /api/v1/payments (via PaymentController subscriptions)"
echo "  - /api/v1/analytics"
echo "  - /api/v1/admin/users"
echo "  - /api/v1/moderation"
echo "  - /api/v1/advertising"
echo "  - /api/v1/ai"
echo "  - /api/v1/subscriptions (via PaymentController)"
echo "  - /api/v1/matching/suggestions (via MatchingController discovery)"
echo ""
echo "Please rebuild the API Gateway service:"
echo "  cd backend/services/api-gateway"
echo "  npm run build"
echo "  npm run start:dev"
