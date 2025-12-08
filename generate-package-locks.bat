@echo off
echo Generating package-lock.json files for backend services...

cd backend\services\advertising-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for advertising-service
) else (
    echo SUCCESS: Generated package-lock.json for advertising-service
)
cd ..\..\..

cd backend\services\analytics-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for analytics-service
) else (
    echo SUCCESS: Generated package-lock.json for analytics-service
)
cd ..\..\..

cd backend\services\api-gateway
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for api-gateway
) else (
    echo SUCCESS: Generated package-lock.json for api-gateway
)
cd ..\..\..

cd backend\services\auth-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for auth-service
) else (
    echo SUCCESS: Generated package-lock.json for auth-service
)
cd ..\..\..

cd backend\services\matching-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for matching-service
) else (
    echo SUCCESS: Generated package-lock.json for matching-service
)
cd ..\..\..

cd backend\services\media-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for media-service
) else (
    echo SUCCESS: Generated package-lock.json for media-service
)
cd ..\..\..

cd backend\services\messaging-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for messaging-service
) else (
    echo SUCCESS: Generated package-lock.json for messaging-service
)
cd ..\..\..

cd backend\services\moderation-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for moderation-service
) else (
    echo SUCCESS: Generated package-lock.json for moderation-service
)
cd ..\..\..

cd backend\services\notification-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for notification-service
) else (
    echo SUCCESS: Generated package-lock.json for notification-service
)
cd ..\..\..

cd backend\services\payment-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for payment-service
) else (
    echo SUCCESS: Generated package-lock.json for payment-service
)
cd ..\..\..

cd backend\services\user-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to generate package-lock.json for user-service
) else (
    echo SUCCESS: Generated package-lock.json for user-service
)
cd ..\..\..

echo.
echo All package-lock.json files have been generated!
echo Please verify the files were created successfully.
pause
