#!/bin/bash
# =============================================================================
# Flamoral Deployment Verification Script
# =============================================================================
# This script verifies that the Flamoral platform is properly deployed and
# accessible on flamoral.com
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Flamoral Deployment Verification"
echo "========================================"
echo ""

DOMAIN="${DOMAIN:-flamoral.com}"
API_DOMAIN="${API_DOMAIN:-api.flamoral.com}"
ENVIRONMENT="${ENVIRONMENT:-prod}"

PASS_COUNT=0
FAIL_COUNT=0

check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASS_COUNT++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAIL_COUNT++))
    fi
}

# =============================================================================
# DNS Verification
# =============================================================================
echo ""
echo "1. DNS Verification"
echo "-------------------"

# Check root domain resolves
dig +short $DOMAIN A > /dev/null 2>&1
check_result $? "Root domain ($DOMAIN) resolves"

# Check www subdomain
dig +short www.$DOMAIN A > /dev/null 2>&1
check_result $? "WWW subdomain (www.$DOMAIN) resolves"

# Check API subdomain
dig +short $API_DOMAIN A > /dev/null 2>&1
check_result $? "API subdomain ($API_DOMAIN) resolves"

# =============================================================================
# SSL/TLS Verification
# =============================================================================
echo ""
echo "2. SSL/TLS Certificate Verification"
echo "------------------------------------"

# Check SSL certificate is valid
SSL_CHECK=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ $? -eq 0 ]; then
    check_result 0 "SSL certificate for $DOMAIN is valid"
else
    check_result 1 "SSL certificate for $DOMAIN"
fi

# Check API SSL
SSL_CHECK_API=$(echo | openssl s_client -connect $API_DOMAIN:443 -servername $API_DOMAIN 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ $? -eq 0 ]; then
    check_result 0 "SSL certificate for $API_DOMAIN is valid"
else
    check_result 1 "SSL certificate for $API_DOMAIN"
fi

# =============================================================================
# HTTP Endpoint Verification
# =============================================================================
echo ""
echo "3. HTTP Endpoint Verification"
echo "-----------------------------"

# Check frontend is accessible
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null)
if [ "$FRONTEND_STATUS" == "200" ] || [ "$FRONTEND_STATUS" == "301" ] || [ "$FRONTEND_STATUS" == "302" ]; then
    check_result 0 "Frontend (https://$DOMAIN) responds with status $FRONTEND_STATUS"
else
    check_result 1 "Frontend (https://$DOMAIN) - got status $FRONTEND_STATUS"
fi

# Check API health endpoint
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_DOMAIN/health" 2>/dev/null)
if [ "$API_HEALTH" == "200" ]; then
    check_result 0 "API Health (https://$API_DOMAIN/health) responds with 200"
else
    check_result 1 "API Health (https://$API_DOMAIN/health) - got status $API_HEALTH"
fi

# Check API readiness
API_READY=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_DOMAIN/api/health/ready" 2>/dev/null)
if [ "$API_READY" == "200" ]; then
    check_result 0 "API Readiness (https://$API_DOMAIN/api/health/ready) responds with 200"
else
    check_result 1 "API Readiness - got status $API_READY"
fi

# =============================================================================
# Service Health Checks (if accessible)
# =============================================================================
echo ""
echo "4. Backend Service Health"
echo "-------------------------"

# Check auth service
AUTH_HEALTH=$(curl -s "https://$API_DOMAIN/api/auth/health" 2>/dev/null | grep -o '"status":"[^"]*"' | head -1)
if [[ "$AUTH_HEALTH" == *"healthy"* ]] || [[ "$AUTH_HEALTH" == *"ok"* ]]; then
    check_result 0 "Auth Service is healthy"
else
    check_result 1 "Auth Service health check"
fi

# Check user service
USER_HEALTH=$(curl -s "https://$API_DOMAIN/api/users/health" 2>/dev/null | grep -o '"status":"[^"]*"' | head -1)
if [[ "$USER_HEALTH" == *"healthy"* ]] || [[ "$USER_HEALTH" == *"ok"* ]]; then
    check_result 0 "User Service is healthy"
else
    check_result 1 "User Service health check"
fi

# Check matching service
MATCHING_HEALTH=$(curl -s "https://$API_DOMAIN/api/matching/health" 2>/dev/null | grep -o '"status":"[^"]*"' | head -1)
if [[ "$MATCHING_HEALTH" == *"healthy"* ]] || [[ "$MATCHING_HEALTH" == *"ok"* ]]; then
    check_result 0 "Matching Service is healthy"
else
    check_result 1 "Matching Service health check"
fi

# =============================================================================
# WebSocket Verification
# =============================================================================
echo ""
echo "5. WebSocket Connectivity"
echo "-------------------------"

# Basic WebSocket check (if wscat is available)
if command -v wscat &> /dev/null; then
    WS_CHECK=$(timeout 5 wscat -c "wss://$DOMAIN/ws" 2>&1 || true)
    if [[ "$WS_CHECK" != *"error"* ]]; then
        check_result 0 "WebSocket endpoint (wss://$DOMAIN/ws) is accessible"
    else
        check_result 1 "WebSocket endpoint"
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC}: wscat not installed - skipping WebSocket test"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "========================================"
echo "Verification Summary"
echo "========================================"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Domain: ${YELLOW}$DOMAIN${NC}"
echo ""
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All verification checks passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some verification checks failed. Please investigate.${NC}"
    exit 1
fi
