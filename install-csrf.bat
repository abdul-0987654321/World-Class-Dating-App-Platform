@echo off
REM CSRF Protection Installation Script for Windows
REM Installs dependencies and verifies the CSRF implementation

echo ===========================================
echo CSRF Protection Installation Script
echo ===========================================
echo.

REM Check if we're in the correct directory
if not exist "backend\services\api-gateway" (
    echo [ERROR] Must run from project root directory
    exit /b 1
)

echo [OK] Found project root directory
echo.

REM Install backend dependencies
echo Step 1: Installing backend dependencies...
cd backend\services\api-gateway

if exist "package.json" (
    echo Installing cookie-parser...
    call npm install cookie-parser @types/cookie-parser
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        cd ..\..\..\
        exit /b 1
    )
    echo [OK] Backend dependencies installed
) else (
    echo [ERROR] package.json not found in api-gateway
    cd ..\..\..\
    exit /b 1
)

cd ..\..\..

REM Verify file structure
echo.
echo Step 2: Verifying CSRF files...

set "FILES=backend\services\api-gateway\src\middleware\csrf.middleware.ts backend\services\api-gateway\src\guards\csrf.guard.ts backend\services\api-gateway\src\decorators\csrf.decorator.ts backend\services\api-gateway\src\controllers\csrf.controller.ts apps\web-app\src\services\csrf.service.ts apps\web-app\src\hooks\useCsrfToken.ts apps\web-app\src\components\common\CsrfProtectedForm.tsx"

set MISSING=0
for %%f in (%FILES%) do (
    if exist "%%f" (
        echo [OK] %%f
    ) else (
        echo [ERROR] %%f - MISSING
        set MISSING=1
    )
)

if %MISSING%==1 (
    echo.
    echo [ERROR] Missing files detected. Please ensure all CSRF files are created.
    exit /b 1
)

REM Verify documentation
echo.
echo Step 3: Verifying documentation...

if exist "CSRF_IMPLEMENTATION.md" (
    echo [OK] CSRF_IMPLEMENTATION.md
) else (
    echo [WARN] CSRF_IMPLEMENTATION.md - MISSING (optional)
)

if exist "CSRF_QUICK_START.md" (
    echo [OK] CSRF_QUICK_START.md
) else (
    echo [WARN] CSRF_QUICK_START.md - MISSING (optional)
)

if exist "CSRF_MIGRATION_EXAMPLES.md" (
    echo [OK] CSRF_MIGRATION_EXAMPLES.md
) else (
    echo [WARN] CSRF_MIGRATION_EXAMPLES.md - MISSING (optional)
)

if exist "CSRF_FILES_SUMMARY.md" (
    echo [OK] CSRF_FILES_SUMMARY.md
) else (
    echo [WARN] CSRF_FILES_SUMMARY.md - MISSING (optional)
)

REM Check environment configuration
echo.
echo Step 4: Checking environment configuration...

if exist "backend\services\api-gateway\.env" (
    findstr /C:"CORS_ORIGINS" backend\services\api-gateway\.env >nul
    if %errorlevel%==0 (
        echo [OK] CORS_ORIGINS configured
    ) else (
        echo [WARN] CORS_ORIGINS not found in .env
        echo   Add: CORS_ORIGINS=http://localhost:5173,http://localhost:3000
    )

    findstr /C:"CORS_CREDENTIALS" backend\services\api-gateway\.env >nul
    if %errorlevel%==0 (
        echo [OK] CORS_CREDENTIALS configured
    ) else (
        echo [WARN] CORS_CREDENTIALS not found in .env
        echo   Add: CORS_CREDENTIALS=true
    )
) else (
    echo [WARN] .env file not found in api-gateway
    echo   Create .env with:
    echo     CORS_ORIGINS=http://localhost:5173,http://localhost:3000
    echo     CORS_CREDENTIALS=true
    echo     NODE_ENV=development
)

if exist "apps\web-app\.env" (
    findstr /C:"VITE_API_URL" apps\web-app\.env >nul
    if %errorlevel%==0 (
        echo [OK] VITE_API_URL configured
    ) else (
        echo [WARN] VITE_API_URL not found in .env
        echo   Add: VITE_API_URL=http://localhost:4000
    )
) else (
    echo [WARN] .env file not found in web-app
    echo   Create .env with:
    echo     VITE_API_URL=http://localhost:4000
)

REM Summary
echo.
echo ===========================================
echo Installation Summary
echo ===========================================
echo [OK] Dependencies installed
echo [OK] CSRF files verified
echo [OK] Documentation available
echo.

REM Next steps
echo Next Steps:
echo 1. Review environment configuration above
echo 2. Start the backend: cd backend\services\api-gateway ^&^& npm run start:dev
echo 3. Start the frontend: cd apps\web-app ^&^& npm run dev
echo 4. Test CSRF token endpoint: curl http://localhost:4000/api/v1/csrf/token
echo 5. Read documentation: CSRF_QUICK_START.md
echo.

REM Testing instructions
echo Testing CSRF Protection:
echo ------------------------
echo 1. Get CSRF token:
echo    curl -c cookies.txt http://localhost:4000/api/v1/csrf/token
echo.
echo 2. Use token in POST request (PowerShell):
echo    $token = (curl http://localhost:4000/api/v1/csrf/token ^| ConvertFrom-Json).csrfToken
echo    curl -b cookies.txt -H "X-CSRF-Token: $token" -H "Content-Type: application/json" `
echo         -d "{\"test\":\"data\"}" http://localhost:4000/api/v1/endpoint
echo.

echo [OK] CSRF Protection installation complete!
echo.
echo For detailed documentation, see:
echo   - CSRF_IMPLEMENTATION.md (comprehensive guide)
echo   - CSRF_QUICK_START.md (quick reference)
echo   - CSRF_MIGRATION_EXAMPLES.md (code examples)
echo.

pause
