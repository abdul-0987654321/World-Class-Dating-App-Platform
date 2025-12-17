#!/bin/bash

# WebSocket/Real-time Configuration Verification Script
# This script checks if all required configurations are in place

set -e

echo "=================================================="
echo "WebSocket/Real-time Configuration Verification"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((FAILED++))
        return 1
    fi
}

# Function to check if a string exists in a file
check_string_in_file() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Found '$2' in $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} Missing '$2' in $1"
        ((FAILED++))
        return 1
    fi
}

# Function to check environment variable in file
check_env_var() {
    if grep -q "^${2}=" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Environment variable '$2' found in $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} Environment variable '$2' missing in $1"
        ((FAILED++))
        return 1
    fi
}

echo "1. Checking Realtime Service Configuration"
echo "-------------------------------------------"

REALTIME_ENV="backend/services/realtime-service/.env"
REALTIME_ENV_EXAMPLE="backend/services/realtime-service/.env.example"

if [ -f "$REALTIME_ENV" ]; then
    echo "Checking $REALTIME_ENV..."
    check_env_var "$REALTIME_ENV" "SERVICE_TOKEN"
    check_env_var "$REALTIME_ENV" "REDIS_TLS"
    check_env_var "$REALTIME_ENV" "JWT_SECRET"
    check_env_var "$REALTIME_ENV" "JWT_ISSUER"
    check_env_var "$REALTIME_ENV" "ALLOWED_ORIGINS"

    # Check if JWT_ISSUER is set to flamoral-auth-service
    if grep -q "JWT_ISSUER=flamoral-auth-service" "$REALTIME_ENV"; then
        echo -e "${GREEN}✓${NC} JWT_ISSUER correctly set to 'flamoral-auth-service'"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} JWT_ISSUER should be 'flamoral-auth-service'"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} $REALTIME_ENV not found, checking .env.example..."
    ((WARNINGS++))
    if [ -f "$REALTIME_ENV_EXAMPLE" ]; then
        check_env_var "$REALTIME_ENV_EXAMPLE" "SERVICE_TOKEN"
        check_env_var "$REALTIME_ENV_EXAMPLE" "REDIS_TLS"
    fi
fi

echo ""
echo "2. Checking Messaging Service Configuration"
echo "--------------------------------------------"

MESSAGING_ENV="backend/services/messaging-service/.env"
MESSAGING_INDEX="backend/services/messaging-service/src/index.ts"

if [ -f "$MESSAGING_INDEX" ]; then
    echo "Checking $MESSAGING_INDEX..."
    check_string_in_file "$MESSAGING_INDEX" "Socket.IO"
    check_string_in_file "$MESSAGING_INDEX" "transports: \['websocket', 'polling'\]"
    check_string_in_file "$MESSAGING_INDEX" "credentials: true"
else
    echo -e "${RED}✗${NC} Messaging service index.ts not found"
    ((FAILED++))
fi

echo ""
echo "3. Checking Mobile App WebSocket Configuration"
echo "-----------------------------------------------"

MOBILE_WS="apps/mobile-app/src/services/realtime/WebSocketService.ts"
MOBILE_CONFIG="apps/mobile-app/src/services/api/config.ts"

if [ -f "$MOBILE_WS" ]; then
    echo "Checking $MOBILE_WS..."
    if grep -q "path: '/socket.io'" "$MOBILE_WS"; then
        echo -e "${GREEN}✓${NC} Socket.IO path configured"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Missing 'path: /socket.io' in WebSocket config"
        echo -e "${YELLOW}  Fix: Add 'path: '/socket.io'' to io() options${NC}"
        ((FAILED++))
    fi

    if grep -q "transports:.*'websocket'.*'polling'" "$MOBILE_WS"; then
        echo -e "${GREEN}✓${NC} Dual transport configured"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Should configure both websocket and polling transports"
        ((WARNINGS++))
    fi

    if grep -q "withCredentials: true" "$MOBILE_WS"; then
        echo -e "${GREEN}✓${NC} Credentials enabled"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Should enable withCredentials for CORS"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} Mobile WebSocket service not found"
    ((FAILED++))
fi

if [ -f "$MOBILE_CONFIG" ]; then
    echo "Checking $MOBILE_CONFIG..."
    if grep -q "WEBSOCKET_URL" "$MOBILE_CONFIG"; then
        echo -e "${GREEN}✓${NC} WebSocket URL configured in API config"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Consider adding WEBSOCKET_URL to API config"
        ((WARNINGS++))
    fi
fi

echo ""
echo "4. Checking Web App Configuration"
echo "----------------------------------"

WEB_SOCKET="apps/web-app/src/services/socket.service.ts"
WEB_ENV="apps/web-app/.env"

if [ -f "$WEB_SOCKET" ]; then
    echo "Checking $WEB_SOCKET..."
    check_string_in_file "$WEB_SOCKET" "path: '/socket.io'"
    check_string_in_file "$WEB_SOCKET" "transports:"
    check_string_in_file "$WEB_SOCKET" "withCredentials: true"
else
    echo -e "${RED}✗${NC} Web socket service not found"
    ((FAILED++))
fi

if [ -f "$WEB_ENV" ]; then
    echo "Checking $WEB_ENV..."
    check_env_var "$WEB_ENV" "VITE_SOCKET_URL"
else
    echo -e "${YELLOW}⚠${NC} Web app .env not found, create it with VITE_SOCKET_URL"
    ((WARNINGS++))
fi

echo ""
echo "5. Checking Documentation"
echo "-------------------------"

check_file "WEBSOCKET_QUICK_FIX.md"
check_file "WEBSOCKET_REALTIME_FIXES_COMPLETE.md"
check_file "WEBSOCKET_FIX_INDEX.md"
check_file "backend/services/realtime-service/PRODUCTION_ENV_SETUP.md"

echo ""
echo "6. Checking Required Services"
echo "------------------------------"

# Check if services are installed
if command -v go &> /dev/null; then
    echo -e "${GREEN}✓${NC} Go is installed (for realtime-service)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Go is not installed"
    ((FAILED++))
fi

if command -v node &> /dev/null; then
    echo -e "${GREEN}✓${NC} Node.js is installed"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Node.js is not installed"
    ((FAILED++))
fi

echo ""
echo "=================================================="
echo "Verification Summary"
echo "=================================================="
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC}   $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed! WebSocket configuration is ready.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ Configuration is mostly ready, but has some warnings.${NC}"
        echo "  Review the warnings above and consider addressing them."
        exit 0
    fi
else
    echo -e "${RED}✗ Configuration has issues that need to be fixed.${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Review WEBSOCKET_QUICK_FIX.md for immediate fixes"
    echo "2. Address the failed checks above"
    echo "3. Run this script again to verify"
    exit 1
fi
