@echo off
REM OAuth Quick Fix Script for Flamoral (Windows)
REM This script applies the critical code changes needed to enable OAuth

echo ==========================================
echo OAuth Quick Fix Script (Windows)
echo ==========================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo Working directory: %SCRIPT_DIR%
echo.

REM Fix 1: Mount OAuth routes in auth-service
echo Fix 1: Mounting OAuth routes in auth-service...
set "AUTH_ROUTES_FILE=backend\services\auth-service\src\api\routes\index.ts"

if exist "%AUTH_ROUTES_FILE%" (
    REM Create backup
    copy "%AUTH_ROUTES_FILE%" "%AUTH_ROUTES_FILE%.backup" >nul

    REM Apply fix
    (
        echo import { Router } from 'express';
        echo import authRoutes from './auth.routes';
        echo import oauthRoutes from './oauth.routes';
        echo.
        echo const router = Router^(^);
        echo.
        echo // Mount auth routes
        echo router.use^('/auth', authRoutes^);
        echo.
        echo // Mount OAuth routes
        echo router.use^('/auth/oauth', oauthRoutes^);
        echo.
        echo export default router;
    ) > "%AUTH_ROUTES_FILE%"

    echo [32mOAuth routes mounted in auth-service[0m
) else (
    echo [31mFile not found: %AUTH_ROUTES_FILE%[0m
    exit /b 1
)

REM Fix 2: Register OAuth controller in API Gateway
echo Fix 2: Registering OAuth controller in API Gateway...
set "CONTROLLERS_MODULE_FILE=backend\services\api-gateway\src\controllers\controllers.module.ts"

if exist "%CONTROLLERS_MODULE_FILE%" (
    REM Create backup
    copy "%CONTROLLERS_MODULE_FILE%" "%CONTROLLERS_MODULE_FILE%.backup" >nul

    REM Apply fix
    (
        echo import { Module } from '@nestjs/common';
        echo import { AuthController } from './auth.controller';
        echo import { OAuthController } from './oauth.controller';
        echo import { UserController } from './user.controller';
        echo import { MatchingController } from './matching.controller';
        echo import { MessagingController } from './messaging.controller';
        echo import { PaymentController } from './payment.controller';
        echo import { MediaController } from './media.controller';
        echo import { NotificationController } from './notification.controller';
        echo import { ModerationController } from './moderation.controller';
        echo import { AnalyticsController } from './analytics.controller';
        echo import { CsrfController } from './csrf.controller';
        echo import { SafetyController } from './safety.controller';
        echo.
        echo @Module^({
        echo   controllers: [
        echo     AuthController,
        echo     OAuthController,
        echo     UserController,
        echo     MatchingController,
        echo     MessagingController,
        echo     PaymentController,
        echo     MediaController,
        echo     NotificationController,
        echo     ModerationController,
        echo     AnalyticsController,
        echo     CsrfController,
        echo     SafetyController,
        echo   ],
        echo }^)
        echo export class ControllersModule {}
    ) > "%CONTROLLERS_MODULE_FILE%"

    echo [32mOAuth controller registered in API Gateway[0m
) else (
    echo [31mFile not found: %CONTROLLERS_MODULE_FILE%[0m
    exit /b 1
)

REM Fix 3: Add OAuth environment variables
echo Fix 3: Adding OAuth environment variables...
set "AUTH_ENV_FILE=backend\services\auth-service\.env"

if exist "%AUTH_ENV_FILE%" (
    findstr /C:"GOOGLE_CLIENT_ID" "%AUTH_ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        REM Create backup
        copy "%AUTH_ENV_FILE%" "%AUTH_ENV_FILE%.backup" >nul

        REM Add OAuth config
        (
            echo.
            echo # OAuth Configuration
            echo # Google OAuth ^(Get from https://console.cloud.google.com/^)
            echo GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
            echo GOOGLE_CLIENT_SECRET=your-google-client-secret
            echo.
            echo # Facebook OAuth ^(Get from https://developers.facebook.com/^)
            echo FACEBOOK_APP_ID=your-facebook-app-id
            echo FACEBOOK_APP_SECRET=your-facebook-app-secret
            echo.
            echo # Apple OAuth ^(Get from https://developer.apple.com/^)
            echo APPLE_CLIENT_ID=com.flamoral.app
            echo APPLE_TEAM_ID=your-apple-team-id
            echo APPLE_KEY_ID=your-apple-key-id
            echo APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
        ) >> "%AUTH_ENV_FILE%"

        echo [32mOAuth environment variables added to .env[0m
    ) else (
        echo [32mOAuth environment variables already exist in .env[0m
    )
) else (
    echo [31mFile not found: %AUTH_ENV_FILE%[0m
    exit /b 1
)

echo.
echo ==========================================
echo [32mAll fixes applied successfully![0m
echo ==========================================
echo.
echo Next steps:
echo   1. Update OAuth credentials in backend\services\auth-service\.env
echo   2. Configure OAuth providers (Google, Facebook, Apple)
echo   3. Rebuild and deploy services
echo   4. Test OAuth endpoints
echo.
echo For detailed instructions, see: OAUTH_FIX_DEPLOYMENT_GUIDE.md
echo.
pause
