# Fix API Gateway Route Path Issues
# This script fixes the double /api/ prefix issue in controller decorators
# Routes are: /api/v1/{controller-path} due to global prefix in main.ts
# Controllers should NOT have 'api/' in their @Controller() decorator

Write-Host "Fixing API Gateway route path issues..." -ForegroundColor Cyan

$API_GATEWAY_CONTROLLERS = "C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/api-gateway/src/controllers"

# Fix auth.controller.ts - Change @Controller('api/auth') to @Controller('auth')
$authController = Join-Path $API_GATEWAY_CONTROLLERS "auth.controller.ts"
if (Test-Path $authController) {
    Write-Host "Fixing auth.controller.ts..." -ForegroundColor Yellow
    $content = Get-Content $authController -Raw
    $content = $content -replace "@Controller\('api/auth'\)", "@Controller('auth')"
    $content = $content -replace "@Post\('verify-email'\)", "@Get('verify-email')"
    Set-Content $authController $content -NoNewline
}

# Fix auth.controller.secure.ts - Change @Controller('api/auth') to @Controller('auth')
$authControllerSecure = Join-Path $API_GATEWAY_CONTROLLERS "auth.controller.secure.ts"
if (Test-Path $authControllerSecure) {
    Write-Host "Fixing auth.controller.secure.ts..." -ForegroundColor Yellow
    $content = Get-Content $authControllerSecure -Raw
    $content = $content -replace "@Controller\('api/auth'\)", "@Controller('auth')"
    $content = $content -replace "@Post\('verify-email'\)", "@Get('verify-email')"
    Set-Content $authControllerSecure $content -NoNewline
}

# Fix safety.controller.ts - Change @Controller('api/safety') to @Controller('safety')
$safetyController = Join-Path $API_GATEWAY_CONTROLLERS "safety.controller.ts"
if (Test-Path $safetyController) {
    Write-Host "Fixing safety.controller.ts..." -ForegroundColor Yellow
    $content = Get-Content $safetyController -Raw
    $content = $content -replace "@Controller\('api/safety'\)", "@Controller('safety')"
    Set-Content $safetyController $content -NoNewline
}

# Update controllers.module.ts to include new controllers
Write-Host "Updating controllers.module.ts..." -ForegroundColor Yellow
$controllersModule = Join-Path $API_GATEWAY_CONTROLLERS "controllers.module.ts"
$moduleContent = @"
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { MatchingController } from './matching.controller';
import { MessagingController } from './messaging.controller';
import { PaymentController } from './payment.controller';
import { MediaController } from './media.controller';
import { NotificationController } from './notification.controller';
import { ModerationController } from './moderation.controller';
import { AnalyticsController } from './analytics.controller';
import { CsrfController } from './csrf.controller';
import { SafetyController } from './safety.controller';
import { ProfilesController } from './profiles.controller';
import { AdminController } from './admin.controller';
import { AdvertisingController } from './advertising.controller';
import { AIController } from './ai.controller';

@Module({
  controllers: [
    AuthController,
    UserController,
    MatchingController,
    MessagingController,
    PaymentController,
    MediaController,
    NotificationController,
    ModerationController,
    AnalyticsController,
    CsrfController,
    SafetyController,
    ProfilesController,
    AdminController,
    AdvertisingController,
    AIController,
  ],
})
export class ControllersModule {}
"@
Set-Content $controllersModule $moduleContent

Write-Host ""
Write-Host "Route path fixes completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary of changes:" -ForegroundColor Cyan
Write-Host "  - Fixed @Controller('api/auth') -> @Controller('auth') in auth controllers"
Write-Host "  - Fixed @Controller('api/safety') -> @Controller('safety') in safety controller"
Write-Host "  - Changed verify-email from POST to GET endpoint"
Write-Host "  - Added ProfilesController for /api/v1/profiles routes"
Write-Host "  - Added AdminController for /api/v1/admin/* routes"
Write-Host "  - Added AdvertisingController for /api/v1/advertising routes"
Write-Host "  - Added AIController for /api/v1/ai routes"
Write-Host ""
Write-Host "Routes will now be accessible at:" -ForegroundColor Cyan
Write-Host "  - /api/v1/auth/* (was /api/v1/api/auth/*)" -ForegroundColor White
Write-Host "  - /api/v1/safety/* (was /api/v1/api/safety/*)" -ForegroundColor White
Write-Host "  - /api/v1/profiles" -ForegroundColor Green
Write-Host "  - /api/v1/messages (via MessagingController)" -ForegroundColor Green
Write-Host "  - /api/v1/media" -ForegroundColor Green
Write-Host "  - /api/v1/payments (via PaymentController subscriptions)" -ForegroundColor Green
Write-Host "  - /api/v1/analytics" -ForegroundColor Green
Write-Host "  - /api/v1/admin/users" -ForegroundColor Green
Write-Host "  - /api/v1/moderation" -ForegroundColor Green
Write-Host "  - /api/v1/advertising" -ForegroundColor Green
Write-Host "  - /api/v1/ai" -ForegroundColor Green
Write-Host "  - /api/v1/subscriptions (via PaymentController)" -ForegroundColor Green
Write-Host "  - /api/v1/matching/suggestions (via MatchingController discovery)" -ForegroundColor Green
Write-Host ""
Write-Host "Please rebuild the API Gateway service:" -ForegroundColor Yellow
Write-Host "  cd backend/services/api-gateway"
Write-Host "  npm run build"
Write-Host "  npm run start:dev"
