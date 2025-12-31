#!/bin/bash
# ============================================================================
# SECRET ROTATION SCRIPT
# ============================================================================
# CRITICAL: Run this script after any security incident or before production
# deployment if secrets have been exposed.
#
# This script generates new cryptographically secure secrets for all
# environment variables and provides instructions for updating them.
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${RED}============================================================${NC}"
echo -e "${RED}      CRITICAL: SECRET ROTATION REQUIRED                   ${NC}"
echo -e "${RED}============================================================${NC}"
echo ""
echo -e "${YELLOW}The .env file was committed to the repository, exposing:${NC}"
echo "  - JWT secrets"
echo "  - Database passwords"
echo "  - API keys"
echo "  - Encryption keys"
echo ""
echo -e "${YELLOW}ALL EXPOSED SECRETS MUST BE ROTATED IMMEDIATELY${NC}"
echo ""

# Generate secure random strings
generate_secret() {
    local length=${1:-64}
    openssl rand -base64 $length | tr -d '\n/+=' | head -c $length
}

generate_hex_secret() {
    local length=${1:-32}
    openssl rand -hex $length
}

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}      STEP 1: GENERATE NEW SECRETS                         ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo "Copy these values to AWS Secrets Manager and your production .env:"
echo ""

echo -e "${GREEN}# JWT Secrets (RS256 recommended, but HS256 shown for simplicity)${NC}"
echo "JWT_ACCESS_SECRET=$(generate_secret 64)"
echo "JWT_REFRESH_SECRET=$(generate_secret 64)"
echo "JWT_SECRET=$(generate_secret 64)"
echo ""

echo -e "${GREEN}# Service Authentication${NC}"
echo "SERVICE_TOKEN=$(generate_secret 48)"
echo "SERVICE_API_KEY=$(generate_secret 48)"
echo "INTERNAL_SERVICE_KEY=$(generate_secret 48)"
echo ""

echo -e "${GREEN}# Database Password${NC}"
echo "DB_PASSWORD=$(generate_secret 32)"
echo ""

echo -e "${GREEN}# Redis Password${NC}"
echo "REDIS_PASSWORD=$(generate_secret 32)"
echo ""

echo -e "${GREEN}# Encryption Key (must be exactly 32 bytes for AES-256)${NC}"
echo "ENCRYPTION_KEY=$(generate_hex_secret 16)"
echo ""

echo -e "${GREEN}# TOTP Encryption Key${NC}"
echo "TOTP_ENCRYPTION_KEY=$(generate_hex_secret 16)"
echo ""

echo -e "${GREEN}# Session Secret${NC}"
echo "SESSION_SECRET=$(generate_secret 64)"
echo ""

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}      STEP 2: UPDATE AWS SECRETS MANAGER                   ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo "Run the following AWS CLI commands to update secrets:"
echo ""
echo "aws secretsmanager update-secret \\"
echo "  --secret-id flamoral-production-secrets \\"
echo "  --secret-string '{...}' \\"
echo "  --region us-east-1"
echo ""

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}      STEP 3: REMOVE .env FROM GIT HISTORY                 ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${YELLOW}Option A: Using BFG Repo-Cleaner (RECOMMENDED)${NC}"
echo ""
echo "1. Install BFG: https://rtyley.github.io/bfg-repo-cleaner/"
echo "2. Run the following commands:"
echo ""
echo "   # Create a backup first"
echo "   git clone --mirror git@github.com:your-org/Dating.git backup-Dating.git"
echo ""
echo "   # Remove .env files from history"
echo "   bfg --delete-files .env Dating.git"
echo ""
echo "   # Cleanup and push"
echo "   cd Dating.git"
echo "   git reflog expire --expire=now --all && git gc --prune=now --aggressive"
echo "   git push --force"
echo ""
echo -e "${YELLOW}Option B: Using git filter-branch${NC}"
echo ""
echo "   git filter-branch --force --index-filter \\"
echo "     'git rm --cached --ignore-unmatch .env' \\"
echo "     --prune-empty --tag-name-filter cat -- --all"
echo ""
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}      STEP 4: ADD PRE-COMMIT HOOK                          ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo "Add a pre-commit hook to prevent future .env commits:"
echo ""
echo 'cat > .git/hooks/pre-commit << '\''EOF'\'''
echo '#!/bin/sh'
echo ''
echo '# Check for .env files being committed'
echo 'if git diff --cached --name-only | grep -qE "^\.env$|/\.env$"; then'
echo '  echo "ERROR: Attempting to commit .env file!"'
echo '  echo "This file should never be committed to git."'
echo '  exit 1'
echo 'fi'
echo ''
echo 'exit 0'
echo 'EOF'
echo 'chmod +x .git/hooks/pre-commit'
echo ""

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}      STEP 5: NOTIFY ALL DEVELOPERS                        ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo "After force pushing, all team members must:"
echo "1. Delete their local clone"
echo "2. Re-clone the repository"
echo "3. Update their local .env files with new secrets"
echo ""

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}      CHECKLIST                                            ${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "[ ] New secrets generated"
echo "[ ] AWS Secrets Manager updated"
echo "[ ] RDS database password changed"
echo "[ ] Redis password changed"
echo "[ ] Kubernetes secrets updated"
echo "[ ] All services redeployed"
echo "[ ] .env removed from git history"
echo "[ ] Pre-commit hook installed"
echo "[ ] Team notified"
echo "[ ] Old secrets revoked/expired"
echo ""
echo -e "${GREEN}============================================================${NC}"
echo ""
