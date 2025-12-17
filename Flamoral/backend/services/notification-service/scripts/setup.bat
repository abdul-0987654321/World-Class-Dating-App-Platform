@echo off
REM Notification Service Setup Script for Windows
REM This script helps you set up the notification service for the first time

echo ================================================
echo   Flamoral Notification Service Setup
echo ================================================
echo.

REM Check if .env exists
if exist .env (
    echo WARNING: .env file already exists
    set /p "overwrite=Do you want to overwrite it? (y/N): "
    if /i "%overwrite%"=="y" (
        copy /Y .env.example .env
        echo Created new .env from template
    ) else (
        echo Keeping existing .env file
    )
) else (
    copy .env.example .env
    echo Created .env from template
)

echo.
echo ================================================
echo   Installing Dependencies
echo ================================================
echo.

call npm install

echo.
echo Dependencies installed
echo.

echo ================================================
echo   Configuration Check
echo ================================================
echo.

REM Run validation (allow failure)
call npm run validate 2>nul

echo.
echo ================================================
echo   Next Steps
echo ================================================
echo.
echo 1. Configure your .env file with real credentials:
echo    - Database connection (PostgreSQL)
echo    - Redis connection
echo    - Email provider (SendGrid, AWS SES, or SMTP)
echo    - Push notification providers (Firebase, APNs)
echo    - SMS provider (Twilio) - optional
echo.
echo 2. Set up the database:
echo    - Ensure PostgreSQL is running
echo    - Create database: CREATE DATABASE flamoral_notifications;
echo    - Run migrations: npm run migrate
echo.
echo 3. Ensure Redis is running:
echo    - Test with: redis-cli ping
echo.
echo 4. Validate configuration:
echo    npm run validate
echo.
echo 5. Start the service:
echo    npm run dev      # Development mode
echo    npm run build    # Build for production
echo    npm start        # Run in production
echo.
echo For detailed setup instructions, see:
echo   - SERVICE_HEALTH_CHECK.md
echo   - FIXES_APPLIED.md
echo   - README.md
echo.
echo Setup complete!
echo.

pause
