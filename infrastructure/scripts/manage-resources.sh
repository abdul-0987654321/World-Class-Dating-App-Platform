#!/bin/bash

# =============================================================================
# Flamoral Dating Platform - Azure Resource Management Script
# =============================================================================
# This script manages Azure resources to optimize costs:
# - Start/Stop AKS clusters
# - Scale down/up resources
# - Turn off non-production resources
#
# Usage: ./manage-resources.sh [start|stop|status|scale-down|scale-up]
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Resource configuration
SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-ba233460-2dbe-4603-a594-68f93ec9deb3}"

# Resource groups
declare -A RESOURCE_GROUPS
RESOURCE_GROUPS["prod"]="flamoral-prod-rg"
RESOURCE_GROUPS["americas"]="flamoral-prod-americas-rg"
RESOURCE_GROUPS["europe"]="flamoral-prod-europe-rg"
RESOURCE_GROUPS["africa"]="flamoral-prod-africa-rg"
RESOURCE_GROUPS["shared"]="flamoral-shared-rg"

# AKS clusters
declare -A AKS_CLUSTERS
AKS_CLUSTERS["prod"]="flamoral-aks"
AKS_CLUSTERS["americas"]="flamoral-aks-americas"
AKS_CLUSTERS["europe"]="flamoral-aks-europe"
AKS_CLUSTERS["africa"]="flamoral-aks-africa"

# Parse arguments
ACTION="${1:-status}"
TARGET="${2:-all}"
DRY_RUN=false

if [[ "$*" == *"--dry-run"* ]]; then
  DRY_RUN=true
fi

# Print header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Flamoral - Azure Resource Management                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check Azure CLI
check_azure_cli() {
  if ! command -v az &> /dev/null; then
    echo -e "${RED}Azure CLI not found. Please install it first.${NC}"
    exit 1
  fi

  # Check if logged in
  if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Please log in to Azure...${NC}"
    az login
  fi

  # Set subscription
  az account set --subscription "$SUBSCRIPTION_ID"
  echo -e "${GREEN}✓ Using subscription: $SUBSCRIPTION_ID${NC}"
  echo ""
}

# Function to get AKS cluster status
get_cluster_status() {
  local rg=$1
  local cluster=$2

  local power_state=$(az aks show --resource-group "$rg" --name "$cluster" \
    --query "powerState.code" -o tsv 2>/dev/null || echo "Not Found")

  echo "$power_state"
}

# Function to stop AKS cluster
stop_cluster() {
  local rg=$1
  local cluster=$2

  echo -e "${YELLOW}Stopping AKS cluster: $cluster in $rg${NC}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would stop cluster: $cluster${NC}"
    return 0
  fi

  az aks stop --resource-group "$rg" --name "$cluster" --no-wait
  echo -e "${GREEN}✓ Stop initiated for $cluster${NC}"
}

# Function to start AKS cluster
start_cluster() {
  local rg=$1
  local cluster=$2

  echo -e "${YELLOW}Starting AKS cluster: $cluster in $rg${NC}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would start cluster: $cluster${NC}"
    return 0
  fi

  az aks start --resource-group "$rg" --name "$cluster" --no-wait
  echo -e "${GREEN}✓ Start initiated for $cluster${NC}"
}

# Function to scale down AKS cluster
scale_down_cluster() {
  local rg=$1
  local cluster=$2
  local min_nodes="${3:-1}"

  echo -e "${YELLOW}Scaling down AKS cluster: $cluster to $min_nodes nodes${NC}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would scale down cluster: $cluster${NC}"
    return 0
  fi

  # Scale system node pool
  az aks nodepool update --resource-group "$rg" --cluster-name "$cluster" \
    --name systempool --min-count "$min_nodes" --max-count "$min_nodes" \
    --enable-cluster-autoscaler 2>/dev/null || true

  # Scale user node pool
  az aks nodepool update --resource-group "$rg" --cluster-name "$cluster" \
    --name userpool --min-count "$min_nodes" --max-count "$min_nodes" \
    --enable-cluster-autoscaler 2>/dev/null || true

  echo -e "${GREEN}✓ Scaled down $cluster${NC}"
}

# Function to scale up AKS cluster
scale_up_cluster() {
  local rg=$1
  local cluster=$2
  local min_system="${3:-3}"
  local max_system="${4:-5}"
  local min_user="${5:-3}"
  local max_user="${6:-20}"

  echo -e "${YELLOW}Scaling up AKS cluster: $cluster${NC}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would scale up cluster: $cluster${NC}"
    return 0
  fi

  # Scale system node pool
  az aks nodepool update --resource-group "$rg" --cluster-name "$cluster" \
    --name systempool --min-count "$min_system" --max-count "$max_system" \
    --enable-cluster-autoscaler 2>/dev/null || true

  # Scale user node pool
  az aks nodepool update --resource-group "$rg" --cluster-name "$cluster" \
    --name userpool --min-count "$min_user" --max-count "$max_user" \
    --enable-cluster-autoscaler 2>/dev/null || true

  echo -e "${GREEN}✓ Scaled up $cluster${NC}"
}

# Function to show all resource status
show_status() {
  echo -e "${YELLOW}Resource Status:${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo -e "${CYAN}AKS Clusters:${NC}"
  printf "%-20s %-30s %-15s\n" "REGION" "CLUSTER" "STATUS"
  printf "%-20s %-30s %-15s\n" "------" "-------" "------"

  for region in "${!AKS_CLUSTERS[@]}"; do
    local rg="${RESOURCE_GROUPS[$region]}"
    local cluster="${AKS_CLUSTERS[$region]}"

    if [ -n "$rg" ] && [ -n "$cluster" ]; then
      local status=$(get_cluster_status "$rg" "$cluster")

      local color="$NC"
      if [ "$status" = "Running" ]; then
        color="$GREEN"
      elif [ "$status" = "Stopped" ]; then
        color="$RED"
      fi

      printf "%-20s %-30s ${color}%-15s${NC}\n" "$region" "$cluster" "$status"
    fi
  done

  echo ""

  # Show cost estimate
  echo -e "${CYAN}Estimated Costs (when running):${NC}"
  echo "  AKS Cluster (3 nodes D4s_v3): ~\$400/month per cluster"
  echo "  PostgreSQL (GP D4s_v3):       ~\$200/month per region"
  echo "  Redis Premium P1:              ~\$150/month per region"
  echo "  Azure Front Door:              ~\$100/month"
  echo "  Storage (100GB):               ~\$20/month"
  echo ""
  echo -e "${YELLOW}Tip: Stop unused clusters to save ~70% on compute costs${NC}"
}

# Function to stop all resources
stop_all() {
  echo -e "${YELLOW}Stopping all AKS clusters...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  for region in "${!AKS_CLUSTERS[@]}"; do
    local rg="${RESOURCE_GROUPS[$region]}"
    local cluster="${AKS_CLUSTERS[$region]}"

    if [ -n "$rg" ] && [ -n "$cluster" ]; then
      local status=$(get_cluster_status "$rg" "$cluster")

      if [ "$status" = "Running" ]; then
        stop_cluster "$rg" "$cluster"
      else
        echo -e "${BLUE}$cluster is already stopped or not found${NC}"
      fi
    fi
  done

  echo ""
  echo -e "${GREEN}✓ Stop commands sent to all clusters${NC}"
  echo -e "${YELLOW}Note: Stopping may take 10-15 minutes to complete${NC}"
}

# Function to start all resources
start_all() {
  echo -e "${YELLOW}Starting all AKS clusters...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  for region in "${!AKS_CLUSTERS[@]}"; do
    local rg="${RESOURCE_GROUPS[$region]}"
    local cluster="${AKS_CLUSTERS[$region]}"

    if [ -n "$rg" ] && [ -n "$cluster" ]; then
      local status=$(get_cluster_status "$rg" "$cluster")

      if [ "$status" = "Stopped" ]; then
        start_cluster "$rg" "$cluster"
      else
        echo -e "${BLUE}$cluster is already running or not found${NC}"
      fi
    fi
  done

  echo ""
  echo -e "${GREEN}✓ Start commands sent to all clusters${NC}"
  echo -e "${YELLOW}Note: Starting may take 5-10 minutes to complete${NC}"
}

# Function to scale down all resources
scale_down_all() {
  echo -e "${YELLOW}Scaling down all AKS clusters to minimum...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  for region in "${!AKS_CLUSTERS[@]}"; do
    local rg="${RESOURCE_GROUPS[$region]}"
    local cluster="${AKS_CLUSTERS[$region]}"

    if [ -n "$rg" ] && [ -n "$cluster" ]; then
      scale_down_cluster "$rg" "$cluster" 1
    fi
  done

  echo ""
  echo -e "${GREEN}✓ Scale down commands sent to all clusters${NC}"
}

# Function to scale up all resources
scale_up_all() {
  echo -e "${YELLOW}Scaling up all AKS clusters to production capacity...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  for region in "${!AKS_CLUSTERS[@]}"; do
    local rg="${RESOURCE_GROUPS[$region]}"
    local cluster="${AKS_CLUSTERS[$region]}"

    if [ -n "$rg" ] && [ -n "$cluster" ]; then
      scale_up_cluster "$rg" "$cluster"
    fi
  done

  echo ""
  echo -e "${GREEN}✓ Scale up commands sent to all clusters${NC}"
}

# Function to deallocate VMs (most cost-effective)
deallocate_resources() {
  echo -e "${YELLOW}Deallocating Azure resources to save costs...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Stop all AKS clusters
  stop_all

  echo ""
  echo -e "${GREEN}✓ Resources deallocated${NC}"
  echo ""
  echo -e "${CYAN}Cost savings when stopped:${NC}"
  echo "  • AKS compute: ~\$0 (no VM charges when stopped)"
  echo "  • Storage: Minimal (only disk storage charges)"
  echo "  • Data services: Continue to incur charges"
  echo ""
  echo -e "${YELLOW}To restart resources, run: $0 start${NC}"
}

# Print help
show_help() {
  echo "Usage: $0 [COMMAND] [OPTIONS]"
  echo ""
  echo "Commands:"
  echo "  status       Show status of all resources (default)"
  echo "  start        Start all AKS clusters"
  echo "  stop         Stop all AKS clusters (saves compute costs)"
  echo "  scale-down   Scale clusters to minimum nodes"
  echo "  scale-up     Scale clusters to production capacity"
  echo "  deallocate   Stop all resources to save maximum costs"
  echo ""
  echo "Options:"
  echo "  --dry-run    Show what would be done without executing"
  echo ""
  echo "Examples:"
  echo "  $0 status              # Show resource status"
  echo "  $0 stop                # Stop all clusters"
  echo "  $0 start               # Start all clusters"
  echo "  $0 stop --dry-run      # Preview stop action"
  echo ""
}

# Main execution
main() {
  check_azure_cli

  case "$ACTION" in
    status)
      show_status
      ;;
    start)
      start_all
      ;;
    stop)
      stop_all
      ;;
    scale-down)
      scale_down_all
      ;;
    scale-up)
      scale_up_all
      ;;
    deallocate)
      deallocate_resources
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      echo -e "${RED}Unknown command: $ACTION${NC}"
      echo ""
      show_help
      exit 1
      ;;
  esac
}

# Run main function
main
