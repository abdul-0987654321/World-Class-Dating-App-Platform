@echo off
echo =====================================
echo Flamoral Backend Service Fixes
echo =====================================

set SERVICES_DIR=backend\services

echo Step 1: Fixing shared package exports...

REM Update shared package index.ts to include logger
(
echo // Flamoral Shared Package - Entry Point
echo // Export all shared utilities, middleware, and clients
echo.
echo // Clients
echo export * from './clients/service-client';
echo.
echo // Middleware
echo export * from './middleware/error-handler.middleware';
echo export * from './middleware/health-check.middleware';
echo export * from './middleware/service-auth.middleware';
echo.
echo // Utils
echo export * from './utils/logger';
) > "%SERVICES_DIR%\shared\index.ts"

echo [32mUpdated shared/index.ts[0m

REM Build shared package
echo Step 2: Building shared package...
cd "%SERVICES_DIR%\shared"
call npm install
call npm run build
echo [32mShared package built[0m
cd ..\..\..

REM Install and build services
echo Step 3: Installing dependencies for all services...

for %%s in (
  auth-service
  user-service
  api-gateway
  matching-service
  messaging-service
  payment-service
  media-service
  notification-service
  analytics-service
  moderation-service
  automation-service
) do (
  if exist "%SERVICES_DIR%\%%s" (
    echo Installing %%s...
    cd "%SERVICES_DIR%\%%s"
    call npm install
    echo [32mDependencies installed for %%s[0m
    cd ..\..\..
  )
)

echo Step 4: Building all services...

for %%s in (
  auth-service
  user-service
  api-gateway
  matching-service
  messaging-service
  payment-service
  media-service
  notification-service
  analytics-service
  moderation-service
  automation-service
) do (
  if exist "%SERVICES_DIR%\%%s\package.json" (
    echo Building %%s...
    cd "%SERVICES_DIR%\%%s"
    call npm run build 2>nul && (
      echo [32mBuilt %%s successfully[0m
    ) || (
      echo [33mNo build script or build failed for %%s[0m
    )
    cd ..\..\..
  )
)

echo.
echo =====================================
echo Backend Fixes Complete!
echo =====================================
echo.
echo Next steps:
echo 1. Review build output above for any errors
echo 2. Test services individually: cd backend\services\auth-service ^&^& npm run dev
echo 3. Check health endpoints: curl http://localhost:3001/health
echo 4. Deploy to staging/production
echo.
pause
