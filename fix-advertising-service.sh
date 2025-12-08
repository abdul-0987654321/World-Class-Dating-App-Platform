#!/bin/bash

# Fix advertising-service package.json by adding missing ESLint dependencies

PACKAGE_JSON="backend/services/advertising-service/package.json"

# Create a backup
cp "$PACKAGE_JSON" "$PACKAGE_JSON.bak"

# Use Python to update the JSON file
python3 << 'EOF'
import json

# Read the package.json
with open('backend/services/advertising-service/package.json', 'r') as f:
    package = json.load(f)

# Add missing devDependencies
package['devDependencies']['@types/jest'] = '^29.5.11'
package['devDependencies']['@typescript-eslint/eslint-plugin'] = '^6.15.0'
package['devDependencies']['@typescript-eslint/parser'] = '^6.15.0'
package['devDependencies']['eslint'] = '^8.56.0'

# Sort devDependencies alphabetically
package['devDependencies'] = dict(sorted(package['devDependencies'].items()))

# Write back to file
with open('backend/services/advertising-service/package.json', 'w') as f:
    json.dump(package, f, indent=2)
    f.write('\n')

print("✅ Updated package.json successfully")
EOF

echo "Package.json has been updated. Review the changes:"
diff -u "$PACKAGE_JSON.bak" "$PACKAGE_JSON" || true
