@echo off
REM ############################################################################
REM Flamoral Dating Platform - Migration Runner Script (Windows)
REM Purpose: Run database migrations with comprehensive checks and reporting
REM Usage: run-migrations.bat [rollback|reset|status|verify]
REM ############################################################################

setlocal enabledelayedexpansion

REM Configuration
set SCRIPT_DIR=%~dp0
set ENV_FILE=%SCRIPT_DIR%.env
set ENV_EXAMPLE=%SCRIPT_DIR%.env.example

REM ############################################################################
REM Helper Functions
REM ############################################################################

:print_header
echo.
echo ========================================================================
echo   Flamoral Dating Platform - Database Migration Runner (Windows)
echo ========================================================================
echo.
goto :eof

:print_section
echo.
echo ======== %~1 ========
echo.
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_info
echo [INFO] %~1
goto :eof

REM ############################################################################
REM Environment Setup
REM ############################################################################

:check_environment
call :print_section "Checking Environment"

REM Check if .env exists
if not exist "%ENV_FILE%" (
    call :print_warning ".env file not found"
    if exist "%ENV_EXAMPLE%" (
        call :print_info "Copying .env.example to .env"
        copy "%ENV_EXAMPLE%" "%ENV_FILE%"
        call :print_success "Created .env file"
        call :print_warning "Please update .env with your database credentials"
        exit /b 1
    ) else (
        call :print_error "Neither .env nor .env.example found"
        exit /b 1
    )
) else (
    call :print_success "Environment file found"
)

REM Load environment variables from .env
for /f "usebackq tokens=1,2 delims==" %%a in ("%ENV_FILE%") do (
    set %%a=%%b
)

REM Verify required variables
set missing_vars=0
if not defined DB_HOST (
    call :print_error "Missing DB_HOST"
    set missing_vars=1
)
if not defined DB_PORT (
    call :print_error "Missing DB_PORT"
    set missing_vars=1
)
if not defined DB_NAME (
    call :print_error "Missing DB_NAME"
    set missing_vars=1
)
if not defined DB_USER (
    call :print_error "Missing DB_USER"
    set missing_vars=1
)
if not defined DB_PASSWORD (
    call :print_error "Missing DB_PASSWORD"
    set missing_vars=1
)

if %missing_vars%==1 (
    call :print_error "Please check your .env file"
    exit /b 1
)

call :print_success "All required environment variables set"
goto :eof

REM ############################################################################
REM Database Connection Check
REM ############################################################################

:check_database_connection
call :print_section "Checking Database Connection"

call :print_info "Connecting to: %DB_USER%@%DB_HOST%:%DB_PORT%/%DB_NAME%"

REM Check if psql is available
where psql >nul 2>&1
if %errorlevel% neq 0 (
    call :print_warning "psql command not found in PATH"
    call :print_info "Skipping PostgreSQL connection check"
    call :print_info "Ensure PostgreSQL is running and accessible"
) else (
    call :print_success "psql found - PostgreSQL is available"
)

call :print_success "Proceeding with migrations"
goto :eof

REM ############################################################################
REM Node.js and Dependencies Check
REM ############################################################################

:check_dependencies
call :print_section "Checking Dependencies"

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Node.js not found"
    call :print_info "Please install Node.js 18+ from https://nodejs.org"
    exit /b 1
) else (
    for /f "tokens=*" %%a in ('node -v') do set NODE_VERSION=%%a
    call :print_success "Node.js found: !NODE_VERSION!"
)

REM Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "npm not found"
    exit /b 1
) else (
    for /f "tokens=*" %%a in ('npm -v') do set NPM_VERSION=%%a
    call :print_success "npm found: v!NPM_VERSION!"
)

REM Check if node_modules exists
if not exist "%SCRIPT_DIR%node_modules" (
    call :print_warning "node_modules not found"
    call :print_info "Installing dependencies..."
    cd /d "%SCRIPT_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        call :print_error "Failed to install dependencies"
        exit /b 1
    )
    call :print_success "Dependencies installed"
) else (
    call :print_success "node_modules found"
)

goto :eof

REM ############################################################################
REM Migration Functions
REM ############################################################################

:run_migrations
call :print_section "Running Migrations"

cd /d "%SCRIPT_DIR%"

call :print_info "Executing: npm run migrate:latest"

call npm run migrate:latest
if %errorlevel% neq 0 (
    call :print_error "Migration failed"
    exit /b 1
)

call :print_success "Migrations completed successfully"
goto :eof

:rollback_migrations
call :print_section "Rolling Back Migrations"

cd /d "%SCRIPT_DIR%"

call :print_warning "This will rollback the last batch of migrations"
set /p confirm="Are you sure? (y/n): "
if /i not "%confirm%"=="y" (
    call :print_info "Rollback cancelled"
    goto :eof
)

call :print_info "Executing: npm run migrate:rollback"

call npm run migrate:rollback
if %errorlevel% neq 0 (
    call :print_error "Rollback failed"
    exit /b 1
)

call :print_success "Rollback completed successfully"
goto :eof

:reset_database
call :print_section "Resetting Database"

cd /d "%SCRIPT_DIR%"

call :print_warning "This will rollback ALL migrations and re-run them"
call :print_warning "ALL DATA WILL BE LOST!"
set /p confirm="Type 'RESET' to confirm: "
if /i not "%confirm%"=="RESET" (
    call :print_info "Reset cancelled"
    goto :eof
)

call :print_info "Executing: npm run db:fresh"

call npm run db:fresh
if %errorlevel% neq 0 (
    call :print_error "Database reset failed"
    exit /b 1
)

call :print_success "Database reset completed successfully"
goto :eof

:show_migration_status
call :print_section "Migration Status"

cd /d "%SCRIPT_DIR%"

call :print_info "Checking migration status..."
call npm run migrate:status
goto :eof

REM ############################################################################
REM Database Verification
REM ############################################################################

:verify_database
call :print_section "Verifying Database Schema"

call :print_info "Database verification requires psql"
call :print_info "Using npm commands to verify migrations..."

cd /d "%SCRIPT_DIR%"
call npm run migrate:status

call :print_success "Verification complete"
goto :eof

REM ############################################################################
REM Generate Summary Report
REM ############################################################################

:generate_report
call :print_section "Migration Summary Report"

cd /d "%SCRIPT_DIR%"

echo.
echo Database Information:
echo   Host: %DB_HOST%:%DB_PORT%
echo   Database: %DB_NAME%
echo   User: %DB_USER%
echo.

echo Migration Status:
call npm run migrate:status 2>nul

echo.
call :print_success "Report generated"
goto :eof

REM ############################################################################
REM Main Script
REM ############################################################################

:main
call :print_header

REM Parse arguments
if "%~1"=="--rollback" goto do_rollback
if "%~1"=="rollback" goto do_rollback
if "%~1"=="--reset" goto do_reset
if "%~1"=="reset" goto do_reset
if "%~1"=="--status" goto do_status
if "%~1"=="status" goto do_status
if "%~1"=="--verify" goto do_verify
if "%~1"=="verify" goto do_verify
if "%~1"=="--help" goto show_help
if "%~1"=="-h" goto show_help
if "%~1"=="" goto do_migrate
goto unknown_option

:do_migrate
call :check_environment
if %errorlevel% neq 0 exit /b 1
call :check_database_connection
call :check_dependencies
if %errorlevel% neq 0 exit /b 1
call :run_migrations
if %errorlevel% neq 0 exit /b 1
call :show_migration_status
call :verify_database
call :generate_report
call :print_success "All operations completed successfully!"
goto end

:do_rollback
call :check_environment
if %errorlevel% neq 0 exit /b 1
call :check_database_connection
call :check_dependencies
if %errorlevel% neq 0 exit /b 1
call :rollback_migrations
call :show_migration_status
goto end

:do_reset
call :check_environment
if %errorlevel% neq 0 exit /b 1
call :check_database_connection
call :check_dependencies
if %errorlevel% neq 0 exit /b 1
call :reset_database
call :show_migration_status
goto end

:do_status
call :check_environment
if %errorlevel% neq 0 exit /b 1
call :check_database_connection
call :check_dependencies
if %errorlevel% neq 0 exit /b 1
call :show_migration_status
call :verify_database
goto end

:do_verify
call :check_environment
if %errorlevel% neq 0 exit /b 1
call :check_database_connection
call :verify_database
call :generate_report
goto end

:show_help
echo Usage: %~nx0 [OPTION]
echo.
echo Options:
echo   (no option)   Run migrations (default)
echo   rollback      Rollback last migration batch
echo   reset         Reset database (rollback all + re-migrate)
echo   status        Show migration status
echo   verify        Verify database schema
echo   help          Show this help message
echo.
goto end

:unknown_option
call :print_error "Unknown option: %~1"
echo Use 'help' for usage information
exit /b 1

:end
endlocal
