#!/bin/bash

# Flamoral Dating Platform - Setup Verification Script
# Verifies that all required files and configurations are in place

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Flamoral Dating Platform - Setup Verification          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PASSED=0
FAILED=0
WARNINGS=0

check_file() {
  local file=$1
  local description=$2

  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $description"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $description - File not found: $file"
    ((FAILED++))
  fi
}

check_executable() {
  local file=$1
  local description=$2

  if [ -x "$file" ]; then
    echo -e "${GREEN}✓${NC} $description"
    ((PASSED++))
  elif [ -f "$file" ]; then
    echo -e "${YELLOW}⚠${NC} $description - File exists but not executable"
    echo -e "  Run: chmod +x $file"
    ((WARNINGS++))
  else
    echo -e "${RED}✗${NC} $description - File not found: $file"
    ((FAILED++))
  fi
}

check_command() {
  local cmd=$1
  local description=$2

  if command -v $cmd &> /dev/null; then
    local version=$($cmd --version 2>&1 | head -n 1)
    echo -e "${GREEN}✓${NC} $description - $version"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $description - Command not found: $cmd"
    ((FAILED++))
  fi
}

check_optional_command() {
  local cmd=$1
  local description=$2

  if command -v $cmd &> /dev/null; then
    local version=$($cmd --version 2>&1 | head -n 1)
    echo -e "${GREEN}✓${NC} $description - $version"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} $description - Optional: $cmd not installed"
    ((WARNINGS++))
  fi
}

# Check Prerequisites
echo -e "${YELLOW}Checking Prerequisites...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_command docker "Docker"
check_command docker-compose "Docker Compose"
check_optional_command az "Azure CLI"
check_optional_command kubectl "Kubernetes CLI"
check_optional_command make "GNU Make"
echo ""

# Check Scripts
echo -e "${YELLOW}Checking Scripts...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_executable "$SCRIPT_DIR/build-all.sh" "build-all.sh"
check_executable "$SCRIPT_DIR/push-all.sh" "push-all.sh"
check_executable "$SCRIPT_DIR/deploy.sh" "deploy.sh"
check_executable "$SCRIPT_DIR/dev-start.sh" "dev-start.sh"
check_executable "$SCRIPT_DIR/dev-stop.sh" "dev-stop.sh"
check_executable "$SCRIPT_DIR/health-check.sh" "health-check.sh"
echo ""

# Check Configuration Files
echo -e "${YELLOW}Checking Configuration Files...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "$SCRIPT_DIR/docker-compose.yml" "docker-compose.yml"
check_file "$SCRIPT_DIR/docker-compose.override.yml" "docker-compose.override.yml"
check_file "$SCRIPT_DIR/.env.example" ".env.example"
check_file "$SCRIPT_DIR/Makefile" "Makefile"
check_file "$SCRIPT_DIR/.gitignore" ".gitignore"

if [ -f "$SCRIPT_DIR/.env" ]; then
  echo -e "${GREEN}✓${NC} .env file exists"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠${NC} .env file not found - will be created from .env.example"
  ((WARNINGS++))
fi
echo ""

# Check Documentation
echo -e "${YELLOW}Checking Documentation...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "$SCRIPT_DIR/README.md" "README.md"
check_file "$SCRIPT_DIR/QUICK_START.md" "QUICK_START.md"
check_file "$SCRIPT_DIR/IMPLEMENTATION_SUMMARY.md" "IMPLEMENTATION_SUMMARY.md"
echo ""

# Check Init Scripts
echo -e "${YELLOW}Checking Init Scripts...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "$SCRIPT_DIR/init-scripts/postgres/init.sql" "PostgreSQL init script"
echo ""

# Check Dockerfiles
echo -e "${YELLOW}Checking Dockerfiles...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BACKEND_DIR="$SCRIPT_DIR/../../backend/services"

# Node.js services
NODE_SERVICES=(
  "api-gateway"
  "auth-service"
  "user-service"
  "matching-service"
  "messaging-service"
  "media-service"
  "payment-service"
  "notification-service"
  "analytics-service"
  "moderation-service"
  "admin-service"
)

for service in "${NODE_SERVICES[@]}"; do
  if [ -f "$BACKEND_DIR/$service/Dockerfile" ]; then
    echo -e "${GREEN}✓${NC} $service/Dockerfile"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} $service/Dockerfile not found"
    ((WARNINGS++))
  fi
done

# Python AI services
PYTHON_SERVICES=(
  "ai-services/recommendation-service"
  "ai-services/nlp-service"
  "ai-services/photo-analysis"
  "ai-services/fraud-detection"
  "ai-services/dating-coach-service"
  "ai-services/content-generator"
)

for service in "${PYTHON_SERVICES[@]}"; do
  if [ -f "$BACKEND_DIR/$service/Dockerfile" ]; then
    echo -e "${GREEN}✓${NC} $service/Dockerfile"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} $service/Dockerfile not found"
    ((WARNINGS++))
  fi
done
echo ""

# Check Docker Daemon
echo -e "${YELLOW}Checking Docker Daemon...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker info &> /dev/null; then
  echo -e "${GREEN}✓${NC} Docker daemon is running"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Docker daemon is not running"
  echo -e "  Start Docker and try again"
  ((FAILED++))
fi
echo ""

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Verification Summary                                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Passed:   ${GREEN}$PASSED${NC}"
echo -e "  Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "  Failed:   ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ Setup verification passed!${NC}"
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo -e "  1. Review and update .env file"
  echo -e "  2. Run: ${YELLOW}./dev-start.sh${NC}"
  echo -e "  3. Check health: ${YELLOW}./health-check.sh${NC}"
  echo ""

  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Note: There are $WARNINGS warning(s) that should be addressed.${NC}"
  fi

  exit 0
else
  echo -e "${RED}✗ Setup verification failed with $FAILED error(s)${NC}"
  echo -e "${YELLOW}Please fix the errors above and run verification again.${NC}"
  exit 1
fi
