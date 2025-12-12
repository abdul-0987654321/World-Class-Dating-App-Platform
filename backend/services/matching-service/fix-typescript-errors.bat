@echo off
echo Fixing TypeScript errors in matching-service...
echo.

REM Navigate to the matching-service directory
cd /d "%~dp0"

REM Backup the current index.ts
copy src\index.ts src\index.ts.backup >nul 2>&1
if errorlevel 1 (
    echo Failed to create backup
    pause
    exit /b 1
)
echo Backup created: src\index.ts.backup

REM Replace index.ts with the fixed version
copy /Y src\index.ts.fixed src\index.ts >nul 2>&1
if errorlevel 1 (
    echo Failed to apply fix
    pause
    exit /b 1
)
echo Fixed file applied

REM Verify the fix
echo.
echo Running TypeScript compiler to verify...
call npx tsc --noEmit 2>&1
if errorlevel 1 (
    echo.
    echo TypeScript errors still present. Restoring backup...
    copy /Y src\index.ts.backup src\index.ts >nul 2>&1
    echo Backup restored
) else (
    echo.
    echo ✓ All TypeScript errors fixed successfully!
    del src\index.ts.fixed >nul 2>&1
)

echo.
pause
