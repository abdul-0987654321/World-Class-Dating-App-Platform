@echo off
REM ============================================
REM Flamoral - Quick Docker Build Script
REM ============================================

echo ============================================
echo Flamoral Docker Build
echo ============================================
echo.

cd /d "%~dp0"

REM Configure Docker credentials
echo Configuring Docker credentials...
if not exist "%USERPROFILE%\.docker" mkdir "%USERPROFILE%\.docker"

echo { > "%USERPROFILE%\.docker\config.json"
echo   "auths": { >> "%USERPROFILE%\.docker\config.json"
echo     "https://index.docker.io/v1/": { >> "%USERPROFILE%\.docker\config.json"
echo       "auth": "Y2l0YWRlbGNsb3VkMTpkY2tyX3BhdF9sMlFWX1JURTNTY05nQ2lTMWhVYlM5aGppQTA=" >> "%USERPROFILE%\.docker\config.json"
echo     } >> "%USERPROFILE%\.docker\config.json"
echo   } >> "%USERPROFILE%\.docker\config.json"
echo } >> "%USERPROFILE%\.docker\config.json"

echo Done.
echo.

REM Build Backend
echo ============================================
echo Building Backend...
echo ============================================
cd backend-unified
docker build -t citadelcloud1/world-class-dating-platform:backend-latest -t citadelcloud1/world-class-dating-platform:backend-v1.0.0 .
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend build failed
    pause
    exit /b 1
)
echo Backend built successfully!
echo.

cd ..

REM Build Frontend
echo ============================================
echo Building Frontend...
echo ============================================
docker build -f infrastructure\docker\frontend\Dockerfile -t citadelcloud1/world-class-dating-platform:frontend-latest -t citadelcloud1/world-class-dating-platform:frontend-v1.0.0 frontend\web
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)
echo Frontend built successfully!
echo.

REM Build NGINX
echo ============================================
echo Building NGINX Gateway...
echo ============================================
cd infrastructure\docker\nginx
docker build -t citadelcloud1/world-class-dating-platform:nginx-latest -t citadelcloud1/world-class-dating-platform:nginx-v1.0.0 .
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: NGINX build failed
    cd ..\..\..
    pause
    exit /b 1
)
echo NGINX built successfully!
echo.

cd ..\..\..

REM Push to Docker Hub
echo ============================================
echo Pushing to Docker Hub...
echo ============================================

echo Pushing backend...
docker push citadelcloud1/world-class-dating-platform:backend-latest
docker push citadelcloud1/world-class-dating-platform:backend-v1.0.0

echo Pushing frontend...
docker push citadelcloud1/world-class-dating-platform:frontend-latest
docker push citadelcloud1/world-class-dating-platform:frontend-v1.0.0

echo Pushing nginx...
docker push citadelcloud1/world-class-dating-platform:nginx-latest
docker push citadelcloud1/world-class-dating-platform:nginx-v1.0.0

echo.
echo ============================================
echo Build and Push Complete!
echo ============================================
echo.
echo Images available at:
echo https://hub.docker.com/r/citadelcloud1/world-class-dating-platform
echo.
pause
