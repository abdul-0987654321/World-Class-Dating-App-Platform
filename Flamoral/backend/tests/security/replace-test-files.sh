#!/bin/bash
# Bash script to replace old security test files with fixed versions
# Run this from: tests/security directory

echo "Replacing old security test files with fixed versions..."

# Backup old files
echo "Backing up old files..."
[ -f "sqli.test.ts" ] && mv "sqli.test.ts" "sqli.test.ts.old" && echo "  - Backed up sqli.test.ts"
[ -f "xss.test.ts" ] && mv "xss.test.ts" "xss.test.ts.old" && echo "  - Backed up xss.test.ts"
[ -f "auth.test.ts" ] && mv "auth.test.ts" "auth.test.ts.old" && echo "  - Backed up auth.test.ts"

# Rename fixed files
echo ""
echo "Renaming fixed files..."
[ -f "sqli-fixed.test.ts" ] && mv "sqli-fixed.test.ts" "sqli.test.ts" && echo "  - Renamed sqli-fixed.test.ts to sqli.test.ts"
[ -f "xss-fixed.test.ts" ] && mv "xss-fixed.test.ts" "xss.test.ts" && echo "  - Renamed xss-fixed.test.ts to xss.test.ts"
[ -f "auth-fixed.test.ts" ] && mv "auth-fixed.test.ts" "auth.test.ts" && echo "  - Renamed auth-fixed.test.ts to auth.test.ts"

echo ""
echo "File replacement complete!"
echo "Old files backed up with .old extension"
echo ""
echo "To verify, run:"
echo "  npm test -- --testPathPattern=security --testTimeout=60000"
