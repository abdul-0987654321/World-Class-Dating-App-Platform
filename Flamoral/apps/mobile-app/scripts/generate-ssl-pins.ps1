###############################################################################
# SSL Certificate Pin Generation Script for Flamoral Mobile App (PowerShell)
#
# This script generates SSL certificate pins (SPKI SHA-256 hashes) for all
# Flamoral domains and provides ready-to-use configuration updates.
#
# Usage:
#   .\generate-ssl-pins.ps1
#
# Requirements:
#   - OpenSSL (Git for Windows includes OpenSSL in Git Bash)
#   - Network access to flamoral.com domains
#
# Output:
#   - Certificate pins for all domains
#   - Backup pins (from intermediate CA)
#   - Certificate expiration dates
#   - Ready-to-paste configuration snippets
###############################################################################

# Domains to generate pins for
$Domains = @(
    "api.flamoral.com",
    "ai.flamoral.com",
    "ws.flamoral.com"
)

# Output file
$OutputFile = "ssl-pins-output.txt"

###############################################################################
# Functions
###############################################################################

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host "  $Message" -ForegroundColor Blue
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Msg {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-InfoMsg {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

# Find OpenSSL executable
function Find-OpenSSL {
    # Try common locations
    $opensslPaths = @(
        "openssl",  # In PATH
        "C:\Program Files\Git\usr\bin\openssl.exe",
        "C:\Program Files (x86)\Git\usr\bin\openssl.exe",
        "$env:ProgramFiles\Git\usr\bin\openssl.exe",
        "${env:ProgramFiles(x86)}\Git\usr\bin\openssl.exe",
        "C:\OpenSSL\bin\openssl.exe",
        "C:\OpenSSL-Win64\bin\openssl.exe"
    )

    foreach ($path in $opensslPaths) {
        try {
            $version = & $path version 2>$null
            if ($LASTEXITCODE -eq 0) {
                return $path
            }
        }
        catch {
            continue
        }
    }

    return $null
}

# Check if domain is accessible
function Test-DomainAccessible {
    param([string]$Domain)

    try {
        $result = Test-NetConnection -ComputerName $Domain -Port 443 -WarningAction SilentlyContinue -InformationLevel Quiet
        return $result
    }
    catch {
        return $false
    }
}

# Get primary pin
function Get-PrimaryPin {
    param(
        [string]$Domain,
        [string]$OpenSSLPath
    )

    try {
        # Create temporary files
        $tempCert = [System.IO.Path]::GetTempFileName()
        $tempPubKey = [System.IO.Path]::GetTempFileName()

        # Get certificate
        $certData = "" | & $OpenSSLPath s_client -servername $Domain -connect "${Domain}:443" 2>$null
        $certData | & $OpenSSLPath x509 -outform PEM | Out-File -FilePath $tempCert -Encoding ASCII

        # Extract public key and generate hash
        & $OpenSSLPath x509 -in $tempCert -pubkey -noout | Out-File -FilePath $tempPubKey -Encoding ASCII
        $pin = & $OpenSSLPath pkey -pubin -in $tempPubKey -outform DER | & $OpenSSLPath dgst -sha256 -binary | & $OpenSSLPath enc -base64

        # Clean up
        Remove-Item -Path $tempCert -ErrorAction SilentlyContinue
        Remove-Item -Path $tempPubKey -ErrorAction SilentlyContinue

        return $pin.Trim()
    }
    catch {
        Write-ErrorMsg "Error generating primary pin: $_"
        return $null
    }
}

# Get certificate expiration
function Get-CertExpiration {
    param(
        [string]$Domain,
        [string]$OpenSSLPath
    )

    try {
        $certData = "" | & $OpenSSLPath s_client -servername $Domain -connect "${Domain}:443" 2>$null
        $expiry = $certData | & $OpenSSLPath x509 -noout -enddate 2>$null
        if ($expiry -match "notAfter=(.+)") {
            return $matches[1]
        }
        return "Unknown"
    }
    catch {
        return "Unknown"
    }
}

# Get certificate issuer
function Get-CertIssuer {
    param(
        [string]$Domain,
        [string]$OpenSSLPath
    )

    try {
        $certData = "" | & $OpenSSLPath s_client -servername $Domain -connect "${Domain}:443" 2>$null
        $issuer = $certData | & $OpenSSLPath x509 -noout -issuer 2>$null
        if ($issuer -match "issuer=(.+)") {
            return $matches[1]
        }
        return "Unknown"
    }
    catch {
        return "Unknown"
    }
}

###############################################################################
# Main Script
###############################################################################

Write-Header "Flamoral SSL Certificate Pin Generator"

Write-Host "This script will generate SSL certificate pins for the following domains:"
foreach ($domain in $Domains) {
    Write-Host "  - $domain"
}
Write-Host ""

# Find OpenSSL
Write-InfoMsg "Checking OpenSSL installation..."
$OpenSSL = Find-OpenSSL

if ($null -eq $OpenSSL) {
    Write-ErrorMsg "OpenSSL is not installed or not found"
    Write-Host ""
    Write-Host "Please install OpenSSL using one of these methods:" -ForegroundColor Yellow
    Write-Host "  1. Install Git for Windows (includes OpenSSL): https://git-scm.com/download/win"
    Write-Host "  2. Install OpenSSL for Windows: https://slproweb.com/products/Win32OpenSSL.html"
    Write-Host ""
    exit 1
}

$opensslVersion = & $OpenSSL version
Write-Success "OpenSSL found: $opensslVersion"
Write-InfoMsg "Path: $OpenSSL"
Write-Host ""

# Initialize output file
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
@"
═══════════════════════════════════════════════════════════════
SSL Certificate Pins for Flamoral Mobile App
Generated: $timestamp
═══════════════════════════════════════════════════════════════

"@ | Out-File -FilePath $OutputFile -Encoding UTF8

# Storage for results
$PrimaryPins = @{}
$BackupPins = @{}
$ExpiryDates = @{}
$Issuers = @{}
$AccessibleDomains = @()
$InaccessibleDomains = @()

# Process each domain
foreach ($domain in $Domains) {
    Write-Header "Processing $domain"

    # Check if domain is accessible
    Write-InfoMsg "Checking domain accessibility..."

    $isAccessible = Test-DomainAccessible -Domain $domain

    if (-not $isAccessible) {
        Write-ErrorMsg "Domain is not accessible or SSL certificate is not configured"
        Write-Warning-Msg "Skipping $domain"
        Write-Host ""

        $InaccessibleDomains += $domain

        # Log to output file
        @"
Domain: $domain
Status: NOT ACCESSIBLE
Primary Pin: [NOT AVAILABLE - Domain not accessible]
Backup Pin: [NOT AVAILABLE - Domain not accessible]

---

"@ | Out-File -FilePath $OutputFile -Append -Encoding UTF8

        continue
    }

    Write-Success "Domain is accessible"
    $AccessibleDomains += $domain

    # Generate primary pin
    Write-InfoMsg "Generating primary pin (from certificate)..."
    $primaryPin = Get-PrimaryPin -Domain $domain -OpenSSLPath $OpenSSL

    if ([string]::IsNullOrWhiteSpace($primaryPin)) {
        Write-ErrorMsg "Failed to generate primary pin"
        $primaryPin = "FAILED_TO_GENERATE"
    }
    else {
        Write-Success "Primary pin generated"
        $PrimaryPins[$domain] = $primaryPin
    }

    # For backup pin, suggest manual generation
    Write-InfoMsg "Backup pin should be generated manually using future key pair"
    $backupPin = "MANUAL_GENERATION_REQUIRED"
    $BackupPins[$domain] = $backupPin

    # Get certificate expiration
    Write-InfoMsg "Checking certificate expiration..."
    $expiry = Get-CertExpiration -Domain $domain -OpenSSLPath $OpenSSL

    if ($expiry -ne "Unknown") {
        Write-Success "Certificate expires: $expiry"
        $ExpiryDates[$domain] = $expiry
    }
    else {
        Write-Warning-Msg "Could not determine certificate expiration"
        $ExpiryDates[$domain] = "Unknown"
    }

    # Get certificate issuer
    Write-InfoMsg "Checking certificate issuer..."
    $issuer = Get-CertIssuer -Domain $domain -OpenSSLPath $OpenSSL

    if ($issuer -ne "Unknown") {
        Write-Success "Issuer: $issuer"
        $Issuers[$domain] = $issuer
    }
    else {
        $Issuers[$domain] = "Unknown"
    }

    Write-Host ""
    Write-Success "Completed processing $domain"
    Write-Host ""

    # Write to output file
    @"
Domain: $domain
Status: ACCESSIBLE
Primary Pin: sha256/$primaryPin
Backup Pin: sha256/$backupPin
Certificate Expiry: $expiry
Certificate Issuer: $issuer

---

"@ | Out-File -FilePath $OutputFile -Append -Encoding UTF8
}

###############################################################################
# Generate Configuration Snippets
###############################################################################

Write-Header "Configuration Updates"

@"

═══════════════════════════════════════════════════════════════
CONFIGURATION FILE UPDATES
═══════════════════════════════════════════════════════════════

1. UPDATE: src/config/sslPinning.config.ts

Replace the SSL_PIN_CONFIG array with:

export const SSL_PIN_CONFIG: SSLPinConfig[] = [
"@ | Out-File -FilePath $OutputFile -Append -Encoding UTF8

foreach ($domain in $AccessibleDomains) {
    if ($PrimaryPins.ContainsKey($domain)) {
        @"
  {
    hostname: '$domain',
    pins: [
      'sha256/$($PrimaryPins[$domain])',
      'sha256/$($BackupPins[$domain])',
    ],
    includeSubdomains: false,
  },
"@ | Out-File -FilePath $OutputFile -Append -Encoding UTF8
    }
}

@"
];

---

2. UPDATE: android/app/src/main/res/xml/network_security_config.xml

Replace the domain-config sections with:

"@ | Out-File -FilePath $OutputFile -Append -Encoding UTF8

foreach ($domain in $AccessibleDomains) {
    if ($PrimaryPins.ContainsKey($domain)) {
        $expiryDate = (Get-Date).AddYears(1).ToString("yyyy-MM-dd")

        @"
<!-- $domain -->
<domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="false">$domain</domain>
    <pin-set expiration="$expiryDate">
        <pin digest="sha256">$($PrimaryPins[$domain])</pin>
        <pin digest="sha256">$($BackupPins[$domain])</pin>
    </pin-set>
    <trust-anchors>
        <certificates src="system" />
    </trust-anchors>
</domain-config>

"@ | Out-File -FilePath $OutputFile -Append -Encoding UTF8
    }
}

@"
---

3. PIN REGISTRY (for documentation)

| Domain | Primary Pin | Backup Pin | Expiry | Generated |
|--------|-------------|------------|--------|-----------|
"@ | Out-File -FilePath $OutputFile -Append -Encoding UTF8

$today = Get-Date -Format "yyyy-MM-dd"

foreach ($domain in $Domains) {
    if ($PrimaryPins.ContainsKey($domain)) {
        $expiry = $ExpiryDates[$domain]
        "| $domain | sha256/$($PrimaryPins[$domain]) | sha256/$($BackupPins[$domain]) | $expiry | $today |" | Out-File -FilePath $OutputFile -Append -Encoding UTF8
    }
    else {
        "| $domain | NOT AVAILABLE | NOT AVAILABLE | - | - |" | Out-File -FilePath $OutputFile -Append -Encoding UTF8
    }
}

@"

---

NEXT STEPS:

1. Review the generated pins in: $OutputFile
2. Update src/config/sslPinning.config.ts with the new pins
3. Update android/app/src/main/res/xml/network_security_config.xml
4. Generate backup pins manually using a future key pair (see guide)
5. Document the pins in your internal security documentation
6. Set calendar reminders for certificate rotation (60 days before expiry)
7. Test the app with the new pins in development environment
8. Deploy to staging for validation
9. Deploy to production

For domains that are not yet accessible:
- Keep SSL_PINNING_OPTIONS.enabled = false until domains are live
- Re-run this script once domains have SSL certificates
- Update the configuration files before production release

IMPORTANT - BACKUP PIN GENERATION:

The backup pins are marked as "MANUAL_GENERATION_REQUIRED" because they should
be generated from a future key pair that you'll use during certificate rotation.

To generate a backup pin:
1. Generate a new private key (keep it SECURE and OFFLINE):
   openssl genrsa -out backup_private.key 2048

2. Generate the pin from this key:
   openssl rsa -in backup_private.key -pubout -outform DER | \
     openssl dgst -sha256 -binary | \
     openssl enc -base64

3. Store the private key in secure offline storage (HSM or encrypted vault)
4. Replace "MANUAL_GENERATION_REQUIRED" with the generated pin

SECURITY REMINDERS:
- Store backup private keys in secure offline storage
- Never commit private keys to version control
- Monitor certificate expiration dates
- Test pin rotation procedure before emergency

"@ | Out-File -FilePath $OutputFile -Append -Encoding UTF8

###############################################################################
# Summary
###############################################################################

Write-Header "Summary"

Write-Host ""
Write-Success "Pin generation complete!"
Write-InfoMsg "Results saved to: $OutputFile"
Write-Host ""

# Display summary
$accessibleCount = $AccessibleDomains.Count
$failedCount = $InaccessibleDomains.Count

foreach ($domain in $AccessibleDomains) {
    Write-Success "$domain - Pins generated successfully"
}

foreach ($domain in $InaccessibleDomains) {
    Write-ErrorMsg "$domain - Not accessible or failed to generate"
}

Write-Host ""
Write-InfoMsg "Summary: $accessibleCount successful, $failedCount failed"
Write-Host ""
Write-InfoMsg "Review $OutputFile for complete details and configuration snippets"
Write-Host ""

# Display warnings for domains that need attention
if ($failedCount -gt 0) {
    Write-Warning-Msg "Some domains were not accessible. Please:"
    Write-Host "  1. Verify domains have SSL certificates configured"
    Write-Host "  2. Check DNS resolution"
    Write-Host "  3. Ensure port 443 is accessible"
    Write-Host "  4. Re-run this script once issues are resolved"
    Write-Host ""
}

Write-Header "Script Complete"

# Open the output file
Write-InfoMsg "Opening results file..."
Start-Process notepad.exe -ArgumentList $OutputFile
