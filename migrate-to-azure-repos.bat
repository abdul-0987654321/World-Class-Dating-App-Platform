@echo off
REM #############################################################################
REM Azure Repos Migration Script (Windows)
REM Purpose: Migrate GitHub repository to Azure Repos
REM Repository: World-Class-Dating-App-Platform
REM Azure Repos: https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
REM #############################################################################

setlocal enabledelayedexpansion

REM Configuration
set "AZURE_REPO_URL=https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform"
set "BACKUP_DIR=backup-%date:~10,4%%date:~4,2%%date:~7,2%-%time:~0,2%%time:~3,2%%time:~6,2%"
set "BACKUP_DIR=%BACKUP_DIR: =0%"

echo ================================================
echo Azure Repos Migration Script
echo ================================================
echo.
echo Repository: World-Class-Dating-App-Platform
echo Destination: %AZURE_REPO_URL%
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed. Please install Git first.
    pause
    exit /b 1
)
echo [OK] Git is installed

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not in a git repository.
    pause
    exit /b 1
)
echo [OK] Current directory is a Git repository

echo.
echo ================================================
echo Current Repository Information
echo ================================================
echo Repository Path: %CD%
git branch --show-current
git remote -v
echo.

REM Confirm with user
set /p CONFIRM="Do you want to proceed with the migration? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Migration cancelled.
    pause
    exit /b 0
)

REM Create backup
echo.
echo ================================================
echo Creating Backup
echo ================================================
echo Creating backup directory: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul
echo Backing up .git folder...
xcopy /E /I /H /Y .git "%BACKUP_DIR%\.git" >nul
if errorlevel 1 (
    echo [ERROR] Failed to create backup
    pause
    exit /b 1
)
echo [OK] Backup created successfully

REM Fetch all branches and tags
echo.
echo ================================================
echo Fetching All Branches and Tags
echo ================================================
git fetch origin --tags --prune
if errorlevel 1 (
    echo [WARNING] Failed to fetch from origin
)

REM Add Azure Repos remote
echo.
echo ================================================
echo Adding Azure Repos Remote
echo ================================================
git remote | findstr /C:"azure" >nul
if not errorlevel 1 (
    echo [INFO] Azure remote already exists. Removing old remote...
    git remote remove azure
)
echo Adding Azure Repos as 'azure' remote...
git remote add azure "%AZURE_REPO_URL%"
if errorlevel 1 (
    echo [ERROR] Failed to add Azure remote
    pause
    exit /b 1
)
echo [OK] Azure remote added successfully
echo.
git remote -v

REM Confirm push
echo.
echo ================================================
echo Ready to Push to Azure Repos
echo ================================================
echo You may be prompted for Azure DevOps credentials.
echo.
set /p CONFIRM_PUSH="Continue with push? (Y/N): "
if /i not "%CONFIRM_PUSH%"=="Y" (
    echo Migration stopped before push. Azure remote has been added.
    echo You can manually push later with: git push azure --all
    pause
    exit /b 0
)

REM Push to Azure Repos
echo.
echo ================================================
echo Pushing to Azure Repos
echo ================================================
echo Pushing all branches...
git push azure --all
if errorlevel 1 (
    echo [ERROR] Failed to push branches
    echo Please check your credentials and permissions.
    pause
    exit /b 1
)
echo [OK] All branches pushed successfully

echo.
echo Pushing all tags...
git tag >nul 2>&1
if not errorlevel 1 (
    git push azure --tags
    if errorlevel 1 (
        echo [WARNING] Failed to push tags (this is non-critical)
    ) else (
        echo [OK] All tags pushed successfully
    )
) else (
    echo [INFO] No tags to push
)

REM Verify migration
echo.
echo ================================================
echo Verifying Migration
echo ================================================
git fetch azure
echo.
echo Local branches:
git branch
echo.
echo Azure remote branches:
git branch -r | findstr "azure/"
echo.
echo [OK] Migration verification complete

REM Post-migration instructions
echo.
echo ================================================
echo Migration Completed Successfully!
echo ================================================
echo.
echo IMPORTANT NEXT STEPS:
echo.
echo 1. Verify the migration:
echo    Visit: %AZURE_REPO_URL%
echo    Check that all branches and commits are present
echo.
echo 2. Configure Azure Repos:
echo    - Set up branch policies
echo    - Configure PR templates
echo    - Set up build validation
echo.
echo 3. Update team members:
echo    - Share the new repository URL
echo    - Provide access instructions
echo.
echo 4. Backup location:
echo    %BACKUP_DIR%
echo.
echo For detailed instructions, see:
echo    - AZURE_REPOS_MIGRATION_CHECKLIST.md
echo    - AZURE_REPOS_BRANCH_POLICIES.md
echo    - AZURE_REPOS_FOLDER_STRUCTURE.md
echo.
echo ================================================

pause
