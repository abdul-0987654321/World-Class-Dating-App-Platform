# PowerShell script to fix TypeScript compilation errors in matching-service
# Run this script from the Flamoral root directory

Write-Host "Applying TypeScript compilation fixes..." -ForegroundColor Green

# Fix 1: Install ioredis in shared package
Write-Host "`n[1/6] Adding ioredis dependency to shared package..." -ForegroundColor Yellow
Set-Location "backend/shared"
npm install --save ioredis@^5.3.2
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ ioredis installed successfully" -ForegroundColor Green
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Shared package built successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Shared package build failed" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ Failed to install ioredis" -ForegroundColor Red
}
Set-Location "../.."

# Fix 2: Add premium property to UserProfile interface
Write-Host "`n[2/6] Fixing user-service.client.ts..." -ForegroundColor Yellow
$userServicePath = "backend/services/matching-service/src/infrastructure/clients/user-service.client.ts"
$userServiceContent = Get-Content $userServicePath -Raw
$userServiceContent = $userServiceContent -replace "  date_of_birth: Date;`n}", "  date_of_birth: Date;`n  premium?: boolean;`n}"
Set-Content $userServicePath $userServiceContent -NoNewline
Write-Host "  ✓ Added premium property to UserProfile interface" -ForegroundColor Green

# Fix 3: Add notifySuperLike method to NotificationServiceClient
Write-Host "`n[3/6] Fixing notification-service.client.ts..." -ForegroundColor Yellow
$notificationServicePath = "backend/services/matching-service/src/infrastructure/clients/notification-service.client.ts"
$notificationServiceContent = Get-Content $notificationServicePath -Raw

# Update the type definition
$notificationServiceContent = $notificationServiceContent -replace "type: 'new_match' \| 'new_message' \| 'new_like' \| 'subscription_update' \| 'payment_success' \| 'payment_failed' \| 'profile_boost_active' \| 'verification_complete' \| 'match_expiring' \| 'match_expired'", "type: 'new_match' | 'new_message' | 'new_like' | 'subscription_update' | 'payment_success' | 'payment_failed' | 'profile_boost_active' | 'verification_complete' | 'match_expiring' | 'match_expired' | 'super_like_received'"

# Add the notifySuperLike method
$notifySuperLikeMethod = @"

  /**
   * Send Super Like notification to a user
   */
  async notifySuperLike(data: {
    userId: string;
    superLikerId: string;
    hasMessage: boolean;
    messagePreview?: string;
  }): Promise<void> {
    await this.sendNotification({
      userId: data.userId,
      type: 'super_like_received',
      title: 'You received a Super Like!',
      body: data.hasMessage
        ? ``Someone sent you a Super Like with a message: "$${data.messagePreview}"``
        : 'Someone sent you a Super Like!',
      data: {
        superLikerId: data.superLikerId,
        hasMessage: data.hasMessage,
        action: 'view_super_like',
      },
      channel: 'push',
    });
  }
"@

$notificationServiceContent = $notificationServiceContent -replace "  /\*\*`n   \* Send bulk match notifications", "$notifySuperLikeMethod`n`n  /**`n   * Send bulk match notifications"
Set-Content $notificationServicePath $notificationServiceContent -NoNewline
Write-Host "  ✓ Added notifySuperLike method to NotificationServiceClient" -ForegroundColor Green

# Fix 4: Add eventName to trackEvent calls in boost.service.ts
Write-Host "`n[4/6] Fixing boost.service.ts..." -ForegroundColor Yellow
$boostServicePath = "backend/services/matching-service/src/domain/services/boost.service.ts"
$boostServiceContent = Get-Content $boostServicePath -Raw

# Fix all trackEvent calls
$boostServiceContent = $boostServiceContent -replace "eventType: 'boost_activated'", "eventType: 'premium',`n        eventName: 'boost_activated'"
$boostServiceContent = $boostServiceContent -replace "eventType: 'boost_profile_view'", "eventType: 'premium',`n        eventName: 'boost_profile_view'"
$boostServiceContent = $boostServiceContent -replace "eventType: 'boost_like_received'", "eventType: 'premium',`n        eventName: 'boost_like_received'"
$boostServiceContent = $boostServiceContent -replace "eventType: 'boost_match'", "eventType: 'premium',`n        eventName: 'boost_match'"
$boostServiceContent = $boostServiceContent -replace "eventType: 'boost_cancelled'", "eventType: 'premium',`n        eventName: 'boost_cancelled'"

Set-Content $boostServicePath $boostServiceContent -NoNewline
Write-Host "  ✓ Added eventName to 5 trackEvent calls in boost.service.ts" -ForegroundColor Green

# Fix 5: Add eventName to trackEvent call in super-like.service.ts
Write-Host "`n[5/6] Fixing super-like.service.ts..." -ForegroundColor Yellow
$superLikeServicePath = "backend/services/matching-service/src/domain/services/super-like.service.ts"
$superLikeServiceContent = Get-Content $superLikeServicePath -Raw
$superLikeServiceContent = $superLikeServiceContent -replace "eventType: 'super_like_sent'", "eventType: 'engagement',`n        eventName: 'super_like_sent'"
Set-Content $superLikeServicePath $superLikeServiceContent -NoNewline
Write-Host "  ✓ Added eventName to trackEvent call in super-like.service.ts" -ForegroundColor Green

# Fix 6: Build matching-service to verify fixes
Write-Host "`n[6/6] Building matching-service..." -ForegroundColor Yellow
Set-Location "backend/services/matching-service"
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ matching-service built successfully! All TypeScript errors fixed." -ForegroundColor Green
} else {
    Write-Host "  ✗ matching-service build failed. Check the errors above." -ForegroundColor Red
}
Set-Location "../../.."

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Fixes application complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
