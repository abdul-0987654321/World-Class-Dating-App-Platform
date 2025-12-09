#!/bin/bash

# Media Service API Test Runner
# This script runs the comprehensive E2E tests for the Media Service

set -e

echo "=========================================="
echo "Media Service API E2E Tests"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo -e "${YELLOW}Checking if required services are running...${NC}"

# Check Auth Service
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Auth Service is running (Port 3001)${NC}"
else
    echo -e "${RED}✗ Auth Service is not running (Port 3001)${NC}"
    echo "Please start the Auth Service first:"
    echo "  cd backend/services/auth-service && npm run dev"
    exit 1
fi

# Check Media Service
if curl -s http://localhost:3005/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Media Service is running (Port 3005)${NC}"
else
    echo -e "${RED}✗ Media Service is not running (Port 3005)${NC}"
    echo "Please start the Media Service first:"
    echo "  cd backend/services/media-service && npm run dev"
    exit 1
fi

echo ""
echo -e "${YELLOW}Starting test execution...${NC}"
echo ""

# Parse command line arguments
TEST_FILTER=""
WATCH_MODE=""
COVERAGE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --photo)
            TEST_FILTER="Photo Upload"
            shift
            ;;
        --video)
            TEST_FILTER="Video Upload"
            shift
            ;;
        --voice)
            TEST_FILTER="Voice Note Upload"
            shift
            ;;
        --auth)
            TEST_FILTER="Authentication"
            shift
            ;;
        --watch)
            WATCH_MODE="--watch"
            shift
            ;;
        --coverage)
            COVERAGE="--coverage"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--photo|--video|--voice|--auth] [--watch] [--coverage]"
            exit 1
            ;;
    esac
done

# Run tests
if [ -n "$TEST_FILTER" ]; then
    echo -e "${YELLOW}Running filtered tests: ${TEST_FILTER}${NC}"
    npx jest tests/e2e/api/media-api.spec.ts -t "$TEST_FILTER" $WATCH_MODE $COVERAGE --verbose
else
    echo -e "${YELLOW}Running all Media API tests...${NC}"
    npx jest tests/e2e/api/media-api.spec.ts $WATCH_MODE $COVERAGE --verbose
fi

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "All tests passed successfully! ✓"
    echo -e "==========================================${NC}"
else
    echo ""
    echo -e "${RED}=========================================="
    echo "Some tests failed! ✗"
    echo -e "==========================================${NC}"
    exit 1
fi
