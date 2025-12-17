@echo off
echo ================================================
echo   FLAMORAL MATCHING SERVICE FIX
echo ================================================
echo.
echo This script will fix the matching service routing issues.
echo.
echo WHAT WILL BE FIXED:
echo  1. Add 'matching' controller prefix
echo  2. Add missing /suggestions endpoint
echo  3. Add missing /swipe endpoint
echo  4. Fix all proxy paths
echo.
pause

echo.
echo [1/4] Creating backup...
copy "backend\services\api-gateway\src\controllers\matching.controller.ts" "backend\services\api-gateway\src\controllers\matching.controller.ts.backup" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Could not create backup. Make sure you're in the Flamoral directory.
    pause
    exit /b 1
)
echo ✓ Backup created: matching.controller.ts.backup

echo.
echo [2/4] Applying fix...
copy /Y "MATCHING_CONTROLLER_FIXED.ts" "backend\services\api-gateway\src\controllers\matching.controller.ts" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Could not apply fix. Make sure MATCHING_CONTROLLER_FIXED.ts exists.
    pause
    exit /b 1
)
echo ✓ Fix applied successfully

echo.
echo [3/4] Building API Gateway...
cd backend\services\api-gateway
call npm run build >nul 2>&1
if errorlevel 1 (
    echo WARNING: Build failed. You may need to run 'npm install' first.
    echo.
    echo Try running these commands manually:
    echo   cd backend\services\api-gateway
    echo   npm install
    echo   npm run build
    echo.
    cd ..\..\..
    pause
    exit /b 1
)
cd ..\..\..
echo ✓ Build successful

echo.
echo [4/4] Fix complete!
echo.
echo ================================================
echo   NEXT STEPS
echo ================================================
echo.
echo 1. Restart the API Gateway:
echo    cd backend\services\api-gateway
echo    npm run start
echo.
echo    OR if using Docker:
echo    docker-compose restart api-gateway
echo.
echo 2. Test the fix:
echo    curl http://localhost:4000/api/v1/matching/suggestions
echo.
echo    Expected: {"statusCode":401,"message":"Unauthorized"}
echo    (This is good - endpoint exists and requires auth!)
echo.
echo 3. If something goes wrong, restore the backup:
echo    copy backend\services\api-gateway\src\controllers\matching.controller.ts.backup backend\services\api-gateway\src\controllers\matching.controller.ts
echo.
echo ================================================
echo.
pause
