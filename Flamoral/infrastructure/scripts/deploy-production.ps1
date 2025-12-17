<#
.SYNOPSIS
    Flamoral Production Deployment Orchestration Script (PowerShell)

.DESCRIPTION
    This master script orchestrates the complete production deployment process
    in the correct order with validation, error handling, and rollback capability.

    This is the PowerShell version of deploy-production.sh for Windows environments.

.PARAMETER DryRun
    Perform a dry run without making actual changes

.PARAMETER SkipDns
    Skip DNS deployment step

.PARAMETER SkipValidation
    Skip pre-deployment validation

.PARAMETER Step
    Run only a specific step (dns, namespace, secrets, tls, frontdoor, verify)

.PARAMETER NoRollback
    Disable automatic rollback on failure

.PARAMETER Verbose
    Enable verbose logging

.EXAMPLE
    .\deploy-production.ps1
    Full deployment with all steps

.EXAMPLE
    .\deploy-production.ps1 -DryRun
    Dry run to see what would happen

.EXAMPLE
    .\deploy-production.ps1 -SkipDns
    Skip DNS if already configured

.EXAMPLE
    .\deploy-production.ps1 -Step tls
    Run only TLS certificate step

.NOTES
    Author: Flamoral DevOps Team
    Version: 1.0.0
    Date: 2025-12-13
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipDns,
    [switch]$SkipValidation,
    [string]$Step,
    [switch]$NoRollback,
    [switch]$VerboseLogging
)

# =============================================================================
# Configuration
# =============================================================================
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InfraDir = Split-Path -Parent $ScriptDir
$ProjectRoot = Split-Path -Parent $InfraDir
$LogDir = Join-Path $InfraDir "logs"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = Join-Path $LogDir "deployment_$Timestamp.log"
$StatusFile = Join-Path $ScriptDir "deployment-status.json"

# Azure Configuration
$ResourceGroup = if ($env:RESOURCE_GROUP) { $env:RESOURCE_GROUP } else { "flamoral-prod-rg" }
$AksCluster = if ($env:AKS_CLUSTER) { $env:AKS_CLUSTER } else { "flamoral-prod-aks" }
$AcrName = if ($env:ACR_NAME) { $env:ACR_NAME } else { "flamoralacr" }
$KeyVaultName = if ($env:KEY_VAULT_NAME) { $env:KEY_VAULT_NAME } else { "flamoral-prod-kv" }
$Namespace = if ($env:NAMESPACE) { $env:NAMESPACE } else { "flamoral" }

# DNS Configuration
$DomainName = if ($env:DOMAIN_NAME) { $env:DOMAIN_NAME } else { "flamoral.com" }
$TargetIP = if ($env:TARGET_IP) { $env:TARGET_IP } else { "48.200.65.15" }

# Front Door Configuration
$FrontDoorProfile = if ($env:FRONTDOOR_PROFILE) { $env:FRONTDOOR_PROFILE } else { "flamoral-prod-afd" }
$FrontDoorEndpoint = if ($env:FRONTDOOR_ENDPOINT) { $env:FRONTDOOR_ENDPOINT } else { "flamoral-prod" }

# =============================================================================
# Logging Functions
# =============================================================================
function Setup-Logging {
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }

    $separator = "=" * 60
    $header = @"
$separator
Flamoral Production Deployment
Started: $(Get-Date)
$separator
"@

    Add-Content -Path $LogFile -Value $header
    Write-Host $header -ForegroundColor Cyan
}

function Write-Log {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Level,

        [Parameter(Mandatory=$true)]
        [string]$Message
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry
}

function Write-Info {
    param([string]$Message)
    Write-Log -Level "INFO" -Message $Message
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Log -Level "SUCCESS" -Message $Message
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Log -Level "WARNING" -Message $Message
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Log -Level "ERROR" -Message $Message
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Step {
    param(
        [int]$StepNum,
        [string]$StepName
    )

    $separator = "=" * 60
    $header = @"

$separator
STEP $StepNum: $StepName
$separator
"@

    Write-Host $header -ForegroundColor Magenta
    Write-Log -Level "STEP" -Message "STEP $StepNum: $StepName"
}

function Write-Verbose {
    param([string]$Message)

    if ($VerboseLogging) {
        Write-Log -Level "VERBOSE" -Message $Message
        Write-Host "[VERBOSE] $Message" -ForegroundColor Gray
    }
}

# =============================================================================
# Status Tracking Functions
# =============================================================================
function Initialize-StatusFile {
    $status = @{
        deployment_id = $Timestamp
        started_at = (Get-Date).ToString("o")
        status = "in_progress"
        steps = @{
            dns_deployment = @{
                status = "pending"
                started_at = $null
                completed_at = $null
                error = $null
            }
            namespace_setup = @{
                status = "pending"
                started_at = $null
                completed_at = $null
                error = $null
            }
            external_secrets = @{
                status = "pending"
                started_at = $null
                completed_at = $null
                error = $null
            }
            tls_certificate = @{
                status = "pending"
                started_at = $null
                completed_at = $null
                error = $null
            }
            frontdoor_routes = @{
                status = "pending"
                started_at = $null
                completed_at = $null
                error = $null
            }
            verification = @{
                status = "pending"
                started_at = $null
                completed_at = $null
                error = $null
            }
        }
        completed_at = $null
        rollback_performed = $false
    }

    $status | ConvertTo-Json -Depth 10 | Set-Content -Path $StatusFile
    Write-Info "Status tracker initialized: $StatusFile"
}

function Update-StepStatus {
    param(
        [string]$StepName,
        [string]$Status,
        [string]$ErrorMessage = $null
    )

    $statusObj = Get-Content -Path $StatusFile | ConvertFrom-Json
    $timestamp = (Get-Date).ToString("o")

    switch ($Status) {
        "in_progress" {
            $statusObj.steps.$StepName.status = "in_progress"
            $statusObj.steps.$StepName.started_at = $timestamp
        }
        "completed" {
            $statusObj.steps.$StepName.status = "completed"
            $statusObj.steps.$StepName.completed_at = $timestamp
        }
        "failed" {
            $statusObj.steps.$StepName.status = "failed"
            $statusObj.steps.$StepName.completed_at = $timestamp
            if ($ErrorMessage) {
                $statusObj.steps.$StepName.error = $ErrorMessage
            }
        }
    }

    $statusObj | ConvertTo-Json -Depth 10 | Set-Content -Path $StatusFile
}

function Set-DeploymentComplete {
    param([string]$Status)

    $statusObj = Get-Content -Path $StatusFile | ConvertFrom-Json
    $statusObj.status = $Status
    $statusObj.completed_at = (Get-Date).ToString("o")
    $statusObj | ConvertTo-Json -Depth 10 | Set-Content -Path $StatusFile
}

# =============================================================================
# Validation Functions
# =============================================================================
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."

    $missingTools = @()

    # Check Azure CLI
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        $missingTools += "azure-cli"
    }

    # Check kubectl
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        $missingTools += "kubectl"
    }

    # Check helm
    if (-not (Get-Command helm -ErrorAction SilentlyContinue)) {
        Write-Warning "helm not found - some features may be limited"
    }

    if ($missingTools.Count -gt 0) {
        Write-Error "Missing required tools: $($missingTools -join ', ')"
        Write-Error "Please install missing tools before proceeding"
        return $false
    }

    # Check Azure CLI authentication
    try {
        $account = az account show 2>$null | ConvertFrom-Json
        if (-not $account) {
            Write-Error "Not authenticated with Azure CLI"
            Write-Error "Please run: az login"
            return $false
        }
        Write-Success "Azure CLI authenticated as: $($account.user.name)"
    }
    catch {
        Write-Error "Azure CLI authentication check failed"
        return $false
    }

    # Check kubectl context
    try {
        $null = kubectl cluster-info 2>$null
        $context = kubectl config current-context 2>$null
        Write-Success "kubectl configured with context: $context"
    }
    catch {
        Write-Error "kubectl is not configured or cluster is not accessible"
        Write-Error "Please configure kubectl with: az aks get-credentials --resource-group $ResourceGroup --name $AksCluster"
        return $false
    }

    Write-Success "All prerequisites met"
    return $true
}

function Test-AzureResources {
    Write-Info "Verifying Azure resources..."

    # Check Resource Group
    try {
        $null = az group show --name $ResourceGroup 2>$null | ConvertFrom-Json
        Write-Verbose "Resource group verified: $ResourceGroup"
    }
    catch {
        Write-Error "Resource group $ResourceGroup does not exist"
        return $false
    }

    # Check AKS Cluster
    try {
        $null = az aks show --resource-group $ResourceGroup --name $AksCluster 2>$null | ConvertFrom-Json
        Write-Verbose "AKS cluster verified: $AksCluster"
    }
    catch {
        Write-Error "AKS cluster $AksCluster does not exist"
        return $false
    }

    # Check Key Vault
    try {
        $null = az keyvault show --name $KeyVaultName 2>$null | ConvertFrom-Json
        Write-Verbose "Key Vault verified: $KeyVaultName"
    }
    catch {
        Write-Error "Key Vault $KeyVaultName does not exist"
        return $false
    }

    Write-Success "Azure resources verified"
    return $true
}

function Test-KeyVaultSecrets {
    Write-Info "Verifying Key Vault secrets..."

    $requiredSecrets = @(
        "database-password",
        "jwt-secret",
        "jwt-access-secret",
        "jwt-refresh-secret",
        "stripe-secret-key"
    )

    $missingSecrets = @()

    foreach ($secret in $requiredSecrets) {
        try {
            $null = az keyvault secret show --vault-name $KeyVaultName --name $secret 2>$null
        }
        catch {
            $missingSecrets += $secret
        }
    }

    if ($missingSecrets.Count -gt 0) {
        Write-Error "Missing required secrets in Key Vault: $($missingSecrets -join ', ')"
        return $false
    }

    Write-Success "All required secrets present in Key Vault"
    return $true
}

# =============================================================================
# DNS Functions
# =============================================================================
function Wait-DnsPropagation {
    param(
        [string]$Domain,
        [string]$ExpectedIP,
        [int]$MaxAttempts = 30
    )

    Write-Info "Waiting for DNS propagation for $Domain..."
    Write-Info "Expected IP: $ExpectedIP"

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        Write-Verbose "DNS check attempt $attempt of $MaxAttempts"

        try {
            $resolvedIP = (Resolve-DnsName -Name $Domain -Server 8.8.8.8 -Type A -ErrorAction SilentlyContinue).IPAddress | Select-Object -First 1

            if ($resolvedIP -eq $ExpectedIP) {
                Write-Success "DNS propagated successfully for $Domain -> $resolvedIP"
                return $true
            }

            Write-Verbose "DNS not yet propagated (got: $resolvedIP, expected: $ExpectedIP)"
        }
        catch {
            Write-Verbose "DNS resolution failed for $Domain"
        }

        Write-Info "Waiting 60 seconds before next check... ($attempt/$MaxAttempts)"
        Start-Sleep -Seconds 60
    }

    Write-Warning "DNS propagation timeout after $MaxAttempts attempts"
    Write-Warning "This may be normal - DNS can take up to 48 hours to fully propagate"
    return $false
}

function Deploy-Dns {
    Write-Step -StepNum 1 -StepName "DNS Deployment"
    Update-StepStatus -StepName "dns_deployment" -Status "in_progress"

    if ($SkipDns) {
        Write-Warning "Skipping DNS deployment (SkipDns flag)"
        Update-StepStatus -StepName "dns_deployment" -Status "completed"
        return $true
    }

    if ($DryRun) {
        Write-Info "[DRY RUN] Would deploy DNS for $DomainName to IP $TargetIP"
        Update-StepStatus -StepName "dns_deployment" -Status "completed"
        return $true
    }

    $dnsScript = Join-Path $InfraDir "dns\configure-dns.ps1"

    if (-not (Test-Path $dnsScript)) {
        Write-Error "DNS script not found: $dnsScript"
        Update-StepStatus -StepName "dns_deployment" -Status "failed" -ErrorMessage "DNS script not found"
        return $false
    }

    Write-Info "Executing DNS configuration script..."
    try {
        & $dnsScript
        Write-Success "DNS configuration completed"

        # Wait for DNS propagation
        Write-Info "Checking DNS propagation (this may take time)..."
        Wait-DnsPropagation -Domain $DomainName -ExpectedIP $TargetIP
        Wait-DnsPropagation -Domain "www.$DomainName" -ExpectedIP $TargetIP
        Wait-DnsPropagation -Domain "api.$DomainName" -ExpectedIP $TargetIP

        Update-StepStatus -StepName "dns_deployment" -Status "completed"
        return $true
    }
    catch {
        Write-Error "DNS configuration failed: $_"
        Update-StepStatus -StepName "dns_deployment" -Status "failed" -ErrorMessage $_.Exception.Message
        return $false
    }
}

# =============================================================================
# Kubernetes Functions
# =============================================================================
function Deploy-NamespaceAndConfigs {
    Write-Step -StepNum 2 -StepName "Kubernetes Namespace and Configurations"
    Update-StepStatus -StepName "namespace_setup" -Status "in_progress"

    if ($DryRun) {
        Write-Info "[DRY RUN] Would create namespace: $Namespace"
        Update-StepStatus -StepName "namespace_setup" -Status "completed"
        return $true
    }

    try {
        # Create namespace
        Write-Info "Creating namespace: $Namespace"
        $existingNs = kubectl get namespace $Namespace 2>$null
        if ($existingNs) {
            Write-Warning "Namespace $Namespace already exists"
        }
        else {
            kubectl create namespace $Namespace
            Write-Success "Namespace created: $Namespace"
        }

        # Label namespace
        kubectl label namespace $Namespace environment=production --overwrite
        kubectl label namespace $Namespace managed-by=flamoral-deploy --overwrite

        # Apply ConfigMaps
        Write-Info "Applying ConfigMaps..."
        $configmapDir = Join-Path $InfraDir "kubernetes\configmaps"
        if (Test-Path $configmapDir) {
            kubectl apply -f $configmapDir -n $Namespace 2>$null
        }

        Update-StepStatus -StepName "namespace_setup" -Status "completed"
        Write-Success "Namespace and configurations deployed"
        return $true
    }
    catch {
        Write-Error "Namespace setup failed: $_"
        Update-StepStatus -StepName "namespace_setup" -Status "failed" -ErrorMessage $_.Exception.Message
        return $false
    }
}

function Deploy-ExternalSecrets {
    Write-Step -StepNum 3 -StepName "External Secrets Operator"
    Update-StepStatus -StepName "external_secrets" -Status "in_progress"

    if ($DryRun) {
        Write-Info "[DRY RUN] Would deploy External Secrets"
        Update-StepStatus -StepName "external_secrets" -Status "completed"
        return $true
    }

    try {
        # Check if External Secrets Operator is installed
        Write-Info "Checking External Secrets Operator installation..."
        $esDeployment = kubectl get deployment -n external-secrets external-secrets 2>$null

        if (-not $esDeployment) {
            Write-Info "Installing External Secrets Operator..."
            helm repo add external-secrets https://charts.external-secrets.io
            helm repo update
            helm install external-secrets external-secrets/external-secrets `
                -n external-secrets `
                --create-namespace `
                --set installCRDs=true

            # Wait for operator to be ready
            kubectl wait --for=condition=available --timeout=300s `
                deployment/external-secrets -n external-secrets
            Write-Success "External Secrets Operator installed"
        }
        else {
            Write-Info "External Secrets Operator already installed"
        }

        # Deploy SecretProviderClass
        Write-Info "Deploying Azure Key Vault SecretProviderClass..."
        $secretProvider = Join-Path $InfraDir "kubernetes\secrets\azure-keyvault-secretprovider.yaml"

        if (Test-Path $secretProvider) {
            $tenantId = (az account show --query tenantId -o tsv)
            $clientId = (az aks show -g $ResourceGroup -n $AksCluster --query identityProfile.kubeletidentity.clientId -o tsv)

            # Replace variables and apply
            $content = Get-Content $secretProvider -Raw
            $content = $content -replace '\$\{ENVIRONMENT\}', 'production'
            $content = $content -replace '\$\{KEY_VAULT_NAME\}', $KeyVaultName
            $content = $content -replace '\$\{AZURE_TENANT_ID\}', $tenantId
            $content = $content -replace '\$\{AZURE_CLIENT_ID\}', $clientId

            $content | kubectl apply -f - -n $Namespace
            Write-Success "SecretProviderClass deployed"
        }
        else {
            Write-Warning "SecretProviderClass file not found: $secretProvider"
        }

        Update-StepStatus -StepName "external_secrets" -Status "completed"
        Write-Success "External Secrets deployed"
        return $true
    }
    catch {
        Write-Error "External Secrets deployment failed: $_"
        Update-StepStatus -StepName "external_secrets" -Status "failed" -ErrorMessage $_.Exception.Message
        return $false
    }
}

function Deploy-TlsCertificate {
    Write-Step -StepNum 4 -StepName "TLS Certificate (Let's Encrypt)"
    Update-StepStatus -StepName "tls_certificate" -Status "in_progress"

    if ($DryRun) {
        Write-Info "[DRY RUN] Would deploy TLS certificate"
        Update-StepStatus -StepName "tls_certificate" -Status "completed"
        return $true
    }

    try {
        # Check if cert-manager is installed
        Write-Info "Checking cert-manager installation..."
        $cmNamespace = kubectl get namespace cert-manager 2>$null

        if (-not $cmNamespace) {
            Write-Info "Installing cert-manager..."
            kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

            # Wait for cert-manager to be ready
            Start-Sleep -Seconds 30
            kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
            kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-webhook -n cert-manager
            kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-cainjector -n cert-manager

            Write-Success "cert-manager installed"
        }
        else {
            Write-Info "cert-manager already installed"
        }

        # Deploy ClusterIssuer
        Write-Info "Deploying Let's Encrypt ClusterIssuer..."
        $issuerFile = Join-Path (Split-Path $ProjectRoot) "letsencrypt-prod-issuer.yaml"

        if (Test-Path $issuerFile) {
            kubectl apply -f $issuerFile
            Write-Success "ClusterIssuer deployed"
        }
        else {
            Write-Warning "ClusterIssuer file not found: $issuerFile"
        }

        # Deploy Ingress with TLS
        Write-Info "Deploying Ingress with TLS..."
        $ingressFile = Join-Path (Split-Path $ProjectRoot) "flamoral-ingress-tls.yaml"

        if (Test-Path $ingressFile) {
            kubectl apply -f $ingressFile -n $Namespace
            Write-Success "Ingress with TLS deployed"

            # Wait for certificate
            Write-Info "Waiting for certificate to be issued (this may take a few minutes)..."
            $maxWait = 300
            $waited = 0

            while ($waited -lt $maxWait) {
                $certStatus = kubectl get certificate flamoral-tls -n $Namespace -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>$null
                if ($certStatus -eq "True") {
                    Write-Success "TLS certificate issued successfully"
                    break
                }
                Start-Sleep -Seconds 10
                $waited += 10
                Write-Verbose "Waiting for certificate... ($waited/$maxWait seconds)"
            }

            if ($waited -ge $maxWait) {
                Write-Warning "Certificate issuance timeout - check status manually with: kubectl describe certificate flamoral-tls -n $Namespace"
            }
        }
        else {
            Write-Warning "Ingress file not found: $ingressFile"
        }

        Update-StepStatus -StepName "tls_certificate" -Status "completed"
        Write-Success "TLS certificate deployed"
        return $true
    }
    catch {
        Write-Error "TLS certificate deployment failed: $_"
        Update-StepStatus -StepName "tls_certificate" -Status "failed" -ErrorMessage $_.Exception.Message
        return $false
    }
}

function Deploy-FrontDoorRoutes {
    Write-Step -StepNum 5 -StepName "Azure Front Door Routing Rules"
    Update-StepStatus -StepName "frontdoor_routes" -Status "in_progress"

    if ($DryRun) {
        Write-Info "[DRY RUN] Would deploy Front Door routes"
        Update-StepStatus -StepName "frontdoor_routes" -Status "completed"
        return $true
    }

    $frontdoorScript = Join-Path $InfraDir "azure\deploy-frontdoor-routes.ps1"

    if (-not (Test-Path $frontdoorScript)) {
        Write-Error "Front Door script not found: $frontdoorScript"
        Update-StepStatus -StepName "frontdoor_routes" -Status "failed" -ErrorMessage "Front Door script not found"
        return $false
    }

    Write-Info "Executing Front Door routing deployment..."
    try {
        & $frontdoorScript
        Write-Success "Front Door routes deployed"
        Update-StepStatus -StepName "frontdoor_routes" -Status "completed"
        return $true
    }
    catch {
        Write-Error "Front Door deployment failed: $_"
        Update-StepStatus -StepName "frontdoor_routes" -Status "failed" -ErrorMessage $_.Exception.Message
        return $false
    }
}

function Test-Deployment {
    Write-Step -StepNum 6 -StepName "Deployment Verification"
    Update-StepStatus -StepName "verification" -Status "in_progress"

    $verificationFailed = $false

    try {
        # Check namespace
        Write-Info "Verifying namespace..."
        $ns = kubectl get namespace $Namespace 2>$null
        if ($ns) {
            Write-Success "Namespace exists: $Namespace"
        }
        else {
            Write-Error "Namespace not found: $Namespace"
            $verificationFailed = $true
        }

        # Check pods
        Write-Info "Checking pod status..."
        $pods = kubectl get pods -n $Namespace --no-headers 2>$null
        $podCount = if ($pods) { ($pods | Measure-Object).Count } else { 0 }
        Write-Info "Found $podCount pods in namespace $Namespace"

        if ($podCount -gt 0) {
            kubectl get pods -n $Namespace -o wide
        }

        # Check services
        Write-Info "Checking services..."
        $services = kubectl get services -n $Namespace --no-headers 2>$null
        $svcCount = if ($services) { ($services | Measure-Object).Count } else { 0 }
        Write-Info "Found $svcCount services in namespace $Namespace"

        if ($svcCount -gt 0) {
            kubectl get services -n $Namespace
        }

        # Check ingress
        Write-Info "Checking ingress..."
        $ingress = kubectl get ingress -n $Namespace 2>$null
        if ($ingress) {
            kubectl get ingress -n $Namespace
            Write-Success "Ingress configured"
        }
        else {
            Write-Warning "No ingress found in namespace"
        }

        # Check TLS certificate
        Write-Info "Checking TLS certificate..."
        $cert = kubectl get certificate -n $Namespace 2>$null
        if ($cert) {
            kubectl get certificate -n $Namespace
            Write-Success "TLS certificates found"
        }
        else {
            Write-Warning "No TLS certificates found"
        }

        # DNS verification
        if (-not $SkipDns) {
            Write-Info "Verifying DNS resolution..."
            $subdomains = @("", "www.", "api.", "admin.")
            foreach ($subdomain in $subdomains) {
                $fqdn = "$subdomain$DomainName"
                try {
                    $ip = (Resolve-DnsName -Name $fqdn -Server 8.8.8.8 -Type A -ErrorAction SilentlyContinue).IPAddress | Select-Object -First 1
                    if ($ip) {
                        Write-Success "DNS resolved: $fqdn -> $ip"
                    }
                    else {
                        Write-Warning "DNS not resolved: $fqdn"
                    }
                }
                catch {
                    Write-Warning "DNS not resolved: $fqdn"
                }
            }
        }

        # Health check
        Write-Info "Performing health checks..."
        try {
            $response = Invoke-WebRequest -Uri "https://api.$DomainName/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Success "API health check passed"
            }
        }
        catch {
            Write-Warning "API health check failed (this may be normal if services are still starting)"
        }

        if ($verificationFailed) {
            Update-StepStatus -StepName "verification" -Status "failed" -ErrorMessage "Verification checks failed"
            return $false
        }
        else {
            Update-StepStatus -StepName "verification" -Status "completed"
            Write-Success "Deployment verification completed"
            return $true
        }
    }
    catch {
        Write-Error "Verification failed: $_"
        Update-StepStatus -StepName "verification" -Status "failed" -ErrorMessage $_.Exception.Message
        return $false
    }
}

# =============================================================================
# Rollback Functions
# =============================================================================
function Invoke-Rollback {
    Write-Error "Deployment failed - initiating rollback..."

    if ($NoRollback) {
        Write-Warning "Rollback disabled (NoRollback flag)"
        return
    }

    if ($DryRun) {
        Write-Info "[DRY RUN] Would perform rollback"
        return
    }

    Write-Warning "Rolling back changes..."

    # Mark rollback in status
    $statusObj = Get-Content -Path $StatusFile | ConvertFrom-Json
    $statusObj.rollback_performed = $true
    $statusObj | ConvertTo-Json -Depth 10 | Set-Content -Path $StatusFile

    # Delete namespace (this removes all resources)
    try {
        $ns = kubectl get namespace $Namespace 2>$null
        if ($ns) {
            Write-Info "Deleting namespace: $Namespace"
            kubectl delete namespace $Namespace --timeout=120s
        }
    }
    catch {
        Write-Warning "Failed to delete namespace: $_"
    }

    Write-Warning "Rollback completed - please review logs at: $LogFile"
}

# =============================================================================
# Main Deployment Flow
# =============================================================================
function Main {
    # Setup
    Setup-Logging
    Initialize-StatusFile

    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  Flamoral Production Deployment Orchestration" -ForegroundColor White
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""

    if ($DryRun) {
        Write-Warning "DRY RUN MODE - No actual changes will be made"
    }

    # Pre-deployment validation
    if (-not $SkipValidation) {
        Write-Info "Running pre-deployment checks..."

        if (-not (Test-Prerequisites)) {
            Write-Error "Prerequisites check failed"
            exit 1
        }

        if (-not (Test-AzureResources)) {
            Write-Error "Azure resources verification failed"
            exit 1
        }

        if (-not (Test-KeyVaultSecrets)) {
            Write-Error "Key Vault secrets verification failed"
            exit 1
        }
    }

    # Execute deployment steps
    $failed = $false

    if ($Step) {
        Write-Info "Running specific step: $Step"

        switch ($Step.ToLower()) {
            "dns" { $failed = -not (Deploy-Dns) }
            "namespace" { $failed = -not (Deploy-NamespaceAndConfigs) }
            "secrets" { $failed = -not (Deploy-ExternalSecrets) }
            "tls" { $failed = -not (Deploy-TlsCertificate) }
            "frontdoor" { $failed = -not (Deploy-FrontDoorRoutes) }
            "verify" { $failed = -not (Test-Deployment) }
            default {
                Write-Error "Unknown step: $Step"
                Write-Error "Valid steps: dns, namespace, secrets, tls, frontdoor, verify"
                exit 1
            }
        }
    }
    else {
        # Run all steps in order
        if (-not (Deploy-Dns)) { $failed = $true }
        if (-not $failed -and -not (Deploy-NamespaceAndConfigs)) { $failed = $true }
        if (-not $failed -and -not (Deploy-ExternalSecrets)) { $failed = $true }
        if (-not $failed -and -not (Deploy-TlsCertificate)) { $failed = $true }
        if (-not $failed -and -not (Deploy-FrontDoorRoutes)) { $failed = $true }
        if (-not $failed -and -not (Test-Deployment)) { $failed = $true }
    }

    # Handle deployment result
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan

    if ($failed) {
        Write-Error "Deployment failed!"
        Set-DeploymentComplete -Status "failed"
        Invoke-Rollback
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Error "Deployment failed - check logs at: $LogFile"
        exit 1
    }
    else {
        Write-Success "Deployment completed successfully!"
        Set-DeploymentComplete -Status "completed"
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Success "All deployment steps completed successfully"
        Write-Info "Deployment log: $LogFile"
        Write-Info "Status tracker: $StatusFile"
        Write-Host ""
        Write-Info "Your application should now be accessible at:"
        Write-Host "  https://$DomainName" -ForegroundColor White
        Write-Host "  https://www.$DomainName" -ForegroundColor White
        Write-Host "  https://api.$DomainName" -ForegroundColor White
        Write-Host ""
    }
}

# Execute main function
Main
