# =============================================================================
# Populate Service-Specific Key Vaults with Initial Secrets
# =============================================================================
# This script populates the 5 category-specific vaults with their required secrets.
# Run this AFTER the Terraform module has created the vaults.
#
# Usage: .\populate-service-vaults.ps1 -Environment prod
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,

    [Parameter(Mandatory=$false)]
    [switch]$GenerateRandomSecrets = $false
)

$ErrorActionPreference = "Stop"

# Vault names
$prefix = "flamoral"
$vaults = @{
    auth = "$prefix-$Environment-auth-kv"
    payment = "$prefix-$Environment-payment-kv"
    data = "$prefix-$Environment-data-kv"
    external = "$prefix-$Environment-external-kv"
    infra = "$prefix-$Environment-infra-kv"
}

function Generate-SecureSecret {
    param([int]$Length = 64)
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

function Set-VaultSecret {
    param(
        [string]$VaultName,
        [string]$SecretName,
        [string]$SecretValue,
        [string]$Description = ""
    )

    Write-Host "  Setting secret: $SecretName" -ForegroundColor Cyan

    if ([string]::IsNullOrEmpty($SecretValue)) {
        if ($GenerateRandomSecrets) {
            $SecretValue = Generate-SecureSecret
            Write-Host "    Generated random secret" -ForegroundColor Yellow
        } else {
            Write-Host "    SKIPPED - No value provided (use -GenerateRandomSecrets to auto-generate)" -ForegroundColor Yellow
            return
        }
    }

    try {
        az keyvault secret set `
            --vault-name $VaultName `
            --name $SecretName `
            --value $SecretValue `
            --description $Description `
            --output none
        Write-Host "    SUCCESS" -ForegroundColor Green
    } catch {
        Write-Host "    FAILED: $_" -ForegroundColor Red
    }
}

# =============================================================================
# AUTH VAULT SECRETS
# =============================================================================
Write-Host "`n=== AUTH VAULT: $($vaults.auth) ===" -ForegroundColor Magenta

# JWT secrets - should be generated securely
Set-VaultSecret -VaultName $vaults.auth -SecretName "jwt-secret" `
    -SecretValue $env:JWT_SECRET `
    -Description "Legacy JWT secret for backward compatibility"

Set-VaultSecret -VaultName $vaults.auth -SecretName "jwt-access-secret" `
    -SecretValue $env:JWT_ACCESS_SECRET `
    -Description "JWT access token signing secret (short-lived)"

Set-VaultSecret -VaultName $vaults.auth -SecretName "jwt-refresh-secret" `
    -SecretValue $env:JWT_REFRESH_SECRET `
    -Description "JWT refresh token signing secret (long-lived)"

Set-VaultSecret -VaultName $vaults.auth -SecretName "session-secret" `
    -SecretValue $env:SESSION_SECRET `
    -Description "Express session encryption secret"

# OAuth secrets - must be obtained from providers
Set-VaultSecret -VaultName $vaults.auth -SecretName "google-client-secret" `
    -SecretValue $env:GOOGLE_CLIENT_SECRET `
    -Description "Google OAuth 2.0 client secret"

Set-VaultSecret -VaultName $vaults.auth -SecretName "facebook-app-secret" `
    -SecretValue $env:FACEBOOK_APP_SECRET `
    -Description "Facebook OAuth app secret"

Set-VaultSecret -VaultName $vaults.auth -SecretName "apple-private-key" `
    -SecretValue $env:APPLE_PRIVATE_KEY `
    -Description "Apple Sign In private key (PKCS#8 format)"

# =============================================================================
# PAYMENT VAULT SECRETS
# =============================================================================
Write-Host "`n=== PAYMENT VAULT: $($vaults.payment) ===" -ForegroundColor Magenta

Set-VaultSecret -VaultName $vaults.payment -SecretName "stripe-secret-key" `
    -SecretValue $env:STRIPE_SECRET_KEY `
    -Description "Stripe API secret key"

Set-VaultSecret -VaultName $vaults.payment -SecretName "stripe-webhook-secret" `
    -SecretValue $env:STRIPE_WEBHOOK_SECRET `
    -Description "Stripe webhook signing secret"

Set-VaultSecret -VaultName $vaults.payment -SecretName "paystack-secret-key" `
    -SecretValue $env:PAYSTACK_SECRET_KEY `
    -Description "Paystack API secret key (disabled in prod)"

Set-VaultSecret -VaultName $vaults.payment -SecretName "flutterwave-secret-key" `
    -SecretValue $env:FLUTTERWAVE_SECRET_KEY `
    -Description "Flutterwave API secret key (disabled in prod)"

Set-VaultSecret -VaultName $vaults.payment -SecretName "apple-iap-shared-secret" `
    -SecretValue $env:APPLE_IAP_SHARED_SECRET `
    -Description "Apple App Store In-App Purchase shared secret"

Set-VaultSecret -VaultName $vaults.payment -SecretName "google-play-service-account" `
    -SecretValue $env:GOOGLE_PLAY_SERVICE_ACCOUNT `
    -Description "Google Play service account JSON (base64 encoded)"

# =============================================================================
# DATA VAULT SECRETS
# =============================================================================
Write-Host "`n=== DATA VAULT: $($vaults.data) ===" -ForegroundColor Magenta

Set-VaultSecret -VaultName $vaults.data -SecretName "postgres-connection-string" `
    -SecretValue $env:DATABASE_URL `
    -Description "PostgreSQL connection string"

Set-VaultSecret -VaultName $vaults.data -SecretName "mongodb-uri" `
    -SecretValue $env:MONGODB_URI `
    -Description "MongoDB/Cosmos DB connection URI"

Set-VaultSecret -VaultName $vaults.data -SecretName "redis-password" `
    -SecretValue $env:REDIS_PASSWORD `
    -Description "Redis cache password"

Set-VaultSecret -VaultName $vaults.data -SecretName "redis-connection-string" `
    -SecretValue $env:REDIS_URL `
    -Description "Redis full connection string"

Set-VaultSecret -VaultName $vaults.data -SecretName "cosmosdb-key" `
    -SecretValue $env:COSMOS_KEY `
    -Description "Azure Cosmos DB primary key"

# =============================================================================
# EXTERNAL VAULT SECRETS
# =============================================================================
Write-Host "`n=== EXTERNAL VAULT: $($vaults.external) ===" -ForegroundColor Magenta

Set-VaultSecret -VaultName $vaults.external -SecretName "sendgrid-api-key" `
    -SecretValue $env:SENDGRID_API_KEY `
    -Description "SendGrid email API key"

Set-VaultSecret -VaultName $vaults.external -SecretName "twilio-auth-token" `
    -SecretValue $env:TWILIO_AUTH_TOKEN `
    -Description "Twilio authentication token"

Set-VaultSecret -VaultName $vaults.external -SecretName "firebase-private-key" `
    -SecretValue $env:FIREBASE_PRIVATE_KEY `
    -Description "Firebase service account private key"

Set-VaultSecret -VaultName $vaults.external -SecretName "agora-app-certificate" `
    -SecretValue $env:AGORA_APP_CERTIFICATE `
    -Description "Agora.io app certificate for video calls"

Set-VaultSecret -VaultName $vaults.external -SecretName "agora-customer-secret" `
    -SecretValue $env:AGORA_CUSTOMER_SECRET `
    -Description "Agora.io customer secret"

Set-VaultSecret -VaultName $vaults.external -SecretName "sentry-dsn" `
    -SecretValue $env:SENTRY_DSN `
    -Description "Sentry error tracking DSN"

Set-VaultSecret -VaultName $vaults.external -SecretName "openai-api-key" `
    -SecretValue $env:OPENAI_API_KEY `
    -Description "OpenAI API key for AI features"

# =============================================================================
# INFRA VAULT SECRETS
# =============================================================================
Write-Host "`n=== INFRA VAULT: $($vaults.infra) ===" -ForegroundColor Magenta

Set-VaultSecret -VaultName $vaults.infra -SecretName "service-api-key" `
    -SecretValue $env:SERVICE_API_KEY `
    -Description "Internal service-to-service API key"

Set-VaultSecret -VaultName $vaults.infra -SecretName "encryption-key" `
    -SecretValue $env:ENCRYPTION_KEY `
    -Description "Message encryption key (32 bytes hex)"

Set-VaultSecret -VaultName $vaults.infra -SecretName "azure-storage-key" `
    -SecretValue $env:AZURE_STORAGE_KEY `
    -Description "Azure Storage account key"

Set-VaultSecret -VaultName $vaults.infra -SecretName "azure-storage-connection-string" `
    -SecretValue $env:AZURE_STORAGE_CONNECTION_STRING `
    -Description "Azure Storage connection string"

Set-VaultSecret -VaultName $vaults.infra -SecretName "azure-face-api-key" `
    -SecretValue $env:AZURE_FACE_API_KEY `
    -Description "Azure Face API key for verification"

Set-VaultSecret -VaultName $vaults.infra -SecretName "azure-content-moderator-key" `
    -SecretValue $env:AZURE_CONTENT_MODERATOR_KEY `
    -Description "Azure Content Moderator API key"

Set-VaultSecret -VaultName $vaults.infra -SecretName "azure-service-bus-connection-string" `
    -SecretValue $env:AZURE_SERVICE_BUS_CONNECTION_STRING `
    -Description "Azure Service Bus connection string"

Set-VaultSecret -VaultName $vaults.infra -SecretName "application-insights-connection-string" `
    -SecretValue $env:APPLICATION_INSIGHTS_CONNECTION_STRING `
    -Description "Azure Application Insights connection string"

Set-VaultSecret -VaultName $vaults.infra -SecretName "elasticsearch-password" `
    -SecretValue $env:ELASTICSEARCH_PASSWORD `
    -Description "Elasticsearch cluster password"

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host "`n=== SUMMARY ===" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor White
Write-Host "Vaults configured:" -ForegroundColor White
foreach ($vault in $vaults.GetEnumerator()) {
    Write-Host "  - $($vault.Key): $($vault.Value)" -ForegroundColor Cyan
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Run 'terraform apply' to create vaults if not exists" -ForegroundColor White
Write-Host "2. Set environment variables with actual secret values" -ForegroundColor White
Write-Host "3. Re-run this script to populate secrets" -ForegroundColor White
Write-Host "4. Deploy updated Kubernetes SecretProviderClasses" -ForegroundColor White
Write-Host "5. Restart services to pick up new secrets" -ForegroundColor White
