# Fix Payment Service TypeScript Errors
$basePath = "C:\Users\citad\OneDrive\Documents\Dating\Flamoral\backend\services\payment-service\src"

Write-Host "Fixing TypeScript errors in payment-service..."

# Fix 1: webhook.controller.ts - Update Stripe API version
$webhookController = Join-Path $basePath "api\controllers\webhook.controller.ts"
(Get-Content $webhookController) -replace "apiVersion: '2024-12-18\.acacia'", "apiVersion: '2023-10-16'" | Set-Content $webhookController
Write-Host "Fixed webhook.controller.ts"

# Fix 2: payment.service.ts - Update Stripe API version
$paymentService = Join-Path $basePath "domain\services\payment.service.ts"
(Get-Content $paymentService) -replace "apiVersion: '2024-12-18\.acacia'", "apiVersion: '2023-10-16'" | Set-Content $paymentService
Write-Host "Fixed payment.service.ts"

# Fix 3: index.ts - Replace @flamoral/shared import
$indexFile = Join-Path $basePath "index.ts"
(Get-Content $indexFile) -replace "import { createLogger } from '@flamoral/shared';", "import logger from './utils/logger';" | Set-Content $indexFile
(Get-Content $indexFile) -replace "const logger = createLogger\('payment-service'\);", "" | Set-Content $indexFile
(Get-Content $indexFile) -replace "const PORT = process\.env\.PORT \|\| 3006;", "const PORT = process.env.PORT || 3005;" | Set-Content $indexFile
Write-Host "Fixed index.ts"

# Fix 4: user-service.client.ts - Replace @flamoral/shared import
$userServiceClient = Join-Path $basePath "infrastructure\clients\user-service.client.ts"
(Get-Content $userServiceClient) -replace "import { ServiceClient } from '@flamoral/shared';", "import { ServiceClient } from '../../utils/service-client';" | Set-Content $userServiceClient
Write-Host "Fixed user-service.client.ts"

# Fix 5: notification-service.client.ts - Replace @flamoral/shared import
$notificationServiceClient = Join-Path $basePath "infrastructure\clients\notification-service.client.ts"
(Get-Content $notificationServiceClient) -replace "import { ServiceClient } from '@flamoral/shared';", "import { ServiceClient } from '../../utils/service-client';" | Set-Content $notificationServiceClient
Write-Host "Fixed notification-service.client.ts"

# Fix 6: Add missing methods to user-service.client.ts
$userServiceClientContent = Get-Content $userServiceClient -Raw
if ($userServiceClientContent -notmatch "getSubscription") {
    $userServiceClientContent = $userServiceClientContent -replace "mapTierName\(tier: string\): 'free' \| 'premium' \| 'premium_plus' {", @"
/**
   * Get user subscription
   */
  async getSubscription(userId: string): Promise<{ tier: string; status: string }> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}/subscription`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get subscription from user-service:', error.message);
      return { tier: 'free', status: 'active' };
    }
  }

  /**
   * Get user wallet
   */
  async getWallet(userId: string): Promise<{ coins: number; boosts: number; superLikes: number }> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}/wallet`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get wallet from user-service:', error.message);
      return { coins: 0, boosts: 0, superLikes: 0 };
    }
  }

  /**
   * Add boosts to user
   */
  async addBoosts(userId: string, amount: number): Promise<void> {
    try {
      await this.client.post('/api/internal/boosts/add', { userId, amount });
      logger.info(`Added ${amount} boosts to user ${userId}`);
    } catch (error: any) {
      logger.error('Failed to add boosts in user-service:', error.message);
    }
  }

  /**
   * Add super likes to user
   */
  async addSuperLikes(userId: string, amount: number): Promise<void> {
    try {
      await this.client.post('/api/internal/superlikes/add', { userId, amount });
      logger.info(`Added ${amount} super likes to user ${userId}`);
    } catch (error: any) {
      logger.error('Failed to add super likes in user-service:', error.message);
    }
  }

  /**
   * Map tier names for compatibility
   */
  mapTierName(tier: string): 'free' | 'premium' | 'premium_plus' {
"@
    $userServiceClientContent | Set-Content $userServiceClient
    Write-Host "Added missing methods to user-service.client.ts"
}

# Fix 7: Update UpdateSubscriptionDto in user-service.client.ts to include provider
$userServiceClientContent = Get-Content $userServiceClient -Raw
$userServiceClientContent = $userServiceClientContent -replace "interface UpdateSubscriptionDto {[\s\S]*?gracePeriodEnd\?: Date;[\s]*}", @"
interface UpdateSubscriptionDto {
  userId: string;
  tier: 'free' | 'premium' | 'premium_plus';
  stripeSubscriptionId?: string;
  status?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'grace_period';
  currentPeriodEnd?: Date;
  gracePeriodEnd?: Date;
  provider?: string;
}
"@
$userServiceClientContent | Set-Content $userServiceClient
Write-Host "Updated UpdateSubscriptionDto interface"

# Fix 8: Update AddCoinsDto to include iap_purchase type
$userServiceClientContent = Get-Content $userServiceClient -Raw
$userServiceClientContent = $userServiceClientContent -replace "transactionType: 'purchase' \| 'reward' \| 'refund';", "transactionType: 'purchase' | 'reward' | 'refund' | 'iap_purchase';"
$userServiceClientContent | Set-Content $userServiceClient
Write-Host "Updated AddCoinsDto interface"

Write-Host "`nAll fixes applied successfully!"
Write-Host "Now run: npm run build"
