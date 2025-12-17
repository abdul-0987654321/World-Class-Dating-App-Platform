#!/bin/bash
# Bash script to add Jest type references to test files
# Run this from the user-service directory

JEST_REF='/// <reference types="jest" />'

FILES_TO_FIX=(
    "src/__tests__/unit/services/verification.service.test.ts"
    "tests/unit/profile.service.test.ts"
    "tests/e2e/api/user-api.spec.ts"
)

echo "Adding Jest type references to test files..."
echo ""

for FILE in "${FILES_TO_FIX[@]}"; do
    if [ -f "$FILE" ]; then
        # Check if already has the reference
        if head -1 "$FILE" | grep -q '/// <reference types="jest"'; then
            echo "✓ Already has jest reference: $FILE"
        else
            # Add the jest reference at the beginning
            echo "$JEST_REF" | cat - "$FILE" > /tmp/temp_file && mv /tmp/temp_file "$FILE"
            echo "✓ Added jest reference to: $FILE"
        fi
    else
        echo "✗ File not found: $FILE"
    fi
done

echo ""
echo "Done! You can now run: npm test -- --testTimeout=60000"
