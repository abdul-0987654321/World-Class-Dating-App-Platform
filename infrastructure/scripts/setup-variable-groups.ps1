<#
.SYNOPSIS
    Creates Azure DevOps Variable Groups for the Flamoral Dating Platform

.DESCRIPTION
    This script automates the creation of Variable Groups in Azure DevOps using the REST API.
    It creates all required variable groups for dev, test, and production environments,
    and sets up common (non-secret) variables with default values.

    Secret variables are created as placeholders and must be manually populated via
    Azure DevOps portal or Azure Key Vault integration.

.PARAMETER PAT
    Personal Access Token for Azure DevOps with Variable Groups (Read, Create, & Manage) permissions

.PARAMETER Organization
    Azure DevOps organization name (default: citadelcloudmanagement)

.PARAMETER Project
    Azure DevOps project name (default: DatingPlatform)

.PARAMETER Environment
    Target environment to create. Options: dev, test, prod, all (default: all)

.PARAMETER Force
    Force recreation of existing variable groups (WARNING: This will delete existing groups)

.EXAMPLE
    .\setup-variable-groups.ps1 -PAT "your-pat-token"
    Creates all variable groups with default organization and project

.EXAMPLE
    .\setup-variable-groups.ps1 -PAT "your-pat-token" -Environment "dev"
    Creates only development environment variable group

.EXAMPLE
    .\setup-variable-groups.ps1 -PAT "your-pat-token" -Organization "myorg" -Project "myproject"
    Creates variable groups for custom organization and project

.NOTES
    File Name      : setup-variable-groups.ps1
    Author         : Flamoral DevOps Team
    Prerequisite   : Azure DevOps PAT with Variable Groups permissions
    Version        : 1.0.0
    Last Updated   : 2025-12-07
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "Azure DevOps Personal Access Token")]
    [ValidateNotNullOrEmpty()]
    [string]$PAT,

    [Parameter(Mandatory = $false)]
    [ValidateNotNullOrEmpty()]
    [string]$Organization = "citadelcloudmanagement",

    [Parameter(Mandatory = $false)]
    [ValidateNotNullOrEmpty()]
    [string]$Project = "DatingPlatform",

    [Parameter(Mandatory = $false)]
    [ValidateSet("dev", "test", "prod", "all")]
    [string]$Environment = "all",

    [Parameter(Mandatory = $false)]
    [switch]$Force
)

# Script configuration
$ErrorActionPreference = "Stop"
$baseUrl = "https://dev.azure.com/$Organization/$Project"
$apiVersion = "7.0"

# Encode PAT for authentication
$encodedPat = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$PAT"))
$headers = @{
    Authorization  = "Basic $encodedPat"
    "Content-Type" = "application/json"
}

#region Helper Functions

function Write-ColorOutput {
    param(
        [string]$Message,
        [ValidateSet("Success", "Error", "Warning", "Info")]
        [string]$Type = "Info"
    )

    $color = switch ($Type) {
        "Success" { "Green" }
        "Error" { "Red" }
        "Warning" { "Yellow" }
        "Info" { "Cyan" }
    }

    $prefix = switch ($Type) {
        "Success" { "[SUCCESS]" }
        "Error" { "[ERROR]" }
        "Warning" { "[WARNING]" }
        "Info" { "[INFO]" }
    }

    Write-Host "$prefix $Message" -ForegroundColor $color
}

function Test-AzureDevOpsConnection {
    try {
        $projectUrl = "https://dev.azure.com/$Organization/_apis/projects/$Project`?api-version=$apiVersion"
        $response = Invoke-RestMethod -Uri $projectUrl -Headers $headers -Method Get
        Write-ColorOutput "Successfully connected to Azure DevOps project: $($response.name)" -Type Success
        return $true
    }
    catch {
        Write-ColorOutput "Failed to connect to Azure DevOps: $($_.Exception.Message)" -Type Error
        return $false
    }
}

function Get-VariableGroup {
    param([string]$GroupName)

    try {
        $url = "$baseUrl/_apis/distributedtask/variablegroups?api-version=$apiVersion"
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        $group = $response.value | Where-Object { $_.name -eq $GroupName }
        return $group
    }
    catch {
        Write-ColorOutput "Error checking for existing variable group: $($_.Exception.Message)" -Type Error
        return $null
    }
}

function Remove-VariableGroup {
    param([int]$GroupId)

    try {
        $url = "$baseUrl/_apis/distributedtask/variablegroups/$GroupId`?api-version=$apiVersion"
        Invoke-RestMethod -Uri $url -Headers $headers -Method Delete | Out-Null
        return $true
    }
    catch {
        Write-ColorOutput "Error deleting variable group: $($_.Exception.Message)" -Type Error
        return $false
    }
}

function New-VariableGroup {
    param(
        [string]$Name,
        [string]$Description,
        [hashtable]$Variables
    )

    Write-ColorOutput "Creating variable group: $Name" -Type Info

    # Check if group already exists
    $existingGroup = Get-VariableGroup -GroupName $Name
    if ($existingGroup) {
        if ($Force) {
            Write-ColorOutput "Variable group '$Name' exists. Force flag set - deleting existing group..." -Type Warning
            if (Remove-VariableGroup -GroupId $existingGroup.id) {
                Write-ColorOutput "Deleted existing variable group: $Name" -Type Success
            }
            else {
                Write-ColorOutput "Failed to delete existing group. Skipping..." -Type Error
                return $null
            }
        }
        else {
            Write-ColorOutput "Variable group '$Name' already exists. Use -Force to recreate." -Type Warning
            return $existingGroup
        }
    }

    # Build variables object
    $variablesObj = @{}
    foreach ($key in $Variables.Keys) {
        $variablesObj[$key] = @{
            value    = $Variables[$key].Value
            isSecret = $Variables[$key].IsSecret
        }
    }

    $body = @{
        name        = $Name
        description = $Description
        type        = "Vsts"
        variables   = $variablesObj
    } | ConvertTo-Json -Depth 10

    try {
        $url = "$baseUrl/_apis/distributedtask/variablegroups?api-version=$apiVersion"
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $body
        Write-ColorOutput "Successfully created variable group: $Name (ID: $($response.id))" -Type Success
        return $response
    }
    catch {
        Write-ColorOutput "Failed to create variable group '$Name': $($_.Exception.Message)" -Type Error
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-ColorOutput "Response: $responseBody" -Type Error
        }
        return $null
    }
}

#endregion

#region Variable Group Definitions

function Get-SharedVariables {
    return @{
        nodeVersion            = @{ Value = "20.x"; IsSecret = $false }
        goVersion              = @{ Value = "1.21"; IsSecret = $false }
        pythonVersion          = @{ Value = "3.x"; IsSecret = $false }
        terraformVersion       = @{ Value = "1.6.0"; IsSecret = $false }
        helmVersion            = @{ Value = "3.12.0"; IsSecret = $false }
        vmImageName            = @{ Value = "ubuntu-latest"; IsSecret = $false }
        acrName                = @{ Value = "flamoralacr8eq5eg"; IsSecret = $false }
        acrLoginServer         = @{ Value = "flamoralacr8eq5eg.azurecr.io"; IsSecret = $false }
        imagePrefix            = @{ Value = "flamoral"; IsSecret = $false }
        tfStateResourceGroup   = @{ Value = "flamoral-terraform-state-rg"; IsSecret = $false }
        tfStateStorageAccount  = @{ Value = "flamoraltfstate"; IsSecret = $false }
        tfStateContainer       = @{ Value = "tfstate"; IsSecret = $false }
    }
}

function Get-CDVariables {
    return @{
        azureServiceConnection          = @{ Value = "azure-terraform-sp-connection"; IsSecret = $false }
        dockerRegistryServiceConnection = @{ Value = "acr-datingapp-connection"; IsSecret = $false }
        kubernetesServiceConnection     = @{ Value = "aks-flamoral-connection"; IsSecret = $false }
    }
}

function Get-TerraformVariables {
    return @{
        ARM_CLIENT_ID       = @{ Value = "REPLACE_WITH_YOUR_CLIENT_ID"; IsSecret = $true }
        ARM_CLIENT_SECRET   = @{ Value = ""; IsSecret = $true }
        ARM_SUBSCRIPTION_ID = @{ Value = "REPLACE_WITH_YOUR_SUBSCRIPTION_ID"; IsSecret = $true }
        ARM_TENANT_ID       = @{ Value = "REPLACE_WITH_YOUR_TENANT_ID"; IsSecret = $true }
    }
}

function Get-DevVariables {
    return @{
        # Environment Configuration
        environment              = @{ Value = "dev"; IsSecret = $false }
        namespace                = @{ Value = "flamoral-dev"; IsSecret = $false }
        ingressHost              = @{ Value = "dev.flamoral.app"; IsSecret = $false }
        apiHost                  = @{ Value = "api.dev.flamoral.app"; IsSecret = $false }
        replicaCount             = @{ Value = "1"; IsSecret = $false }
        autoscalingEnabled       = @{ Value = "false"; IsSecret = $false }
        keyVaultName             = @{ Value = "flamoral-dev-kv"; IsSecret = $false }
        aksClusterName           = @{ Value = "flamoral-dev-aks"; IsSecret = $false }
        resourceGroup            = @{ Value = "flamoral-dev-rg"; IsSecret = $false }

        # Database - PostgreSQL
        DATABASE_URL             = @{ Value = ""; IsSecret = $true }
        DB_HOST                  = @{ Value = "flamoral-dev-postgres.postgres.database.azure.com"; IsSecret = $false }
        DB_PORT                  = @{ Value = "5432"; IsSecret = $false }
        DB_NAME                  = @{ Value = "flamoral"; IsSecret = $false }
        DB_USER                  = @{ Value = "flamoral_admin"; IsSecret = $false }
        DB_PASSWORD              = @{ Value = ""; IsSecret = $true }

        # Database - MongoDB
        MONGODB_URI              = @{ Value = ""; IsSecret = $true }
        MONGODB_DB               = @{ Value = "flamoral-dev"; IsSecret = $false }

        # Redis
        REDIS_URL                = @{ Value = ""; IsSecret = $true }
        REDIS_HOST               = @{ Value = "flamoral-dev-redis.redis.cache.windows.net"; IsSecret = $false }
        REDIS_PORT               = @{ Value = "6379"; IsSecret = $false }
        REDIS_PASSWORD           = @{ Value = ""; IsSecret = $true }

        # RabbitMQ
        RABBITMQ_URL             = @{ Value = ""; IsSecret = $true }

        # JWT Secrets
        JWT_ACCESS_SECRET        = @{ Value = ""; IsSecret = $true }
        JWT_REFRESH_SECRET       = @{ Value = ""; IsSecret = $true }
        JWT_ACCESS_EXPIRES_IN    = @{ Value = "15m"; IsSecret = $false }
        JWT_REFRESH_EXPIRES_IN   = @{ Value = "7d"; IsSecret = $false }

        # Stripe Payment
        STRIPE_SECRET_KEY        = @{ Value = ""; IsSecret = $true }
        STRIPE_PUBLISHABLE_KEY   = @{ Value = "pk_test_REPLACE_ME"; IsSecret = $false }
        STRIPE_WEBHOOK_SECRET    = @{ Value = ""; IsSecret = $true }

        # SendGrid Email
        SENDGRID_API_KEY         = @{ Value = ""; IsSecret = $true }
        SENDGRID_FROM_EMAIL      = @{ Value = "dev@flamoral.com"; IsSecret = $false }
        SENDGRID_FROM_NAME       = @{ Value = "Flamoral Dev"; IsSecret = $false }

        # Twilio SMS
        TWILIO_ACCOUNT_SID       = @{ Value = "REPLACE_WITH_YOUR_SID"; IsSecret = $false }
        TWILIO_AUTH_TOKEN        = @{ Value = ""; IsSecret = $true }
        TWILIO_PHONE_NUMBER      = @{ Value = "+1234567890"; IsSecret = $false }
        TWILIO_VERIFY_SERVICE_SID = @{ Value = "REPLACE_WITH_YOUR_SERVICE_SID"; IsSecret = $false }

        # Azure Storage
        AZURE_STORAGE_CONNECTION_STRING = @{ Value = ""; IsSecret = $true }
        AZURE_STORAGE_ACCOUNT    = @{ Value = "flamoraldevst"; IsSecret = $false }
        AZURE_STORAGE_KEY        = @{ Value = ""; IsSecret = $true }

        # Azure Cognitive Services
        AZURE_FACE_API_KEY       = @{ Value = ""; IsSecret = $true }
        AZURE_FACE_API_ENDPOINT  = @{ Value = "https://eastus.api.cognitive.microsoft.com"; IsSecret = $false }

        # Agora Video Calling
        AGORA_APP_ID             = @{ Value = "REPLACE_WITH_YOUR_APP_ID"; IsSecret = $false }
        AGORA_APP_CERTIFICATE    = @{ Value = ""; IsSecret = $true }

        # Sentry Error Tracking
        SENTRY_DSN               = @{ Value = ""; IsSecret = $true }
        SENTRY_ENVIRONMENT       = @{ Value = "development"; IsSecret = $false }

        # Container Registry
        ACR_USERNAME             = @{ Value = "flamoralacr8eq5eg"; IsSecret = $false }
        ACR_PASSWORD             = @{ Value = ""; IsSecret = $true }

        # Application Configuration
        CORS_ORIGIN              = @{ Value = "http://localhost:5173,https://dev.flamoral.app"; IsSecret = $false }
        NODE_ENV                 = @{ Value = "development"; IsSecret = $false }
        LOG_LEVEL                = @{ Value = "debug"; IsSecret = $false }
        PORT                     = @{ Value = "3000"; IsSecret = $false }
    }
}

function Get-TestVariables {
    return @{
        # Environment Configuration
        environment              = @{ Value = "test"; IsSecret = $false }
        namespace                = @{ Value = "flamoral-test"; IsSecret = $false }
        ingressHost              = @{ Value = "test.flamoral.app"; IsSecret = $false }
        apiHost                  = @{ Value = "api.test.flamoral.app"; IsSecret = $false }
        replicaCount             = @{ Value = "2"; IsSecret = $false }
        autoscalingEnabled       = @{ Value = "true"; IsSecret = $false }
        autoscalingMinReplicas   = @{ Value = "2"; IsSecret = $false }
        autoscalingMaxReplicas   = @{ Value = "5"; IsSecret = $false }
        keyVaultName             = @{ Value = "flamoral-test-kv"; IsSecret = $false }
        aksClusterName           = @{ Value = "flamoral-test-aks"; IsSecret = $false }
        resourceGroup            = @{ Value = "flamoral-test-rg"; IsSecret = $false }

        # Database - PostgreSQL
        DATABASE_URL             = @{ Value = ""; IsSecret = $true }
        DB_HOST                  = @{ Value = "flamoral-test-postgres.postgres.database.azure.com"; IsSecret = $false }
        DB_PORT                  = @{ Value = "5432"; IsSecret = $false }
        DB_NAME                  = @{ Value = "flamoral"; IsSecret = $false }
        DB_USER                  = @{ Value = "flamoral_admin"; IsSecret = $false }
        DB_PASSWORD              = @{ Value = ""; IsSecret = $true }

        # Database - MongoDB
        MONGODB_URI              = @{ Value = ""; IsSecret = $true }
        MONGODB_DB               = @{ Value = "flamoral-test"; IsSecret = $false }

        # Redis
        REDIS_URL                = @{ Value = ""; IsSecret = $true }
        REDIS_HOST               = @{ Value = "flamoral-test-redis.redis.cache.windows.net"; IsSecret = $false }
        REDIS_PORT               = @{ Value = "6379"; IsSecret = $false }
        REDIS_PASSWORD           = @{ Value = ""; IsSecret = $true }

        # RabbitMQ
        RABBITMQ_URL             = @{ Value = ""; IsSecret = $true }

        # JWT Secrets
        JWT_ACCESS_SECRET        = @{ Value = ""; IsSecret = $true }
        JWT_REFRESH_SECRET       = @{ Value = ""; IsSecret = $true }
        JWT_ACCESS_EXPIRES_IN    = @{ Value = "15m"; IsSecret = $false }
        JWT_REFRESH_EXPIRES_IN   = @{ Value = "7d"; IsSecret = $false }

        # Stripe Payment
        STRIPE_SECRET_KEY        = @{ Value = ""; IsSecret = $true }
        STRIPE_PUBLISHABLE_KEY   = @{ Value = "pk_test_REPLACE_ME"; IsSecret = $false }
        STRIPE_WEBHOOK_SECRET    = @{ Value = ""; IsSecret = $true }

        # SendGrid Email
        SENDGRID_API_KEY         = @{ Value = ""; IsSecret = $true }
        SENDGRID_FROM_EMAIL      = @{ Value = "test@flamoral.com"; IsSecret = $false }
        SENDGRID_FROM_NAME       = @{ Value = "Flamoral Test"; IsSecret = $false }

        # Twilio SMS
        TWILIO_ACCOUNT_SID       = @{ Value = "REPLACE_WITH_YOUR_SID"; IsSecret = $false }
        TWILIO_AUTH_TOKEN        = @{ Value = ""; IsSecret = $true }
        TWILIO_PHONE_NUMBER      = @{ Value = "+1234567890"; IsSecret = $false }
        TWILIO_VERIFY_SERVICE_SID = @{ Value = "REPLACE_WITH_YOUR_SERVICE_SID"; IsSecret = $false }

        # Azure Storage
        AZURE_STORAGE_CONNECTION_STRING = @{ Value = ""; IsSecret = $true }
        AZURE_STORAGE_ACCOUNT    = @{ Value = "flamoraltestst"; IsSecret = $false }
        AZURE_STORAGE_KEY        = @{ Value = ""; IsSecret = $true }

        # Azure Cognitive Services
        AZURE_FACE_API_KEY       = @{ Value = ""; IsSecret = $true }
        AZURE_FACE_API_ENDPOINT  = @{ Value = "https://eastus.api.cognitive.microsoft.com"; IsSecret = $false }

        # Agora Video Calling
        AGORA_APP_ID             = @{ Value = "REPLACE_WITH_YOUR_APP_ID"; IsSecret = $false }
        AGORA_APP_CERTIFICATE    = @{ Value = ""; IsSecret = $true }

        # Sentry Error Tracking
        SENTRY_DSN               = @{ Value = ""; IsSecret = $true }
        SENTRY_ENVIRONMENT       = @{ Value = "test"; IsSecret = $false }

        # Container Registry
        ACR_USERNAME             = @{ Value = "flamoralacr8eq5eg"; IsSecret = $false }
        ACR_PASSWORD             = @{ Value = ""; IsSecret = $true }

        # Application Configuration
        CORS_ORIGIN              = @{ Value = "https://test.flamoral.app"; IsSecret = $false }
        NODE_ENV                 = @{ Value = "production"; IsSecret = $false }
        LOG_LEVEL                = @{ Value = "info"; IsSecret = $false }
        PORT                     = @{ Value = "3000"; IsSecret = $false }
    }
}

function Get-ProdVariables {
    return @{
        # Environment Configuration
        environment              = @{ Value = "production"; IsSecret = $false }
        namespace                = @{ Value = "flamoral-prod"; IsSecret = $false }
        ingressHost              = @{ Value = "flamoral.app"; IsSecret = $false }
        apiHost                  = @{ Value = "api.flamoral.app"; IsSecret = $false }
        replicaCount             = @{ Value = "5"; IsSecret = $false }
        autoscalingEnabled       = @{ Value = "true"; IsSecret = $false }
        autoscalingMinReplicas   = @{ Value = "5"; IsSecret = $false }
        autoscalingMaxReplicas   = @{ Value = "50"; IsSecret = $false }
        targetCPUUtilization     = @{ Value = "70"; IsSecret = $false }
        resourceRequestMemory    = @{ Value = "1Gi"; IsSecret = $false }
        resourceRequestCpu       = @{ Value = "1000m"; IsSecret = $false }
        resourceLimitMemory      = @{ Value = "2Gi"; IsSecret = $false }
        resourceLimitCpu         = @{ Value = "2000m"; IsSecret = $false }
        keyVaultName             = @{ Value = "flamoral-prod-kv"; IsSecret = $false }
        aksClusterName           = @{ Value = "flamoral-prod-aks"; IsSecret = $false }
        resourceGroup            = @{ Value = "flamoral-prod-rg"; IsSecret = $false }

        # Database - PostgreSQL
        DATABASE_URL             = @{ Value = ""; IsSecret = $true }
        DB_HOST                  = @{ Value = "flamoral-prod-postgres.postgres.database.azure.com"; IsSecret = $false }
        DB_PORT                  = @{ Value = "5432"; IsSecret = $false }
        DB_NAME                  = @{ Value = "flamoral"; IsSecret = $false }
        DB_USER                  = @{ Value = "flamoral_admin"; IsSecret = $false }
        DB_PASSWORD              = @{ Value = ""; IsSecret = $true }

        # Database - MongoDB
        MONGODB_URI              = @{ Value = ""; IsSecret = $true }
        MONGODB_DB               = @{ Value = "flamoral-prod"; IsSecret = $false }

        # Redis
        REDIS_URL                = @{ Value = ""; IsSecret = $true }
        REDIS_HOST               = @{ Value = "flamoral-prod-redis.redis.cache.windows.net"; IsSecret = $false }
        REDIS_PORT               = @{ Value = "6380"; IsSecret = $false }
        REDIS_PASSWORD           = @{ Value = ""; IsSecret = $true }

        # RabbitMQ
        RABBITMQ_URL             = @{ Value = ""; IsSecret = $true }

        # JWT Secrets
        JWT_ACCESS_SECRET        = @{ Value = ""; IsSecret = $true }
        JWT_REFRESH_SECRET       = @{ Value = ""; IsSecret = $true }
        JWT_ACCESS_EXPIRES_IN    = @{ Value = "15m"; IsSecret = $false }
        JWT_REFRESH_EXPIRES_IN   = @{ Value = "7d"; IsSecret = $false }

        # Stripe Payment (LIVE KEYS)
        STRIPE_SECRET_KEY        = @{ Value = ""; IsSecret = $true }
        STRIPE_PUBLISHABLE_KEY   = @{ Value = "pk_live_REPLACE_ME"; IsSecret = $false }
        STRIPE_WEBHOOK_SECRET    = @{ Value = ""; IsSecret = $true }

        # SendGrid Email
        SENDGRID_API_KEY         = @{ Value = ""; IsSecret = $true }
        SENDGRID_FROM_EMAIL      = @{ Value = "noreply@flamoral.com"; IsSecret = $false }
        SENDGRID_FROM_NAME       = @{ Value = "Flamoral"; IsSecret = $false }

        # Twilio SMS
        TWILIO_ACCOUNT_SID       = @{ Value = "REPLACE_WITH_YOUR_SID"; IsSecret = $false }
        TWILIO_AUTH_TOKEN        = @{ Value = ""; IsSecret = $true }
        TWILIO_PHONE_NUMBER      = @{ Value = "+1234567890"; IsSecret = $false }
        TWILIO_VERIFY_SERVICE_SID = @{ Value = "REPLACE_WITH_YOUR_SERVICE_SID"; IsSecret = $false }

        # Azure Storage
        AZURE_STORAGE_CONNECTION_STRING = @{ Value = ""; IsSecret = $true }
        AZURE_STORAGE_ACCOUNT    = @{ Value = "flamoralprodst"; IsSecret = $false }
        AZURE_STORAGE_KEY        = @{ Value = ""; IsSecret = $true }

        # Azure Cognitive Services
        AZURE_FACE_API_KEY       = @{ Value = ""; IsSecret = $true }
        AZURE_FACE_API_ENDPOINT  = @{ Value = "https://eastus.api.cognitive.microsoft.com"; IsSecret = $false }

        # Agora Video Calling
        AGORA_APP_ID             = @{ Value = "REPLACE_WITH_YOUR_APP_ID"; IsSecret = $false }
        AGORA_APP_CERTIFICATE    = @{ Value = ""; IsSecret = $true }

        # Sentry Error Tracking
        SENTRY_DSN               = @{ Value = ""; IsSecret = $true }
        SENTRY_ENVIRONMENT       = @{ Value = "production"; IsSecret = $false }

        # Container Registry
        ACR_USERNAME             = @{ Value = "flamoralacr8eq5eg"; IsSecret = $false }
        ACR_PASSWORD             = @{ Value = ""; IsSecret = $true }

        # Application Configuration
        CORS_ORIGIN              = @{ Value = "https://flamoral.app,https://www.flamoral.app"; IsSecret = $false }
        NODE_ENV                 = @{ Value = "production"; IsSecret = $false }
        LOG_LEVEL                = @{ Value = "warn"; IsSecret = $false }
        PORT                     = @{ Value = "3000"; IsSecret = $false }
    }
}

#endregion

#region Main Script

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  Flamoral Variable Groups Setup Script" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

Write-ColorOutput "Organization: $Organization" -Type Info
Write-ColorOutput "Project: $Project" -Type Info
Write-ColorOutput "Environment: $Environment`n" -Type Info

# Test connection
Write-ColorOutput "Testing Azure DevOps connection..." -Type Info
if (-not (Test-AzureDevOpsConnection)) {
    Write-ColorOutput "Failed to connect to Azure DevOps. Please check your PAT and organization/project names." -Type Error
    exit 1
}
Write-Host ""

# Create variable groups based on environment parameter
$createdGroups = @()

# Shared Variables (always created)
Write-ColorOutput "`nCreating shared variable groups..." -Type Info
$sharedGroup = New-VariableGroup -Name "flamoral-shared-vars" `
    -Description "Shared variables across all environments for Flamoral Dating Platform" `
    -Variables (Get-SharedVariables)
if ($sharedGroup) { $createdGroups += $sharedGroup }

$cdGroup = New-VariableGroup -Name "flamoral-cd-vars" `
    -Description "Continuous Deployment specific variables for Flamoral Dating Platform" `
    -Variables (Get-CDVariables)
if ($cdGroup) { $createdGroups += $cdGroup }

$terraformGroup = New-VariableGroup -Name "datingplatform-terraform-common" `
    -Description "Terraform backend and Azure authentication variables" `
    -Variables (Get-TerraformVariables)
if ($terraformGroup) { $createdGroups += $terraformGroup }

# Environment-specific groups
if ($Environment -eq "dev" -or $Environment -eq "all") {
    Write-ColorOutput "`nCreating development variable group..." -Type Info
    $devGroup = New-VariableGroup -Name "datingplatform-dev" `
        -Description "Development environment variables for Flamoral Dating Platform" `
        -Variables (Get-DevVariables)
    if ($devGroup) { $createdGroups += $devGroup }
}

if ($Environment -eq "test" -or $Environment -eq "all") {
    Write-ColorOutput "`nCreating test variable group..." -Type Info
    $testGroup = New-VariableGroup -Name "datingplatform-test" `
        -Description "Test environment variables for Flamoral Dating Platform" `
        -Variables (Get-TestVariables)
    if ($testGroup) { $createdGroups += $testGroup }
}

if ($Environment -eq "prod" -or $Environment -eq "all") {
    Write-ColorOutput "`nCreating production variable group..." -Type Info
    $prodGroup = New-VariableGroup -Name "datingplatform-prod" `
        -Description "Production environment variables for Flamoral Dating Platform" `
        -Variables (Get-ProdVariables)
    if ($prodGroup) { $createdGroups += $prodGroup }
}

# Summary
Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  Summary" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

if ($createdGroups.Count -gt 0) {
    Write-ColorOutput "Successfully processed $($createdGroups.Count) variable group(s):" -Type Success
    foreach ($group in $createdGroups) {
        Write-Host "  - $($group.name) (ID: $($group.id))" -ForegroundColor Green
    }
}
else {
    Write-ColorOutput "No variable groups were created." -Type Warning
}

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  Next Steps" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

Write-Host "1. Navigate to Azure DevOps → Pipelines → Library" -ForegroundColor Yellow
Write-Host "2. For each variable group, set the SECRET variable values:" -ForegroundColor Yellow
Write-Host "   - Database passwords and connection strings" -ForegroundColor Yellow
Write-Host "   - API keys (Stripe, SendGrid, Twilio, etc.)" -ForegroundColor Yellow
Write-Host "   - JWT secrets (minimum 64 characters)" -ForegroundColor Yellow
Write-Host "   - Azure credentials and keys" -ForegroundColor Yellow
Write-Host "3. For Production/Test, link variable groups to Azure Key Vault" -ForegroundColor Yellow
Write-Host "4. Set pipeline permissions for each variable group" -ForegroundColor Yellow
Write-Host "5. Verify all placeholder values (e.g., 'REPLACE_WITH_YOUR_*')" -ForegroundColor Yellow

Write-Host "`nFor detailed setup instructions, see: docs/azure-devops-setup.md`n" -ForegroundColor Cyan

#endregion
