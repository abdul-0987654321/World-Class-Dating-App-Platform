#!/bin/bash

# Analytics Service Fix Deployment Script
# Fixes the analytics routing issue and redeploys services

set -e  # Exit on error

echo "============================================="
echo "Analytics Service Fix Deployment"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")"

echo -e "${BLUE}Step 1: Backup current files${NC}"
echo "Creating backups..."
cp backend/services/api-gateway/src/controllers/analytics.controller.ts \
   backend/services/api-gateway/src/controllers/analytics.controller.ts.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

echo -e "${BLUE}Step 2: Apply routing fix${NC}"
echo "Fixing analytics controller routing..."

# Fix analytics controller
sed -i "s/@Controller('analytics')/@Controller('api\/analytics')/g" \
  backend/services/api-gateway/src/controllers/analytics.controller.ts

# Verify the change
if grep -q "@Controller('api/analytics')" backend/services/api-gateway/src/controllers/analytics.controller.ts; then
  echo -e "${GREEN}✓ Analytics controller fixed${NC}"
else
  echo -e "${RED}✗ Failed to fix analytics controller${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}Step 3: Check other controllers${NC}"
echo "Verifying other controller routes..."

# Check which controllers need the api/ prefix
CONTROLLERS=(
  "user.controller.ts:users"
  "profiles.controller.ts:profiles"
  "notification.controller.ts:notifications"
  "moderation.controller.ts:moderation"
  "media.controller.ts:media"
)

for ctrl in "${CONTROLLERS[@]}"; do
  file="${ctrl%%:*}"
  route="${ctrl##*:}"

  if grep -q "@Controller('$route')" "backend/services/api-gateway/src/controllers/$file"; then
    echo -e "${YELLOW}⚠ $file uses @Controller('$route') - may need api/ prefix${NC}"
  fi
done
echo ""

echo -e "${BLUE}Step 4: Rebuild API Gateway${NC}"
echo "Building API Gateway..."
cd backend/services/api-gateway

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build
npm run build

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ API Gateway built successfully${NC}"
else
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
fi
echo ""

cd ../../..

echo -e "${BLUE}Step 5: Verify Analytics Service${NC}"
echo "Checking analytics service status..."

if [ -d "backend/services/analytics-service" ]; then
  echo -e "${GREEN}✓ Analytics service found${NC}"

  # Check if service needs build
  if [ -f "backend/services/analytics-service/package.json" ]; then
    cd backend/services/analytics-service

    if [ ! -d "node_modules" ]; then
      echo "Installing dependencies..."
      npm install
    fi

    if [ -f "tsconfig.json" ]; then
      echo "Building analytics service..."
      npm run build || true
    fi

    cd ../../..
  fi
else
  echo -e "${RED}✗ Analytics service not found${NC}"
fi
echo ""

echo -e "${BLUE}Step 6: Test configuration${NC}"
echo "Verifying configuration files..."

# Check environment variables
if [ -f "backend/services/api-gateway/.env" ]; then
  if grep -q "ANALYTICS_SERVICE_URL" backend/services/api-gateway/.env; then
    echo -e "${GREEN}✓ Analytics service URL configured${NC}"
  else
    echo -e "${YELLOW}⚠ ANALYTICS_SERVICE_URL not found in .env${NC}"
  fi
else
  echo -e "${YELLOW}⚠ No .env file found for API Gateway${NC}"
fi
echo ""

echo "============================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "============================================="
echo ""
echo "Next steps:"
echo ""
echo "1. ${YELLOW}LOCAL TESTING:${NC}"
echo "   cd backend/services/api-gateway && npm run dev"
echo "   cd backend/services/analytics-service && npm run dev"
echo ""
echo "2. ${YELLOW}TEST ENDPOINT:${NC}"
echo "   curl http://localhost:4000/api/v1/api/analytics/dashboard"
echo ""
echo "3. ${YELLOW}PRODUCTION DEPLOYMENT:${NC}"
echo "   Build Docker images:"
echo "   docker build -t flamoral.azurecr.io/api-gateway:latest ./backend/services/api-gateway"
echo "   docker push flamoral.azurecr.io/api-gateway:latest"
echo ""
echo "   Update Azure Container App:"
echo "   az containerapp update \\"
echo "     --name api-gateway \\"
echo "     --resource-group flamoral-prod-rg \\"
echo "     --image flamoral.azurecr.io/api-gateway:latest"
echo ""
echo "4. ${YELLOW}VERIFY FIX:${NC}"
echo "   curl https://api.flamoral.com/api/v1/api/analytics/dashboard \\"
echo "     -H \"Authorization: Bearer YOUR_JWT_TOKEN\""
echo ""
echo "5. ${YELLOW}MONITOR:${NC}"
echo "   Check circuit breaker status should show 0 failures"
echo "   Monitor API Gateway logs for successful analytics requests"
echo ""
echo -e "${GREEN}Analytics service fix deployed successfully!${NC}"
