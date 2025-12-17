# =============================================================================
# Update Missing DNS Subdomains for flamoral.com
# =============================================================================
# This script adds the missing ws. and media. subdomains to Azure DNS
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "flamoral-prod-rg",

    [Parameter(Mandatory=$false)]
    [string]$DomainName = "flamoral.com",

    [Parameter(Mandatory=$false)]
    [string]$TargetIP = "48.200.65.15",

    [Parameter(Mandatory=$false)]
    [int]$TTL = 300
)

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "Adding Missing DNS Subdomains for $DomainName" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check Azure CLI and login
Write-Host "Checking Azure CLI..." -ForegroundColor Yellow
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "Azure CLI version: $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Azure CLI is not installed" -ForegroundColor Red
    exit 1
}

$account = az account show 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Azure..." -ForegroundColor Yellow
    az login
}

$accountInfo = az account show | ConvertFrom-Json
Write-Host "Logged in as: $($accountInfo.user.name)" -ForegroundColor Green
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
            --ttl $TTL `
            --tags Environment=production ManagedBy=script Purpose=$Description | Out-Null

        az network dns record-set a add-record `
            --record-set-name $RecordName `
            --zone-name $DomainName `
            --resource-group $ResourceGroup `
            --ipv4-address $IP | Out-Null
    } else {
        # Update existing record
        az network dns record-set a update `
            --name $RecordName `
            --zone-name $DomainName `
            --resource-group $ResourceGroup `
            --set aRecords[0].ipv4Address=$IP `
            --set ttl=$TTL | Out-Null
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  $Description → $IP (TTL: $TTL)" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Failed to configure $Description" -ForegroundColor Red
    }
}

# Create Missing A Records
Write-Host "Creating Missing Subdomains..." -ForegroundColor Cyan
Write-Host ""
Set-DnsARecord -RecordName "ws" -IP $TargetIP -Description "WebSocket/Realtime (ws.flamoral.com)"
Set-DnsARecord -RecordName "media" -IP $TargetIP -Description "Media CDN (media.flamoral.com)"

# Summary
Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "DNS Update Complete!" -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "New DNS Records Added:" -ForegroundColor Yellow
Write-Host "  - ws.flamoral.com → $TargetIP (WebSocket/Realtime)" -ForegroundColor White
Write-Host "  - media.flamoral.com → $TargetIP (Media CDN)" -ForegroundColor White
Write-Host ""
Write-Host "Wait 5-15 minutes for DNS propagation, then verify:" -ForegroundColor Yellow
Write-Host "  nslookup ws.flamoral.com" -ForegroundColor Gray
Write-Host "  nslookup media.flamoral.com" -ForegroundColor Gray
Write-Host ""
Write-Host "All DNS Records:" -ForegroundColor Cyan
az network dns record-set a list --zone-name $DomainName --resource-group $ResourceGroup --output table
Write-Host ""
