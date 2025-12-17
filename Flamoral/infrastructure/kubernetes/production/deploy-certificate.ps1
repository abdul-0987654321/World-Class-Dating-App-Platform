# =============================================================================
# Deploy Flamoral TLS Certificate
# =============================================================================
# This script deploys the TLS certificate for flamoral.com
# Prerequisites: kubectl configured, cert-manager installed
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Flamoral TLS Certificate Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if kubectl is available
try {
    kubectl version --client --short | Out-Null
    Write-Host "✓ kubectl is available" -ForegroundColor Green
} catch {
    Write-Host "Error: kubectl is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if we can connect to the cluster
try {
    kubectl cluster-info | Out-Null
    Write-Host "✓ kubectl is configured and connected" -ForegroundColor Green
} catch {
    Write-Host "Error: Cannot connect to Kubernetes cluster" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check if cert-manager is installed
Write-Host "Checking cert-manager installation..."
try {
    kubectl get namespace cert-manager 2>$null | Out-Null
    Write-Host "✓ cert-manager namespace exists" -ForegroundColor Green
} catch {
    Write-Host "Error: cert-manager namespace not found" -ForegroundColor Red
    Write-Host "Please install cert-manager first"
    exit 1
}

# Check if cert-manager pods are running
try {
    $pods = kubectl get pods -n cert-manager 2>$null | Select-String "cert-manager.*Running"
    if ($pods) {
        Write-Host "✓ cert-manager pods are running" -ForegroundColor Green
    } else {
        Write-Host "Warning: cert-manager pods may not be running" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Warning: Could not check cert-manager pod status" -ForegroundColor Yellow
}
Write-Host ""

# Check if flamoral namespace exists
Write-Host "Checking flamoral namespace..."
try {
    kubectl get namespace flamoral 2>$null | Out-Null
    Write-Host "✓ flamoral namespace exists" -ForegroundColor Green
} catch {
    Write-Host "Warning: flamoral namespace not found, creating it..." -ForegroundColor Yellow
    kubectl create namespace flamoral
    Write-Host "✓ flamoral namespace created" -ForegroundColor Green
}
Write-Host ""

# Deploy ClusterIssuer (if not already deployed)
Write-Host "Deploying ClusterIssuer..."
$issuerPath = "..\..\..\..\letsencrypt-prod-issuer.yaml"
if (Test-Path $issuerPath) {
    kubectl apply -f $issuerPath
    Write-Host "✓ ClusterIssuer applied" -ForegroundColor Green
} else {
    Write-Host "Warning: ClusterIssuer file not found at $issuerPath" -ForegroundColor Yellow
    Write-Host "Checking if ClusterIssuer already exists..."
}

# Check ClusterIssuer status
Write-Host "Verifying ClusterIssuer..."
Start-Sleep -Seconds 2
try {
    kubectl get clusterissuer letsencrypt-prod 2>$null | Out-Null
    $issuerStatus = kubectl get clusterissuer letsencrypt-prod -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>$null
    if ($issuerStatus -eq "True") {
        Write-Host "✓ ClusterIssuer letsencrypt-prod is ready" -ForegroundColor Green
    } else {
        Write-Host "Warning: ClusterIssuer exists but may not be ready" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: ClusterIssuer letsencrypt-prod not found" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Deploy Certificate
Write-Host "Deploying Certificate resource..."
kubectl apply -f flamoral-certificate.yaml
Write-Host "✓ Certificate resource applied" -ForegroundColor Green
Write-Host ""

# Wait for certificate to be ready
Write-Host "Waiting for certificate to be issued (this may take 2-5 minutes)..."
Write-Host "You can press Ctrl+C to exit, the certificate will continue to process in the background"
Write-Host ""

# Monitor certificate status
$timeout = 300  # 5 minutes
$elapsed = 0
$success = $false

while ($elapsed -lt $timeout) {
    try {
        kubectl get certificate flamoral-tls -n flamoral 2>$null | Out-Null
        $certReady = kubectl get certificate flamoral-tls -n flamoral -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>$null

        if ($certReady -eq "True") {
            Write-Host ""
            Write-Host "✓ Certificate issued successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Certificate details:"
            kubectl get certificate flamoral-tls -n flamoral
            Write-Host ""
            Write-Host "Secret created:"
            kubectl get secret flamoral-tls -n flamoral
            Write-Host ""
            $success = $true
            break
        } else {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 5
            $elapsed += 5
        }
    } catch {
        Write-Host ""
        Write-Host "Error: Certificate resource not found" -ForegroundColor Red
        exit 1
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "Certificate issuance is taking longer than expected" -ForegroundColor Yellow
    Write-Host "Check the status with: kubectl describe certificate flamoral-tls -n flamoral"
    Write-Host "Check challenges with: kubectl get challenges -n flamoral"
    Write-Host "Check cert-manager logs with: kubectl logs -n cert-manager -l app=cert-manager"
    Write-Host ""

    # Show current status
    Write-Host "Current certificate status:"
    kubectl describe certificate flamoral-tls -n flamoral

    exit 1
}
