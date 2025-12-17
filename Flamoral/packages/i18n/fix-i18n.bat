@echo off
REM Fix script for i18n package issues (Windows)

echo 🔧 Fixing Flamoral i18n package...

REM Navigate to i18n package directory
cd /d "%~dp0"

echo 📝 Step 1: Fixing src/index.ts to use exports.ts...
(
echo /**
echo  * i18n Package Exports - Flamoral Dating Platform
echo  * Full internationalization support with 12 locales
echo  */
echo.
echo // Export everything from exports.ts ^(the comprehensive export file^)
echo export * from './exports';
) > src\index.ts

echo ✅ Step 1 complete: index.ts updated

echo 📦 Step 2: Building i18n package...
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo ✅ Step 2 complete: Build successful
) else (
    echo ❌ Build failed. Please check errors above.
    exit /b 1
)

echo.
echo 🎉 i18n package fixes applied successfully!
echo.
echo Next steps:
echo 1. cd ..\..\apps\web-app
echo 2. Add '@flamoral/i18n': 'workspace:*' to package.json dependencies
echo 3. Run: npm install
echo 4. Update src/main.tsx to wrap app with I18nextProvider
echo 5. See I18N_FIXES.md for detailed integration guide

pause
