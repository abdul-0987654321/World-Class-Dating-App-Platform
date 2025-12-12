#!/bin/bash

# Flamoral Dating Platform - Health Check Script
# Checks health of all running services
# Usage: ./health-check.sh [--service <service>]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SERVICE=""
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --service|-s)
      SERVICE="$2"
      shift 2
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -s, --service <svc>     Check only specific service"
      echo "  -v, --verbose           Show detailed information"
      echo "  -h, --help              Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Flamoral Dating Platform - Health Check                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Health check endpoints
declare -A HEALTH_ENDPOINTS=(
  ["api-gateway"]="http://localhost:4000/health"
  ["auth-service"]="http://localhost:4001/health"
  ["user-service"]="http://localhost:4002/health"
  ["matching-service"]="http://localhost:4003/health"
  ["messaging-service"]="http://localhost:4004/health"
  ["media-service"]="http://localhost:4005/health"
  ["payment-service"]="http://localhost:4006/health"
  ["notification-service"]="http://localhost:4007/health"
  ["analytics-service"]="http://localhost:4008/health"
  ["moderation-service"]="http://localhost:4009/health"
  ["admin-service"]="http://localhost:4010/health"
  ["realtime-service"]="http://localhost:4011/health"
  ["recommendation-service"]="http://localhost:5000/health"
  ["nlp-service"]="http://localhost:5001/health"
  ["photo-analysis"]="http://localhost:5002/health"
  ["fraud-detection"]="http://localhost:5003/health"
  ["dating-coach-service"]="http://localhost:5004/health"
  ["content-generator"]="http://localhost:5005/health"
)

# Infrastructure endpoints
declare -A INFRA_ENDPOINTS=(
  ["postgres"]="localhost:5432"
  ["redis"]="localhost:6379"
  ["mongodb"]="localhost:27017"
  ["minio"]="http://localhost:9000/minio/health/live"
  ["rabbitmq"]="http://localhost:15672"
  ["elasticsearch"]="http://localhost:9200/_cluster/health"
)

# Check service health
check_service_health() {
  local service=$1
  local endpoint=$2

  if [ "$VERBOSE" = true ]; then
    echo -ne "  ${BLUE}$service${NC} "
  else
    echo -ne "  ${BLUE}${service}:${NC} "
  fi

  # Pad service name for alignment
  local padding=$((30 - ${#service}))
  printf "%${padding}s"

  # Make HTTP request
  response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$endpoint" 2>/dev/null || echo "000")

  if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Healthy${NC}"
    return 0
  elif [ "$response" = "000" ]; then
    echo -e "${RED}✗ Not Running${NC}"
    return 1
  else
    echo -e "${YELLOW}⚠ Unhealthy (HTTP $response)${NC}"
    return 1
  fi
}

# Check infrastructure health
check_infra_health() {
  local service=$1
  local endpoint=$2

  echo -ne "  ${BLUE}${service}:${NC} "

  # Pad service name for alignment
  local padding=$((30 - ${#service}))
  printf "%${padding}s"

  case $service in
    postgres)
      if pg_isready -h localhost -p 5432 &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
      else
        echo -e "${RED}✗ Not Running${NC}"
        return 1
      fi
      ;;
    redis)
      if redis-cli -h localhost -p 6379 ping &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
      else
        echo -e "${RED}✗ Not Running${NC}"
        return 1
      fi
      ;;
    mongodb)
      if mongosh --host localhost:27017 --eval "db.runCommand('ping')" &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
      else
        echo -e "${RED}✗ Not Running${NC}"
        return 1
      fi
      ;;
    minio|rabbitmq|elasticsearch)
      response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$endpoint" 2>/dev/null || echo "000")
      if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
      else
        echo -e "${RED}✗ Not Running${NC}"
        return 1
      fi
      ;;
  esac
}

# Summary counters
TOTAL=0
HEALTHY=0
UNHEALTHY=0

# Check infrastructure
if [ -z "$SERVICE" ]; then
  echo -e "${YELLOW}Infrastructure Services:${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  for service in "${!INFRA_ENDPOINTS[@]}"; do
    ((TOTAL++))
    if check_infra_health "$service" "${INFRA_ENDPOINTS[$service]}"; then
      ((HEALTHY++))
    else
      ((UNHEALTHY++))
    fi
  done
  echo ""
fi

# Check application services
if [ -n "$SERVICE" ]; then
  if [ -n "${HEALTH_ENDPOINTS[$SERVICE]}" ]; then
    ((TOTAL++))
    if check_service_health "$SERVICE" "${HEALTH_ENDPOINTS[$SERVICE]}"; then
      ((HEALTHY++))
    else
      ((UNHEALTHY++))
    fi
  else
    echo -e "${RED}Unknown service: $SERVICE${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}Application Services:${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  for service in "${!HEALTH_ENDPOINTS[@]}"; do
    ((TOTAL++))
    if check_service_health "$service" "${HEALTH_ENDPOINTS[$service]}"; then
      ((HEALTHY++))
    else
      ((UNHEALTHY++))
    fi
  done
fi

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Health Summary                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Services:  ${BLUE}$TOTAL${NC}"
echo -e "  Healthy:         ${GREEN}$HEALTHY${NC}"
echo -e "  Unhealthy:       ${RED}$UNHEALTHY${NC}"
echo ""

if [ $UNHEALTHY -eq 0 ]; then
  echo -e "${GREEN}✓ All services are healthy!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠ Some services are unhealthy${NC}"
  echo -e "${YELLOW}  Run with --verbose for more details${NC}"
  exit 1
fi
