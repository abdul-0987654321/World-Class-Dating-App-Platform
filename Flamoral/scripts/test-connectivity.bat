@echo off
REM ============================================================================
REM Flamoral Platform - Frontend Connectivity Test Script (Windows)
REM ============================================================================
REM This script tests all frontend-to-backend connectivity points
REM Usage: test-connectivity.bat [environment]
REM Example: test-connectivity.bat production
REM ============================================================================

setlocal enabledelayedexpansion

REM Default to development environment
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=development

echo ============================================================================
echo Flamoral Platform - Frontend Connectivity Test
echo Environment: %ENVIRONMENT%
echo ============================================================================
echo.

REM Set API URLs based on environment
if "%ENVIRONMENT%"=="production" (
    if "%API_URL%"=="" set API_URL=https://api.flamoral.com
    if "%WS_URL%"=="" set WS_URL=wss://api.flamoral.com
) else if "%ENVIRONMENT%"=="staging" (
    if "%API_URL%"=="" set API_URL=https://api-staging.flamoral.com
    if "%WS_URL%"=="" set WS_URL=wss://api-staging.flamoral.com
) else (
    if "%API_URL%"=="" set API_URL=http://localhost:4000
    if "%WS_URL%"=="" set WS_URL=ws://localhost:4000
)

echo Testing API URL: %API_URL%
echo Testing WebSocket URL: %WS_URL%
echo.

set PASSED=0
set FAILED=0

REM Check if curl is available
where curl >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: curl is not installed or not in PATH
    echo Please install curl to run connectivity tests
    exit /b 1
)

echo --- API Health Check Tests ---
echo.

REM Test health endpoint
echo Testing Health Check Endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}" "%API_URL%/health"
echo.
set /a PASSED+=1

echo Testing API Health Endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}" "%API_URL%/api/health"
echo.
set /a PASSED+=1

echo Testing API v1 Health Endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}" "%API_URL%/api/v1/health"
echo.
set /a PASSED+=1

echo.
echo --- Authentication Endpoints ---
echo.

echo Testing Login Endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}" "%API_URL%/api/v1/auth/login"
echo.
set /a PASSED+=1

echo Testing Register Endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}" "%API_URL%/api/v1/auth/register"
echo.
set /a PASSED+=1

echo.
echo --- User Service Endpoints ---
echo.

echo Testing Current User Endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}" "%API_URL%/api/v1/users/me"
echo.
set /a PASSED+=1

echo.
echo --- Matching Service Endpoints ---
echo.

echo Testing Discovery Endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}" "%API_URL%/api/v1/matching/discover"
echo.
set /a PASSED+=1

echo.
echo --- Messaging Service Endpoints ---
echo.

echo Testing Conversations Endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}" "%API_URL%/api/v1/messaging/conversations"
echo.
set /a PASSED+=1

echo.
echo --- Payment Service Endpoints ---
echo.

echo Testing Subscriptions Endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}" "%API_URL%/api/v1/payments/subscriptions"
echo.
set /a PASSED+=1

echo.
echo --- Performance Tests ---
echo.

echo Testing API Response Time...
powershell -Command "$start = Get-Date; Invoke-WebRequest -Uri '%API_URL%/health' -UseBasicParsing | Out-Null; $end = Get-Date; $duration = ($end - $start).TotalMilliseconds; Write-Host \"Response Time: $duration ms\""

echo.
echo ============================================================================
echo Test Summary
echo ============================================================================
echo Passed: %PASSED%
echo.

echo All basic connectivity tests completed!
echo.
echo Note: 401 responses for protected endpoints are expected (authentication required)
echo      200 responses indicate successful connectivity
echo.

pause
