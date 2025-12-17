#!/bin/bash
# Quick Fix Script for OAuth Routes
# This script completes the manual file edits required for OAuth implementation

echo "OAuth Quick Fix Script"
echo "====================="

# Define file paths
AUTH_ROUTES_INDEX="auth-service/src/api/routes/index.ts"
API_CONTROLLERS_MODULE="api-gateway/src/controllers/controllers.module.ts"

# Backup files
echo "Creating backups..."
cp "$AUTH_ROUTES_INDEX" "${AUTH_ROUTES_INDEX}.backup"
cp "$API_CONTROLLERS_MODULE" "${API_CONTROLLERS_MODULE}.backup"

# Fix 1: Update auth-service routes index
echo "Fixing auth-service routes..."
cat > "$AUTH_ROUTES_INDEX" << 'EOF'
import { Router } from 'express';
import authRoutes from './auth.routes';
import oauthRoutes from './oauth.routes';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount OAuth routes
router.use('/auth/oauth', oauthRoutes);

export default router;
EOF

echo "✓ Updated $AUTH_ROUTES_INDEX"

# Fix 2: Update api-gateway controllers module
echo "Fixing api-gateway controllers..."
cat > "$API_CONTROLLERS_MODULE" << 'EOF'
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OAuthController } from './oauth.controller';
import { UserController } from './user.controller';
import { MatchingController } from './matching.controller';
import { MessagingController } from './messaging.controller';
import { PaymentController } from './payment.controller';
import { MediaController } from './media.controller';
import { NotificationController } from './notification.controller';
import { ModerationController } from './moderation.controller';
import { AnalyticsController } from './analytics.controller';
import { CsrfController } from './csrf.controller';

@Module({
  controllers: [
    AuthController,
    OAuthController,
    UserController,
    MatchingController,
    MessagingController,
    PaymentController,
    MediaController,
    NotificationController,
    ModerationController,
    AnalyticsController,
    CsrfController,
  ],
})
export class ControllersModule {}
EOF

echo "✓ Updated $API_CONTROLLERS_MODULE"

echo ""
echo "✓ All fixes applied successfully!"
echo ""
echo "Next steps:"
echo "1. Build auth-service: cd auth-service && npm run build"
echo "2. Build api-gateway: cd api-gateway && npm run build"
echo "3. Test locally or deploy to Kubernetes"
echo ""
echo "Backup files created:"
echo "  - ${AUTH_ROUTES_INDEX}.backup"
echo "  - ${API_CONTROLLERS_MODULE}.backup"
