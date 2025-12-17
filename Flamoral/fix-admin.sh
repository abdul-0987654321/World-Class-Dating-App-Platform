#!/bin/bash

echo "🔧 Fixing Admin Dashboard Issues..."
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Fix 1: Add AdminController to controllers.module.ts
echo "📝 Fix 1: Adding AdminController to controllers.module.ts"
CONTROLLERS_MODULE="backend/services/api-gateway/src/controllers/controllers.module.ts"

# Check if AdminController import exists
if ! grep -q "import { AdminController }" "$CONTROLLERS_MODULE"; then
    # Add import after SafetyController import
    sed -i "/import { SafetyController } from '.\/safety.controller';/a import { AdminController } from './admin.controller';" "$CONTROLLERS_MODULE"
    echo "✅ Added AdminController import"
else
    echo "✅ AdminController import already exists"
fi

# Check if AdminController is in controllers array
if ! grep -q "AdminController," "$CONTROLLERS_MODULE"; then
    # Add to controllers array before closing bracket
    sed -i "s/    SafetyController,/    SafetyController,\n    AdminController,/" "$CONTROLLERS_MODULE"
    echo "✅ Added AdminController to controllers array"
else
    echo "✅ AdminController already in controllers array"
fi

echo ""

# Fix 2: Add adminService to configuration.ts
echo "📝 Fix 2: Adding adminService to configuration.ts"
CONFIG_FILE="backend/services/api-gateway/src/config/configuration.ts"

if ! grep -q "adminService:" "$CONFIG_FILE"; then
    # Add adminService after advertisingService
    sed -i "s/advertisingService: process.env.ADVERTISING_SERVICE_URL || 'http:\/\/localhost:3010',/advertisingService: process.env.ADVERTISING_SERVICE_URL || 'http:\/\/localhost:3011',\n    adminService: process.env.ADMIN_SERVICE_URL || 'http:\/\/localhost:3010',/" "$CONFIG_FILE"
    echo "✅ Added adminService to configuration"
else
    echo "✅ adminService already in configuration"
fi

echo ""

# Fix 3: Fix admin controller paths to remove double /api
echo "📝 Fix 3: Fixing admin controller API paths"
ADMIN_CONTROLLER="backend/services/api-gateway/src/controllers/admin.controller.ts"

# Replace /api/admin/ with just /
sed -i "s/\/api\/admin\//\//g" "$ADMIN_CONTROLLER"
echo "✅ Fixed admin controller API paths"

echo ""

# Fix 4: Verify .env configuration
echo "📝 Fix 4: Checking .env configuration"
ENV_FILE="backend/services/api-gateway/.env"

if grep -q "ADMIN_SERVICE_URL=http://localhost:3010" "$ENV_FILE"; then
    echo "✅ ADMIN_SERVICE_URL already configured correctly"
elif grep -q "ADMIN_SERVICE_URL=" "$ENV_FILE"; then
    sed -i "s/ADMIN_SERVICE_URL=.*/ADMIN_SERVICE_URL=http:\/\/localhost:3010/" "$ENV_FILE"
    echo "✅ Updated ADMIN_SERVICE_URL in .env"
else
    echo "ADMIN_SERVICE_URL=http://localhost:3010" >> "$ENV_FILE"
    echo "✅ Added ADMIN_SERVICE_URL to .env"
fi

echo ""
echo "🎉 Admin Dashboard fixes complete!"
echo ""
echo "Next steps:"
echo "1. Restart the API Gateway service"
echo "2. Ensure Admin Service is running on port 3010"
echo "3. Test the endpoints:"
echo "   - GET /api/v1/api/admin/users"
echo "   - GET /api/v1/api/admin/dashboard"
echo ""
echo "Note: Due to the global prefix /api/v1, admin routes will be:"
echo "  /api/v1/api/admin/*"
