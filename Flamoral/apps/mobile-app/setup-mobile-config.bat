@echo off
REM Mobile App Configuration Setup Script for Windows
REM This script installs and configures react-native-config and applies all necessary fixes

echo ======================================
echo Flamoral Mobile App Configuration Setup
echo ======================================

REM 1. Install react-native-config
echo.
echo [+] Installing react-native-config...
call npm install react-native-config --save

REM 2. Install react-native-dotenv
echo.
echo [+] Installing react-native-dotenv...
call npm install -D react-native-dotenv

REM 3. Apply configuration fixes
echo.
echo [+] Applying configuration fixes...

REM Backup original files
echo Creating backups of original files...
if exist babel.config.js copy babel.config.js babel.config.js.backup >nul 2>&1
if exist app.json copy app.json app.json.backup >nul 2>&1
if exist android\app\build.gradle copy android\app\build.gradle android\app\build.gradle.backup >nul 2>&1
if exist android\app\src\main\AndroidManifest.xml copy android\app\src\main\AndroidManifest.xml android\app\src\main\AndroidManifest.xml.backup >nul 2>&1
if exist src\services\api\config.ts copy src\services\api\config.ts src\services\api\config.ts.backup >nul 2>&1

REM Apply fixes
echo Applying fixed configurations...
if exist babel.config.js.fixed (
    copy /Y babel.config.js.fixed babel.config.js >nul 2>&1
    echo [OK] babel.config.js updated
) else (
    echo [!] babel.config.js.fixed not found
)

if exist app.json.fixed (
    copy /Y app.json.fixed app.json >nul 2>&1
    echo [OK] app.json updated
) else (
    echo [!] app.json.fixed not found
)

if exist android\app\build.gradle.fixed (
    copy /Y android\app\build.gradle.fixed android\app\build.gradle >nul 2>&1
    echo [OK] build.gradle updated
) else (
    echo [!] build.gradle.fixed not found
)

if exist android\app\src\main\AndroidManifest.xml.fixed (
    copy /Y android\app\src\main\AndroidManifest.xml.fixed android\app\src\main\AndroidManifest.xml >nul 2>&1
    echo [OK] AndroidManifest.xml updated
) else (
    echo [!] AndroidManifest.xml.fixed not found
)

if exist src\services\api\config.fixed.ts (
    copy /Y src\services\api\config.fixed.ts src\services\api\config.ts >nul 2>&1
    echo [OK] API config updated
) else (
    echo [!] config.fixed.ts not found
)

REM 4. Install iOS pods
echo.
echo [+] Installing iOS dependencies...
cd ios
call pod install
cd ..

REM 5. Clean build artifacts
echo.
echo [+] Cleaning build artifacts...
if exist android\build rmdir /S /Q android\build >nul 2>&1
if exist android\app\build rmdir /S /Q android\app\build >nul 2>&1
if exist ios\build rmdir /S /Q ios\build >nul 2>&1

REM 6. Verify .env file exists
echo.
if exist .env (
    echo [OK] .env file exists
) else (
    echo [!] .env file not found. Creating from example...
    if exist .env.example (
        copy .env.example .env >nul 2>&1
        echo [OK] .env file created from .env.example
    ) else (
        echo [ERROR] .env file not found and no .env.example available
        echo Please create a .env file with your configuration
    )
)

REM 7. Summary
echo.
echo ======================================
echo Configuration Setup Complete!
echo ======================================
echo.
echo Next steps:
echo 1. Review your .env file and update values as needed
echo 2. Update any Java/Kotlin files that reference com.flamoral.app to com.flamoral
echo 3. Clean and rebuild:
echo    - Android: cd android ^&^& gradlew clean ^&^& cd ..
echo    - iOS: cd ios ^&^& xcodebuild clean ^&^& cd ..
echo 4. Run the app:
echo    - Android: npm run android
echo    - iOS: npm run ios
echo.
echo Backup files created:
echo   - babel.config.js.backup
echo   - app.json.backup
echo   - android/app/build.gradle.backup
echo   - android/app/src/main/AndroidManifest.xml.backup
echo   - src/services/api/config.ts.backup
echo.
echo [OK] Setup complete!
pause
