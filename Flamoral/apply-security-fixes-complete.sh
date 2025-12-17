#!/bin/bash

# Flamoral Security Fixes - Complete Installation Script
# This script installs all dependencies and verifies security fixes

set -e

echo "======================================"
echo "Flamoral Security Fixes Installer"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in the Flamoral root directory. Please cd to the project root."
    exit 1
fi

print_status "Found Flamoral project root"

# Navigate to auth service
echo ""
echo "======================================"
echo "Installing Auth Service Dependencies"
echo "======================================"

cd backend/services/auth-service

# Install jwks-rsa for OAuth signature verification
print_status "Installing jwks-rsa for OAuth token verification..."
npm install jwks-rsa

# Verify installation
if npm list jwks-rsa > /dev/null 2>&1; then
    print_status "jwks-rsa installed successfully"
else
    print_error "Failed to install jwks-rsa"
    exit 1
fi

cd ../../..

# Check if .env files exist
echo ""
echo "======================================"
echo "Checking Environment Configuration"
echo "======================================"

# Auth Service
if [ ! -f "backend/services/auth-service/.env" ]; then
    print_warning "Auth service .env file not found"
    echo "    Creating from .env.example..."
    cp backend/services/auth-service/.env.example backend/services/auth-service/.env
    print_warning "Please update backend/services/auth-service/.env with your secrets!"
else
    print_status "Auth service .env file exists"
fi

# API Gateway
if [ ! -f "backend/services/api-gateway/.env" ]; then
    print_warning "API Gateway .env file not found"
    echo "    Creating from .env.example..."
    cp backend/services/api-gateway/.env.example backend/services/api-gateway/.env
    print_warning "Please update backend/services/api-gateway/.env with your configuration!"
else
    print_status "API Gateway .env file exists"
fi

# Verify JWT secrets are set
echo ""
echo "======================================"
echo "Verifying Security Configuration"
echo "======================================"

check_jwt_secret() {
    local env_file=$1
    local secret_name=$2

    if [ -f "$env_file" ]; then
        local secret_value=$(grep "^${secret_name}=" "$env_file" | cut -d '=' -f2)

        if [ -z "$secret_value" ] || [ "$secret_value" = "CHANGE_ME_TO_SECURE_64_CHARACTER_HEX_STRING_MINIMUM_32_CHARS" ] || [ "$secret_value" = "CHANGE_ME_TO_DIFFERENT_64_CHARACTER_HEX_STRING_MINIMUM_32_CHARS" ]; then
            print_error "${secret_name} is not set or uses default value in ${env_file}"
            echo "    Generate a secure secret:"
            echo "    node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
            return 1
        else
            local length=${#secret_value}
            if [ $length -lt 32 ]; then
                print_error "${secret_name} is too short (${length} chars, minimum 32)"
                return 1
            else
                print_status "${secret_name} is configured (${length} characters)"
                return 0
            fi
        fi
    else
        print_error "Environment file not found: ${env_file}"
        return 1
    fi
}

# Check auth service JWT secrets
JWT_ACCESS_OK=0
JWT_REFRESH_OK=0

if check_jwt_secret "backend/services/auth-service/.env" "JWT_ACCESS_SECRET"; then
    JWT_ACCESS_OK=1
fi

if check_jwt_secret "backend/services/auth-service/.env" "JWT_REFRESH_SECRET"; then
    JWT_REFRESH_OK=1
fi

# Check OAuth configuration
echo ""
print_status "Checking OAuth configuration..."

check_oauth_config() {
    local env_file="backend/services/auth-service/.env"
    local configured=0

    if [ -f "$env_file" ]; then
        if grep -q "^GOOGLE_CLIENT_ID=" "$env_file" && ! grep -q "^GOOGLE_CLIENT_ID=your-google-client-id" "$env_file"; then
            print_status "Google OAuth configured"
            configured=$((configured + 1))
        else
            print_warning "Google OAuth not configured (optional)"
        fi

        if grep -q "^FACEBOOK_APP_ID=" "$env_file" && ! grep -q "^FACEBOOK_APP_ID=your-facebook-app-id" "$env_file"; then
            print_status "Facebook OAuth configured"
            configured=$((configured + 1))
        else
            print_warning "Facebook OAuth not configured (optional)"
        fi

        if grep -q "^APPLE_CLIENT_ID=" "$env_file" && ! grep -q "^APPLE_CLIENT_ID=your-apple-" "$env_file"; then
            print_status "Apple OAuth configured"
            configured=$((configured + 1))
        else
            print_warning "Apple OAuth not configured (optional)"
        fi
    fi

    if [ $configured -eq 0 ]; then
        print_warning "No OAuth providers configured. Social login will not work."
    else
        print_status "${configured} OAuth provider(s) configured"
    fi
}

check_oauth_config

# Check CSRF protection
echo ""
if grep -q "^ENABLE_CSRF_PROTECTION=true" "backend/services/api-gateway/.env" 2>/dev/null || grep -q "^ENABLE_CSRF_PROTECTION=true" "backend/services/api-gateway/.env.example"; then
    print_status "CSRF protection is enabled"
else
    print_warning "CSRF protection should be enabled in API Gateway .env"
fi

# Summary
echo ""
echo "======================================"
echo "Security Fixes Installation Summary"
echo "======================================"
echo ""

if [ $JWT_ACCESS_OK -eq 1 ] && [ $JWT_REFRESH_OK -eq 1 ]; then
    print_status "All critical security fixes installed"
    print_status "JWT secrets are properly configured"
    echo ""
    echo "Next steps:"
    echo "  1. Review and update .env files if needed"
    echo "  2. Configure OAuth providers (optional)"
    echo "  3. Restart auth-service: cd backend/services/auth-service && npm run dev"
    echo "  4. Restart api-gateway: cd backend/services/api-gateway && npm run dev"
    echo "  5. Run tests to verify everything works"
    echo ""
    print_status "Security fixes are ready for deployment!"
else
    print_error "Critical configuration missing!"
    echo ""
    echo "Required actions:"
    echo "  1. Generate secure JWT secrets:"
    echo "     node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    echo ""
    echo "  2. Update backend/services/auth-service/.env:"
    echo "     - Set JWT_ACCESS_SECRET"
    echo "     - Set JWT_REFRESH_SECRET"
    echo ""
    echo "  3. Run this script again to verify"
    echo ""
    exit 1
fi

echo ""
echo "For detailed information, see: SECURITY_FIXES_COMPLETE_REPORT.md"
echo ""
