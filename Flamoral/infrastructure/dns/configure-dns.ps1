# =============================================================================
# Azure DNS Configuration Script for flamoral.com
# =============================================================================
# This script creates Azure DNS Zone and A records using Azure CLI
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "flamoral-prod-rg",

    [Parameter(Mandatory=$false)]
    [string]$DomainName = "flamoral.com",

    [Parameter(Mandatory=$false)]
    [string]$TargetIP = "48.200.65.15",

    [Parameter(Mandatory=$false)]
    [int]$TTL = 300,

    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus"
)

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "Azure DNS Configuration for $DomainName" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
Write-Host "Checking Azure CLI installation..." -ForegroundColor Yellow
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "Azure CLI version: $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Azure CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install from: https://aka.ms/installazurecliwindows" -ForegroundColor Red
    exit 1
}

# Login check
Write-Host ""
Write-Host "Checking Azure login status..." -ForegroundColor Yellow
$account = az account show 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Please login to Azure..." -ForegroundColor Yellow
    az login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Azure login failed" -ForegroundColor Red
        exit 1
    }
}

$accountInfo = az account show | ConvertFrom-Json
Write-Host "Logged in as: $($accountInfo.user.name)" -ForegroundColor Green
Write-Host "Subscription: $($accountInfo.name)" -ForegroundColor Green

# Check if resource group exists
Write-Host ""
Write-Host "Checking resource group: $ResourceGroup..." -ForegroundColor Yellow
$rgExists = az group exists --name $ResourceGroup
if ($rgExists -eq "false") {
    Write-Host "Resource group does not exist. Creating..." -ForegroundColor Yellow
    az group create --name $ResourceGroup --location $Location --tags Environment=production ManagedBy=script
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Resource group created successfully" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to create resource group" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Resource group exists" -ForegroundColor Green
}

# Create DNS Zone
Write-Host ""
Write-Host "Creating DNS Zone: $DomainName..." -ForegroundColor Yellow
$dnsZoneExists = az network dns zone show --name $DomainName --resource-group $ResourceGroup 2>$null
if ($LASTEXITCODE -ne 0) {
    az network dns zone create `
        --name $DomainName `
        --resource-group $ResourceGroup `
        --tags Environment=production ManagedBy=script

    if ($LASTEXITCODE -eq 0) {
        Write-Host "DNS Zone created successfully" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to create DNS zone" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "DNS Zone already exists" -ForegroundColor Yellow
}

# Get name servers
Write-Host ""
Write-Host "DNS Zone Name Servers:" -ForegroundColor Cyan
$nameServers = az network dns zone show --name $DomainName --resource-group $ResourceGroup --query "nameServers" -o json | ConvertFrom-Json
foreach ($ns in $nameServers) {
    Write-Host "  - $ns" -ForegroundColor White
}
Write-Host ""
Write-Host "IMPORTANT: Update these name servers at your domain registrar!" -ForegroundColor Yellow
Write-Host ""

# Function to create or update A record
function Set-DnsARecord {
    param(
        [string]$RecordName,
        [string]$IP,
        [string]$Description
    )

    Write-Host "Configuring A record: $Description..." -ForegroundColor Yellow

    $recordExists = az network dns record-set a show `
        --name $RecordName `
        --zone-name $DomainName `
        --resource-group $ResourceGroup 2>$null

    if ($LASTEXITCODE -ne 0) {
        # Create new record
        az network dns record-set a create `
            --name $RecordName `
            --zone-name $DomainName `
            --resource-group $ResourceGroup `
            --ttl $TTL

        az network dns record-set a add-record `
            --record-set-name $RecordName `
            --zone-name $DomainName `
            --resource-group $ResourceGroup `
            --ipv4-address $IP
    } else {
        # Update existing record
        az network dns record-set a update `
            --name $RecordName `
            --zone-name $DomainName `
            --resource-group $ResourceGroup `
            --set aRecords[0].ipv4Address=$IP `
            --set ttl=$TTL
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  $Description → $IP (TTL: $TTL)" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Failed to configure $Description" -ForegroundColor Red
    }
}

# Create A Records
Write-Host ""
Write-Host "Creating A Records..." -ForegroundColor Cyan
Set-DnsARecord -RecordName "@" -IP $TargetIP -Description "flamoral.com"
Set-DnsARecord -RecordName "www" -IP $TargetIP -Description "www.flamoral.com"
Set-DnsARecord -RecordName "api" -IP $TargetIP -Description "api.flamoral.com"
Set-DnsARecord -RecordName "admin" -IP $TargetIP -Description "admin.flamoral.com"

# Create CAA records for Let's Encrypt
Write-Host ""
Write-Host "Creating CAA records for Let's Encrypt..." -ForegroundColor Yellow

$caaExists = az network dns record-set caa show `
    --name "@" `
    --zone-name $DomainName `
    --resource-group $ResourceGroup 2>$null

if ($LASTEXITCODE -ne 0) {
    # Create CAA record set
    az network dns record-set caa create `
        --name "@" `
        --zone-name $DomainName `
        --resource-group $ResourceGroup `
        --ttl 3600

    # Add issue record
    az network dns record-set caa add-record `
        --record-set-name "@" `
        --zone-name $DomainName `
        --resource-group $ResourceGroup `
        --flags 0 `
        --tag "issue" `
        --value "letsencrypt.org"

    # Add issuewild record
    az network dns record-set caa add-record `
        --record-set-name "@" `
        --zone-name $DomainName `
        --resource-group $ResourceGroup `
        --flags 0 `
        --tag "issuewild" `
        --value "letsencrypt.org"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "CAA records created successfully" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Failed to create CAA records" -ForegroundColor Yellow
    }
} else {
    Write-Host "CAA records already exist" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "DNS Configuration Complete!" -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update your domain registrar with the name servers listed above" -ForegroundColor White
Write-Host "2. Wait 24-48 hours for DNS propagation" -ForegroundColor White
Write-Host "3. Verify DNS resolution:" -ForegroundColor White
Write-Host "   nslookup $DomainName" -ForegroundColor Gray
Write-Host "   nslookup www.$DomainName" -ForegroundColor Gray
Write-Host "   nslookup api.$DomainName" -ForegroundColor Gray
Write-Host "   nslookup admin.$DomainName" -ForegroundColor Gray
Write-Host ""

# Display current DNS records
Write-Host "Current DNS Records:" -ForegroundColor Cyan
az network dns record-set a list --zone-name $DomainName --resource-group $ResourceGroup --output table
Write-Host ""
