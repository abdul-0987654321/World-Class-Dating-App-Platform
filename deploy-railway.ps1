# Railway Deployment Script for Flamoral
# Run this script in PowerShell after setting environment variables

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flamoral Railway Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check required environment variables
$required = @("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET")
foreach ($var in $required) {
    if (-not [Environment]::GetEnvironmentVariable($var)) {
        Write-Host "ERROR: $var environment variable not set" -ForegroundColor Red
        Write-Host "Set it with: `$env:$var = 'your-value'" -ForegroundColor Yellow
        exit 1
    }
}

# Check if Railway CLI is installed
$railwayCli = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayCli) {
    Write-Host "ERROR: Railway CLI not found. Install with: npm install -g @railway/cli" -ForegroundColor Red
    exit 1
}

# Login to Railway
Write-Host "`nStep 1: Authenticating with Railway..." -ForegroundColor Yellow
railway login

# Link to project
Write-Host "`nStep 2: Linking to Flamoral project..." -ForegroundColor Yellow
railway link af6bc3f4-b8e3-4501-b9ea-1f3e0e1d6beb

# Set environment variables from env
Write-Host "`nStep 3: Setting environment variables..." -ForegroundColor Yellow
railway variables set "STRIPE_SECRET_KEY=$env:STRIPE_SECRET_KEY"
railway variables set "STRIPE_WEBHOOK_SECRET=$env:STRIPE_WEBHOOK_SECRET"
railway variables set "STRIPE_PUBLISHABLE_KEY=$env:STRIPE_PUBLISHABLE_KEY"

# Set Stripe price IDs if provided
if ($env:STRIPE_PRICE_BASIC) { railway variables set "STRIPE_PRICE_BASIC=$env:STRIPE_PRICE_BASIC" }
if ($env:STRIPE_PRICE_PLUS) { railway variables set "STRIPE_PRICE_PLUS=$env:STRIPE_PRICE_PLUS" }
if ($env:STRIPE_PRICE_PREMIUM) { railway variables set "STRIPE_PRICE_PREMIUM=$env:STRIPE_PRICE_PREMIUM" }
if ($env:STRIPE_PRICE_PREMIUM_PLUS) { railway variables set "STRIPE_PRICE_PREMIUM_PLUS=$env:STRIPE_PRICE_PREMIUM_PLUS" }
if ($env:STRIPE_PRICE_ELITE) { railway variables set "STRIPE_PRICE_ELITE=$env:STRIPE_PRICE_ELITE" }

# Deploy the API Gateway service
Write-Host "`nStep 4: Deploying API Gateway service..." -ForegroundColor Yellow
railway up --service api-gateway --detach

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment initiated!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nMonitor deployment at: https://railway.com/project/af6bc3f4-b8e3-4501-b9ea-1f3e0e1d6beb" -ForegroundColor Cyan
