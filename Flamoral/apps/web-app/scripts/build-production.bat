@echo off
REM Flamoral Web App - Production Build Script for Windows
REM This script ensures a clean, optimized production build

echo =========================================
echo Flamoral Production Build
echo =========================================
echo.

REM Check Node version
echo Checking Node.js version...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    exit /b 1
)
echo.

REM Check npm version
echo Checking npm version...
npm --version
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    exit /b 1
)
echo.

REM Clean previous build
echo Cleaning previous build...
if exist "dist" rd /s /q "dist"
if exist "node_modules\.vite" rd /s /q "node_modules\.vite"
echo Previous build cleaned
echo.

REM Install dependencies
echo Installing dependencies...
call npm ci --no-audit --prefer-offline
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)
echo Dependencies installed
echo.

REM Type check
echo Running TypeScript type check...
call npm run type-check
if %errorlevel% neq 0 (
    echo WARNING: Type check failed
    echo Continuing with build...
)
echo.

REM Lint check
echo Running ESLint...
call npm run lint
if %errorlevel% neq 0 (
    echo WARNING: Lint check failed
    echo Continuing with build...
)
echo.

REM Set production environment
set NODE_ENV=production

REM Build the application
echo Building production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    exit /b 1
)
echo.

REM Check if build was successful
if not exist "dist" (
    echo ERROR: Build failed - dist directory not found
    exit /b 1
)
echo Production build completed
echo.

REM Analyze bundle size
echo =========================================
echo Build Statistics
echo =========================================
echo.

REM Count files
for /f %%i in ('dir /b /s "dist\assets\js\*.js" 2^>nul ^| find /c /v ""') do set js_count=%%i
for /f %%i in ('dir /b /s "dist\assets\css\*.css" 2^>nul ^| find /c /v ""') do set css_count=%%i

echo JavaScript files: %js_count%
echo CSS files: %css_count%
echo.

REM Check for large chunks
echo Checking for large chunks (^>500KB)...
for /r "dist\assets" %%f in (*.js *.css) do (
    if %%~zf gtr 512000 (
        echo WARNING: Large file found: %%~nxf (%%~zf bytes)
    )
)
echo.

REM Check for source maps
echo Checking for source maps...
dir /b /s "dist\*.map" 2>nul | find /c /v "" > nul
if %errorlevel% equ 0 (
    for /f %%i in ('dir /b /s "dist\*.map" 2^>nul ^| find /c /v ""') do (
        echo Found %%i source map files
    )
) else (
    echo No source maps found
)
echo.

REM Verify critical files
echo Verifying critical files...
if not exist "dist\index.html" (
    echo ERROR: Critical file missing: index.html
    exit /b 1
)
if not exist "dist\assets" (
    echo ERROR: Critical directory missing: assets
    exit /b 1
)
echo All critical files present
echo.

REM Security check
echo Checking for security issues...
call npm audit --production --audit-level=high
if %errorlevel% neq 0 (
    echo WARNING: Security vulnerabilities found
    echo Review before deployment
)
echo.

echo =========================================
echo Production build completed successfully!
echo =========================================
echo.
echo Next steps:
echo 1. Test the build locally: npm run preview
echo 2. Review bundle size and optimize if needed
echo 3. Deploy to staging environment for testing
echo 4. Deploy to production after QA approval
echo.

pause
