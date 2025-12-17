# =============================================================================
# Azure Front Door Routing Rules Deployment Script (PowerShell)
# =============================================================================
# This script creates routing rules for Azure Front Door to fix 404 errors
# Run this script to immediately deploy routing rules without Terraform
# =============================================================================

#Requires -Version 5.1

# Set error action preference
$ErrorActionPreference = "Stop"

# =============================================================================
# Configuration Variables
# =============================================================================
$RESOURCE_GROUP = "flamoral-prod-rg"
$PROFILE_NAME = "flamoral-prod-afd"
$ENDPOINT_NAME = "flamoral-prod"
$ORIGIN_GROUP_NAME = "flamoral-origin-group"

# =============================================================================
# Helper Functions
# =============================================================================
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# =============================================================================
# Pre-flight Checks
# =============================================================================
Write-Info "Starting Azure Front Door routing rules deployment..."
Write-Info "Resource Group: $RESOURCE_GROUP"
Write-Info "Front Door Profile: $PROFILE_NAME"
Write-Info "Endpoint: $ENDPOINT_NAME"
Write-Host ""

# Check if Azure CLI is installed
try {
    $null = Get-Command az -ErrorAction Stop
    Write-Info "Azure CLI found."
} catch {
    Write-Error-Custom "Azure CLI is not installed. Please install it first."
    exit 1
}

# Check if logged in
Write-Info "Checking Azure CLI authentication..."
try {
    $accountInfo = az account show 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Not logged in"
    }
    Write-Info "Authentication confirmed."
} catch {
    Write-Error-Custom "Not logged in to Azure. Please run 'az login' first."
    exit 1
}
Write-Host ""

# Verify Front Door profile exists
Write-Info "Verifying Front Door profile exists..."
try {
    $profile = az afd profile show --profile-name $PROFILE_NAME --resource-group $RESOURCE_GROUP 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Profile not found"
    }
    Write-Info "Front Door profile verified."
} catch {
    Write-Error-Custom "Front Door profile '$PROFILE_NAME' not found in resource group '$RESOURCE_GROUP'"
    exit 1
}
Write-Host ""

# =============================================================================
# Route 1: Default Route - All web traffic
# =============================================================================
Write-Info "Creating default route for all web traffic (/*) ..."
az afd route create `
  --endpoint-name $ENDPOINT_NAME `
  --profile-name $PROFILE_NAME `
  --resource-group $RESOURCE_GROUP `
  --route-name "default-route" `
  --origin-group $ORIGIN_GROUP_NAME `
  --supported-protocols Http Https `
  --patterns-to-match "/*" `
  --forwarding-protocol HttpsOnly `
  --https-redirect Enabled `
  --enable-caching true `
  --query-string-caching-behavior IgnoreSpecifiedQueryStrings `
  --query-parameters "utm_source" "utm_medium" "utm_campaign" "fbclid" "gclid" `
  --enable-compression true `
  --content-types-to-compress `
    "application/javascript" `
    "application/json" `
    "application/x-javascript" `
    "application/xml" `
    "text/css" `
    "text/html" `
    "text/javascript" `
    "text/plain" `
    "text/xml" `
  --output none

if ($LASTEXITCODE -eq 0) {
    Write-Info "Default route created successfully."
} else {
    Write-Warning-Custom "Default route may already exist or encountered an error."
}
Write-Host ""

# =============================================================================
# Route 2: API Route - Backend API traffic
# =============================================================================
Write-Info "Creating API route for /api/* and /graphql ..."
az afd route create `
  --endpoint-name $ENDPOINT_NAME `
  --profile-name $PROFILE_NAME `
  --resource-group $RESOURCE_GROUP `
  --route-name "api-route" `
  --origin-group $ORIGIN_GROUP_NAME `
  --supported-protocols Http Https `
  --patterns-to-match "/api/*" "/graphql" "/v1/*" `
  --forwarding-protocol HttpsOnly `
  --https-redirect Enabled `
  --enable-caching true `
  --query-string-caching-behavior UseQueryString `
  --enable-compression true `
  --content-types-to-compress `
    "application/json" `
    "application/xml" `
    "text/plain" `
  --output none

if ($LASTEXITCODE -eq 0) {
    Write-Info "API route created successfully."
} else {
    Write-Warning-Custom "API route may already exist or encountered an error."
}
Write-Host ""

# =============================================================================
# Route 3: WebSocket Route - Real-time connections
# =============================================================================
Write-Info "Creating WebSocket route for /ws/*, /socket.io/*, /signalr/* ..."
az afd route create `
  --endpoint-name $ENDPOINT_NAME `
  --profile-name $PROFILE_NAME `
  --resource-group $RESOURCE_GROUP `
  --route-name "websocket-route" `
  --origin-group $ORIGIN_GROUP_NAME `
  --supported-protocols Http Https `
  --patterns-to-match "/ws/*" "/socket.io/*" "/signalr/*" "/realtime/*" `
  --forwarding-protocol HttpsOnly `
  --https-redirect Enabled `
  --enable-caching false `
  --output none

if ($LASTEXITCODE -eq 0) {
    Write-Info "WebSocket route created successfully."
} else {
    Write-Warning-Custom "WebSocket route may already exist or encountered an error."
}
Write-Host ""

# =============================================================================
# Route 4: Static Assets Route - CSS, JS, fonts
# =============================================================================
Write-Info "Creating static assets route for /static/*, /assets/*, CSS, JS ..."
az afd route create `
  --endpoint-name $ENDPOINT_NAME `
  --profile-name $PROFILE_NAME `
  --resource-group $RESOURCE_GROUP `
  --route-name "static-route" `
  --origin-group $ORIGIN_GROUP_NAME `
  --supported-protocols Http Https `
  --patterns-to-match "/static/*" "/assets/*" "/_next/static/*" "/fonts/*" `
  --forwarding-protocol HttpsOnly `
  --https-redirect Enabled `
  --enable-caching true `
  --query-string-caching-behavior IgnoreQueryString `
  --enable-compression true `
  --content-types-to-compress `
    "application/javascript" `
    "application/x-javascript" `
    "text/css" `
    "text/javascript" `
    "font/woff" `
    "font/woff2" `
  --output none

if ($LASTEXITCODE -eq 0) {
    Write-Info "Static assets route created successfully."
} else {
    Write-Warning-Custom "Static route may already exist or encountered an error."
}
Write-Host ""

# =============================================================================
# Route 5: Media Route - Images, videos, uploads
# =============================================================================
Write-Info "Creating media route for /media/*, /uploads/*, /images/*, /videos/* ..."
az afd route create `
  --endpoint-name $ENDPOINT_NAME `
  --profile-name $PROFILE_NAME `
  --resource-group $RESOURCE_GROUP `
  --route-name "media-route" `
  --origin-group $ORIGIN_GROUP_NAME `
  --supported-protocols Http Https `
  --patterns-to-match "/media/*" "/uploads/*" "/images/*" "/videos/*" `
  --forwarding-protocol HttpsOnly `
  --https-redirect Enabled `
  --enable-caching true `
  --query-string-caching-behavior IgnoreQueryString `
  --enable-compression false `
  --output none

if ($LASTEXITCODE -eq 0) {
    Write-Info "Media route created successfully."
} else {
    Write-Warning-Custom "Media route may already exist or encountered an error."
}
Write-Host ""

# =============================================================================
# Route 6: Health Check Route - No caching
# =============================================================================
Write-Info "Creating health check route for /health, /healthz, /ready, /live ..."
az afd route create `
  --endpoint-name $ENDPOINT_NAME `
  --profile-name $PROFILE_NAME `
  --resource-group $RESOURCE_GROUP `
  --route-name "health-route" `
  --origin-group $ORIGIN_GROUP_NAME `
  --supported-protocols Http Https `
  --patterns-to-match "/health" "/health/*" "/healthz" "/ready" "/live" `
  --forwarding-protocol HttpsOnly `
  --https-redirect Enabled `
  --enable-caching false `
  --output none

if ($LASTEXITCODE -eq 0) {
    Write-Info "Health check route created successfully."
} else {
    Write-Warning-Custom "Health route may already exist or encountered an error."
}
Write-Host ""

# =============================================================================
# Verification
# =============================================================================
Write-Info "Deployment complete! Verifying routes..."
Write-Host ""

Write-Info "Listing all routes:"
az afd route list `
  --endpoint-name $ENDPOINT_NAME `
  --profile-name $PROFILE_NAME `
  --resource-group $RESOURCE_GROUP `
  --query "[].{Name:name, Patterns:patternsToMatch, Protocol:forwardingProtocol, Caching:cacheConfiguration.queryStringCachingBehavior}" `
  --output table

Write-Host ""
Write-Info "===================================================================="
Write-Info "Azure Front Door routing rules deployed successfully!"
Write-Info "===================================================================="
Write-Host ""
Write-Warning-Custom "IMPORTANT: The origin (AKS cluster) must be deployed and healthy"
Write-Warning-Custom "for Front Door to start routing traffic successfully."
Write-Host ""
Write-Info "Next steps:"
Write-Info "1. Deploy AKS cluster with ingress controller"
Write-Info "2. Verify origin health: curl https://flamoral.westus2.cloudapp.azure.com/health"
Write-Info "3. Test Front Door: curl https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net"
Write-Info "4. Add custom domain (flamoral.com) to Front Door"
Write-Info "5. Update DNS records to point to Front Door"
Write-Host ""
Write-Info "Front Door endpoint: https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net"
Write-Host ""
