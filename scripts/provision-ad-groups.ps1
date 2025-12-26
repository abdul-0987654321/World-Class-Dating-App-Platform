# ============================================================================
# FLAMORAL - Azure AD Group Provisioning Script (PowerShell)
# Provisions Azure AD security groups for the FLAMORAL SAAS platform
# ============================================================================
#
# Prerequisites:
#   - Azure CLI installed and configured
#   - Logged in with: az login
#   - Required permissions: Group.Create, Group.ReadWrite.All
#
# Usage:
#   .\provision-ad-groups.ps1 [-DryRun]
#
# Options:
#   -DryRun    Show what would be created without making changes
#
# ============================================================================

param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# ============================================================================
# GROUP DEFINITIONS
# ============================================================================

$Groups = @(
    @{
        Name = "saas-free"
        Description = "Free tier users - Basic FLAMORAL access"
        MailNickname = "saas-free"
    },
    @{
        Name = "saas-standard"
        Description = "Standard subscription users - Enhanced features"
        MailNickname = "saas-standard"
    },
    @{
        Name = "saas-premium"
        Description = "Premium subscription users - Full feature access"
        MailNickname = "saas-premium"
    },
    @{
        Name = "saas-verified"
        Description = "Identity verified users - Completed verification"
        MailNickname = "saas-verified"
    },
    @{
        Name = "saas-moderator"
        Description = "Content moderators - Review and moderate content"
        MailNickname = "saas-moderator"
    },
    @{
        Name = "saas-operator"
        Description = "Operations staff - System monitoring and management"
        MailNickname = "saas-operator"
    },
    @{
        Name = "saas-admin"
        Description = "Platform administrators - Full administrative access"
        MailNickname = "saas-admin"
    },
    @{
        Name = "banned"
        Description = "Banned users - Account suspended"
        MailNickname = "banned"
    }
)

# ============================================================================
# FUNCTIONS
# ============================================================================

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."

    # Check if Azure CLI is installed
    try {
        $null = az version 2>&1
    }
    catch {
        Write-Error "Azure CLI is not installed. Please install it first."
        Write-Info "Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    }

    # Check if logged in
    try {
        $account = az account show 2>&1 | ConvertFrom-Json
        if (-not $account) {
            throw "Not logged in"
        }
    }
    catch {
        Write-Error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    }

    $tenantId = $account.tenantId
    Write-Success "Logged in to Azure"
    Write-Info "Tenant ID: $tenantId"

    # Verify permissions by checking if we can list groups
    try {
        $null = az ad group list --top 1 2>&1
    }
    catch {
        Write-Error "Insufficient permissions to manage groups."
        Write-Info "Required permissions: Group.Create, Group.ReadWrite.All"
        exit 1
    }

    Write-Success "Permissions verified"
    Write-Host ""
}

function Get-ExistingGroup {
    param([string]$Name)

    try {
        $result = az ad group list --display-name $Name --query "[0].id" -o tsv 2>&1
        if ($LASTEXITCODE -eq 0 -and $result) {
            return $result.Trim()
        }
    }
    catch {
        return $null
    }
    return $null
}

function New-AzureADGroup {
    param(
        [string]$Name,
        [string]$Description,
        [string]$MailNickname
    )

    # Check if group already exists
    $existingId = Get-ExistingGroup -Name $Name

    if ($existingId) {
        Write-Warning "Group '$Name' already exists with ID: $existingId"
        return @{
            Id = $existingId
            Status = "Existing"
        }
    }

    if ($DryRun) {
        Write-Info "[DRY RUN] Would create group: $Name"
        return @{
            Id = "dry-run-id-$(Get-Date -Format 'yyyyMMddHHmmss')"
            Status = "DryRun"
        }
    }

    Write-Info "Creating group: $Name"

    try {
        $groupId = az ad group create `
            --display-name $Name `
            --mail-nickname $MailNickname `
            --description $Description `
            --security-enabled true `
            --query "id" -o tsv 2>&1

        if ($LASTEXITCODE -eq 0 -and $groupId) {
            $groupId = $groupId.Trim()
            Write-Success "Created group '$Name' with ID: $groupId"
            return @{
                Id = $groupId
                Status = "Created"
            }
        }
        else {
            throw "Failed to create group: $groupId"
        }
    }
    catch {
        Write-Error "Failed to create group '$Name': $_"
        return @{
            Id = $null
            Status = "Failed"
        }
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host "=============================================="
Write-Host "  FLAMORAL Azure AD Group Provisioning"
Write-Host "=============================================="
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

Test-Prerequisites

# Store results
$GroupIds = @{}
$CreatedCount = 0
$ExistingCount = 0
$FailedCount = 0

Write-Info "Provisioning $($Groups.Count) groups..."
Write-Host ""

foreach ($group in $Groups) {
    Write-Host "----------------------------------------"
    Write-Info "Processing: $($group.Name)"
    Write-Info "Description: $($group.Description)"

    $result = New-AzureADGroup -Name $group.Name -Description $group.Description -MailNickname $group.MailNickname

    if ($result.Id) {
        $GroupIds[$group.Name] = $result.Id

        switch ($result.Status) {
            "Created" { $CreatedCount++ }
            "Existing" { $ExistingCount++ }
            "DryRun" { $CreatedCount++ }
        }
    }
    else {
        $FailedCount++
    }

    Write-Host ""
}

# ============================================================================
# OUTPUT SUMMARY
# ============================================================================

Write-Host "=============================================="
Write-Host "  Provisioning Summary"
Write-Host "=============================================="
Write-Host ""

if ($DryRun) {
    Write-Info "DRY RUN - No actual changes were made"
    Write-Host ""
}

Write-Host "Created:  " -NoNewline
Write-Host $CreatedCount -ForegroundColor Green
Write-Host "Existing: " -NoNewline
Write-Host $ExistingCount -ForegroundColor Yellow
Write-Host "Failed:   " -NoNewline
Write-Host $FailedCount -ForegroundColor Red
Write-Host ""

# ============================================================================
# ENVIRONMENT VARIABLES OUTPUT
# ============================================================================

Write-Host "=============================================="
Write-Host "  Environment Variables"
Write-Host "=============================================="
Write-Host ""
Write-Host "Add these to your .env file or GitHub Secrets:"
Write-Host ""

$envVars = @(
    "saas-free",
    "saas-standard",
    "saas-premium",
    "saas-verified",
    "saas-moderator",
    "saas-operator",
    "saas-admin",
    "banned"
)

foreach ($name in $envVars) {
    $envName = "GROUP_ID_$($name.ToUpper().Replace('-', '_'))"
    $value = $GroupIds[$name]

    if ($value) {
        Write-Host "$envName=$value"
    }
    else {
        Write-Host "$envName="
    }
}

Write-Host ""

# ============================================================================
# GITHUB SECRETS INSTRUCTIONS
# ============================================================================

Write-Host "=============================================="
Write-Host "  GitHub Secrets"
Write-Host "=============================================="
Write-Host ""
Write-Host "Add these secrets to your GitHub repository:"
Write-Host "Settings -> Secrets and variables -> Actions -> New repository secret"
Write-Host ""

foreach ($name in $envVars) {
    $envName = "GROUP_ID_$($name.ToUpper().Replace('-', '_'))"
    $value = $GroupIds[$name]

    if ($value) {
        Write-Host "  $envName = $value"
    }
}

Write-Host ""

# ============================================================================
# EXPORT TO FILE (Optional)
# ============================================================================

$exportPath = Join-Path $PSScriptRoot "group-ids-export.env"

Write-Host "=============================================="
Write-Host "  Export to File"
Write-Host "=============================================="
Write-Host ""

if (-not $DryRun) {
    $envContent = @()
    $envContent += "# FLAMORAL Azure AD Group IDs"
    $envContent += "# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $envContent += ""

    foreach ($name in $envVars) {
        $envName = "GROUP_ID_$($name.ToUpper().Replace('-', '_'))"
        $value = $GroupIds[$name]
        $envContent += "$envName=$value"
    }

    $envContent | Out-File -FilePath $exportPath -Encoding utf8
    Write-Success "Exported to: $exportPath"
}
else {
    Write-Info "[DRY RUN] Would export to: $exportPath"
}

Write-Host ""

# ============================================================================
# NEXT STEPS
# ============================================================================

Write-Host "=============================================="
Write-Host "  Next Steps"
Write-Host "=============================================="
Write-Host ""
Write-Host "1. Copy the environment variables above to your .env files"
Write-Host "2. Add the secrets to GitHub repository settings"
Write-Host "3. Update Azure Key Vault with the group IDs (production)"
Write-Host "4. Verify groups in Azure Portal:"
Write-Host "   https://portal.azure.com/#view/Microsoft_AAD_IAM/GroupsManagementMenuBlade"
Write-Host ""

if ($FailedCount -gt 0) {
    Write-Error "Some groups failed to create. Check the errors above."
    exit 1
}

Write-Success "Provisioning complete!"
exit 0
