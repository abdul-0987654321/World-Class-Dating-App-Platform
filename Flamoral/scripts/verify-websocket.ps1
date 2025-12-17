# WebSocket Connectivity Verification Script (PowerShell)
# Tests WebSocket connectivity for flamoral.com

param(
    [string]$Namespace = "flamoral",
    [string]$ApiUrl = "https://api.flamoral.com",
    [string]$RealtimeUrl = "https://api.flamoral.com/realtime"
)

# Colors
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"

function Write-TestResult {
    param([bool]$Success, [string]$Message)

    if ($Success) {
        Write-Host "✓ " -ForegroundColor $Green -NoNewline
        Write-Host $Message
    } else {
        Write-Host "✗ " -ForegroundColor $Red -NoNewline
        Write-Host $Message
    }
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ " -ForegroundColor $Yellow -NoNewline
    Write-Host $Message
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "WebSocket Connectivity Verification" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..."
$kubectlExists = Get-Command kubectl -ErrorAction SilentlyContinue
$curlExists = Get-Command curl -ErrorAction SilentlyContinue

if (-not $kubectlExists) {
    Write-Host "kubectl is required but not installed. Aborting." -ForegroundColor Red
    exit 1
}

Write-TestResult $true "Prerequisites installed"
Write-Host ""

# 1. Check Kubernetes Pods
Write-Host "1. Checking Kubernetes Pods..." -ForegroundColor Cyan
Write-Host "----------------------------------------------"

try {
    # API Gateway
    $apiPod = kubectl get pods -n $Namespace -l app=api-gateway -o jsonpath='{.items[0].metadata.name}' 2>$null
    if ($apiPod) {
        $apiStatus = kubectl get pod $apiPod -n $Namespace -o jsonpath='{.status.phase}'
        Write-TestResult ($apiStatus -eq "Running") "API Gateway pod: $apiPod ($apiStatus)"
    } else {
        Write-TestResult $false "API Gateway pod not found"
    }

    # Realtime Service
    $rtPod = kubectl get pods -n $Namespace -l app=realtime-service -o jsonpath='{.items[0].metadata.name}' 2>$null
    if ($rtPod) {
        $rtStatus = kubectl get pod $rtPod -n $Namespace -o jsonpath='{.status.phase}'
        Write-TestResult ($rtStatus -eq "Running") "Realtime Service pod: $rtPod ($rtStatus)"
    } else {
        Write-TestResult $false "Realtime Service pod not found"
    }
} catch {
    Write-Host "Error checking pods: $_" -ForegroundColor Red
}

Write-Host ""

# 2. Check Environment Variables
Write-Host "2. Checking Environment Variables..." -ForegroundColor Cyan
Write-Host "----------------------------------------------"

if ($rtPod) {
    $envVars = @("PORT", "REDIS_HOST", "REDIS_TLS", "JWT_SECRET", "SERVICE_TOKEN", "ALLOWED_ORIGINS")

    foreach ($var in $envVars) {
        try {
            $value = kubectl exec -n $Namespace $rtPod -- printenv $var 2>$null
            if ($value) {
                if ($var -in @("JWT_SECRET", "SERVICE_TOKEN")) {
                    Write-TestResult $true "$var is set (value hidden)"
                } else {
                    Write-TestResult $true "$var = $value"
                }
            } else {
                Write-TestResult $false "$var is not set"
            }
        } catch {
            Write-TestResult $false "$var check failed"
        }
    }
} else {
    Write-Warning "Skipping env var check - no pod found"
}

Write-Host ""

# 3. Check Health Endpoints
Write-Host "3. Checking Health Endpoints..." -ForegroundColor Cyan
Write-Host "----------------------------------------------"

try {
    # API Gateway Health
    $apiHealth = Invoke-WebRequest -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-TestResult ($apiHealth.StatusCode -eq 200) "API Gateway health endpoint"

    # Realtime Service Health
    $rtHealth = Invoke-WebRequest -Uri "$RealtimeUrl/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-TestResult ($rtHealth.StatusCode -eq 200) "Realtime Service health endpoint"

    # Realtime Service Ready
    $rtReady = Invoke-WebRequest -Uri "$RealtimeUrl/ready" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-TestResult ($rtReady.StatusCode -eq 200) "Realtime Service ready endpoint (Redis connected)"
} catch {
    Write-Host "Error checking health endpoints: $_" -ForegroundColor Red
}

Write-Host ""

# 4. Check Redis Connectivity
Write-Host "4. Checking Redis Connectivity..." -ForegroundColor Cyan
Write-Host "----------------------------------------------"

if ($rtPod) {
    try {
        $redisCheck = kubectl exec -n $Namespace $rtPod -- wget -q -O- http://localhost:8081/ready 2>$null
        $redisOk = $redisCheck -match '"status":"ready"'
        Write-TestResult $redisOk "Redis connection verified"
    } catch {
        Write-TestResult $false "Redis connection check failed"
    }
} else {
    Write-Warning "Skipping Redis check - no pod found"
}

Write-Host ""

# 5. Check Service Configuration
Write-Host "5. Checking Service Configuration..." -ForegroundColor Cyan
Write-Host "----------------------------------------------"

try {
    # API Gateway Service
    $apiSvc = kubectl get svc -n $Namespace api-gateway -o jsonpath='{.metadata.name}' 2>$null
    if ($apiSvc) {
        $apiPort = kubectl get svc -n $Namespace api-gateway -o jsonpath='{.spec.ports[0].port}'
        Write-TestResult $true "API Gateway service: $apiSvc (port $apiPort)"
    } else {
        Write-TestResult $false "API Gateway service not found"
    }

    # Realtime Service
    $rtSvc = kubectl get svc -n $Namespace realtime-service -o jsonpath='{.metadata.name}' 2>$null
    if ($rtSvc) {
        $rtPort = kubectl get svc -n $Namespace realtime-service -o jsonpath='{.spec.ports[0].port}'
        Write-TestResult $true "Realtime Service: $rtSvc (port $rtPort)"
    } else {
        Write-TestResult $false "Realtime Service not found"
    }
} catch {
    Write-Host "Error checking services: $_" -ForegroundColor Red
}

Write-Host ""

# 6. Check Ingress Configuration
Write-Host "6. Checking Ingress Configuration..." -ForegroundColor Cyan
Write-Host "----------------------------------------------"

try {
    $ingress = kubectl get ingress -n $Namespace flamoral-ingress -o jsonpath='{.metadata.name}' 2>$null
    if ($ingress) {
        Write-TestResult $true "Ingress found: $ingress"

        $backends = kubectl get ingress -n $Namespace flamoral-ingress -o jsonpath='{.spec.rules[*].http.paths[*].backend.service.name}' 2>$null
        $backendCount = ($backends -split " ").Count
        Write-TestResult $true "Ingress has $backendCount backend rules"
    } else {
        Write-Warning "Ingress not found (might be using Azure Front Door directly)"
    }
} catch {
    Write-Host "Error checking ingress: $_" -ForegroundColor Red
}

Write-Host ""

# 7. Check Logs for Errors
Write-Host "7. Checking Recent Logs for Errors..." -ForegroundColor Cyan
Write-Host "----------------------------------------------"

if ($rtPod) {
    try {
        $logs = kubectl logs --tail=100 -n $Namespace $rtPod 2>$null
        $errors = $logs | Select-String -Pattern "error" -CaseSensitive
        $errorCount = $errors.Count

        if ($errorCount -eq 0) {
            Write-TestResult $true "No errors in recent logs"
        } else {
            Write-Warning "Found $errorCount error messages in logs"
            Write-Host "Recent errors:"
            $errors | Select-Object -Last 5 | ForEach-Object { Write-Host "  $_" }
        }
    } catch {
        Write-Warning "Failed to check logs: $_"
    }
} else {
    Write-Warning "Skipping log check - no pod found"
}

Write-Host ""

# 8. Test WebSocket Connection
Write-Host "8. Testing WebSocket Connection..." -ForegroundColor Cyan
Write-Host "----------------------------------------------"

$websocatExists = Get-Command websocat -ErrorAction SilentlyContinue
if ($websocatExists) {
    Write-Warning "websocat found - manual WebSocket test available"
    Write-Host "  To test: websocat wss://api.flamoral.com/socket.io/?EIO=4&transport=websocket"
} else {
    Write-Warning "websocat not installed - skipping WebSocket test"
    Write-Host "  Install: https://github.com/vi/websocat/releases"
}

Write-Host ""

# Summary
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Review the checks above to ensure WebSocket connectivity is properly configured." -ForegroundColor Yellow
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. If health checks fail, verify pods are running: kubectl get pods -n $Namespace"
Write-Host "2. If Redis check fails, verify Redis connection string and TLS settings"
Write-Host "3. If ingress issues, verify Azure Front Door routing configuration"
Write-Host "4. Check detailed logs: kubectl logs -f deployment/realtime-service -n $Namespace"
Write-Host ""
