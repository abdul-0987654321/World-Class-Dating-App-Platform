@echo off
REM ============================================================================
REM Quick Start Script - Run this to build and push all services
REM ============================================================================

echo.
echo ============================================================================
echo  Docker Build and Push - World Class Dating Platform
echo ============================================================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo.
    echo Please:
    echo 1. Open Docker Desktop from Start Menu
    echo 2. Wait for "Docker Desktop is running" message
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo Docker is running... Good!
echo.
echo This will:
echo  1. Login to Docker Hub
echo  2. Build all 9 microservices
echo  3. Push to organized repository
echo  4. Take approximately 1-2 hours
echo.
set /p confirm="Continue? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Cancelled by user
    pause
    exit /b 0
)

echo.
echo Starting PowerShell script...
echo.

powershell -ExecutionPolicy Bypass -File ".\EXECUTE_BUILD_PUSH.ps1"

pause
