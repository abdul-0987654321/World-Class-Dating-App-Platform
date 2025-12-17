#!/bin/bash

# ============================================================================
# Nginx Configuration Fix Application Script
# ============================================================================
# This script applies the corrected nginx configurations to the Flamoral
# dating platform. It creates backups of the original files before applying.
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}Nginx Configuration Fix Applicator${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Function to backup and apply a fix
apply_fix() {
    local original_file="$1"
    local fixed_file="$2"
    local backup_file="${original_file}.backup"

    echo -e "${YELLOW}Processing: ${original_file}${NC}"

    # Check if fixed file exists
    if [ ! -f "$fixed_file" ]; then
        echo -e "${RED}ERROR: Fixed file not found: ${fixed_file}${NC}"
        return 1
    fi

    # Create backup if original exists
    if [ -f "$original_file" ]; then
        echo -e "  Creating backup: ${backup_file}"
        cp "$original_file" "$backup_file"
    else
        echo -e "${YELLOW}  WARNING: Original file not found, creating new file${NC}"
    fi

    # Apply fix
    echo -e "  Applying fix..."
    cp "$fixed_file" "$original_file"

    echo -e "${GREEN}  SUCCESS: Configuration updated${NC}"
    echo ""
}

# Function to validate nginx configuration
validate_nginx() {
    echo -e "${YELLOW}Validating nginx configuration...${NC}"

    # Check if nginx is installed
    if command -v nginx &> /dev/null; then
        if nginx -t 2>&1; then
            echo -e "${GREEN}Nginx configuration is valid!${NC}"
            return 0
        else
            echo -e "${RED}Nginx configuration validation failed!${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}WARNING: nginx command not found. Skipping validation.${NC}"
        echo -e "${YELLOW}Please validate manually with: nginx -t${NC}"
        return 0
    fi
}

# Main execution
main() {
    echo "This script will apply the following fixes:"
    echo "1. apps/web-app/nginx.conf - Add API Gateway proxy and WebSocket support"
    echo "2. infrastructure/docker/nginx/nginx.conf - Add all backend service upstreams"
    echo "3. infrastructure/docker/nginx/default.conf - Complete routing and SSL configuration"
    echo ""
    echo -e "${YELLOW}Backups will be created with .backup extension${NC}"
    echo ""

    read -p "Do you want to continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted by user${NC}"
        exit 1
    fi

    echo ""
    echo -e "${BLUE}Applying fixes...${NC}"
    echo ""

    # Apply fixes
    apply_fix \
        "${SCRIPT_DIR}/apps/web-app/nginx.conf" \
        "${SCRIPT_DIR}/apps/web-app/nginx.conf.fixed"

    apply_fix \
        "${SCRIPT_DIR}/infrastructure/docker/nginx/nginx.conf" \
        "${SCRIPT_DIR}/infrastructure/docker/nginx/nginx.conf.fixed"

    apply_fix \
        "${SCRIPT_DIR}/infrastructure/docker/nginx/default.conf" \
        "${SCRIPT_DIR}/infrastructure/docker/nginx/default.conf.fixed"

    echo -e "${BLUE}=================================${NC}"
    echo -e "${GREEN}All fixes applied successfully!${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""

    # Validate if nginx is available
    if command -v nginx &> /dev/null; then
        echo ""
        validate_nginx
    fi

    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Review the changes in the updated files"
    echo "2. If using Docker, rebuild your nginx container:"
    echo -e "   ${YELLOW}docker-compose build nginx${NC}"
    echo "3. Restart nginx:"
    echo -e "   ${YELLOW}docker-compose restart nginx${NC}"
    echo "   or"
    echo -e "   ${YELLOW}systemctl restart nginx${NC}"
    echo "4. Test the configuration:"
    echo -e "   ${YELLOW}curl http://localhost/health${NC}"
    echo -e "   ${YELLOW}curl http://localhost/api/health${NC}"
    echo ""
    echo "To rollback changes, use the .backup files:"
    echo -e "   ${YELLOW}cp apps/web-app/nginx.conf.backup apps/web-app/nginx.conf${NC}"
    echo ""
}

# Run main function
main "$@"
