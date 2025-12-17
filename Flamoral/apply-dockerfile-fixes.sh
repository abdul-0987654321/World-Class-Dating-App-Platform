#!/bin/bash

# =============================================================================
# Apply Dockerfile Fixes Script
# =============================================================================
# This script backs up original Dockerfiles and applies all fixes
#
# Usage:
#   chmod +x apply-dockerfile-fixes.sh
#   ./apply-dockerfile-fixes.sh
#
# To revert changes:
#   ./apply-dockerfile-fixes.sh --revert
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup suffix
BACKUP_SUFFIX=".backup-$(date +%Y%m%d-%H%M%S)"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to backup and replace file
backup_and_replace() {
    local original=$1
    local fixed=$2

    if [ ! -f "$fixed" ]; then
        print_warning "Fixed file not found: $fixed"
        return 1
    fi

    if [ -f "$original" ]; then
        cp "$original" "${original}${BACKUP_SUFFIX}"
        print_status "Backed up: $original"
    fi

    cp "$fixed" "$original"
    print_status "Applied fix: $original"
}

# Function to revert changes
revert_changes() {
    print_status "Reverting Dockerfile changes..."

    # Find all backup files
    find . -name "Dockerfile${BACKUP_SUFFIX}" -o -name "Dockerfile.*${BACKUP_SUFFIX}" | while read backup; do
        original="${backup%${BACKUP_SUFFIX}}"
        mv "$backup" "$original"
        print_status "Restored: $original"
    done

    print_status "All changes reverted"
    exit 0
}

# Check for revert flag
if [ "$1" == "--revert" ]; then
    revert_changes
fi

# =============================================================================
# Main Execution
# =============================================================================

echo "======================================================================="
echo "  Flamoral Dockerfile Fixes Application Script"
echo "======================================================================="
echo ""

print_status "Starting Dockerfile fixes application..."
echo ""

# 1. Backend main Dockerfile
print_status "Fixing backend/Dockerfile..."
backup_and_replace \
    "backend/Dockerfile" \
    "backend/Dockerfile.fixed"

# 2. Infrastructure production Dockerfile
print_status "Fixing infrastructure/docker/backend/Dockerfile.production..."
backup_and_replace \
    "infrastructure/docker/backend/Dockerfile.production" \
    "infrastructure/docker/backend/Dockerfile.production.fixed"

# 3. Realtime service Dockerfile
print_status "Fixing backend/services/realtime-service/Dockerfile..."
backup_and_replace \
    "backend/services/realtime-service/Dockerfile" \
    "backend/services/realtime-service/Dockerfile.fixed"

# 4. Advertising service Dockerfile
print_status "Fixing backend/services/advertising-service/Dockerfile..."
backup_and_replace \
    "backend/services/advertising-service/Dockerfile" \
    "backend/services/advertising-service/Dockerfile.fixed"

# 5. Workflow engine Dockerfile
print_status "Fixing backend/services/workflow-engine/Dockerfile..."
backup_and_replace \
    "backend/services/workflow-engine/Dockerfile" \
    "backend/services/workflow-engine/Dockerfile.fixed"

# 6. AI Services - Photo Analysis
print_status "Fixing backend/services/ai-services/photo-analysis/Dockerfile..."
backup_and_replace \
    "backend/services/ai-services/photo-analysis/Dockerfile" \
    "backend/services/ai-services/photo-analysis/Dockerfile.fixed"

# 7. AI Services - Fraud Detection
print_status "Fixing backend/services/ai-services/fraud-detection/Dockerfile..."
backup_and_replace \
    "backend/services/ai-services/fraud-detection/Dockerfile" \
    "backend/services/ai-services/fraud-detection/Dockerfile.fixed"

# 8. AI Services - Dating Coach
print_status "Fixing backend/services/ai-services/dating-coach-service/Dockerfile..."
backup_and_replace \
    "backend/services/ai-services/dating-coach-service/Dockerfile" \
    "backend/services/ai-services/dating-coach-service/Dockerfile.fixed"

# 9. AI Services - Content Generator
print_status "Fixing backend/services/ai-services/content-generator/Dockerfile..."
backup_and_replace \
    "backend/services/ai-services/content-generator/Dockerfile" \
    "backend/services/ai-services/content-generator/Dockerfile.fixed"

echo ""
print_status "All Dockerfile fixes applied successfully!"
echo ""

# =============================================================================
# Cleanup .fixed files
# =============================================================================

read -p "Do you want to remove the .fixed files? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    find . -name "Dockerfile.fixed" -o -name "Dockerfile.*.fixed" | while read fixed; do
        rm "$fixed"
        print_status "Removed: $fixed"
    done
fi

echo ""
echo "======================================================================="
echo "  Summary of Changes"
echo "======================================================================="
echo ""
echo "✓ Fixed backend/Dockerfile"
echo "  - Added curl for health checks"
echo "  - Removed failing migrations copy"
echo ""
echo "✓ Fixed infrastructure/docker/backend/Dockerfile.production"
echo "  - Separated build and production dependencies"
echo "  - Added curl for health checks"
echo ""
echo "✓ Fixed backend/services/realtime-service/Dockerfile"
echo "  - Fixed go.mod path issues"
echo "  - Simplified build flags"
echo ""
echo "✓ Fixed backend/services/advertising-service/Dockerfile"
echo "  - Changed wget to curl for health checks"
echo "  - Added dumb-init for signal handling"
echo ""
echo "✓ Fixed backend/services/workflow-engine/Dockerfile"
echo "  - Changed port from 4011 to 4013 (avoid conflict)"
echo ""
echo "✓ Fixed AI Services Dockerfiles (4 services)"
echo "  - Updated COPY paths for monorepo build context"
echo "  - All services: photo-analysis, fraud-detection,"
echo "    dating-coach-service, content-generator"
echo ""
echo "======================================================================="
echo "  Next Steps"
echo "======================================================================="
echo ""
echo "1. Review the changes in each Dockerfile"
echo "2. Update docker-compose.yml:"
echo "   - Change workflow-engine port to 4013"
echo "   - Verify build contexts for AI services"
echo "3. Test builds:"
echo "   docker-compose -f infrastructure/docker/docker-compose.yml build"
echo "4. Test individual services:"
echo "   docker-compose -f infrastructure/docker/docker-compose.yml up -d [service-name]"
echo ""
echo "To revert all changes, run:"
echo "  ./apply-dockerfile-fixes.sh --revert"
echo ""
echo "Backup files are saved with suffix: ${BACKUP_SUFFIX}"
echo ""
print_status "Done!"
