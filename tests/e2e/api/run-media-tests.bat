@echo off
REM Media Service API Test Runner for Windows
REM This script runs the comprehensive E2E tests for the Media Service

echo ==========================================
echo Media Service API E2E Tests
echo ==========================================
echo.

echo Checking if required services are running...

REM Check Auth Service
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Auth Service is running (Port 3001)
) else (
    echo [ERROR] Auth Service is not running (Port 3001)
    echo Please start the Auth Service first:
    echo   cd backend\services\auth-service ^&^& npm run dev
    exit /b 1
)

REM Check Media Service
curl -s http://localhost:3005/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Media Service is running (Port 3005)
) else (
    echo [ERROR] Media Service is not running (Port 3005)
    echo Please start the Media Service first:
    echo   cd backend\services\media-service ^&^& npm run dev
    exit /b 1
)

echo.
echo Starting test execution...
echo.

REM Parse command line arguments
set TEST_FILTER=
set WATCH_MODE=
set COVERAGE=

:parse
if "%~1"=="" goto endparse
if "%~1"=="--photo" (
    set TEST_FILTER=-t "Photo Upload"
    shift
    goto parse
)
if "%~1"=="--video" (
    set TEST_FILTER=-t "Video Upload"
    shift
    goto parse
)
if "%~1"=="--voice" (
    set TEST_FILTER=-t "Voice Note Upload"
    shift
    goto parse
)
if "%~1"=="--auth" (
    set TEST_FILTER=-t "Authentication"
    shift
    goto parse
)
if "%~1"=="--watch" (
    set WATCH_MODE=--watch
    shift
    goto parse
)
if "%~1"=="--coverage" (
    set COVERAGE=--coverage
    shift
    goto parse
)
echo Unknown option: %~1
echo Usage: %0 [--photo^|--video^|--voice^|--auth] [--watch] [--coverage]
exit /b 1

:endparse

REM Run tests
if defined TEST_FILTER (
    echo Running filtered tests: %TEST_FILTER%
    npx jest tests/e2e/api/media-api.spec.ts %TEST_FILTER% %WATCH_MODE% %COVERAGE% --verbose
) else (
    echo Running all Media API tests...
    npx jest tests/e2e/api/media-api.spec.ts %WATCH_MODE% %COVERAGE% --verbose
)

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo All tests passed successfully!
    echo ==========================================
) else (
    echo.
    echo ==========================================
    echo Some tests failed!
    echo ==========================================
    exit /b 1
)
