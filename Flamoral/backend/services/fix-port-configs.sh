#!/bin/bash

# Script to fix backend service port configuration mismatches
# Run this from: backend/services/

echo "Fixing backend service port configurations..."

# Fix 1: API Gateway configuration.ts
echo "1. Fixing API Gateway configuration.ts..."
cd api-gateway/src/config
if [ -f "configuration.ts.new" ]; then
  cp configuration.ts configuration.ts.backup
  mv configuration.ts.new configuration.ts
  echo "   ✓ API Gateway configuration.ts updated"
else
  echo "   ⚠️  configuration.ts.new not found - skipping"
fi
cd ../../..

# Fix 2: Media Service config
echo "2. Fixing Media Service port (3004 → 3006)..."
sed -i "s/parseInt(process.env.PORT || '3004', 10)/parseInt(process.env.PORT || '3006', 10)/g" media-service/src/config/index.ts
echo "   ✓ Media Service config updated"

# Fix 3: Notification Service config
echo "3. Fixing Notification Service port (3008 → 3012)..."
sed -i "s/port: process.env.PORT || 3008/port: process.env.PORT || 3012/g" notification-service/src/config/index.ts
echo "   ✓ Notification Service config updated"

# Fix 4: Advertising Service
echo "4. Fixing Advertising Service port (3010 → 3011)..."
sed -i "s/const PORT = process.env.PORT || 3010/const PORT = process.env.PORT || 3011/g" advertising-service/src/index.ts
echo "   ✓ Advertising Service config updated"

# Fix 5: Payment Service (verify and fix if needed)
echo "5. Checking Payment Service port..."
if grep -q "const PORT = process.env.PORT || 3006" payment-service/src/index.ts; then
  echo "   ⚠️  Payment Service has wrong port (3006), fixing to 3005..."
  sed -i "s/const PORT = process.env.PORT || 3006/const PORT = process.env.PORT || 3005/g" payment-service/src/index.ts
  echo "   ✓ Payment Service config updated"
else
  echo "   ✓ Payment Service port is already correct"
fi

echo ""
echo "✓ All port configurations fixed!"
echo ""
echo "Next steps:"
echo "1. Restart all services"
echo "2. Verify with: curl http://localhost:[PORT]/health for each service"
echo "3. Check API Gateway circuit breaker status"
echo ""
echo "Port Mapping:"
echo "  Auth: 3001, User: 3002, Messaging: 3004, Payment: 3005"
echo "  Media: 3006, Analytics: 3007, Moderation: 3008, Matching: 3009"
echo "  Admin: 3010, Advertising: 3011, Notification: 3012"
echo "  API Gateway: 4000, AI: 8000, Realtime: 8081"
