#
# Flamoral Production Smoke Test (PowerShell)
# Runs post-deployment to verify critical functionality
#
# Usage: .\smoke-test.ps1 [-ApiUrl "https://api.flamoral.com"]
#

param(
    [string]$ApiUrl = "http://localhost:3000/api"
)

$ErrorActionPreference = "Stop"

$Failed = 0
$Passed = 0

Write-Host "=========================================="
Write-Host "Flamoral Production Smoke Test"
Write-Host "API URL: $ApiUrl"
Write-Host "=========================================="
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [int]$ExpectedStatus,
        [string]$Body = $null,
        [string]$AuthToken = $null
    )

    $headers = @{}
    if ($AuthToken) {
        $headers["Authorization"] = "Bearer $AuthToken"
    }
    if ($Body) {
        $headers["Content-Type"] = "application/json"
    }

    try {
        $params = @{
            Uri = "$ApiUrl$Endpoint"
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
        }

        if ($Body) {
            $params["Body"] = $Body
        }

        $response = Invoke-WebRequest @params -ErrorAction SilentlyContinue
        $status = $response.StatusCode
    }
    catch {
        $status = $_.Exception.Response.StatusCode.value__
    }

    if ($status -eq $ExpectedStatus) {
        Write-Host "[PASS] $Name - Status: $status" -ForegroundColor Green
        $script:Passed++
    }
    else {
        Write-Host "[FAIL] $Name - Expected: $ExpectedStatus, Got: $status" -ForegroundColor Red
        $script:Failed++
    }
}

# Health Check
Write-Host "1. Health Checks"
Write-Host "----------------"
Test-Endpoint -Name "Health endpoint" -Method "GET" -Endpoint "/health" -ExpectedStatus 200
Write-Host ""

# Auth Endpoints (unauthenticated)
Write-Host "2. Auth Endpoints"
Write-Host "-----------------"
Test-Endpoint -Name "Login (no creds)" -Method "POST" -Endpoint "/auth/login" -ExpectedStatus 400 -Body '{"email":"","password":""}'
Test-Endpoint -Name "Register (no data)" -Method "POST" -Endpoint "/auth/register" -ExpectedStatus 400 -Body '{}'
Test-Endpoint -Name "Refresh (no token)" -Method "POST" -Endpoint "/auth/refresh" -ExpectedStatus 400 -Body '{}'
Write-Host ""

# Protected Endpoints (should return 401 without auth)
Write-Host "3. Protected Endpoints (no auth)"
Write-Host "---------------------------------"
Test-Endpoint -Name "Profile (no auth)" -Method "GET" -Endpoint "/profile/me" -ExpectedStatus 401
Test-Endpoint -Name "Discovery (no auth)" -Method "GET" -Endpoint "/discovery/feed" -ExpectedStatus 401
Test-Endpoint -Name "Matches (no auth)" -Method "GET" -Endpoint "/matches" -ExpectedStatus 401
Test-Endpoint -Name "Conversations (no auth)" -Method "GET" -Endpoint "/conversations" -ExpectedStatus 401
Test-Endpoint -Name "Verification status (no auth)" -Method "GET" -Endpoint "/verification/status" -ExpectedStatus 401
Test-Endpoint -Name "Subscription status (no auth)" -Method "GET" -Endpoint "/subscriptions/status" -ExpectedStatus 401
Test-Endpoint -Name "Audit logs (no auth)" -Method "GET" -Endpoint "/audit/logs" -ExpectedStatus 401
Write-Host ""

# Public Endpoints
Write-Host "4. Public Endpoints"
Write-Host "-------------------"
Test-Endpoint -Name "Subscription plans" -Method "GET" -Endpoint "/subscriptions/plans" -ExpectedStatus 200
Write-Host ""

# Test with authentication if TEST_TOKEN is provided
$TestToken = $env:TEST_TOKEN
if ($TestToken) {
    Write-Host "5. Authenticated Endpoints"
    Write-Host "--------------------------"
    Test-Endpoint -Name "Session" -Method "GET" -Endpoint "/auth/session" -ExpectedStatus 200 -AuthToken $TestToken
    Test-Endpoint -Name "Profile" -Method "GET" -Endpoint "/profile/me" -ExpectedStatus 200 -AuthToken $TestToken
    Test-Endpoint -Name "Discovery feed" -Method "GET" -Endpoint "/discovery/feed" -ExpectedStatus 200 -AuthToken $TestToken
    Test-Endpoint -Name "Matches" -Method "GET" -Endpoint "/matches" -ExpectedStatus 200 -AuthToken $TestToken
    Test-Endpoint -Name "Conversations" -Method "GET" -Endpoint "/conversations" -ExpectedStatus 200 -AuthToken $TestToken
    Test-Endpoint -Name "Verification status" -Method "GET" -Endpoint "/verification/status" -ExpectedStatus 200 -AuthToken $TestToken
    Test-Endpoint -Name "Subscription status" -Method "GET" -Endpoint "/subscriptions/status" -ExpectedStatus 200 -AuthToken $TestToken
    Write-Host ""

    # SEV-1 Checks
    Write-Host "6. SEV-1 Checks"
    Write-Host "---------------"

    # Check discovery feed
    try {
        $feedResponse = Invoke-RestMethod -Uri "$ApiUrl/discovery/feed" -Headers @{ Authorization = "Bearer $TestToken" }
        $feedCount = $feedResponse.items.Count
        if ($feedCount -gt 0) {
            Write-Host "[PASS] Discovery feed has $feedCount candidates" -ForegroundColor Green
            $Passed++
        }
        else {
            Write-Host "[WARN] Discovery feed is empty (may be expected if no eligible users)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[FAIL] Discovery feed check failed: $_" -ForegroundColor Red
        $Failed++
    }

    # Check verification status
    try {
        $verificationResponse = Invoke-RestMethod -Uri "$ApiUrl/verification/status" -Headers @{ Authorization = "Bearer $TestToken" }
        if ($verificationResponse.status) {
            Write-Host "[PASS] Verification status returned: $($verificationResponse.status)" -ForegroundColor Green
            $Passed++
        }
        else {
            Write-Host "[FAIL] Verification status missing" -ForegroundColor Red
            $Failed++
        }
    }
    catch {
        Write-Host "[FAIL] Verification status check failed: $_" -ForegroundColor Red
        $Failed++
    }

    # Check subscription entitlements
    try {
        $subscriptionResponse = Invoke-RestMethod -Uri "$ApiUrl/subscriptions/status" -Headers @{ Authorization = "Bearer $TestToken" }
        if ($subscriptionResponse.entitlements) {
            Write-Host "[PASS] Subscription entitlements present" -ForegroundColor Green
            $Passed++
        }
        else {
            Write-Host "[FAIL] Subscription entitlements missing" -ForegroundColor Red
            $Failed++
        }
    }
    catch {
        Write-Host "[FAIL] Subscription status check failed: $_" -ForegroundColor Red
        $Failed++
    }
    Write-Host ""
}
else {
    Write-Host "[INFO] Set TEST_TOKEN environment variable to run authenticated tests" -ForegroundColor Yellow
    Write-Host ""
}

# Summary
Write-Host "=========================================="
Write-Host "Summary"
Write-Host "=========================================="
Write-Host "Passed: $Passed" -ForegroundColor Green
Write-Host "Failed: $Failed" -ForegroundColor Red
Write-Host ""

if ($Failed -gt 0) {
    Write-Host "SMOKE TEST FAILED" -ForegroundColor Red
    exit 1
}
else {
    Write-Host "SMOKE TEST PASSED" -ForegroundColor Green
    exit 0
}
