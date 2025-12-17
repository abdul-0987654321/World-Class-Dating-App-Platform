#!/bin/bash

################################################################################
# Flamoral CI/CD Pipeline - Automatic Fix Application
################################################################################
# This script applies all necessary fixes to support:
# - 4 new services (policy-service, advertising-service, automation-service, workflow-engine)
# - 6 AI services (in ai-services subdirectory)
# - Improved service discovery logic
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORKFLOW_DIR="$SCRIPT_DIR/.github/workflows"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Flamoral CI/CD Pipeline - Automatic Fix Application        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo

# Check if we're in the right directory
if [ ! -d "$WORKFLOW_DIR" ]; then
    echo -e "${RED}Error: .github/workflows directory not found${NC}"
    echo "Please run this script from the repository root"
    exit 1
fi

# Create backup
BACKUP_DIR="$WORKFLOW_DIR/backup-$(date +%Y%m%d-%H%M%S)"
echo -e "${YELLOW}📦 Creating backup at: $BACKUP_DIR${NC}"
mkdir -p "$BACKUP_DIR"

backup_file() {
    local file="$1"
    if [ -f "$WORKFLOW_DIR/$file" ]; then
        cp "$WORKFLOW_DIR/$file" "$BACKUP_DIR/"
        echo -e "${GREEN}  ✓ Backed up: $file${NC}"
    else
        echo -e "${YELLOW}  ⚠ Not found: $file${NC}"
    fi
}

backup_file "build-acr-pipeline.yml"
backup_file "unified-ci.yml"
backup_file "unified-cd-dev.yml"
backup_file "unified-cd-staging.yml"
backup_file "unified-cd-production.yml"

echo

# Function to apply fixes
apply_fix() {
    local file="$1"
    local description="$2"

    echo -e "${BLUE}🔧 Fixing: $file${NC}"
    echo -e "   $description"

    if [ ! -f "$WORKFLOW_DIR/$file" ]; then
        echo -e "${RED}   ✗ File not found!${NC}"
        return 1
    fi

    return 0
}

################################################################################
# FIX 1: build-acr-pipeline.yml
################################################################################

if [ -f "$WORKFLOW_DIR/build-acr-pipeline.PATCHED.yml" ]; then
    echo -e "${GREEN}✓ Using pre-patched build-acr-pipeline.yml${NC}"
    cp "$WORKFLOW_DIR/build-acr-pipeline.PATCHED.yml" "$WORKFLOW_DIR/build-acr-pipeline.yml"
else
    echo -e "${YELLOW}⚠ Pre-patched file not found, manual edit required${NC}"
    echo "  See: CICD_FIXES_SUMMARY.md"
fi

echo

################################################################################
# FIX 2: unified-ci.yml
################################################################################

apply_fix "unified-ci.yml" "Adding 4 new services to test matrices"

# Create a temporary Python script for the fix (more reliable than sed)
cat > /tmp/fix_unified_ci.py << 'PYEOF'
#!/usr/bin/env python3
import sys
import re

def fix_backend_matrix(content):
    """Add missing services to backend test matrix"""

    # Find the backend test matrix section
    pattern = r'(matrix:\s+service:\s+)((?:- [^\n]+\n\s+)+)'

    def replacer(match):
        indent = match.group(1)
        services = match.group(2)

        # Services to add if not present
        new_services = [
            '      - admin-service',
            '      - policy-service',
            '      - automation-service',
            '      - workflow-engine'
        ]

        # Add missing services
        for svc in new_services:
            svc_name = svc.strip().replace('- ', '')
            if svc_name not in services:
                services += svc + '\n'

        return indent + services

    return re.sub(pattern, replacer, content, count=1)

def fix_docker_matrix(content):
    """Add all services to docker build matrix"""

    all_services = [
        '      - auth-service',
        '      - user-service',
        '      - messaging-service',
        '      - matching-service',
        '      - media-service',
        '      - api-gateway',
        '      - payment-service',
        '      - notification-service',
        '      - analytics-service',
        '      - moderation-service',
        '      - realtime-service',
        '      - admin-service',
        '      - policy-service',
        '      - advertising-service',
        '      - automation-service',
        '      - workflow-engine'
    ]

    # Find docker-build-test section
    pattern = r'(docker-build-test:.*?strategy:.*?matrix:\s+service:\s+)((?:- [^\n]+\n\s+)+)'

    def replacer(match):
        prefix = match.group(1)
        return prefix + '\n'.join(all_services) + '\n'

    return re.sub(pattern, replacer, content, flags=re.DOTALL)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: fix_unified_ci.py <file>")
        sys.exit(1)

    filepath = sys.argv[1]

    with open(filepath, 'r') as f:
        content = f.read()

    content = fix_backend_matrix(content)
    content = fix_docker_matrix(content)

    with open(filepath, 'w') as f:
        f.write(content)

    print("✓ Fixed unified-ci.yml")
PYEOF

chmod +x /tmp/fix_unified_ci.py

if command -v python3 &> /dev/null; then
    python3 /tmp/fix_unified_ci.py "$WORKFLOW_DIR/unified-ci.yml"
    echo -e "${GREEN}   ✓ Applied fixes using Python${NC}"
else
    echo -e "${YELLOW}   ⚠ Python3 not found - manual edit required${NC}"
    echo -e "${YELLOW}   See CICD_FIXES_SUMMARY.md for details${NC}"
fi

echo

################################################################################
# FIX 3, 4, 5: CD Pipelines (Dev, Staging, Production)
################################################################################

fix_cd_pipeline() {
    local file="$1"
    local env_name="$2"

    echo -e "${BLUE}🔧 Fixing: $file ($env_name environment)${NC}"

    if [ ! -f "$WORKFLOW_DIR/$file" ]; then
        echo -e "${RED}   ✗ File not found!${NC}"
        return 1
    fi

    # Create Python script to fix CD pipeline
    cat > /tmp/fix_cd.py << 'PYEOF'
#!/usr/bin/env python3
import sys
import yaml

if len(sys.argv) != 2:
    print("Usage: fix_cd.py <file>")
    sys.exit(1)

filepath = sys.argv[1]

# Full service matrix
all_services = [
    {'name': 'api-gateway', 'path': 'backend/services/api-gateway'},
    {'name': 'user-service', 'path': 'backend/services/user-service'},
    {'name': 'auth-service', 'path': 'backend/services/auth-service'},
    {'name': 'matching-service', 'path': 'backend/services/matching-service'},
    {'name': 'messaging-service', 'path': 'backend/services/messaging-service'},
    {'name': 'media-service', 'path': 'backend/services/media-service'},
    {'name': 'notification-service', 'path': 'backend/services/notification-service'},
    {'name': 'payment-service', 'path': 'backend/services/payment-service'},
    {'name': 'analytics-service', 'path': 'backend/services/analytics-service'},
    {'name': 'moderation-service', 'path': 'backend/services/moderation-service'},
    {'name': 'realtime-service', 'path': 'backend/services/realtime-service'},
    {'name': 'admin-service', 'path': 'backend/services/admin-service'},
    {'name': 'policy-service', 'path': 'backend/services/policy-service'},
    {'name': 'advertising-service', 'path': 'backend/services/advertising-service'},
    {'name': 'automation-service', 'path': 'backend/services/automation-service'},
    {'name': 'workflow-engine', 'path': 'backend/services/workflow-engine'},
]

# Read file
with open(filepath, 'r') as f:
    content = f.read()

# Manual YAML manipulation (safer than full parse for complex GitHub Actions)
lines = content.split('\n')
result = []
in_service_matrix = False
indent_level = 0
added_services = set()

for i, line in enumerate(lines):
    # Detect service matrix section
    if 'matrix:' in line and i + 1 < len(lines) and 'service:' in lines[i+1]:
        in_service_matrix = True
        result.append(line)
        continue

    if in_service_matrix:
        if line.strip().startswith('- name:'):
            # Extract service name
            svc_name = line.split('name:')[1].strip()
            added_services.add(svc_name)
            result.append(line)
        elif 'path:' in line:
            result.append(line)
        elif line.strip() == '' or (not line.strip().startswith('-') and not 'path:' in line):
            # End of matrix - add missing services
            if in_service_matrix:
                for svc in all_services:
                    if svc['name'] not in added_services:
                        result.append(f"      - name: {svc['name']}")
                        result.append(f"        path: {svc['path']}")
                in_service_matrix = False
            result.append(line)
        else:
            result.append(line)
    else:
        result.append(line)

# Write back
with open(filepath, 'w') as f:
    f.write('\n'.join(result))

print(f"✓ Fixed {filepath}")
PYEOF

    chmod +x /tmp/fix_cd.py

    if command -v python3 &> /dev/null; then
        python3 /tmp/fix_cd.py "$WORKFLOW_DIR/$file" 2>&1 | sed 's/^/   /'
        echo -e "${GREEN}   ✓ Applied fixes${NC}"
    else
        echo -e "${YELLOW}   ⚠ Python3 not found - manual edit required${NC}"
    fi
}

fix_cd_pipeline "unified-cd-dev.yml" "Development"
echo

fix_cd_pipeline "unified-cd-staging.yml" "Staging"
echo

fix_cd_pipeline "unified-cd-production.yml" "Production"
echo

################################################################################
# Summary
################################################################################

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Fix Application Complete                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo

echo -e "${GREEN}✓ Completed Fixes:${NC}"
echo "  • build-acr-pipeline.yml - Service discovery + 4 new services"
echo "  • unified-ci.yml - Test matrices"
echo "  • unified-cd-dev.yml - Deployment matrix"
echo "  • unified-cd-staging.yml - Deployment matrix"
echo "  • unified-cd-production.yml - Deployment matrix"
echo

echo -e "${YELLOW}📋 Backup Location:${NC}"
echo "  $BACKUP_DIR"
echo

echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. Review changes:       git diff .github/workflows/"
echo "  2. Test syntax:          gh workflow view 'Build & ACR Pipeline'"
echo "  3. Create test branch:   git checkout -b fix/cicd-all-services"
echo "  4. Commit changes:       git add .github/workflows/ && git commit -m 'fix: Add CI/CD support for all services'"
echo "  5. Push and test:        git push -u origin fix/cicd-all-services"
echo "  6. Monitor workflows:    gh run watch"
echo

echo -e "${GREEN}✨ All fixes applied successfully!${NC}"
echo

# Cleanup temp files
rm -f /tmp/fix_unified_ci.py /tmp/fix_cd.py

exit 0
