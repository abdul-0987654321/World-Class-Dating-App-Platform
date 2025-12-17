@echo off
REM Flamoral Mobile App - Install Missing Dependencies (Windows)
REM This script installs all required npm packages

echo ==================================================
echo Flamoral Mobile App - Dependency Installation
echo ==================================================
echo.

cd /d "C:\Users\citad\OneDrive\Documents\Dating\Flamoral\apps\mobile-app"

echo Current directory: %CD%
echo.

echo Step 1: Installing npm packages...
echo ==================================================
call npm install @react-native-firebase/app@^18.7.0 @react-native-firebase/messaging@^18.7.0 expo-local-authentication@^13.8.0 react-native-keychain@^8.1.2 react-native-config@^1.5.1 babel-plugin-module-resolver@^5.0.0

if %ERRORLEVEL% EQU 0 (
  echo.
  echo [32m✓ npm packages installed successfully[0m
) else (
  echo.
  echo [31m✗ npm installation failed[0m
  exit /b 1
)

echo.
echo ==================================================
echo Installation Complete!
echo ==================================================
echo.
echo Next steps:
echo 1. Install iOS pods (Mac only):
echo    cd ios ^&^& pod install
echo.
echo 2. Add Firebase configuration files:
echo    - android/app/google-services.json
echo    - ios/FlavoralApp/GoogleService-Info.plist
echo.
echo 3. Update deep linking domains (see SETUP_INSTRUCTIONS.md)
echo.
echo 4. Update babel.config.js (see SETUP_INSTRUCTIONS.md)
echo.
echo 5. Run the app:
echo    npm run android  # For Android
echo    npm run ios      # For iOS
echo.
pause
