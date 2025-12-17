#!/bin/bash

# Bash script to fix TypeScript compilation errors in matching-service
# Run this script from the Flamoral root directory

set -e  # Exit on error

echo "Applying TypeScript compilation fixes..."

# Fix 1: Install ioredis in shared package
echo ""
echo "[1/6] Adding ioredis dependency to shared package..."
cd backend/shared
npm install --save ioredis@^5.3.2
echo "  ✓ ioredis installed successfully"
npm run build
echo "  ✓ Shared package built successfully"
cd ../..

# Fix 2: Add premium property to UserProfile interface
echo ""
echo "[2/6] Fixing user-service.client.ts..."
perl -i -pe 's/(  date_of_birth: Date;)\n}/\1\n  premium?: boolean;\n}/' \
  backend/services/matching-service/src/infrastructure/clients/user-service.client.ts
echo "  ✓ Added premium property to UserProfile interface"

# Fix 3: Add notifySuperLike method to NotificationServiceClient
echo ""
echo "[3/6] Fixing notification-service.client.ts..."

# Update the type definition
perl -i -pe "s/type: 'new_match' \| 'new_message' \| 'new_like' \| 'subscription_update' \| 'payment_success' \| 'payment_failed' \| 'profile_boost_active' \| 'verification_complete' \| 'match_expiring' \| 'match_expired'/type: 'new_match' | 'new_message' | 'new_like' | 'subscription_update' | 'payment_success' | 'payment_failed' | 'profile_boost_active' | 'verification_complete' | 'match_expiring' | 'match_expired' | 'super_like_received'/" \
  backend/services/matching-service/src/infrastructure/clients/notification-service.client.ts

# Add the notifySuperLike method before notifyBothUsersOfMatch
perl -i -pe 'BEGIN{undef $/;} s#  /\*\*\n   \* Send bulk match notifications#  /**\n   * Send Super Like notification to a user\n   */\n  async notifySuperLike(data: {\n    userId: string;\n    superLikerId: string;\n    hasMessage: boolean;\n    messagePreview?: string;\n  }): Promise<void> {\n    await this.sendNotification({\n      userId: data.userId,\n      type: '\''super_like_received'\'',\n      title: '\''You received a Super Like!'\'',\n      body: data.hasMessage\n        ? `Someone sent you a Super Like with a message: "${data.messagePreview}"`\n        : '\''Someone sent you a Super Like!'\'',\n      data: {\n        superLikerId: data.superLikerId,\n        hasMessage: data.hasMessage,\n        action: '\''view_super_like'\'',\n      },\n      channel: '\''push'\'',\n    });\n  }\n\n  /**\n   * Send bulk match notifications#smg' \
  backend/services/matching-service/src/infrastructure/clients/notification-service.client.ts

echo "  ✓ Added notifySuperLike method to NotificationServiceClient"

# Fix 4: Add eventName to trackEvent calls in boost.service.ts
echo ""
echo "[4/6] Fixing boost.service.ts..."
perl -i -pe "s/eventType: 'boost_activated'/eventType: 'premium',\n        eventName: 'boost_activated'/g" \
  backend/services/matching-service/src/domain/services/boost.service.ts
perl -i -pe "s/eventType: 'boost_profile_view'/eventType: 'premium',\n        eventName: 'boost_profile_view'/g" \
  backend/services/matching-service/src/domain/services/boost.service.ts
perl -i -pe "s/eventType: 'boost_like_received'/eventType: 'premium',\n        eventName: 'boost_like_received'/g" \
  backend/services/matching-service/src/domain/services/boost.service.ts
perl -i -pe "s/eventType: 'boost_match'/eventType: 'premium',\n        eventName: 'boost_match'/g" \
  backend/services/matching-service/src/domain/services/boost.service.ts
perl -i -pe "s/eventType: 'boost_cancelled'/eventType: 'premium',\n        eventName: 'boost_cancelled'/g" \
  backend/services/matching-service/src/domain/services/boost.service.ts
echo "  ✓ Added eventName to 5 trackEvent calls in boost.service.ts"

# Fix 5: Add eventName to trackEvent call in super-like.service.ts
echo ""
echo "[5/6] Fixing super-like.service.ts..."
perl -i -pe "s/eventType: 'super_like_sent'/eventType: 'engagement',\n        eventName: 'super_like_sent'/g" \
  backend/services/matching-service/src/domain/services/super-like.service.ts
echo "  ✓ Added eventName to trackEvent call in super-like.service.ts"

# Fix 6: Build matching-service to verify fixes
echo ""
echo "[6/6] Building matching-service..."
cd backend/services/matching-service
npm run build
echo "  ✓ matching-service built successfully! All TypeScript errors fixed."
cd ../../..

echo ""
echo "========================================"
echo "Fixes application complete!"
echo "========================================"
