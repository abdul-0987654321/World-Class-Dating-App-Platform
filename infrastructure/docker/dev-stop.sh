#!/bin/bash

# Flamoral Dating Platform - Local Development Stop Script
# Stops all services and optionally removes volumes
# Usage: ./dev-stop.sh [--clean] [--service <service>]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CLEAN=false
SERVICE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --clean|-c)
      CLEAN=true
      shift
      ;;
    --service|-s)
      SERVICE="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -c, --clean             Remove volumes (WARNING: deletes all data)"
      echo "  -s, --service <svc>     Stop only specific service"
      echo "  -h, --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                      Stop all services"
      echo "  $0 --clean              Stop all services and remove volumes"
      echo "  $0 --service api-gateway"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Flamoral Dating Platform - Stop Services               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Build compose command
COMPOSE_CMD="docker-compose -f $SCRIPT_DIR/docker-compose.yml"

if [ -n "$SERVICE" ]; then
  echo -e "${YELLOW}Stopping service: ${BLUE}$SERVICE${NC}"
  $COMPOSE_CMD stop $SERVICE

  if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}⚠ Cannot remove volumes for individual service${NC}"
    echo -e "${YELLOW}  Use --clean without --service to remove all volumes${NC}"
  fi
else
  if [ "$CLEAN" = true ]; then
    echo -e "${RED}⚠ WARNING: This will delete all data in volumes!${NC}"
    echo -e "${YELLOW}Press Ctrl+C to cancel, or Enter to continue...${NC}"
    read

    echo -e "${YELLOW}Stopping services and removing volumes...${NC}"
    $COMPOSE_CMD down -v
    echo -e "${GREEN}✓ Services stopped and volumes removed${NC}"
  else
    echo -e "${YELLOW}Stopping all services...${NC}"
    $COMPOSE_CMD down
    echo -e "${GREEN}✓ Services stopped${NC}"
  fi
fi

echo ""
echo -e "${GREEN}✓ Stopped successfully${NC}"
echo ""
