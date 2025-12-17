@echo off
REM ============================================================================
REM Flamoral Mobile App - Apply Configuration Fixes (Windows)
REM ============================================================================
REM This script applies all the corrected configuration files
REM Run this from the mobile-app directory
REM ============================================================================

echo ==========================================
echo Applying Flamoral Mobile App Config Fixes
echo ==========================================
echo.

REM Get current directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo Step 1: Backing up original files...
echo --------------------------------------
if exist .env.example (
    echo   Backing up: .env.example
    copy /Y .env.example .env.example.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul
)
if exist src\api\client.ts (
    echo   Backing up: src\api\client.ts
    copy /Y src\api\client.ts src\api\client.ts.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul
)
if exist src\services\api\config.ts (
    echo   Backing up: src\services\api\config.ts
    copy /Y src\services\api\config.ts src\services\api\config.ts.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul
)
if exist src\config\sslPinning.config.ts (
    echo   Backing up: src\config\sslPinning.config.ts
    copy /Y src\config\sslPinning.config.ts src\config\sslPinning.config.ts.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul
)
if exist app.json (
    echo   Backing up: app.json
    copy /Y app.json app.json.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul
)
if exist android\app\build.gradle (
    echo   Backing up: android\app\build.gradle
    copy /Y android\app\build.gradle android\app\build.gradle.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul
)
if exist android\app\src\main\AndroidManifest.xml (
    echo   Backing up: android\app\src\main\AndroidManifest.xml
    copy /Y android\app\src\main\AndroidManifest.xml android\app\src\main\AndroidManifest.xml.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul
)
if exist ios\FlavoralApp\Info.plist (
    echo   Backing up: ios\FlavoralApp\Info.plist
    copy /Y ios\FlavoralApp\Info.plist ios\FlavoralApp\Info.plist.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul
)
echo.

echo Step 2: Applying fixed environment configuration...
echo ----------------------------------------------------
if exist .env.example.fixed (
    copy /Y .env.example.fixed .env.example >nul
    echo   Applied .env.example.fixed
) else (
    echo   Warning: .env.example.fixed not found
)
echo.

echo Step 3: Applying fixed API client...
echo ------------------------------------
if exist src\api\client.fixed.ts (
    copy /Y src\api\client.fixed.ts src\api\client.ts >nul
    echo   Applied src\api\client.fixed.ts
) else (
    echo   Warning: src\api\client.fixed.ts not found
)
echo.

echo Step 4: Applying fixed API config...
echo ------------------------------------
if exist src\services\api\config.ts.fixed (
    copy /Y src\services\api\config.ts.fixed src\services\api\config.ts >nul
    echo   Applied src\services\api\config.ts.fixed
) else (
    echo   Warning: src\services\api\config.ts.fixed not found
)
echo.

echo Step 5: Applying fixed SSL pinning config...
echo --------------------------------------------
if exist src\config\sslPinning.config.ts.fixed (
    copy /Y src\config\sslPinning.config.ts.fixed src\config\sslPinning.config.ts >nul
    echo   Applied src\config\sslPinning.config.ts.fixed
) else (
    echo   Warning: src\config\sslPinning.config.ts.fixed not found
)
echo.

echo Step 6: Applying fixed app.json...
echo ----------------------------------
if exist app.json.corrected (
    copy /Y app.json.corrected app.json >nul
    echo   Applied app.json.corrected
) else (
    echo   Warning: app.json.corrected not found
)
echo.

echo Step 7: Applying fixed Android build.gradle...
echo ----------------------------------------------
if exist android\app\build.gradle.corrected (
    copy /Y android\app\build.gradle.corrected android\app\build.gradle >nul
    echo   Applied android\app\build.gradle.corrected
) else (
    echo   Warning: android\app\build.gradle.corrected not found
)
echo.

echo Step 8: Applying fixed Android AndroidManifest.xml...
echo ----------------------------------------------------
if exist android\app\src\main\AndroidManifest.xml.corrected (
    copy /Y android\app\src\main\AndroidManifest.xml.corrected android\app\src\main\AndroidManifest.xml >nul
    echo   Applied android\app\src\main\AndroidManifest.xml.corrected
) else (
    echo   Warning: android\app\src\main\AndroidManifest.xml.corrected not found
)
echo.

echo Step 9: Applying fixed iOS Info.plist...
echo ----------------------------------------
if exist ios\FlavoralApp\Info.plist.fixed (
    copy /Y ios\FlavoralApp\Info.plist.fixed ios\FlavoralApp\Info.plist >nul
    echo   Applied ios\FlavoralApp\Info.plist.fixed
) else (
    echo   Warning: ios\FlavoralApp\Info.plist.fixed not found
)
echo.

echo ==========================================
echo Configuration fixes applied successfully!
echo ==========================================
echo.
echo Next Steps:
echo ----------
echo 1. Copy .env.example to .env and add your API keys
echo 2. Download Firebase config files:
echo    - google-services.json -^> android\app\
echo    - GoogleService-Info.plist -^> ios\FlavoralApp\
echo 3. Configure keystores for release builds
echo 4. Generate SSL pins for production
echo 5. Test the app: npm run ios / npm run android
echo.
echo See MOBILE_CONFIG_FIXES_COMPLETE.md for detailed instructions
echo.

pause
