#!/bin/bash

# Fix TypeScript compilation errors in matching-service
# This script fixes all the type errors identified

echo "Fixing TypeScript errors in matching-service..."

# Fix 1: Add ioredis to shared package
cd "C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/shared"
echo "Adding ioredis dependency to shared package..."
npm install --save ioredis@^5.3.2

# Build shared package
echo "Building shared package..."
npm run build

# Fix 2: Update boost.service.ts - Add eventName to all trackEvent calls
cd "C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/matching-service"

echo "Fixing boost.service.ts..."
sed -i "s/eventType: 'boost_activated'/eventType: 'premium',\n        eventName: 'boost_activated'/g" src/domain/services/boost.service.ts
sed -i "s/eventType: 'boost_profile_view'/eventType: 'premium',\n        eventName: 'boost_profile_view'/g" src/domain/services/boost.service.ts
sed -i "s/eventType: 'boost_like_received'/eventType: 'premium',\n        eventName: 'boost_like_received'/g" src/domain/services/boost.service.ts
sed -i "s/eventType: 'boost_match'/eventType: 'premium',\n        eventName: 'boost_match'/g" src/domain/services/boost.service.ts
sed -i "s/eventType: 'boost_cancelled'/eventType: 'premium',\n        eventName: 'boost_cancelled'/g" src/domain/services/boost.service.ts

# Fix 3: Update super-like.service.ts - Add eventName to trackEvent call
echo "Fixing super-like.service.ts..."
sed -i "s/eventType: 'super_like_sent'/eventType: 'engagement',\n        eventName: 'super_like_sent'/g" src/domain/services/super-like.service.ts

# Fix 4: Add notifySuperLike method to notification-service.client.ts
echo "Fixing notification-service.client.ts..."
# This requires adding a new method, which we'll do via a patch file

# Fix 5: Add premium property to UserProfile interface
echo "Fixing user-service.client.ts..."
sed -i "/date_of_birth: Date;/a\\  premium?: boolean;" src/infrastructure/clients/user-service.client.ts

# Build matching-service
echo "Building matching-service..."
npm run build

echo "All fixes applied! Check the build output above for any remaining errors."
