#!/bin/bash
set -e

echo "====================================="
echo "Flamoral Backend Service Fixes"
echo "====================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SERVICES_DIR="backend/services"

echo -e "${BLUE}Step 1: Fixing shared package exports...${NC}"

# Update shared package index.ts to include logger
cat > "${SERVICES_DIR}/shared/index.ts" << 'EOF'
// Flamoral Shared Package - Entry Point
// Export all shared utilities, middleware, and clients

// Clients
export * from './clients/service-client';

// Middleware
export * from './middleware/error-handler.middleware';
export * from './middleware/health-check.middleware';
export * from './middleware/service-auth.middleware';

// Utils
export * from './utils/logger';
EOF

echo -e "${GREEN}✓ Updated shared/index.ts${NC}"

# Build shared package
echo -e "${BLUE}Step 2: Building shared package...${NC}"
cd "${SERVICES_DIR}/shared"
npm install
npm run build
echo -e "${GREEN}✓ Shared package built${NC}"
cd ../../..

# List of services to check/build
SERVICES=(
  "auth-service"
  "user-service"
  "api-gateway"
  "matching-service"
  "messaging-service"
  "payment-service"
  "media-service"
  "notification-service"
  "analytics-service"
  "moderation-service"
  "automation-service"
)

echo -e "${BLUE}Step 3: Installing dependencies for all services...${NC}"
for service in "${SERVICES[@]}"; do
  if [ -d "${SERVICES_DIR}/${service}" ]; then
    echo -e "${BLUE}Installing ${service}...${NC}"
    cd "${SERVICES_DIR}/${service}"
    npm install
    echo -e "${GREEN}✓ ${service} dependencies installed${NC}"
    cd ../../..
  fi
done

echo -e "${BLUE}Step 4: Building all services...${NC}"
for service in "${SERVICES[@]}"; do
  if [ -d "${SERVICES_DIR}/${service}" ] && [ -f "${SERVICES_DIR}/${service}/package.json" ]; then
    echo -e "${BLUE}Building ${service}...${NC}"
    cd "${SERVICES_DIR}/${service}"

    # Check if build script exists
    if grep -q '"build"' package.json; then
      npm run build && echo -e "${GREEN}✓ ${service} built successfully${NC}" || echo -e "${RED}✗ ${service} build failed${NC}"
    else
      echo -e "${BLUE}⊘ ${service} has no build script${NC}"
    fi
    cd ../../..
  fi
done

echo ""
echo -e "${GREEN}====================================="
echo "Backend Fixes Complete!"
echo "=====================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review build output above for any errors"
echo "2. Test services individually: cd backend/services/auth-service && npm run dev"
echo "3. Check health endpoints: curl http://localhost:3001/health"
echo "4. Deploy to staging/production"
echo ""
