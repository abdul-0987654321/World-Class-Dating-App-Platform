#!/bin/bash

# Security Headers and HSTS Fix Script for Flamoral.com
# This script applies all security header improvements

set -e  # Exit on error

echo "========================================="
echo "Flamoral Security Headers Fix Script"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}Step 1: Backing up files...${NC}"
mkdir -p backups/security-fixes-$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/security-fixes-$(date +%Y%m%d-%H%M%S)"

cp backend/services/api-gateway/src/middleware/security-headers.middleware.ts "$BACKUP_DIR/"
cp backend/services/api-gateway/src/config/security.config.ts "$BACKUP_DIR/"
cp apps/web-app/nginx.conf "$BACKUP_DIR/"
cp backend/services/api-gateway/src/controllers/security.controller.ts "$BACKUP_DIR/"

echo -e "${GREEN}✓ Backups created in $BACKUP_DIR${NC}"
echo ""

echo -e "${YELLOW}Step 2: Updating HSTS max-age in security-headers.middleware.ts...${NC}"
sed -i 's/max-age=31536000/max-age=63072000/g' backend/services/api-gateway/src/middleware/security-headers.middleware.ts
sed -i 's/1 year$/2 years (recommended for preload list eligibility)/g' backend/services/api-gateway/src/middleware/security-headers.middleware.ts
echo -e "${GREEN}✓ Updated HSTS max-age in security-headers.middleware.ts${NC}"
echo ""

echo -e "${YELLOW}Step 3: Adding CSP documentation to security-headers.middleware.ts...${NC}"
# This requires manual edit - add documentation comment before buildCSPDirectives method
echo -e "${YELLOW}⚠ MANUAL ACTION REQUIRED: Add CSP documentation comment${NC}"
echo "   See SECURITY_HEADERS_PATCH.md for the documentation to add before buildCSPDirectives method"
echo ""

echo -e "${YELLOW}Step 4: Updating HSTS max-age in security.config.ts...${NC}"
sed -i 's/maxAge: 31536000, \/\/ 1 year/maxAge: 63072000, \/\/ 2 years (recommended for preload list eligibility)/g' backend/services/api-gateway/src/config/security.config.ts
echo -e "${GREEN}✓ Updated HSTS max-age in security.config.ts${NC}"
echo ""

echo -e "${YELLOW}Step 5: Updating HSTS max-age in nginx.conf...${NC}"
sed -i 's/max-age=31536000/max-age=63072000/g' apps/web-app/nginx.conf
sed -i 's/# HSTS - Enforce HTTPS (preload requires submission to hstspreload.org)/# HSTS - Enforce HTTPS for 2 years (preload requires submission to hstspreload.org)/g' apps/web-app/nginx.conf
echo -e "${GREEN}✓ Updated HSTS max-age in nginx.conf${NC}"
echo ""

echo -e "${YELLOW}Step 6: Verifying .well-known/security.txt exists...${NC}"
if [ -f "apps/web-app/public/.well-known/security.txt" ]; then
    echo -e "${GREEN}✓ security.txt file already exists${NC}"
else
    echo -e "${RED}✗ security.txt file not found${NC}"
    echo "   Creating .well-known directory and security.txt..."
    mkdir -p apps/web-app/public/.well-known
    cat > apps/web-app/public/.well-known/security.txt << 'EOF'
# Security Policy for Flamoral.com
# This file follows RFC 9116: https://www.rfc-editor.org/rfc/rfc9116.html

Contact: mailto:security@flamoral.com
Contact: https://flamoral.com/security/report
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://flamoral.com/.well-known/security.txt

# Security Acknowledgments
Acknowledgments: https://flamoral.com/security/hall-of-fame

# Policy
Policy: https://flamoral.com/security/disclosure-policy

# Encryption
# Encryption: https://flamoral.com/.well-known/pgp-key.txt

# Scope
# This security policy applies to:
# - flamoral.com
# - app.flamoral.com
# - api.flamoral.com
# - All subdomains of flamoral.com

# Please report security vulnerabilities responsibly.
# We aim to respond to security reports within 48 hours.
EOF
    echo -e "${GREEN}✓ Created security.txt file${NC}"
fi
echo ""

echo -e "${YELLOW}Step 7: Updating security.controller.ts...${NC}"
echo -e "${YELLOW}⚠ MANUAL ACTION REQUIRED: Update security.controller.ts${NC}"
echo "   See SECURITY_CONTROLLER_ADDITIONS.ts for the code to add"
echo "   1. Update imports to include Get and Res"
echo "   2. Add getSecurityTxt() method after reportSecurityEvent()"
echo ""

echo "========================================="
echo -e "${GREEN}Security fixes applied successfully!${NC}"
echo "========================================="
echo ""
echo "MANUAL ACTIONS REQUIRED:"
echo "1. Add CSP documentation comment to security-headers.middleware.ts"
echo "2. Update imports and add getSecurityTxt() method to security.controller.ts"
echo "3. Review SECURITY_HEADERS_PATCH.md for detailed instructions"
echo ""
echo "NEXT STEPS:"
echo "1. Test locally: npm run test"
echo "2. Build services: npm run build"
echo "3. Test security headers:"
echo "   curl -I https://flamoral.com | grep -i strict-transport"
echo "   curl https://flamoral.com/.well-known/security.txt"
echo "4. Deploy to staging and verify"
echo "5. Run security audit: https://securityheaders.com/"
echo "6. Submit to HSTS preload list: https://hstspreload.org/"
echo ""
echo "Files backed up to: $BACKUP_DIR"
echo ""
