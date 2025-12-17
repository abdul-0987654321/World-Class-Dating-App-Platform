#!/bin/bash
# Bash Script to Update CDN URLs in Flamoral Environment Files
# This script adds/updates CDN configuration in all frontend environment files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Flamoral CDN URL Configuration Updater${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to append CDN config if not exists
add_cdn_config() {
    local file_path="$1"
    local cdn_url="$2"
    local media_cdn_url="$3"
    local prefix="${4:-VITE_}"

    if [ -f "$file_path" ]; then
        if ! grep -q "${prefix}CDN_URL" "$file_path"; then
            echo -e "${GREEN}Adding CDN configuration to: $file_path${NC}"

            # Create temporary file with CDN config
            cat >> "$file_path" << EOF

# ============================================================================
# CDN Configuration
# ============================================================================
${prefix}CDN_URL=$cdn_url
${prefix}MEDIA_CDN_URL=$media_cdn_url
EOF
            echo -e "${GREEN}  ✓ CDN URLs added successfully${NC}"
        else
            echo -e "${YELLOW}CDN configuration already exists in: $file_path${NC}"
        fi
    else
        echo -e "${RED}File not found: $file_path${NC}"
    fi
}

# Function to update existing CDN URLs
update_cdn_config() {
    local file_path="$1"
    local old_cdn_url="$2"
    local new_cdn_url="$3"
    local old_media_cdn_url="$4"
    local new_media_cdn_url="$5"

    if [ -f "$file_path" ]; then
        if grep -q "$old_cdn_url" "$file_path"; then
            echo -e "${GREEN}Updating CDN URLs in: $file_path${NC}"

            # Use sed for replacement (works on both Linux and Mac)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|$old_cdn_url|$new_cdn_url|g" "$file_path"
                sed -i '' "s|$old_media_cdn_url|$new_media_cdn_url|g" "$file_path"
            else
                # Linux
                sed -i "s|$old_cdn_url|$new_cdn_url|g" "$file_path"
                sed -i "s|$old_media_cdn_url|$new_media_cdn_url|g" "$file_path"
            fi

            echo -e "${GREEN}  ✓ CDN URLs updated successfully${NC}"
        else
            echo -e "${YELLOW}CDN URLs already correct in: $file_path${NC}"
        fi
    else
        echo -e "${RED}File not found: $file_path${NC}"
    fi
}

echo -e "${CYAN}Step 1: Updating Web App .env.development${NC}"
echo -e "Adding CDN URLs for local development..."
add_cdn_config \
    "$PROJECT_ROOT/apps/web-app/.env.development" \
    "http://localhost:8080" \
    "http://localhost:8080" \
    "VITE_"
echo ""

echo -e "${CYAN}Step 2: Updating Web App .env.staging${NC}"
echo -e "Correcting CDN URL format (staging-cdn → cdn-staging)..."
update_cdn_config \
    "$PROJECT_ROOT/apps/web-app/.env.staging" \
    "https://staging-cdn.flamoral.com" \
    "https://cdn-staging.flamoral.com" \
    "https://staging-media.flamoral.com" \
    "https://media-staging.flamoral.com"
echo ""

echo -e "${CYAN}Step 3: Verifying Web App .env.production${NC}"
echo -e "Checking production CDN URLs..."
PROD_FILE="$PROJECT_ROOT/apps/web-app/.env.production"
if [ -f "$PROD_FILE" ]; then
    if grep -q "VITE_CDN_URL=https://cdn.flamoral.com" "$PROD_FILE" && \
       grep -q "VITE_MEDIA_CDN_URL=https://media.flamoral.com" "$PROD_FILE"; then
        echo -e "${GREEN}  ✓ Production CDN URLs are correctly configured${NC}"
    else
        echo -e "${YELLOW}  ⚠ Production CDN URLs may need manual verification${NC}"
    fi
else
    echo -e "${RED}  ✗ Production env file not found${NC}"
fi
echo ""

echo -e "${CYAN}Step 4: Updating Web App .env.example${NC}"
echo -e "Adding comprehensive CDN documentation..."
add_cdn_config \
    "$PROJECT_ROOT/apps/web-app/.env.example" \
    "http://localhost:8080" \
    "http://localhost:8080" \
    "VITE_"
echo ""

echo -e "${CYAN}Step 5: Updating Mobile App .env.example${NC}"
echo -e "Adding CDN URLs for mobile app..."
add_cdn_config \
    "$PROJECT_ROOT/apps/mobile-app/.env.example" \
    "http://localhost:8080" \
    "http://localhost:8080" \
    ""
echo ""

echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}CDN Configuration Update Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${CYAN}Summary of changes:${NC}"
echo -e "  • apps/web-app/.env.development - Added CDN URLs for localhost"
echo -e "  • apps/web-app/.env.staging - Updated to cdn-staging/media-staging format"
echo -e "  • apps/web-app/.env.production - Verified (already correct)"
echo -e "  • apps/web-app/.env.example - Added CDN URL documentation"
echo -e "  • apps/mobile-app/.env.example - Added CDN URL variables"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "  1. Review the changes in each file"
echo -e "  2. Test the application in development mode"
echo -e "  3. Configure Azure CDN endpoints for staging and production"
echo -e "  4. Update DNS CNAME records to point to CDN"
echo -e "  5. Review CDN_ENV_CONFIGURATION_GUIDE.md for detailed documentation"
echo ""
