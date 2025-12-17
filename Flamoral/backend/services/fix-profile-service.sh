#!/bin/bash

# Profile Service Fix Script for Flamoral.com
# This script applies the fixes for profile service 404 errors and circuit breaker issues

set -e

echo "========================================="
echo "Profile Service Fix - Flamoral.com"
echo "========================================="
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
API_GATEWAY_DIR="$SCRIPT_DIR/api-gateway"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Backing up files...${NC}"
mkdir -p "$SCRIPT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$SCRIPT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

cp "$API_GATEWAY_DIR/src/controllers/controllers.module.ts" "$BACKUP_DIR/controllers.module.ts.bak"
cp "$API_GATEWAY_DIR/src/controllers/user.controller.ts" "$BACKUP_DIR/user.controller.ts.bak"
cp "$API_GATEWAY_DIR/src/controllers/profiles.controller.ts" "$BACKUP_DIR/profiles.controller.ts.bak"

echo -e "${GREEN}✓ Backup completed: $BACKUP_DIR${NC}"
echo ""

echo -e "${YELLOW}Step 2: Fixing controllers.module.ts...${NC}"

# Fix controllers.module.ts - Add ProfilesController import
sed -i "/import { UserController } from '\.\/user\.controller';/a import { ProfilesController } from './profiles.controller';" \
  "$API_GATEWAY_DIR/src/controllers/controllers.module.ts"

# Fix controllers.module.ts - Add ProfilesController to controllers array
sed -i "/UserController,/a \    ProfilesController," \
  "$API_GATEWAY_DIR/src/controllers/controllers.module.ts"

echo -e "${GREEN}✓ controllers.module.ts updated${NC}"
echo ""

echo -e "${YELLOW}Step 3: Adding /profile endpoints to user.controller.ts...${NC}"

# Create temporary file with new endpoints
cat > /tmp/profile_endpoints.txt << 'EOF'

  /**
   * Get current user profile (alias endpoint)
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getUserProfile(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/profile', {
      Authorization: authorization,
    });
  }

  /**
   * Update current user profile (alias endpoint)
   */
  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateUserProfile(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('userService', '/api/profile', body, {
      Authorization: authorization,
    });
  }

EOF

# Insert after line 28 (after "// ==================== User Profile Endpoints ====================")
sed -i '28r /tmp/profile_endpoints.txt' "$API_GATEWAY_DIR/src/controllers/user.controller.ts"

echo -e "${GREEN}✓ user.controller.ts updated${NC}"
echo ""

echo -e "${YELLOW}Step 4: Fixing profiles.controller.ts routing...${NC}"

# Fix profiles controller to use correct path
sed -i "s|const path = \`/api/users|const path = \`/api/profile|g" \
  "$API_GATEWAY_DIR/src/controllers/profiles.controller.ts"

echo -e "${GREEN}✓ profiles.controller.ts updated${NC}"
echo ""

echo -e "${YELLOW}Step 5: Rebuilding API Gateway...${NC}"
cd "$API_GATEWAY_DIR"

if npm run build; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed. Rolling back...${NC}"
    cp "$BACKUP_DIR/controllers.module.ts.bak" "$API_GATEWAY_DIR/src/controllers/controllers.module.ts"
    cp "$BACKUP_DIR/user.controller.ts.bak" "$API_GATEWAY_DIR/src/controllers/user.controller.ts"
    cp "$BACKUP_DIR/profiles.controller.ts.bak" "$API_GATEWAY_DIR/src/controllers/profiles.controller.ts"
    echo -e "${RED}Rollback completed. Please check the errors and try again.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================="
echo "Profile Service Fix Completed!"
echo "=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Restart API Gateway: pm2 restart api-gateway"
echo "2. Wait 15 seconds for circuit breaker to recover"
echo "3. Test endpoints:"
echo "   - GET /api/v1/api/profiles"
echo "   - GET /api/v1/api/users/profile"
echo ""
echo "To reset circuit breaker immediately:"
echo "curl -X POST http://localhost:4000/api/v1/admin/circuit-breaker/profileService/reset"
echo ""
echo -e "${YELLOW}Backups saved to: $BACKUP_DIR${NC}"
echo ""
