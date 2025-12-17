# =============================================================================
# Flamoral Dating Platform - Production Key Vault Secrets Population
# =============================================================================
# This script populates all 5 production Key Vaults with required secrets
# Run this after the Key Vaults have been created by Terraform
#
# Prerequisites:
#   - Azure CLI installed and logged in
#   - Sufficient permissions on Key Vaults (Key Vault Secrets Officer or Administrator)
#   - Run this from PowerShell
# =============================================================================

param(
    [string]$ResourceGroup = "flamoral-prod-rg"
)

# Color output functions
function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host $msg -ForegroundColor Red }

Write-Info "=========================================="
Write-Info "Flamoral Production Key Vaults Setup"
Write-Info "=========================================="
Write-Info "Resource Group: $ResourceGroup"
Write-Info ""

# Function to generate secure random string
function New-RandomString {
    param([int]$Length)
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $base64 = [Convert]::ToBase64String($bytes)
    # Remove padding and ensure we get the desired length
    return $base64.Substring(0, [Math]::Min($Length, $base64.Length))
}

# Function to generate random hex string
function New-RandomHex {
    param([int]$Bytes)
    $randomBytes = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($randomBytes)
    return ($randomBytes | ForEach-Object { $_.ToString("x2") }) -join ''
}

# Function to set a secret in Key Vault
function Set-KeyVaultSecretSafe {
    param(
        [string]$VaultName,
        [string]$SecretName,
        [string]$SecretValue,
        [switch]$IsPlaceholder
    )

    try {
        az keyvault secret set `
            --vault-name $VaultName `
            --name $SecretName `
            --value $SecretValue `
            --output none 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            if ($IsPlaceholder) {
                Write-Warning "  [$VaultName] Set $SecretName (PLACEHOLDER - needs replacement)"
            } else {
                Write-Success "  [$VaultName] Set $SecretName"
            }
            return $true
        } else {
            Write-Error "  [$VaultName] Failed to set $SecretName"
            return $false
        }
    }
    catch {
        Write-Error "  [$VaultName] Error setting $SecretName : $_"
        return $false
    }
}

# =============================================================================
# Generate Secure Values
# =============================================================================
Write-Info "Generating secure random values..."

$jwtSecret = New-RandomString -Length 64
$jwtAccessSecret = New-RandomString -Length 64
$jwtRefreshSecret = New-RandomString -Length 64
$sessionSecret = New-RandomString -Length 32
$postgresPassword = New-RandomString -Length 32
$redisPassword = New-RandomString -Length 32
$serviceApiKey = New-RandomString -Length 64
$encryptionKey = New-RandomHex -Bytes 32

Write-Success "Secure values generated successfully!"
Write-Info ""

# =============================================================================
# Vault Names
# =============================================================================
$vaults = @{
    "auth"     = "flamoralprodauthkv"
    "payment"  = "flamoralprodpaymentkv"
    "data"     = "flamoralproddatakv"
    "external" = "flamoralprodexternalkv"
    "infra"    = "flamoralprodinfrakv"
}

# Track results
$successCount = 0
$failureCount = 0
$placeholderCount = 0

# =============================================================================
# 1. AUTH VAULT - JWT, OAuth, Session Secrets
# =============================================================================
Write-Info "=========================================="
Write-Info "1. Populating Auth Vault (flamoralprodauthkv)"
Write-Info "=========================================="

$authSecrets = @{
    "jwt-secret"         = $jwtSecret
    "jwt-access-secret"  = $jwtAccessSecret
    "jwt-refresh-secret" = $jwtRefreshSecret
    "session-secret"     = $sessionSecret
}

foreach ($secret in $authSecrets.GetEnumerator()) {
    if (Set-KeyVaultSecretSafe -VaultName $vaults.auth -SecretName $secret.Key -SecretValue $secret.Value) {
        $successCount++
    } else {
        $failureCount++
    }
}

Write-Info ""

# =============================================================================
# 2. PAYMENT VAULT - Stripe, IAP Secrets
# =============================================================================
Write-Info "=========================================="
Write-Info "2. Populating Payment Vault (flamoralprodpaymentkv)"
Write-Info "=========================================="

$paymentSecrets = @{
    "stripe-secret-key"    = "REPLACE_WITH_STRIPE_SECRET_KEY_sk_live_XXXX"
    "stripe-webhook-secret" = "REPLACE_WITH_STRIPE_WEBHOOK_SECRET_whsec_XXXX"
}

foreach ($secret in $paymentSecrets.GetEnumerator()) {
    if (Set-KeyVaultSecretSafe -VaultName $vaults.payment -SecretName $secret.Key -SecretValue $secret.Value -IsPlaceholder) {
        $successCount++
        $placeholderCount++
    } else {
        $failureCount++
    }
}

Write-Info ""

# =============================================================================
# 3. DATA VAULT - Database, Redis Connection Secrets
# =============================================================================
Write-Info "=========================================="
Write-Info "3. Populating Data Vault (flamoralprodatakv)"
Write-Info "=========================================="

$dataSecrets = @{
    "postgres-password" = $postgresPassword
    "redis-password"    = $redisPassword
}

foreach ($secret in $dataSecrets.GetEnumerator()) {
    if (Set-KeyVaultSecretSafe -VaultName $vaults.data -SecretName $secret.Key -SecretValue $secret.Value) {
        $successCount++
    } else {
        $failureCount++
    }
}

Write-Info ""

# =============================================================================
# 4. EXTERNAL VAULT - Third-Party API Keys
# =============================================================================
Write-Info "=========================================="
Write-Info "4. Populating External Services Vault (flamoralprodexternalkv)"
Write-Info "=========================================="

$externalSecrets = @{
    "sendgrid-api-key"      = "REPLACE_WITH_SENDGRID_API_KEY"
    "twilio-auth-token"     = "REPLACE_WITH_TWILIO_AUTH_TOKEN"
    "firebase-private-key"  = "REPLACE_WITH_FIREBASE_PRIVATE_KEY"
    "agora-app-certificate" = "REPLACE_WITH_AGORA_APP_CERTIFICATE"
    "sentry-dsn"            = "REPLACE_WITH_SENTRY_DSN"
    "openai-api-key"        = "REPLACE_WITH_OPENAI_API_KEY"
}

foreach ($secret in $externalSecrets.GetEnumerator()) {
    if (Set-KeyVaultSecretSafe -VaultName $vaults.external -SecretName $secret.Key -SecretValue $secret.Value -IsPlaceholder) {
        $successCount++
        $placeholderCount++
    } else {
        $failureCount++
    }
}

Write-Info ""

# =============================================================================
# 5. INFRA VAULT - Infrastructure Secrets
# =============================================================================
Write-Info "=========================================="
Write-Info "5. Populating Infrastructure Vault (flamoralprodinfrakv)"
Write-Info "=========================================="

$infraSecrets = @{
    "service-api-key"                  = $serviceApiKey
    "encryption-key"                   = $encryptionKey
    "azure-storage-connection-string"  = "REPLACE_WITH_AZURE_STORAGE_CONNECTION_STRING"
}

foreach ($secret in $infraSecrets.GetEnumerator()) {
    $isPlaceholder = $secret.Value.StartsWith("REPLACE_WITH_")
    if (Set-KeyVaultSecretSafe -VaultName $vaults.infra -SecretName $secret.Key -SecretValue $secret.Value -IsPlaceholder:$isPlaceholder) {
        $successCount++
        if ($isPlaceholder) { $placeholderCount++ }
    } else {
        $failureCount++
    }
}

Write-Info ""

# =============================================================================
# SUMMARY
# =============================================================================
Write-Info "=========================================="
Write-Info "SUMMARY"
Write-Info "=========================================="
Write-Success "Successfully created: $successCount secrets"
if ($placeholderCount -gt 0) {
    Write-Warning "Placeholder secrets (need replacement): $placeholderCount"
}
if ($failureCount -gt 0) {
    Write-Error "Failed to create: $failureCount secrets"
}
Write-Info ""

Write-Info "Vault Details:"
Write-Info "  1. Auth Vault:     $($vaults.auth)"
Write-Info "  2. Payment Vault:  $($vaults.payment)"
Write-Info "  3. Data Vault:     $($vaults.data)"
Write-Info "  4. External Vault: $($vaults.external)"
Write-Info "  5. Infra Vault:    $($vaults.infra)"
Write-Info ""

Write-Info "Next Steps:"
Write-Info "1. Update placeholder secrets with actual API keys:"
Write-Warning "   - Stripe keys (stripe-secret-key, stripe-webhook-secret)"
Write-Warning "   - SendGrid API key"
Write-Warning "   - Twilio Auth Token"
Write-Warning "   - Firebase Private Key"
Write-Warning "   - Agora App Certificate"
Write-Warning "   - Sentry DSN"
Write-Warning "   - OpenAI API Key"
Write-Warning "   - Azure Storage Connection String"
Write-Info ""
Write-Info "2. Verify secrets in each vault:"
Write-Info "   az keyvault secret list --vault-name <vault-name> --output table"
Write-Info ""
Write-Info "3. Grant application identities access to vaults (if not done by Terraform)"
Write-Info ""

if ($failureCount -eq 0) {
    Write-Success "All secrets populated successfully!"
} else {
    Write-Error "Some secrets failed to populate. Please check errors above."
}
