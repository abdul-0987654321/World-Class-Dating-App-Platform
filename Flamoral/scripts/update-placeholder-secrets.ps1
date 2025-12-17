# =============================================================================
# Flamoral Dating Platform - Placeholder Secrets Replacement Script
# =============================================================================
# This script replaces placeholder secrets in production Key Vaults with
# real API keys and credentials.
#
# Usage:
#   .\update-placeholder-secrets.ps1                    # Interactive mode
#   .\update-placeholder-secrets.ps1 -UseBatchMode      # Batch mode (env vars)
#   .\update-placeholder-secrets.ps1 -Vaults payment    # Specific vault only
#   .\update-placeholder-secrets.ps1 -DryRun            # Preview changes only
#
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - Key Vault Secrets Officer or Administrator role
#   - PowerShell 7.0+
#
# Security:
#   - Never commit this script with actual secret values
#   - Clear PowerShell history after running: Clear-History
#   - Use environment variables or secure parameter store for batch mode
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "flamoral-prod-rg",

    [Parameter(Mandatory=$false)]
    [ValidateSet("payment", "external", "infra", "all")]
    [string[]]$Vaults = @("all"),

    [Parameter(Mandatory=$false)]
    [switch]$UseBatchMode = $false,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,

    [Parameter(Mandatory=$false)]
    [switch]$AutoRetrieveAzureSecrets = $true,

    [Parameter(Mandatory=$false)]
    [switch]$SkipVerification = $false
)

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Vault names
$VaultNames = @{
    payment  = "flamoral-prod-payment-kv"
    external = "flamoral-prod-ext-kv"
    infra    = "flamoral-prod-infra-kv"
}

# Define placeholder secrets that need replacement
$PlaceholderSecrets = @{
    payment = @{
        "stripe-secret-key" = @{
            placeholder = "REPLACE_WITH_STRIPE_SECRET_KEY_sk_live_XXXX"
            envVar      = "STRIPE_SECRET_KEY"
            description = "Stripe API secret key (sk_live_...)"
            pattern     = "^sk_live_[a-zA-Z0-9]{24,}$"
            required    = $true
            priority    = "Critical"
        }
        "stripe-webhook-secret" = @{
            placeholder = "REPLACE_WITH_STRIPE_WEBHOOK_SECRET_whsec_XXXX"
            envVar      = "STRIPE_WEBHOOK_SECRET"
            description = "Stripe webhook signing secret (whsec_...)"
            pattern     = "^whsec_[a-zA-Z0-9]{32,}$"
            required    = $true
            priority    = "Critical"
        }
    }
    external = @{
        "sendgrid-api-key" = @{
            placeholder = "REPLACE_WITH_SENDGRID_API_KEY"
            envVar      = "SENDGRID_API_KEY"
            description = "SendGrid API key (SG...)"
            pattern     = "^SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}$"
            required    = $true
            priority    = "High"
        }
        "twilio-auth-token" = @{
            placeholder = "REPLACE_WITH_TWILIO_AUTH_TOKEN"
            envVar      = "TWILIO_AUTH_TOKEN"
            description = "Twilio authentication token"
            pattern     = "^[a-f0-9]{32}$"
            required    = $false
            priority    = "Medium"
        }
        "sentry-dsn" = @{
            placeholder = "REPLACE_WITH_SENTRY_DSN"
            envVar      = "SENTRY_DSN"
            description = "Sentry DSN URL"
            pattern     = "^https://[a-f0-9]+@[a-z0-9]+\.ingest\.sentry\.io/[0-9]+$"
            required    = $false
            priority    = "Medium"
        }
        "openai-api-key" = @{
            placeholder = "REPLACE_WITH_OPENAI_API_KEY"
            envVar      = "OPENAI_API_KEY"
            description = "OpenAI API key (sk-...)"
            pattern     = "^sk-[a-zA-Z0-9]{32,}$"
            required    = $false
            priority    = "Medium"
        }
        "firebase-private-key" = @{
            placeholder = "REPLACE_WITH_FIREBASE_PRIVATE_KEY"
            envVar      = "FIREBASE_PRIVATE_KEY"
            description = "Firebase service account JSON or private key"
            pattern     = ".*"  # Accept any format
            required    = $false
            priority    = "Low"
        }
        "agora-app-certificate" = @{
            placeholder = "REPLACE_WITH_AGORA_APP_CERTIFICATE"
            envVar      = "AGORA_APP_CERTIFICATE"
            description = "Agora.io app certificate"
            pattern     = "^[a-f0-9]{32}$"
            required    = $false
            priority    = "Low"
        }
    }
    infra = @{
        "azure-storage-connection-string" = @{
            placeholder = "REPLACE_WITH_AZURE_STORAGE_CONNECTION_STRING"
            envVar      = "AZURE_STORAGE_CONNECTION_STRING"
            description = "Azure Storage connection string"
            pattern     = "^DefaultEndpointsProtocol=https;AccountName=[a-z0-9]+;AccountKey=.+;EndpointSuffix=core\.windows\.net$"
            required    = $true
            priority    = "High"
            autoRetrieve = $true
            storageAccountName = "flamoralprodzcqqgc"
        }
    }
}

# =============================================================================
# Helper Functions
# =============================================================================

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [switch]$NoNewline
    )

    $params = @{
        Object = $Message
        ForegroundColor = $Color
    }

    if ($NoNewline) {
        $params.NoNewline = $true
    }

    Write-Host @params
}

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-ColorOutput "=" * 80 -Color Cyan
    Write-ColorOutput " $Text" -Color Cyan
    Write-ColorOutput "=" * 80 -Color Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[✓] $Message" -Color Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[!] $Message" -Color Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[✗] $Message" -Color Red
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[i] $Message" -Color Cyan
}

function Test-AzureCLI {
    Write-Info "Checking Azure CLI installation..."

    try {
        $azVersion = az version --output json 2>$null | ConvertFrom-Json
        if ($azVersion) {
            Write-Success "Azure CLI version: $($azVersion.'azure-cli')"
            return $true
        }
    }
    catch {
        Write-Error "Azure CLI not found or not authenticated"
        Write-Info "Please install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        Write-Info "Then run: az login"
        return $false
    }

    return $false
}

function Test-AzureAuthentication {
    Write-Info "Checking Azure authentication..."

    try {
        $account = az account show --output json 2>$null | ConvertFrom-Json
        if ($account) {
            Write-Success "Authenticated as: $($account.user.name)"
            Write-Info "Subscription: $($account.name) ($($account.id))"
            return $true
        }
    }
    catch {
        Write-Error "Not authenticated to Azure"
        Write-Info "Please run: az login"
        return $false
    }

    return $false
}

function Test-KeyVaultAccess {
    param([string]$VaultName)

    try {
        az keyvault secret list --vault-name $VaultName --output none 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    }
    catch {
        return $false
    }

    return $false
}

function Get-CurrentSecretValue {
    param(
        [string]$VaultName,
        [string]$SecretName
    )

    try {
        $value = az keyvault secret show `
            --vault-name $VaultName `
            --name $SecretName `
            --query "value" `
            --output tsv 2>$null

        if ($LASTEXITCODE -eq 0) {
            return $value
        }
    }
    catch {
        return $null
    }

    return $null
}

function Test-SecretPattern {
    param(
        [string]$Value,
        [string]$Pattern
    )

    if ([string]::IsNullOrWhiteSpace($Pattern) -or $Pattern -eq ".*") {
        return $true
    }

    return $Value -match $Pattern
}

function Set-KeyVaultSecret {
    param(
        [string]$VaultName,
        [string]$SecretName,
        [string]$SecretValue,
        [string]$Description,
        [bool]$DryRun = $false
    )

    if ($DryRun) {
        Write-Info "[DRY RUN] Would update: $VaultName/$SecretName"
        return $true
    }

    try {
        az keyvault secret set `
            --vault-name $VaultName `
            --name $SecretName `
            --value $SecretValue `
            --description $Description `
            --output none 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            return $true
        }
        else {
            return $false
        }
    }
    catch {
        Write-Error "Exception setting secret: $_"
        return $false
    }
}

function Get-AzureStorageConnectionString {
    param(
        [string]$StorageAccountName,
        [string]$ResourceGroup
    )

    Write-Info "Retrieving Azure Storage connection string automatically..."

    try {
        $connString = az storage account show-connection-string `
            --name $StorageAccountName `
            --resource-group $ResourceGroup `
            --output tsv 2>&1

        if ($LASTEXITCODE -eq 0 -and $connString -match "DefaultEndpointsProtocol=https") {
            Write-Success "Retrieved connection string for storage account: $StorageAccountName"
            return $connString
        }
        else {
            Write-Warning "Could not retrieve storage connection string"
            return $null
        }
    }
    catch {
        Write-Warning "Error retrieving storage connection string: $_"
        return $null
    }
}

function Read-SecretValue {
    param(
        [string]$SecretName,
        [string]$Description,
        [string]$Pattern,
        [bool]$Required
    )

    Write-Host ""
    Write-ColorOutput "Secret: $SecretName" -Color Yellow
    Write-ColorOutput "Description: $Description" -Color Gray

    if (-not [string]::IsNullOrWhiteSpace($Pattern) -and $Pattern -ne ".*") {
        Write-ColorOutput "Expected format: $Pattern" -Color Gray
    }

    $value = Read-Host "Enter value (or leave empty to skip)"

    if ([string]::IsNullOrWhiteSpace($value)) {
        if ($Required) {
            Write-Warning "This secret is required. Skipping for now."
        }
        return $null
    }

    # Validate pattern
    if (-not (Test-SecretPattern -Value $value -Pattern $Pattern)) {
        Write-Warning "Value doesn't match expected pattern"
        $confirm = Read-Host "Continue anyway? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            return $null
        }
    }

    return $value
}

function Get-SecretValueBatchMode {
    param(
        [string]$EnvVarName,
        [bool]$Required
    )

    $value = [Environment]::GetEnvironmentVariable($EnvVarName)

    if ([string]::IsNullOrWhiteSpace($value)) {
        if ($Required) {
            Write-Warning "Required environment variable not set: $EnvVarName"
        }
        return $null
    }

    return $value
}

# =============================================================================
# Main Processing Function
# =============================================================================

function Update-PlaceholderSecrets {
    param(
        [string]$VaultCategory,
        [hashtable]$Secrets,
        [bool]$BatchMode,
        [bool]$DryRun
    )

    $vaultName = $VaultNames[$VaultCategory]
    $updatedCount = 0
    $skippedCount = 0
    $failedCount = 0

    Write-Header "Processing $VaultCategory Vault: $vaultName"

    # Test vault access
    if (-not (Test-KeyVaultAccess -VaultName $vaultName)) {
        Write-Error "Cannot access vault: $vaultName"
        Write-Info "Please ensure you have Key Vault Secrets Officer or Administrator role"
        return @{
            Updated = 0
            Skipped = 0
            Failed = $Secrets.Count
        }
    }

    Write-Success "Vault access confirmed"

    foreach ($secretName in $Secrets.Keys) {
        $secretConfig = $Secrets[$secretName]

        Write-Host ""
        Write-ColorOutput "─" * 80 -Color DarkGray
        Write-ColorOutput "Secret: $secretName" -Color White
        Write-ColorOutput "Priority: $($secretConfig.priority)" -Color $(
            switch ($secretConfig.priority) {
                "Critical" { "Red" }
                "High" { "Yellow" }
                "Medium" { "Cyan" }
                default { "Gray" }
            }
        )

        # Check current value
        $currentValue = Get-CurrentSecretValue -VaultName $vaultName -SecretName $secretName

        if ($null -eq $currentValue) {
            Write-Warning "Secret not found in vault (will create new)"
        }
        elseif ($currentValue -eq $secretConfig.placeholder) {
            Write-Warning "Current value is placeholder (needs replacement)"
        }
        elseif ($currentValue -match "REPLACE_WITH_") {
            Write-Warning "Current value is a placeholder variant (needs replacement)"
        }
        else {
            Write-Info "Secret already has a non-placeholder value"
            $confirm = Read-Host "Overwrite existing value? (y/N)"
            if ($confirm -ne "y" -and $confirm -ne "Y") {
                Write-Info "Skipping secret"
                $skippedCount++
                continue
            }
        }

        # Get new value
        $newValue = $null

        # Auto-retrieve for Azure secrets
        if ($secretConfig.autoRetrieve -and $AutoRetrieveAzureSecrets) {
            if ($secretName -eq "azure-storage-connection-string") {
                $newValue = Get-AzureStorageConnectionString `
                    -StorageAccountName $secretConfig.storageAccountName `
                    -ResourceGroup $ResourceGroup
            }
        }

        # Get from user input or env var
        if ($null -eq $newValue) {
            if ($BatchMode) {
                $newValue = Get-SecretValueBatchMode `
                    -EnvVarName $secretConfig.envVar `
                    -Required $secretConfig.required
            }
            else {
                $newValue = Read-SecretValue `
                    -SecretName $secretName `
                    -Description $secretConfig.description `
                    -Pattern $secretConfig.pattern `
                    -Required $secretConfig.required
            }
        }

        if ($null -eq $newValue) {
            Write-Warning "No value provided, skipping"
            $skippedCount++
            continue
        }

        # Validate pattern
        if (-not (Test-SecretPattern -Value $newValue -Pattern $secretConfig.pattern)) {
            Write-Warning "Value doesn't match expected pattern: $($secretConfig.pattern)"
            if ($BatchMode) {
                Write-Error "Validation failed in batch mode, skipping"
                $failedCount++
                continue
            }
        }

        # Update secret
        if (Set-KeyVaultSecret `
                -VaultName $vaultName `
                -SecretName $secretName `
                -SecretValue $newValue `
                -Description $secretConfig.description `
                -DryRun $DryRun) {

            if ($DryRun) {
                Write-Info "[DRY RUN] Would update secret: $secretName"
            }
            else {
                Write-Success "Successfully updated secret: $secretName"
            }
            $updatedCount++
        }
        else {
            Write-Error "Failed to update secret: $secretName"
            $failedCount++
        }
    }

    return @{
        Updated = $updatedCount
        Skipped = $skippedCount
        Failed  = $failedCount
    }
}

# =============================================================================
# Verification Function
# =============================================================================

function Invoke-SecretsVerification {
    Write-Header "Verification: Checking for Remaining Placeholders"

    $totalPlaceholders = 0

    foreach ($vaultCategory in $VaultNames.Keys) {
        $vaultName = $VaultNames[$vaultCategory]

        if (-not $PlaceholderSecrets.ContainsKey($vaultCategory)) {
            continue
        }

        Write-Info "Checking vault: $vaultName"

        foreach ($secretName in $PlaceholderSecrets[$vaultCategory].Keys) {
            $secretConfig = $PlaceholderSecrets[$vaultCategory][$secretName]
            $currentValue = Get-CurrentSecretValue -VaultName $vaultName -SecretName $secretName

            if ($null -eq $currentValue) {
                Write-Warning "  $secretName: NOT FOUND"
                $totalPlaceholders++
            }
            elseif ($currentValue -match "REPLACE_WITH_") {
                Write-Warning "  $secretName: STILL PLACEHOLDER"
                $totalPlaceholders++
            }
            else {
                Write-Success "  $secretName: Updated"
            }
        }
    }

    Write-Host ""
    if ($totalPlaceholders -eq 0) {
        Write-Success "All placeholder secrets have been replaced!"
    }
    else {
        Write-Warning "$totalPlaceholders placeholder secret(s) remaining"
    }

    return $totalPlaceholders
}

# =============================================================================
# Main Execution
# =============================================================================

try {
    # Banner
    Write-Host ""
    Write-ColorOutput "╔════════════════════════════════════════════════════════════════════════════╗" -Color Cyan
    Write-ColorOutput "║     Flamoral Dating Platform - Placeholder Secrets Replacement            ║" -Color Cyan
    Write-ColorOutput "╚════════════════════════════════════════════════════════════════════════════╝" -Color Cyan
    Write-Host ""

    # Dry run notice
    if ($DryRun) {
        Write-Warning "DRY RUN MODE: No changes will be made"
        Write-Host ""
    }

    # Prerequisites check
    Write-Header "Prerequisites Check"

    if (-not (Test-AzureCLI)) {
        exit 1
    }

    if (-not (Test-AzureAuthentication)) {
        exit 1
    }

    Write-Success "All prerequisites met"

    # Determine which vaults to process
    $vaultsToProcess = @()
    if ($Vaults -contains "all") {
        $vaultsToProcess = @("payment", "external", "infra")
    }
    else {
        $vaultsToProcess = $Vaults
    }

    Write-Info "Vaults to process: $($vaultsToProcess -join ', ')"
    Write-Info "Mode: $(if ($UseBatchMode) { 'Batch (environment variables)' } else { 'Interactive' })"

    # Confirm before proceeding
    if (-not $DryRun) {
        Write-Host ""
        Write-Warning "This will update secrets in production Key Vaults"
        $confirm = Read-Host "Continue? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Info "Aborted by user"
            exit 0
        }
    }

    # Process each vault
    $totalStats = @{
        Updated = 0
        Skipped = 0
        Failed  = 0
    }

    foreach ($vaultCategory in $vaultsToProcess) {
        if (-not $PlaceholderSecrets.ContainsKey($vaultCategory)) {
            Write-Warning "No placeholder secrets defined for vault: $vaultCategory"
            continue
        }

        $stats = Update-PlaceholderSecrets `
            -VaultCategory $vaultCategory `
            -Secrets $PlaceholderSecrets[$vaultCategory] `
            -BatchMode $UseBatchMode `
            -DryRun $DryRun

        $totalStats.Updated += $stats.Updated
        $totalStats.Skipped += $stats.Skipped
        $totalStats.Failed += $stats.Failed
    }

    # Summary
    Write-Header "Summary"

    Write-ColorOutput "Updated: $($totalStats.Updated)" -Color Green
    Write-ColorOutput "Skipped: $($totalStats.Skipped)" -Color Yellow
    Write-ColorOutput "Failed:  $($totalStats.Failed)" -Color Red

    # Verification
    if (-not $DryRun -and -not $SkipVerification) {
        Write-Host ""
        $remainingPlaceholders = Invoke-SecretsVerification
    }

    # Next steps
    Write-Header "Next Steps"

    if ($DryRun) {
        Write-Info "This was a dry run. No changes were made."
        Write-Info "Run without -DryRun to apply changes"
    }
    elseif ($totalStats.Updated -gt 0) {
        Write-Info "1. Verify secrets in Azure Portal or CLI:"
        Write-ColorOutput "   az keyvault secret list --vault-name <vault-name> --output table" -Color Gray
        Write-Host ""
        Write-Info "2. Test service integration:"
        Write-ColorOutput "   curl -X POST https://api.flamoral.com/payments/test-stripe" -Color Gray
        Write-Host ""
        Write-Info "3. Restart affected services:"
        Write-ColorOutput "   kubectl rollout restart deployment -n flamoral-prod <service-name>" -Color Gray
        Write-Host ""
        Write-Info "4. Monitor logs for errors:"
        Write-ColorOutput "   kubectl logs -n flamoral-prod -l app=payment-service --tail=100" -Color Gray
    }

    Write-Host ""
    Write-Success "Script completed successfully"

    exit 0
}
catch {
    Write-Error "An error occurred: $_"
    Write-Error $_.ScriptStackTrace
    exit 1
}
finally {
    # Security: Clear sensitive data from memory
    if (Test-Path variable:newValue) {
        Remove-Variable -Name newValue -ErrorAction SilentlyContinue
    }
}
