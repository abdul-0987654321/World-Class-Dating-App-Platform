#!/bin/bash

# Flamoral Dating Platform - Local Development Start Script
# Starts all services using docker-compose
# Usage: ./dev-start.sh [--build] [--service <service>]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BUILD=false
SERVICE=""
DETACHED=true
FOLLOW_LOGS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --build|-b)
      BUILD=true
      shift
      ;;
    --service|-s)
      SERVICE="$2"
      shift 2
      ;;
    --foreground|-f)
      DETACHED=false
      shift
      ;;
    --logs|-l)
      FOLLOW_LOGS=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -b, --build             Build images before starting"
      echo "  -s, --service <svc>     Start only specific service"
      echo "  -f, --foreground        Run in foreground (don't detach)"
      echo "  -l, --logs              Follow logs after starting"
      echo "  -h, --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                      Start all services in background"
      echo "  $0 --build              Rebuild and start all services"
      echo "  $0 --service api-gateway --logs"
      echo "  $0 --foreground         Start and show logs"
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
echo -e "${BLUE}║  Flamoral Dating Platform - Local Development           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env file exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo -e "${YELLOW}⚠ No .env file found. Creating from .env.example...${NC}"
  cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
  echo -e "${GREEN}✓ Created .env file${NC}"
  echo -e "${YELLOW}  Please review and update the values in .env${NC}"
  echo ""
fi

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
fi

# Check Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker not found. Please install Docker first.${NC}"
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo -e "${RED}✗ docker-compose not found. Please install docker-compose first.${NC}"
  exit 1
fi

# Build compose command
COMPOSE_CMD="docker-compose -f $SCRIPT_DIR/docker-compose.yml"

if [ -n "$SERVICE" ]; then
  echo -e "${BLUE}Starting service: ${GREEN}$SERVICE${NC}"
else
  echo -e "${BLUE}Starting all services...${NC}"
fi
echo ""

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
if [ -n "$SERVICE" ]; then
  $COMPOSE_CMD stop $SERVICE
else
  $COMPOSE_CMD down
fi
echo ""

# Build if requested
if [ "$BUILD" = true ]; then
  echo -e "${YELLOW}Building Docker images...${NC}"
  if [ -n "$SERVICE" ]; then
    $COMPOSE_CMD build $SERVICE
  else
    $COMPOSE_CMD build
  fi
  echo -e "${GREEN}✓ Build completed${NC}"
  echo ""
fi

# Start services
echo -e "${YELLOW}Starting services...${NC}"
if [ "$DETACHED" = true ]; then
  if [ -n "$SERVICE" ]; then
    $COMPOSE_CMD up -d $SERVICE
  else
    $COMPOSE_CMD up -d
  fi
  echo ""
  echo -e "${GREEN}✓ Services started in background${NC}"
else
  if [ -n "$SERVICE" ]; then
    $COMPOSE_CMD up $SERVICE
  else
    $COMPOSE_CMD up
  fi
  exit 0
fi

# Wait for services to be healthy
echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 5

# Show status
echo ""
echo -e "${BLUE}Service Status:${NC}"
$COMPOSE_CMD ps

# Show service URLs
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Service URLs                                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}API Gateway:${NC}        http://localhost:4000"
echo -e "  ${GREEN}API Gateway Health:${NC} http://localhost:4000/health"
echo -e "  ${GREEN}API Gateway Docs:${NC}   http://localhost:4000/api/docs"
echo ""
echo -e "  ${BLUE}Infrastructure:${NC}"
echo -e "  - PostgreSQL:        localhost:5432"
echo -e "  - Redis:             localhost:6379"
echo -e "  - MongoDB:           localhost:27017"
echo -e "  - MinIO:             http://localhost:9000"
echo -e "  - MinIO Console:     http://localhost:9001"
echo -e "  - RabbitMQ:          http://localhost:15672"
echo -e "  - Elasticsearch:     http://localhost:9200"
echo ""
echo -e "  ${BLUE}Backend Services:${NC}"
echo -e "  - Auth Service:      http://localhost:4001"
echo -e "  - User Service:      http://localhost:4002"
echo -e "  - Matching Service:  http://localhost:4003"
echo -e "  - Messaging Service: http://localhost:4004"
echo -e "  - Media Service:     http://localhost:4005"
echo -e "  - Payment Service:   http://localhost:4006"
echo -e "  - Notification:      http://localhost:4007"
echo -e "  - Analytics:         http://localhost:4008"
echo -e "  - Moderation:        http://localhost:4009"
echo -e "  - Admin Service:     http://localhost:4010"
echo -e "  - Realtime Service:  http://localhost:4011"
echo ""
echo -e "  ${BLUE}AI Services:${NC}"
echo -e "  - Recommendation:    http://localhost:5000"
echo -e "  - NLP Service:       http://localhost:5001"
echo -e "  - Photo Analysis:    http://localhost:5002"
echo -e "  - Fraud Detection:   http://localhost:5003"
echo -e "  - Dating Coach:      http://localhost:5004"
echo -e "  - Content Generator: http://localhost:5005"
echo ""

# Useful commands
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Useful Commands                                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}View logs:${NC}"
echo -e "    docker-compose -f $SCRIPT_DIR/docker-compose.yml logs -f"
echo -e "    docker-compose -f $SCRIPT_DIR/docker-compose.yml logs -f <service>"
echo ""
echo -e "  ${GREEN}Stop services:${NC}"
echo -e "    docker-compose -f $SCRIPT_DIR/docker-compose.yml stop"
echo -e "    docker-compose -f $SCRIPT_DIR/docker-compose.yml stop <service>"
echo ""
echo -e "  ${GREEN}Restart services:${NC}"
echo -e "    docker-compose -f $SCRIPT_DIR/docker-compose.yml restart"
echo -e "    docker-compose -f $SCRIPT_DIR/docker-compose.yml restart <service>"
echo ""
echo -e "  ${GREEN}Remove all containers:${NC}"
echo -e "    docker-compose -f $SCRIPT_DIR/docker-compose.yml down"
echo ""
echo -e "  ${GREEN}Remove containers and volumes:${NC}"
echo -e "    docker-compose -f $SCRIPT_DIR/docker-compose.yml down -v"
echo ""

# Follow logs if requested
if [ "$FOLLOW_LOGS" = true ]; then
  echo -e "${YELLOW}Following logs (Ctrl+C to exit)...${NC}"
  echo ""
  if [ -n "$SERVICE" ]; then
    $COMPOSE_CMD logs -f $SERVICE
  else
    $COMPOSE_CMD logs -f
  fi
fi
