# Quick script to populate essential secrets in all 5 vaults
$ErrorActionPreference = "Stop"

# Generate random values
function Get-RandomBase64 { param([int]$Length)
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($bytes)
    [Convert]::ToBase64String($bytes)
}

Write-Host "=== Populating Auth Vault ===" -ForegroundColor Cyan
$secrets = @{
    "jwt-secret" = Get-RandomBase64 48
    "jwt-access-secret" = Get-RandomBase64 48
    "jwt-refresh-secret" = Get-RandomBase64 48
    "session-secret" = Get-RandomBase64 24
}
foreach ($s in $secrets.GetEnumerator()) {
    az keyvault secret set --vault-name flamoral-prod-auth-kv --name $s.Key --value $s.Value --only-show-errors | Out-Null
    Write-Host "  Set $($s.Key)" -ForegroundColor Green
}

Write-Host "=== Populating Payment Vault ===" -ForegroundColor Cyan
$secrets = @{
    "stripe-secret-key" = "sk_test_PLACEHOLDER_REPLACE_ME"
    "stripe-webhook-secret" = "whsec_PLACEHOLDER_REPLACE_ME"
}
foreach ($s in $secrets.GetEnumerator()) {
    az keyvault secret set --vault-name flamoral-prod-payment-kv --name $s.Key --value $s.Value --only-show-errors | Out-Null
    Write-Host "  Set $($s.Key) (placeholder)" -ForegroundColor Yellow
}

Write-Host "=== Populating Data Vault ===" -ForegroundColor Cyan
$secrets = @{
    "postgres-password" = Get-RandomBase64 24
    "redis-password" = Get-RandomBase64 24
}
foreach ($s in $secrets.GetEnumerator()) {
    az keyvault secret set --vault-name flamoral-prod-data-kv --name $s.Key --value $s.Value --only-show-errors | Out-Null
    Write-Host "  Set $($s.Key)" -ForegroundColor Green
}

Write-Host "=== Populating External Vault ===" -ForegroundColor Cyan
$secrets = @{
    "sendgrid-api-key" = "SG.PLACEHOLDER_REPLACE_ME"
    "twilio-auth-token" = "PLACEHOLDER_REPLACE_ME"
    "sentry-dsn" = "https://placeholder@sentry.io/0"
    "openai-api-key" = "sk-PLACEHOLDER_REPLACE_ME"
}
foreach ($s in $secrets.GetEnumerator()) {
    az keyvault secret set --vault-name flamoral-prod-ext-kv --name $s.Key --value $s.Value --only-show-errors | Out-Null
    Write-Host "  Set $($s.Key) (placeholder)" -ForegroundColor Yellow
}

Write-Host "=== Populating Infra Vault ===" -ForegroundColor Cyan
$secrets = @{
    "service-api-key" = Get-RandomBase64 32
    "encryption-key" = (Get-RandomBase64 32).Replace('+','-').Replace('/','_').Substring(0,32)
}
foreach ($s in $secrets.GetEnumerator()) {
    az keyvault secret set --vault-name flamoral-prod-infra-kv --name $s.Key --value $s.Value --only-show-errors | Out-Null
    Write-Host "  Set $($s.Key)" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Secrets with PLACEHOLDER values need to be updated with real API keys!" -ForegroundColor Yellow
