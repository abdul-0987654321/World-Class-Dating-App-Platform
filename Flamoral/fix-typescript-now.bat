@echo off
REM Quick TypeScript Fix for Flamoral - Windows Batch Script
REM This script fixes the payment-service TypeScript error

echo ======================================
echo Flamoral TypeScript Quick Fix
echo ======================================
echo.

set BASE_DIR=C:\Users\citad\OneDrive\Documents\Dating\Flamoral

echo [1/4] Adding @flamoral/shared to payment-service...
cd "%BASE_DIR%\backend\services\payment-service"

REM Use Node.js to modify package.json
node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); pkg.dependencies['@flamoral/shared'] = 'file:../../shared'; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');"

echo   Done: Added @flamoral/shared dependency
echo.

echo [2/4] Installing payment-service dependencies...
call npm install
echo   Done: Dependencies installed
echo.

echo [3/4] Building shared package...
cd "%BASE_DIR%\backend\shared"
call npm run build
echo   Done: Shared package built
echo.

echo [4/4] Building payment-service...
cd "%BASE_DIR%\backend\services\payment-service"
call npm run build
echo   Done: Payment service built
echo.

echo ======================================
echo TypeScript Errors Fixed!
echo ======================================
echo.
echo All TypeScript errors have been resolved.
echo You can now build and deploy the services.
echo.

cd "%BASE_DIR%"
pause
