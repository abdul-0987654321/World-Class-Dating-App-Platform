# Moderation Service Fixes for flamoral.com

## Issues Identified

### 1. Port Configuration Mismatch
The API Gateway is configured to connect to the moderation service on port **3005**, but the moderation service runs on port **3008**.

**Files affected:**
- `backend/services/api-gateway/src/config/configuration.ts` (line 36)
- `backend/services/api-gateway/src/config/validation.ts` (line 22)

**Fix:**
```typescript
// In backend/services/api-gateway/src/config/configuration.ts line 36
moderationService: process.env.MODERATION_SERVICE_URL || 'http://localhost:3008',

// Also update notification service port from 3008 to 3012
notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3012',
```

### 2. Endpoint Route Mismatch
The API Gateway's moderation controller is calling endpoints that don't exist in the moderation service.

**Current (incorrect) API Gateway endpoints:**
- `/api/moderation/submit` - DOES NOT EXIST
- `/api/moderation/status/:contentId` - DOES NOT EXIST
- `/api/moderation/queue` - DOES NOT EXIST
- `/api/moderation/approve/:contentId` - DOES NOT EXIST
- `/api/moderation/reject/:contentId` - DOES NOT EXIST
- `/api/moderation/reports` - DOES NOT EXIST
- `/api/moderation/actions/ban` - DOES NOT EXIST
- `/api/moderation/actions/unban` - DOES NOT EXIST
- `/api/moderation/actions/warn` - DOES NOT EXIST
- `/api/moderation/users/:userId/history` - DOES NOT EXIST
- `/api/moderation/scan/text` - DOES NOT EXIST
- `/api/moderation/scan/image` - DOES NOT EXIST
- `/api/moderation/statistics` - DOES NOT EXIST

**Actual moderation service endpoints (from moderation.routes.ts):**
- `POST /api/moderation/image` - Moderate an image
- `POST /api/moderation/text` - Moderate text content
- `GET /api/moderation/user/:userId/status` - Get user moderation status
- `GET /api/moderation/user/:userId/restricted` - Check if user is banned/suspended
- `GET /api/moderation/user/:userId/violations` - Get user violation history
- `POST /api/moderation/admin/suspend` - Admin: Manually suspend a user
- `POST /api/moderation/admin/unsuspend` - Admin: Manually unsuspend a user
- `POST /api/moderation/admin/ban` - Admin: Permanently ban a user
- `POST /api/moderation/admin/unban` - Admin: Unban a user

**Internal API endpoints (from internal.routes.ts):**
- `POST /api/internal/moderation/moderate` - Moderate content (service-to-service)
- `GET /api/internal/moderation/status/:contentId` - Get moderation status
- `POST /api/internal/moderation/flag` - Flag content for review
- `POST /api/internal/moderation/moderate-bulk` - Bulk moderate content
- `GET /api/internal/moderation/users/:userId/history` - Get user moderation history
- `GET /api/internal/moderation/users/:userId/restrictions` - Check user restrictions

### 3. Circuit Breaker Showing 1 Failure
The circuit breaker is reporting 1 failure for the moderation service, likely due to the port mismatch causing connection failures.

## Required Fixes

### Fix 1: Update API Gateway Configuration
File: `backend/services/api-gateway/src/config/configuration.ts`

Change lines 36 and 39:
```typescript
moderationService: process.env.MODERATION_SERVICE_URL || 'http://localhost:3008',
// ...
notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3012',
```

### Fix 2: Update API Gateway Moderation Controller
File: `backend/services/api-gateway/src/controllers/moderation.controller.ts`

Replace the entire controller with endpoints that match the actual moderation service:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';

@ApiTags('moderation')
@ApiBearerAuth('JWT-auth')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Content Moderation Endpoints ====================

  /**
   * Moderate image content
   */
  @Post('image')
  @ApiOperation({ summary: 'Moderate image content' })
  @HttpCode(HttpStatus.OK)
  async moderateImage(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('moderationService', '/api/moderation/image', body, {
      Authorization: authorization,
    });
  }

  /**
   * Moderate text content
   */
  @Post('text')
  @ApiOperation({ summary: 'Moderate text content' })
  @HttpCode(HttpStatus.OK)
  async moderateText(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('moderationService', '/api/moderation/text', body, {
      Authorization: authorization,
    });
  }

  // ==================== User Moderation Status Endpoints ====================

  /**
   * Get user moderation status
   */
  @Get('user/:userId/status')
  @ApiOperation({ summary: 'Get user moderation status' })
  async getUserStatus(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
  ) {
    return this.proxyService.get('moderationService', `/api/moderation/user/${userId}/status`, {
      Authorization: authorization,
    });
  }

  /**
   * Check if user is restricted (banned/suspended)
   */
  @Get('user/:userId/restricted')
  @ApiOperation({ summary: 'Check if user is restricted' })
  async getUserRestricted(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
  ) {
    return this.proxyService.get('moderationService', `/api/moderation/user/${userId}/restricted`, {
      Authorization: authorization,
    });
  }

  /**
   * Get user violation history
   */
  @Get('user/:userId/violations')
  @ApiOperation({ summary: 'Get user violation history' })
  async getUserViolations(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);

    const path = `/api/moderation/user/${userId}/violations${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('moderationService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Admin Actions ====================

  /**
   * Admin: Suspend user
   */
  @Post('admin/suspend')
  @ApiOperation({ summary: 'Admin: Manually suspend a user' })
  @HttpCode(HttpStatus.OK)
  async adminSuspend(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('moderationService', '/api/moderation/admin/suspend', body, {
      Authorization: authorization,
    });
  }

  /**
   * Admin: Unsuspend user
   */
  @Post('admin/unsuspend')
  @ApiOperation({ summary: 'Admin: Manually unsuspend a user' })
  @HttpCode(HttpStatus.OK)
  async adminUnsuspend(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('moderationService', '/api/moderation/admin/unsuspend', body, {
      Authorization: authorization,
    });
  }

  /**
   * Admin: Ban user permanently
   */
  @Post('admin/ban')
  @ApiOperation({ summary: 'Admin: Permanently ban a user' })
  @HttpCode(HttpStatus.OK)
  async adminBan(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('moderationService', '/api/moderation/admin/ban', body, {
      Authorization: authorization,
    });
  }

  /**
   * Admin: Unban user
   */
  @Post('admin/unban')
  @ApiOperation({ summary: 'Admin: Unban a user' })
  @HttpCode(HttpStatus.OK)
  async adminUnban(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('moderationService', '/api/moderation/admin/unban', body, {
      Authorization: authorization,
    });
  }
}
```

### Fix 3: Environment Configuration
Ensure all `.env` files have the correct moderation service port:

```bash
MODERATION_SERVICE_URL=http://localhost:3008
```

## Testing After Fixes

1. Restart API Gateway: `cd backend/services/api-gateway && npm run start:dev`
2. Restart Moderation Service: `cd backend/services/moderation-service && npm start`
3. Test endpoints:
   ```bash
   # Test image moderation
   curl -X POST http://localhost:4000/api/v1/moderation/image \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"contentId": "test-123", "imageUrl": "https://example.com/image.jpg", "userId": "user-123"}'

   # Test text moderation
   curl -X POST http://localhost:4000/api/v1/moderation/text \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"contentId": "test-456", "text": "Test message", "userId": "user-123"}'

   # Test user status
   curl http://localhost:4000/api/v1/moderation/user/user-123/status \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. Verify circuit breaker resets to healthy state after successful requests

## Additional Recommendations

1. **Add integration tests** for moderation endpoints to catch route mismatches early
2. **Update API documentation** (Swagger/OpenAPI) to reflect correct endpoints
3. **Add health check** for moderation service in API Gateway
4. **Configure monitoring** for moderation service errors and circuit breaker status
5. **Review all service port allocations** to ensure consistency across the codebase

## Configuration Standards Going Forward

**Port Allocations:**
- API Gateway: 4000
- Auth Service: 3001
- User Service: 3002
- Messaging Service: 3003
- Media Service: 3004
- Moderation Service: 3008
- Payment Service: 3006
- Analytics Service: 3007
- Matching Service: 3009
- Advertising Service: 3010
- Notification Service: 3012
- AI Service: 8000

**Important:** Stick to these port allocations to avoid conflicts. Update all `.env`, `.env.example`, and configuration files to match.
