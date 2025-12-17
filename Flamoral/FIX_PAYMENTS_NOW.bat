@echo off
echo ================================================================================
echo FLAMORAL PAYMENT SERVICE - QUICK FIX
echo ================================================================================
echo.

cd backend\services\payment-service

echo Step 1: Running automated fix script...
node fix-payment-service-complete.js
echo.

echo Step 2: Creating .env file from example...
if not exist .env (
    copy .env.example .env
    echo .env file created. IMPORTANT: Edit it and add your Stripe keys!
) else (
    echo .env file already exists.
)
echo.

echo Step 3: Installing dependencies...
call npm install
echo.

echo Step 4: Building TypeScript...
call npm run build
echo.

echo ================================================================================
echo FIX COMPLETE!
echo ================================================================================
echo.
echo NEXT STEPS:
echo 1. Edit backend\services\payment-service\.env
echo    - Add your STRIPE_SECRET_KEY
echo    - Add your STRIPE_PUBLISHABLE_KEY
echo    - Add your STRIPE_WEBHOOK_SECRET
echo.
echo 2. Start the payment service:
echo    cd backend\services\payment-service
echo    npm start
echo.
echo 3. Test the health endpoint:
echo    curl http://localhost:3005/health
echo.
echo See STRIPE_PAYMENT_FIX_COMPLETE.md for full documentation.
echo ================================================================================
pause
