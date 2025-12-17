#!/bin/bash

# OAuth Quick Fix Script for Flamoral
# This script applies the critical code changes needed to enable OAuth

set -e

echo "=========================================="
echo "OAuth Quick Fix Script"
echo "=========================================="
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Working directory: $SCRIPT_DIR"
echo ""

# Fix 1: Mount OAuth routes in auth-service
echo "Fix 1: Mounting OAuth routes in auth-service..."
AUTH_ROUTES_FILE="backend/services/auth-service/src/api/routes/index.ts"

if [ -f "$AUTH_ROUTES_FILE" ]; then
    # Create backup
    cp "$AUTH_ROUTES_FILE" "${AUTH_ROUTES_FILE}.backup"

    # Apply fix
    cat > "$AUTH_ROUTES_FILE" << 'EOF'
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

    echo "✓ OAuth routes mounted in auth-service"
else
    echo "✗ File not found: $AUTH_ROUTES_FILE"
    exit 1
fi

# Fix 2: Register OAuth controller in API Gateway
echo "Fix 2: Registering OAuth controller in API Gateway..."
CONTROLLERS_MODULE_FILE="backend/services/api-gateway/src/controllers/controllers.module.ts"

if [ -f "$CONTROLLERS_MODULE_FILE" ]; then
    # Create backup
    cp "$CONTROLLERS_MODULE_FILE" "${CONTROLLERS_MODULE_FILE}.backup"

    # Apply fix
    cat > "$CONTROLLERS_MODULE_FILE" << 'EOF'
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
import { SafetyController } from './safety.controller';

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
    SafetyController,
  ],
})
export class ControllersModule {}
EOF

    echo "✓ OAuth controller registered in API Gateway"
else
    echo "✗ File not found: $CONTROLLERS_MODULE_FILE"
    exit 1
fi

# Fix 3: Add OAuth environment variables to .env
echo "Fix 3: Adding OAuth environment variables..."
AUTH_ENV_FILE="backend/services/auth-service/.env"

if [ -f "$AUTH_ENV_FILE" ]; then
    # Check if OAuth config already exists
    if ! grep -q "GOOGLE_CLIENT_ID" "$AUTH_ENV_FILE"; then
        # Create backup
        cp "$AUTH_ENV_FILE" "${AUTH_ENV_FILE}.backup"

        # Add OAuth config
        cat >> "$AUTH_ENV_FILE" << 'EOF'

# OAuth Configuration
# Google OAuth (Get from https://console.cloud.google.com/)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth (Get from https://developers.facebook.com/)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Apple OAuth (Get from https://developer.apple.com/)
APPLE_CLIENT_ID=com.flamoral.app
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
EOF

        echo "✓ OAuth environment variables added to .env"
    else
        echo "✓ OAuth environment variables already exist in .env"
    fi
else
    echo "✗ File not found: $AUTH_ENV_FILE"
    exit 1
fi

# Fix 4: Add OAuth environment variables to .env.example
echo "Fix 4: Adding OAuth environment variables to .env.example..."
AUTH_ENV_EXAMPLE_FILE="backend/services/auth-service/.env.example"

if [ -f "$AUTH_ENV_EXAMPLE_FILE" ]; then
    # Check if OAuth config already exists
    if ! grep -q "GOOGLE_CLIENT_ID" "$AUTH_ENV_EXAMPLE_FILE"; then
        # Create backup
        cp "$AUTH_ENV_EXAMPLE_FILE" "${AUTH_ENV_EXAMPLE_FILE}.backup"

        # Add OAuth config
        cat >> "$AUTH_ENV_EXAMPLE_FILE" << 'EOF'

# OAuth Configuration
# Google OAuth (Get from https://console.cloud.google.com/)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth (Get from https://developers.facebook.com/)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Apple OAuth (Get from https://developer.apple.com/)
APPLE_CLIENT_ID=com.flamoral.app
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
EOF

        echo "✓ OAuth environment variables added to .env.example"
    else
        echo "✓ OAuth environment variables already exist in .env.example"
    fi
else
    echo "✗ File not found: $AUTH_ENV_EXAMPLE_FILE"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ All fixes applied successfully!"
echo "=========================================="
echo ""
echo "Backup files created:"
echo "  - ${AUTH_ROUTES_FILE}.backup"
echo "  - ${CONTROLLERS_MODULE_FILE}.backup"
echo "  - ${AUTH_ENV_FILE}.backup"
echo "  - ${AUTH_ENV_EXAMPLE_FILE}.backup"
echo ""
echo "Next steps:"
echo "  1. Update OAuth credentials in backend/services/auth-service/.env"
echo "  2. Configure OAuth providers (Google, Facebook, Apple)"
echo "  3. Rebuild and deploy services"
echo "  4. Test OAuth endpoints"
echo ""
echo "For detailed instructions, see: OAUTH_FIX_DEPLOYMENT_GUIDE.md"
echo ""
