/**
 * Script to fix moderation service port configuration
 * Run with: node apply-moderation-fix.js
 */

const fs = require('fs');
const path = require('path');

// File paths
const configPath = path.join(__dirname, 'src/config/configuration.ts');
const controllerPath = path.join(__dirname, 'src/controllers/moderation.controller.ts');

console.log('Starting moderation service fix...\n');

// Fix 1: Update configuration.ts
try {
  console.log('1. Fixing configuration.ts...');
  let configContent = fs.readFileSync(configPath, 'utf8');

  // Fix moderation service port
  const moderationBefore = configContent.match(/moderationService:.*'http:\/\/localhost:(\d+)'/);
  configContent = configContent.replace(
    /moderationService: process\.env\.MODERATION_SERVICE_URL \|\| 'http:\/\/localhost:3005'/,
    "moderationService: process.env.MODERATION_SERVICE_URL || 'http://localhost:3008'"
  );

  // Fix notification service port
  const notificationBefore = configContent.match(/notificationService:.*'http:\/\/localhost:(\d+)'/);
  configContent = configContent.replace(
    /notificationService: process\.env\.NOTIFICATION_SERVICE_URL \|\| 'http:\/\/localhost:3008'/,
    "notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3012'"
  );

  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log('   ✓ Updated moderation service port: 3005 → 3008');
  console.log('   ✓ Updated notification service port: 3008 → 3012\n');
} catch (error) {
  console.error('   ✗ Error fixing configuration.ts:', error.message);
  process.exit(1);
}

// Fix 2: Update moderation.controller.ts
try {
  console.log('2. Fixing moderation.controller.ts...');

  const newController = `import {
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
    return this.proxyService.get('moderationService', \`/api/moderation/user/\${userId}/status\`, {
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
    return this.proxyService.get('moderationService', \`/api/moderation/user/\${userId}/restricted\`, {
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

    const path = \`/api/moderation/user/\${userId}/violations\${queryString.toString() ? '?' + queryString.toString() : ''}\`;
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
`;

  // Backup original
  const backupPath = controllerPath + '.backup-' + Date.now();
  fs.copyFileSync(controllerPath, backupPath);
  console.log(`   ✓ Created backup: ${path.basename(backupPath)}`);

  // Write new controller
  fs.writeFileSync(controllerPath, newController, 'utf8');
  console.log('   ✓ Updated moderation controller with correct endpoints\n');
} catch (error) {
  console.error('   ✗ Error fixing moderation.controller.ts:', error.message);
  process.exit(1);
}

console.log('✅ Moderation service fixes applied successfully!\n');
console.log('Next steps:');
console.log('  1. Restart API Gateway: npm run start:dev');
console.log('  2. Ensure moderation service is running on port 3008');
console.log('  3. Test endpoints at http://localhost:4000/api/v1/moderation/*');
console.log('  4. Check circuit breaker status should show 0 failures\n');
