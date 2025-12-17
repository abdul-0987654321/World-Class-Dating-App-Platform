# =============================================================================
# External Secrets Deployment Script for Flamoral Dating Platform (PowerShell)
# =============================================================================
# This script deploys External Secrets Operator and configures Azure Key Vault
# integration for production secrets management.
# =============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$NAMESPACE = "flamoral"
$KEY_VAULT_NAME = "flamoral-prod-kv"
$KEY_VAULT_URL = "https://flamoral-prod-kv.vault.azure.net"
$ESO_NAMESPACE = "external-secrets-system"

# Functions for colored output
function Print-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Print-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if command exists
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Check prerequisites
function Test-Prerequisites {
    Print-Info "Checking prerequisites..."

    if (-not (Test-Command "kubectl")) {
        Print-Error "kubectl is not installed"
        exit 1
    }

    if (-not (Test-Command "helm")) {
        Print-Error "helm is not installed"
        exit 1
    }

    if (-not (Test-Command "az")) {
        Print-Error "Azure CLI is not installed"
        exit 1
    }

    Print-Info "All prerequisites satisfied"
}

# Check environment variables
function Test-EnvironmentVariables {
    Print-Info "Checking environment variables..."

    if (-not $env:AZURE_CLIENT_ID) {
        Print-Error "AZURE_CLIENT_ID environment variable is not set"
        exit 1
    }

    if (-not $env:AZURE_TENANT_ID) {
        Print-Error "AZURE_TENANT_ID environment variable is not set"
        exit 1
    }

    Print-Info "Environment variables are set"
    Print-Info "  AZURE_CLIENT_ID: $env:AZURE_CLIENT_ID"
    Print-Info "  AZURE_TENANT_ID: $env:AZURE_TENANT_ID"
}

# Install External Secrets Operator
function Install-ExternalSecretsOperator {
    Print-Info "Checking if External Secrets Operator is installed..."

    $helmList = helm list -n $ESO_NAMESPACE 2>$null | Select-String "external-secrets"

    if ($helmList) {
        Print-Warn "External Secrets Operator is already installed"
        $response = Read-Host "Do you want to upgrade it? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            Print-Info "Upgrading External Secrets Operator..."
            helm upgrade external-secrets external-secrets/external-secrets -n $ESO_NAMESPACE
        }
    }
    else {
        Print-Info "Installing External Secrets Operator..."
        helm repo add external-secrets https://charts.external-secrets.io
        helm repo update
        helm install external-secrets external-secrets/external-secrets `
            -n $ESO_NAMESPACE `
            --create-namespace `
            --wait
    }

    Print-Info "External Secrets Operator installed successfully"
}

# Create namespace
function New-ProductionNamespace {
    Print-Info "Creating namespace $NAMESPACE..."

    $namespaceExists = kubectl get namespace $NAMESPACE 2>$null
    if ($namespaceExists) {
        Print-Warn "Namespace $NAMESPACE already exists"
    }
    else {
        kubectl create namespace $NAMESPACE
        Print-Info "Namespace $NAMESPACE created"
    }
}

# Verify Key Vault access
function Test-KeyVaultAccess {
    Print-Info "Verifying access to Azure Key Vault..."

    try {
        az keyvault show --name $KEY_VAULT_NAME 2>$null | Out-Null
        Print-Info "Successfully connected to Key Vault: $KEY_VAULT_NAME"
    }
    catch {
        Print-Error "Cannot access Key Vault: $KEY_VAULT_NAME"
        Print-Error "Please verify your Azure credentials and Key Vault name"
        exit 1
    }
}

# Check Key Vault secrets
function Test-KeyVaultSecrets {
    Print-Info "Checking for required secrets in Key Vault..."

    $requiredSecrets = @(
        "jwt-secret",
        "jwt-access-secret",
        "jwt-refresh-secret",
        "service-api-key",
        "session-secret",
        "stripe-secret-key",
        "stripe-webhook-secret",
        "stripe-publishable-key",
        "sendgrid-api-key",
        "twilio-account-sid",
        "twilio-auth-token",
        "firebase-private-key",
        "db-host",
        "db-name",
        "db-user",
        "db-password",
        "redis-host",
        "redis-password",
        "azure-storage-key",
        "azure-storage-connection-string"
    )

    $missingSecrets = @()

    foreach ($secret in $requiredSecrets) {
        try {
            az keyvault secret show --vault-name $KEY_VAULT_NAME --name $secret 2>$null | Out-Null
        }
        catch {
            $missingSecrets += $secret
        }
    }

    if ($missingSecrets.Count -gt 0) {
        Print-Warn "The following secrets are missing in Key Vault:"
        foreach ($secret in $missingSecrets) {
            Write-Host "  - $secret"
        }
        Print-Warn "Please add these secrets before proceeding"
        $response = Read-Host "Continue anyway? (y/n)"
        if ($response -ne "y" -and $response -ne "Y") {
            exit 1
        }
    }
    else {
        Print-Info "All required secrets found in Key Vault"
    }
}

# Deploy SecretStore
function Deploy-SecretStore {
    Print-Info "Deploying SecretStore..."

    # Read the secret-store.yaml and replace environment variables
    $content = Get-Content -Path "secret-store.yaml" -Raw
    $content = $content -replace '\$\{AZURE_CLIENT_ID\}', $env:AZURE_CLIENT_ID
    $content = $content -replace '\$\{AZURE_TENANT_ID\}', $env:AZURE_TENANT_ID

    # Apply using kubectl
    $content | kubectl apply -f -

    Print-Info "SecretStore deployed successfully"
}

# Deploy ExternalSecrets
function Deploy-ExternalSecrets {
    Print-Info "Deploying ExternalSecrets..."

    kubectl apply -f auth-secrets.yaml
    kubectl apply -f payment-secrets.yaml
    kubectl apply -f notification-secrets.yaml
    kubectl apply -f media-secrets.yaml
    kubectl apply -f database-secrets.yaml

    Print-Info "ExternalSecrets deployed successfully"
}

# Verify ExternalSecrets
function Test-ExternalSecrets {
    Print-Info "Verifying ExternalSecrets..."

    Start-Sleep -Seconds 5  # Wait for reconciliation

    $externalSecrets = @(
        "flamoral-auth-secrets",
        "flamoral-payment-secrets",
        "flamoral-notification-secrets",
        "flamoral-media-secrets",
        "flamoral-database-secrets"
    )

    $allReady = $true

    foreach ($es in $externalSecrets) {
        $exists = kubectl get externalsecret $es -n $NAMESPACE 2>$null
        if ($exists) {
            $status = kubectl get externalsecret $es -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>$null
            if ($status -eq "True") {
                Print-Info "✓ $es is ready"
            }
            else {
                Print-Warn "✗ $es is not ready"
                $allReady = $false
            }
        }
        else {
            Print-Error "✗ $es not found"
            $allReady = $false
        }
    }

    if ($allReady) {
        Print-Info "All ExternalSecrets are ready"
    }
    else {
        Print-Warn "Some ExternalSecrets are not ready. Check logs for details:"
        Print-Warn "  kubectl describe externalsecret -n $NAMESPACE"
        Print-Warn "  kubectl logs -n $ESO_NAMESPACE -l app.kubernetes.io/name=external-secrets"
    }
}

# Verify Kubernetes secrets
function Test-KubernetesSecrets {
    Print-Info "Verifying created Kubernetes secrets..."

    $secrets = @(
        "flamoral-auth-secrets",
        "flamoral-payment-secrets",
        "flamoral-notification-secrets",
        "flamoral-media-secrets",
        "flamoral-database-secrets"
    )

    foreach ($secret in $secrets) {
        $exists = kubectl get secret $secret -n $NAMESPACE 2>$null
        if ($exists) {
            Print-Info "✓ Secret $secret exists"
        }
        else {
            Print-Warn "✗ Secret $secret does not exist"
        }
    }
}

# Main deployment flow
function Main {
    Write-Host "=======================================================================" -ForegroundColor Cyan
    Write-Host "  Flamoral Dating Platform - External Secrets Deployment" -ForegroundColor Cyan
    Write-Host "=======================================================================" -ForegroundColor Cyan
    Write-Host ""

    Test-Prerequisites
    Test-EnvironmentVariables
    Test-KeyVaultAccess
    Test-KeyVaultSecrets
    Install-ExternalSecretsOperator
    New-ProductionNamespace
    Deploy-SecretStore
    Deploy-ExternalSecrets
    Test-ExternalSecrets
    Test-KubernetesSecrets

    Write-Host ""
    Print-Info "======================================================================="
    Print-Info "  Deployment completed successfully!"
    Print-Info "======================================================================="
    Write-Host ""
    Print-Info "Next steps:"
    Write-Host "  1. Verify secrets are synced:"
    Write-Host "     kubectl get externalsecrets -n $NAMESPACE"
    Write-Host ""
    Write-Host "  2. Check secret data (be careful in production):"
    Write-Host "     kubectl describe secret flamoral-auth-secrets -n $NAMESPACE"
    Write-Host ""
    Write-Host "  3. Monitor External Secrets Operator logs:"
    Write-Host "     kubectl logs -n $ESO_NAMESPACE -l app.kubernetes.io/name=external-secrets -f"
    Write-Host ""
}

# Run main function
Main
