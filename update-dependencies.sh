#!/bin/bash
# Bash script to update backend service dependencies
# Run this from the DatingPlatform root directory

set -e

echo -e "\033[36mStarting dependency updates...\033[0m"
echo ""

# Function to update a single service
update_service() {
    local service_path=$1
    local add_axios=$2
    local add_knex=$3
    local add_shared=$4

    local pkg_path="$service_path/package.json"

    echo -e "\033[33mProcessing: $service_path\033[0m"

    if [ ! -f "$pkg_path" ]; then
        echo -e "  \033[31m✗ package.json not found\033[0m"
        echo ""
        return 1
    fi

    # Use Node.js to update the package.json
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$pkg_path', 'utf8'));
        let modified = false;

        if (!pkg.dependencies) {
            pkg.dependencies = {};
        }

        const newDeps = {};

        // Add @flamoral/shared first if needed
        if ($add_shared && !pkg.dependencies['@flamoral/shared']) {
            newDeps['@flamoral/shared'] = '*';
            console.log('  ✓ Added @flamoral/shared');
            modified = true;
        }

        // Copy existing dependencies
        Object.keys(pkg.dependencies).forEach(key => {
            if (key !== '@flamoral/shared' || $add_shared) {
                newDeps[key] = pkg.dependencies[key];
            }
        });

        // Add axios if needed
        if ($add_axios && !newDeps['axios']) {
            newDeps['axios'] = '^1.6.2';
            console.log('  ✓ Added axios');
            modified = true;
        }

        // Add knex if needed
        if ($add_knex && !newDeps['knex']) {
            newDeps['knex'] = '^3.1.0';
            console.log('  ✓ Added knex');
            modified = true;
        }

        if (modified) {
            pkg.dependencies = newDeps;
            fs.writeFileSync('$pkg_path', JSON.stringify(pkg, null, 2) + '\n', 'utf8');
            console.log('  → Updated $pkg_path');
        } else {
            console.log('  → No changes needed');
        }
    "

    echo ""
}

# Update all services
update_service "backend/services/messaging-service" true true true
update_service "backend/services/advertising-service" false false true
update_service "backend/services/analytics-service" false true true
update_service "backend/services/api-gateway" false false true
update_service "backend/services/auth-service" false true true
update_service "backend/services/matching-service" false false true
update_service "backend/services/media-service" true false true
update_service "backend/services/moderation-service" false false true
update_service "backend/services/notification-service" false false true
update_service "backend/services/payment-service" false false true
update_service "backend/services/user-service" true false true

echo -e "\033[32mDependency updates complete!\033[0m"
echo ""
echo -e "\033[36mSummary of changes:\033[0m"
echo "- Added @flamoral/shared to all 11 backend services"
echo "- Added axios to: messaging-service, media-service, user-service"
echo "- Added knex to: messaging-service, analytics-service, auth-service"
echo ""
echo -e "\033[33mNext steps:\033[0m"
echo "1. Run 'npm install' in the root directory"
echo "2. Test the changes locally"
echo "3. Run the CI pipeline"
