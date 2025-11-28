@echo off
REM Flamoral - Docker Hub Deployment Script (Windows)
REM This script builds, tags, and pushes all Docker images to Docker Hub

setlocal enabledelayedexpansion

REM Configuration
set VERSION=1.0.0
set DOCKER_USERNAME=flamoral

echo ========================================
echo Flamoral Docker Hub Deployment
echo ========================================
echo Version: %VERSION%
echo Docker Username: %DOCKER_USERNAME%
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop.
    exit /b 1
)

REM Check Docker login
echo [INFO] Checking Docker Hub login status...
docker info | findstr /C:"Username" >nul
if errorlevel 1 (
    echo [WARN] Not logged in to Docker Hub
    echo [INFO] Logging in to Docker Hub...
    docker login
    if errorlevel 1 (
        echo [ERROR] Docker login failed
        exit /b 1
    )
) else (
    echo [INFO] Already logged in to Docker Hub
)
echo.

REM Build User Service
echo ========================================
echo Building User Service
echo ========================================
cd backend\services\user-service
if not exist Dockerfile (
    echo [ERROR] Dockerfile not found in backend\services\user-service
    exit /b 1
)

docker build -t %DOCKER_USERNAME%/user-service:latest -t %DOCKER_USERNAME%/user-service:%VERSION% .
if errorlevel 1 (
    echo [ERROR] Failed to build user-service
    exit /b 1
)
echo [INFO] Successfully built user-service
cd ..\..\..
echo.

REM Build Frontend Web
echo ========================================
echo Building Frontend Web
echo ========================================

REM Create production Dockerfile if it doesn't exist
if not exist frontend\web\Dockerfile (
    echo [WARN] Creating production Dockerfile for frontend...
    (
        echo # Build stage
        echo FROM node:20-alpine AS builder
        echo.
        echo WORKDIR /app
        echo.
        echo # Copy package files
        echo COPY package*.json ./
        echo.
        echo # Install dependencies
        echo RUN npm ci
        echo.
        echo # Copy source code
        echo COPY . .
        echo.
        echo # Build application
        echo RUN npm run build
        echo.
        echo # Production stage
        echo FROM nginx:alpine
        echo.
        echo # Copy built assets
        echo COPY --from=builder /app/dist /usr/share/nginx/html
        echo.
        echo # Expose port
        echo EXPOSE 80
        echo.
        echo # Start nginx
        echo CMD ["nginx", "-g", "daemon off;"]
    ) > frontend\web\Dockerfile
)

cd frontend\web
docker build -t %DOCKER_USERNAME%/frontend-web:latest -t %DOCKER_USERNAME%/frontend-web:%VERSION% .
if errorlevel 1 (
    echo [ERROR] Failed to build frontend-web
    exit /b 1
)
echo [INFO] Successfully built frontend-web
cd ..\..
echo.

REM Push images to Docker Hub
echo ========================================
echo Pushing Images to Docker Hub
echo ========================================

echo [INFO] Pushing user-service...
docker push %DOCKER_USERNAME%/user-service:latest
docker push %DOCKER_USERNAME%/user-service:%VERSION%
if errorlevel 1 (
    echo [ERROR] Failed to push user-service
    exit /b 1
)
echo [INFO] Successfully pushed user-service
echo.

echo [INFO] Pushing frontend-web...
docker push %DOCKER_USERNAME%/frontend-web:latest
docker push %DOCKER_USERNAME%/frontend-web:%VERSION%
if errorlevel 1 (
    echo [ERROR] Failed to push frontend-web
    exit /b 1
)
echo [INFO] Successfully pushed frontend-web
echo.

REM Summary
echo ========================================
echo Deployment Summary
echo ========================================
echo Deployed images:
echo   - %DOCKER_USERNAME%/user-service:latest
echo   - %DOCKER_USERNAME%/user-service:%VERSION%
echo   - %DOCKER_USERNAME%/frontend-web:latest
echo   - %DOCKER_USERNAME%/frontend-web:%VERSION%
echo.
echo ✓ Docker Hub deployment completed successfully!
echo.
echo Next steps:
echo   1. Test images: docker pull %DOCKER_USERNAME%/user-service:latest
echo   2. Deploy to production: docker-compose up -d
echo   3. Monitor services: docker-compose logs -f
echo.

endlocal
