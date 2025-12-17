#!/bin/bash

###############################################################################
# SSL Certificate Pin Generation Script for Flamoral Mobile App
#
# This script generates SSL certificate pins (SPKI SHA-256 hashes) for all
# Flamoral domains and provides ready-to-use configuration updates.
#
# Usage:
#   ./generate-ssl-pins.sh
#
# Requirements:
#   - OpenSSL (pre-installed on macOS/Linux, Git Bash on Windows)
#   - Network access to flamoral.com domains
#
# Output:
#   - Certificate pins for all domains
#   - Backup pins (from intermediate CA)
#   - Certificate expiration dates
#   - Ready-to-paste configuration snippets
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Domains to generate pins for
DOMAINS=(
    "api.flamoral.com"
    "ai.flamoral.com"
    "ws.flamoral.com"
)

# Output file
OUTPUT_FILE="ssl-pins-output.txt"

###############################################################################
# Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if domain is accessible
check_domain() {
    local domain=$1
    if timeout 10 openssl s_client -servername "$domain" -connect "$domain:443" </dev/null >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Get primary pin (from leaf certificate)
get_primary_pin() {
    local domain=$1
    local pin

    pin=$(timeout 10 openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null </dev/null | \
        openssl x509 -pubkey -noout 2>/dev/null | \
        openssl pkey -pubin -outform der 2>/dev/null | \
        openssl dgst -sha256 -binary | \
        openssl enc -base64)

    echo "$pin"
}

# Get backup pin (from intermediate CA certificate)
get_backup_pin() {
    local domain=$1
    local pin

    # Extract the second certificate (intermediate CA) from the chain
    pin=$(timeout 10 openssl s_client -servername "$domain" -connect "$domain:443" -showcerts 2>/dev/null </dev/null | \
        awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/ {cert = cert "\n" $0} /END CERTIFICATE/ {print cert; cert=""}' | \
        awk 'NR==2' | \
        openssl x509 -pubkey -noout 2>/dev/null | \
        openssl pkey -pubin -outform der 2>/dev/null | \
        openssl dgst -sha256 -binary | \
        openssl enc -base64)

    if [ -z "$pin" ]; then
        # Fallback: try to get root CA pin
        pin=$(timeout 10 openssl s_client -servername "$domain" -connect "$domain:443" -showcerts 2>/dev/null </dev/null | \
            awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/ {cert = cert "\n" $0} /END CERTIFICATE/ {print cert; cert=""}' | \
            awk 'NR==3' | \
            openssl x509 -pubkey -noout 2>/dev/null | \
            openssl pkey -pubin -outform der 2>/dev/null | \
            openssl dgst -sha256 -binary | \
            openssl enc -base64)
    fi

    echo "$pin"
}

# Get certificate expiration date
get_cert_expiry() {
    local domain=$1
    local expiry

    expiry=$(timeout 10 openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null </dev/null | \
        openssl x509 -noout -enddate 2>/dev/null | \
        cut -d= -f2)

    echo "$expiry"
}

# Get certificate issuer
get_cert_issuer() {
    local domain=$1
    local issuer

    issuer=$(timeout 10 openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null </dev/null | \
        openssl x509 -noout -issuer 2>/dev/null | \
        sed 's/issuer=//')

    echo "$issuer"
}

###############################################################################
# Main Script
###############################################################################

print_header "Flamoral SSL Certificate Pin Generator"

echo "This script will generate SSL certificate pins for the following domains:"
for domain in "${DOMAINS[@]}"; do
    echo "  - $domain"
done
echo ""

# Check OpenSSL availability
print_info "Checking OpenSSL installation..."
if ! command -v openssl &> /dev/null; then
    print_error "OpenSSL is not installed or not in PATH"
    print_info "Please install OpenSSL and try again"
    exit 1
fi
print_success "OpenSSL found: $(openssl version)"
echo ""

# Initialize output file
echo "═══════════════════════════════════════════════════════════════" > "$OUTPUT_FILE"
echo "SSL Certificate Pins for Flamoral Mobile App" >> "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Process each domain
declare -A primary_pins
declare -A backup_pins
declare -A expiry_dates
declare -A issuers

for domain in "${DOMAINS[@]}"; do
    print_header "Processing $domain"

    # Check if domain is accessible
    print_info "Checking domain accessibility..."
    if check_domain "$domain"; then
        print_success "Domain is accessible"
    else
        print_error "Domain is not accessible or SSL certificate is not configured"
        print_warning "Skipping $domain"
        echo ""

        # Log to output file
        echo "Domain: $domain" >> "$OUTPUT_FILE"
        echo "Status: NOT ACCESSIBLE" >> "$OUTPUT_FILE"
        echo "Primary Pin: [NOT AVAILABLE - Domain not accessible]" >> "$OUTPUT_FILE"
        echo "Backup Pin: [NOT AVAILABLE - Domain not accessible]" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo "---" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"

        continue
    fi

    # Generate primary pin
    print_info "Generating primary pin (from leaf certificate)..."
    primary_pin=$(get_primary_pin "$domain")
    if [ -z "$primary_pin" ]; then
        print_error "Failed to generate primary pin"
        primary_pin="FAILED_TO_GENERATE"
    else
        print_success "Primary pin generated"
        primary_pins[$domain]=$primary_pin
    fi

    # Generate backup pin
    print_info "Generating backup pin (from intermediate CA)..."
    backup_pin=$(get_backup_pin "$domain")
    if [ -z "$backup_pin" ]; then
        print_warning "Failed to generate backup pin from CA chain"
        print_info "You should manually generate a backup pin using a future key pair"
        backup_pin="MANUAL_GENERATION_REQUIRED"
    else
        print_success "Backup pin generated"
        backup_pins[$domain]=$backup_pin
    fi

    # Get certificate expiration
    print_info "Checking certificate expiration..."
    expiry=$(get_cert_expiry "$domain")
    if [ -z "$expiry" ]; then
        expiry="Unknown"
    else
        print_success "Certificate expires: $expiry"
        expiry_dates[$domain]=$expiry
    fi

    # Get certificate issuer
    print_info "Checking certificate issuer..."
    issuer=$(get_cert_issuer "$domain")
    if [ -z "$issuer" ]; then
        issuer="Unknown"
    else
        print_success "Issuer: $issuer"
        issuers[$domain]=$issuer
    fi

    echo ""
    print_success "Completed processing $domain"
    echo ""

    # Write to output file
    {
        echo "Domain: $domain"
        echo "Status: ACCESSIBLE"
        echo "Primary Pin: sha256/$primary_pin"
        echo "Backup Pin: sha256/$backup_pin"
        echo "Certificate Expiry: $expiry"
        echo "Certificate Issuer: $issuer"
        echo ""
        echo "---"
        echo ""
    } >> "$OUTPUT_FILE"
done

###############################################################################
# Generate Configuration Snippets
###############################################################################

print_header "Configuration Updates"

echo "" >> "$OUTPUT_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$OUTPUT_FILE"
echo "CONFIGURATION FILE UPDATES" >> "$OUTPUT_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# TypeScript Configuration
print_info "Generating TypeScript configuration snippet..."

{
    echo "1. UPDATE: src/config/sslPinning.config.ts"
    echo ""
    echo "Replace the SSL_PIN_CONFIG array with:"
    echo ""
    echo "export const SSL_PIN_CONFIG: SSLPinConfig[] = ["
} >> "$OUTPUT_FILE"

for domain in "${DOMAINS[@]}"; do
    if [ -n "${primary_pins[$domain]}" ]; then
        {
            echo "  {"
            echo "    hostname: '$domain',"
            echo "    pins: ["
            echo "      'sha256/${primary_pins[$domain]}',"
            echo "      'sha256/${backup_pins[$domain]}',"
            echo "    ],"
            echo "    includeSubdomains: false,"
            echo "  },"
        } >> "$OUTPUT_FILE"
    fi
done

{
    echo "];"
    echo ""
    echo "---"
    echo ""
} >> "$OUTPUT_FILE"

# Android XML Configuration
print_info "Generating Android XML configuration snippet..."

{
    echo "2. UPDATE: android/app/src/main/res/xml/network_security_config.xml"
    echo ""
    echo "Replace the domain-config sections with:"
    echo ""
} >> "$OUTPUT_FILE"

for domain in "${DOMAINS[@]}"; do
    if [ -n "${primary_pins[$domain]}" ]; then
        expiry_date=$(date -d "+1 year" +%Y-%m-%d 2>/dev/null || date -v +1y +%Y-%m-%d 2>/dev/null || echo "2026-12-31")

        {
            echo "<!-- $domain -->"
            echo "<domain-config cleartextTrafficPermitted=\"false\">"
            echo "    <domain includeSubdomains=\"false\">$domain</domain>"
            echo "    <pin-set expiration=\"$expiry_date\">"
            echo "        <pin digest=\"sha256\">${primary_pins[$domain]}</pin>"
            echo "        <pin digest=\"sha256\">${backup_pins[$domain]}</pin>"
            echo "    </pin-set>"
            echo "    <trust-anchors>"
            echo "        <certificates src=\"system\" />"
            echo "    </trust-anchors>"
            echo "</domain-config>"
            echo ""
        } >> "$OUTPUT_FILE"
    fi
done

{
    echo "---"
    echo ""
} >> "$OUTPUT_FILE"

###############################################################################
# Generate Pin Registry
###############################################################################

print_info "Generating pin registry table..."

{
    echo "3. PIN REGISTRY (for documentation)"
    echo ""
    echo "| Domain | Primary Pin | Backup Pin | Expiry | Generated |"
    echo "|--------|-------------|------------|--------|-----------|"
} >> "$OUTPUT_FILE"

for domain in "${DOMAINS[@]}"; do
    if [ -n "${primary_pins[$domain]}" ]; then
        expiry="${expiry_dates[$domain]:-Unknown}"
        generated=$(date +%Y-%m-%d)

        echo "| $domain | sha256/${primary_pins[$domain]} | sha256/${backup_pins[$domain]} | $expiry | $generated |" >> "$OUTPUT_FILE"
    else
        echo "| $domain | NOT AVAILABLE | NOT AVAILABLE | - | - |" >> "$OUTPUT_FILE"
    fi
done

{
    echo ""
    echo "---"
    echo ""
} >> "$OUTPUT_FILE"

###############################################################################
# Summary and Next Steps
###############################################################################

print_header "Summary"

{
    echo "NEXT STEPS:"
    echo ""
    echo "1. Review the generated pins in: $OUTPUT_FILE"
    echo "2. Update src/config/sslPinning.config.ts with the new pins"
    echo "3. Update android/app/src/main/res/xml/network_security_config.xml"
    echo "4. Document the pins in your internal security documentation"
    echo "5. Set calendar reminders for certificate rotation (60 days before expiry)"
    echo "6. Test the app with the new pins in development environment"
    echo "7. Deploy to staging for validation"
    echo "8. Deploy to production"
    echo ""
    echo "For domains that are not yet accessible:"
    echo "- Keep SSL_PINNING_OPTIONS.enabled = false until domains are live"
    echo "- Re-run this script once domains have SSL certificates"
    echo "- Update the configuration files before production release"
    echo ""
    echo "SECURITY REMINDERS:"
    echo "- Store backup private keys in secure offline storage"
    echo "- Never commit private keys to version control"
    echo "- Monitor certificate expiration dates"
    echo "- Test pin rotation procedure before emergency"
    echo ""
} >> "$OUTPUT_FILE"

echo ""
print_success "Pin generation complete!"
print_info "Results saved to: $OUTPUT_FILE"
echo ""

# Display summary
accessible_count=0
failed_count=0

for domain in "${DOMAINS[@]}"; do
    if [ -n "${primary_pins[$domain]}" ]; then
        ((accessible_count++))
        print_success "$domain - Pins generated successfully"
    else
        ((failed_count++))
        print_error "$domain - Not accessible or failed to generate"
    fi
done

echo ""
print_info "Summary: $accessible_count successful, $failed_count failed"
echo ""
print_info "Review $OUTPUT_FILE for complete details and configuration snippets"
echo ""

# Display warnings for domains that need attention
if [ $failed_count -gt 0 ]; then
    print_warning "Some domains were not accessible. Please:"
    echo "  1. Verify domains have SSL certificates configured"
    echo "  2. Check DNS resolution"
    echo "  3. Ensure port 443 is accessible"
    echo "  4. Re-run this script once issues are resolved"
    echo ""
fi

print_header "Script Complete"
