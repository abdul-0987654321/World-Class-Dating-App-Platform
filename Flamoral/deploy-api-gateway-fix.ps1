# =============================================================================
# API Gateway Routing Fix - Deployment Script (PowerShell)
# =============================================================================
# This script applies all ingress configuration fixes to resolve the
# api.flamoral.com/health 404 error
# =============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$NAMESPACE = "flamoral"
$INGRESS_NAME = "flamoral-main-ingress"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "API Gateway Routing Fix - Deployment" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if kubectl is available
try {
    kubectl version --client --short | Out-Null
} catch {
    Write-Host "Error: kubectl is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if connected to cluster
try {
    kubectl cluster-info | Out-Null
    Write-Host "Connected to Kubernetes cluster" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Error: Not connected to a Kubernetes cluster" -ForegroundColor Red
    exit 1
}

# Check if namespace exists
try {
    kubectl get namespace $NAMESPACE 2>$null | Out-Null
} catch {
    Write-Host "Warning: Namespace '$NAMESPACE' does not exist" -ForegroundColor Yellow
    $response = Read-Host "Do you want to create it? (y/n)"
    if ($response -eq "y") {
        kubectl create namespace $NAMESPACE
        Write-Host "Namespace '$NAMESPACE' created" -ForegroundColor Green
    } else {
        Write-Host "Aborting deployment" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Current ingress configuration:" -ForegroundColor Yellow
kubectl get ingress -n $NAMESPACE 2>$null
Write-Host ""

# Function to apply ingress and verify
function Apply-AndVerify {
    param(
        [string]$File,
        [string]$Name
    )

    if (-not (Test-Path $File)) {
        Write-Host "Warning: File not found: $File" -ForegroundColor Yellow
        return $false
    }

    Write-Host "Applying $Name..." -ForegroundColor Yellow
    try {
        kubectl apply -f $File
        Write-Host "Successfully applied $Name" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Failed to apply $Name" -ForegroundColor Red
        return $false
    }
}

# Apply ingress configurations
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Applying Ingress Configurations" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

# Apply production ingress (primary)
Apply-AndVerify -File "infrastructure/kubernetes/production/ingress.yaml" -Name "Production Ingress"
Write-Host ""

# Wait for ingress to be updated
Write-Host "Waiting for ingress to be updated..."
Start-Sleep -Seconds 5

# Verify ingress configuration
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Verification" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Current ingress status:" -ForegroundColor Yellow
kubectl get ingress -n $NAMESPACE
Write-Host ""

Write-Host "Ingress details for $INGRESS_NAME:" -ForegroundColor Yellow
kubectl describe ingress $INGRESS_NAME -n $NAMESPACE 2>$null
Write-Host ""

# Check API Gateway pods
Write-Host "API Gateway pod status:" -ForegroundColor Yellow
kubectl get pods -n $NAMESPACE -l app=api-gateway
Write-Host ""

# Check API Gateway service
Write-Host "API Gateway service:" -ForegroundColor Yellow
kubectl get svc -n $NAMESPACE api-gateway
Write-Host ""

# Test health endpoint
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Testing Health Endpoint" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To test the health endpoint locally, run:" -ForegroundColor Yellow
Write-Host "  kubectl port-forward -n $NAMESPACE svc/api-gateway 4000:4000"
Write-Host "  curl http://localhost:4000/health"
Write-Host ""

Write-Host "To test through ingress (after DNS/cert is ready):" -ForegroundColor Yellow
Write-Host "  curl https://api.flamoral.com/health"
Write-Host ""

# Check if we can test via port-forward automatically
$response = Read-Host "Would you like to test the health endpoint via port-forward? (y/n)"
if ($response -eq "y") {
    Write-Host "Starting port-forward..." -ForegroundColor Yellow
    $job = Start-Job -ScriptBlock {
        kubectl port-forward -n $using:NAMESPACE svc/api-gateway 4000:4000
    }

    # Wait for port-forward to be ready
    Start-Sleep -Seconds 3

    Write-Host "Testing health endpoint..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "`nHealth endpoint is working!" -ForegroundColor Green
            Write-Host $response.Content
        }
    } catch {
        Write-Host "`nHealth endpoint failed" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }

    # Stop port-forward
    Stop-Job $job
    Remove-Job $job
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Deployment Complete" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Gateway routing fixes have been applied" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify pods are running: kubectl get pods -n $NAMESPACE -l app=api-gateway"
Write-Host "2. Check pod logs: kubectl logs -n $NAMESPACE -l app=api-gateway"
Write-Host "3. Test health endpoint: curl https://api.flamoral.com/health"
Write-Host "4. Monitor ingress: kubectl get ingress -n $NAMESPACE -w"
Write-Host ""
Write-Host "For detailed information, see: API_GATEWAY_ROUTING_FIX_COMPLETE.md" -ForegroundColor Cyan
Write-Host ""
