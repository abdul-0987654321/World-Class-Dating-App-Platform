#!/bin/bash

# Service Configuration Verification Script
# This script verifies that all backend services are properly configured

echo "========================================"
echo "Backend Service Configuration Verifier"
echo "========================================"
echo ""

# Define services and their ports
declare -A services=(
  ["api-gateway"]=4000
  ["auth-service"]=3001
  ["user-service"]=3001
  ["matching-service"]=3002
  ["messaging-service"]=3003
  ["moderation-service"]=3004
  ["payment-service"]=3005
  ["media-service"]=3006
  ["analytics-service"]=3007
  ["notification-service"]=3008
  ["advertising-service"]=3010
  ["workflow-engine"]=3011
)

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

total_checks=0
passed_checks=0
failed_checks=0

echo "Checking service configurations..."
echo ""

for service in "${!services[@]}"; do
  port=${services[$service]}
  echo "---------------------------------------"
  echo "Service: $service (Port: $port)"
  echo "---------------------------------------"

  # Check if main.ts exists
  if [ -f "$service/src/main.ts" ]; then
    echo -e "${GREEN}✓${NC} main.ts exists"
    ((total_checks++))
    ((passed_checks++))

    # Check if port is configured correctly
    if grep -q "|| $port" "$service/src/main.ts"; then
      echo -e "${GREEN}✓${NC} Port $port configured correctly"
      ((total_checks++))
      ((passed_checks++))
    else
      echo -e "${RED}✗${NC} Port $port not found in configuration"
      ((total_checks++))
      ((failed_checks++))
    fi

    # Check if CORS is configured
    if grep -q "enableCors" "$service/src/main.ts"; then
      echo -e "${GREEN}✓${NC} CORS configured"
      ((total_checks++))
      ((passed_checks++))
    else
      echo -e "${RED}✗${NC} CORS not configured"
      ((total_checks++))
      ((failed_checks++))
    fi

    # Check if health endpoint exclusion exists
    if grep -q "health" "$service/src/main.ts"; then
      echo -e "${GREEN}✓${NC} Health endpoint configuration found"
      ((total_checks++))
      ((passed_checks++))
    else
      echo -e "${YELLOW}⚠${NC} Health endpoint configuration not found"
      ((total_checks++))
      ((failed_checks++))
    fi

    # Check if Swagger is configured
    if grep -q "SwaggerModule" "$service/src/main.ts"; then
      echo -e "${GREEN}✓${NC} Swagger documentation configured"
      ((total_checks++))
      ((passed_checks++))
    else
      echo -e "${RED}✗${NC} Swagger documentation not configured"
      ((total_checks++))
      ((failed_checks++))
    fi

  else
    echo -e "${RED}✗${NC} main.ts does NOT exist"
    ((total_checks++))
    ((failed_checks++))
  fi

  # Check if health controller exists
  if [ -f "$service/src/health/health.controller.ts" ]; then
    echo -e "${GREEN}✓${NC} Health controller exists"
    ((total_checks++))
    ((passed_checks++))
  else
    echo -e "${YELLOW}⚠${NC} Health controller does NOT exist"
    ((total_checks++))
  fi

  # Check if app.module.ts exists
  if [ -f "$service/src/app.module.ts" ]; then
    echo -e "${GREEN}✓${NC} App module exists"
    ((total_checks++))
    ((passed_checks++))
  else
    echo -e "${YELLOW}⚠${NC} App module does NOT exist (needs to be created)"
    ((total_checks++))
  fi

  # Check if package.json exists
  if [ -f "$service/package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json exists"
    ((total_checks++))
    ((passed_checks++))
  else
    echo -e "${YELLOW}⚠${NC} package.json does NOT exist (needs to be created)"
    ((total_checks++))
  fi

  echo ""
done

echo "========================================"
echo "Verification Summary"
echo "========================================"
echo "Total checks: $total_checks"
echo -e "Passed: ${GREEN}$passed_checks${NC}"
echo -e "Failed/Warning: ${YELLOW}$((total_checks - passed_checks))${NC}"
echo ""

# Calculate success rate
success_rate=$((passed_checks * 100 / total_checks))
echo "Success rate: $success_rate%"
echo ""

if [ $success_rate -ge 80 ]; then
  echo -e "${GREEN}✓ Configuration is in good shape!${NC}"
  exit 0
elif [ $success_rate -ge 60 ]; then
  echo -e "${YELLOW}⚠ Configuration needs some work.${NC}"
  exit 1
else
  echo -e "${RED}✗ Configuration needs significant work.${NC}"
  exit 2
fi
