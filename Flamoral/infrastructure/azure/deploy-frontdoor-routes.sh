#!/bin/bash
# =============================================================================
# Azure Front Door Routing Rules Deployment Script
# =============================================================================
# This script creates routing rules for Azure Front Door to fix 404 errors
# Run this script to immediately deploy routing rules without Terraform
# =============================================================================

set -e # Exit on error

# =============================================================================
# Configuration Variables
# =============================================================================
RESOURCE_GROUP="flamoral-prod-rg"
PROFILE_NAME="flamoral-prod-afd"
ENDPOINT_NAME="flamoral-prod"
ORIGIN_GROUP_NAME="flamoral-origin-group"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Pre-flight Checks
# =============================================================================
log_info "Starting Azure Front Door routing rules deployment..."
log_info "Resource Group: $RESOURCE_GROUP"
log_info "Front Door Profile: $PROFILE_NAME"
log_info "Endpoint: $ENDPOINT_NAME"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    log_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check if logged in
log_info "Checking Azure CLI authentication..."
if ! az account show &> /dev/null; then
    log_error "Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

log_info "Authentication confirmed."
echo ""

# Verify Front Door profile exists
log_info "Verifying Front Door profile exists..."
if ! az afd profile show --profile-name "$PROFILE_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    log_error "Front Door profile '$PROFILE_NAME' not found in resource group '$RESOURCE_GROUP'"
    exit 1
fi
log_info "Front Door profile verified."
echo ""

# =============================================================================
# Route 1: Default Route - All web traffic
# =============================================================================
log_info "Creating default route for all web traffic (/*) ..."
az afd route create \
  --endpoint-name "$ENDPOINT_NAME" \
  --profile-name "$PROFILE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --route-name "default-route" \
  --origin-group "$ORIGIN_GROUP_NAME" \
  --supported-protocols Http Https \
  --patterns-to-match "/*" \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled \
  --enable-caching true \
  --query-string-caching-behavior IgnoreSpecifiedQueryStrings \
  --query-parameters "utm_source" "utm_medium" "utm_campaign" "fbclid" "gclid" \
  --enable-compression true \
  --content-types-to-compress \
    "application/javascript" \
    "application/json" \
    "application/x-javascript" \
    "application/xml" \
    "text/css" \
    "text/html" \
    "text/javascript" \
    "text/plain" \
    "text/xml" \
  --output none

log_info "Default route created successfully."
echo ""

# =============================================================================
# Route 2: API Route - Backend API traffic
# =============================================================================
log_info "Creating API route for /api/* and /graphql ..."
az afd route create \
  --endpoint-name "$ENDPOINT_NAME" \
  --profile-name "$PROFILE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --route-name "api-route" \
  --origin-group "$ORIGIN_GROUP_NAME" \
  --supported-protocols Http Https \
  --patterns-to-match "/api/*" "/graphql" "/v1/*" \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled \
  --enable-caching true \
  --query-string-caching-behavior UseQueryString \
  --enable-compression true \
  --content-types-to-compress \
    "application/json" \
    "application/xml" \
    "text/plain" \
  --output none

log_info "API route created successfully."
echo ""

# =============================================================================
# Route 3: WebSocket Route - Real-time connections
# =============================================================================
log_info "Creating WebSocket route for /ws/*, /socket.io/*, /signalr/* ..."
az afd route create \
  --endpoint-name "$ENDPOINT_NAME" \
  --profile-name "$PROFILE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --route-name "websocket-route" \
  --origin-group "$ORIGIN_GROUP_NAME" \
  --supported-protocols Http Https \
  --patterns-to-match "/ws/*" "/socket.io/*" "/signalr/*" "/realtime/*" \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled \
  --enable-caching false \
  --output none

log_info "WebSocket route created successfully."
echo ""

# =============================================================================
# Route 4: Static Assets Route - CSS, JS, fonts
# =============================================================================
log_info "Creating static assets route for /static/*, /assets/*, CSS, JS ..."
az afd route create \
  --endpoint-name "$ENDPOINT_NAME" \
  --profile-name "$PROFILE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --route-name "static-route" \
  --origin-group "$ORIGIN_GROUP_NAME" \
  --supported-protocols Http Https \
  --patterns-to-match "/static/*" "/assets/*" "/_next/static/*" "/fonts/*" \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled \
  --enable-caching true \
  --query-string-caching-behavior IgnoreQueryString \
  --enable-compression true \
  --content-types-to-compress \
    "application/javascript" \
    "application/x-javascript" \
    "text/css" \
    "text/javascript" \
    "font/woff" \
    "font/woff2" \
  --output none

log_info "Static assets route created successfully."
echo ""

# =============================================================================
# Route 5: Media Route - Images, videos, uploads
# =============================================================================
log_info "Creating media route for /media/*, /uploads/*, /images/*, /videos/* ..."
az afd route create \
  --endpoint-name "$ENDPOINT_NAME" \
  --profile-name "$PROFILE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --route-name "media-route" \
  --origin-group "$ORIGIN_GROUP_NAME" \
  --supported-protocols Http Https \
  --patterns-to-match "/media/*" "/uploads/*" "/images/*" "/videos/*" \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled \
  --enable-caching true \
  --query-string-caching-behavior IgnoreQueryString \
  --enable-compression false \
  --output none

log_info "Media route created successfully."
echo ""

# =============================================================================
# Route 6: Health Check Route - No caching
# =============================================================================
log_info "Creating health check route for /health, /healthz, /ready, /live ..."
az afd route create \
  --endpoint-name "$ENDPOINT_NAME" \
  --profile-name "$PROFILE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --route-name "health-route" \
  --origin-group "$ORIGIN_GROUP_NAME" \
  --supported-protocols Http Https \
  --patterns-to-match "/health" "/health/*" "/healthz" "/ready" "/live" \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled \
  --enable-caching false \
  --output none

log_info "Health check route created successfully."
echo ""

# =============================================================================
# Verification
# =============================================================================
log_info "Deployment complete! Verifying routes..."
echo ""

log_info "Listing all routes:"
az afd route list \
  --endpoint-name "$ENDPOINT_NAME" \
  --profile-name "$PROFILE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[].{Name:name, Patterns:patternsToMatch, Protocol:forwardingProtocol, Caching:cacheConfiguration.queryStringCachingBehavior}" \
  --output table

echo ""
log_info "===================================================================="
log_info "Azure Front Door routing rules deployed successfully!"
log_info "===================================================================="
echo ""
log_warn "IMPORTANT: The origin (AKS cluster) must be deployed and healthy"
log_warn "for Front Door to start routing traffic successfully."
echo ""
log_info "Next steps:"
log_info "1. Deploy AKS cluster with ingress controller"
log_info "2. Verify origin health: curl https://flamoral.westus2.cloudapp.azure.com/health"
log_info "3. Test Front Door: curl https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net"
log_info "4. Add custom domain (flamoral.com) to Front Door"
log_info "5. Update DNS records to point to Front Door"
echo ""
log_info "Front Door endpoint: https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net"
echo ""
