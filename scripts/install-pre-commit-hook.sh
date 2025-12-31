#!/bin/bash
# Install pre-commit hook to prevent .env files from being committed

HOOK_FILE=".git/hooks/pre-commit"

# Check if .git directory exists
if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository root"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create the pre-commit hook
cat > "$HOOK_FILE" << 'HOOK'
#!/bin/bash
# Pre-commit hook to prevent sensitive files from being committed

# Colors
RED='\033[0;31m'
NC='\033[0m'

# Files that should never be committed
FORBIDDEN_PATTERNS=(
    "^\.env$"
    "\.env\.local$"
    "\.env\.production$"
    "\.env\.staging$"
    "credentials\.json$"
    "secrets\.json$"
    "\.pem$"
    "private.*key"
)

# Check staged files against forbidden patterns
FILES=$(git diff --cached --name-only --diff-filter=ACM)

for file in $FILES; do
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        if echo "$file" | grep -qE "$pattern"; then
            echo -e "${RED}ERROR: Attempting to commit sensitive file: $file${NC}"
            echo ""
            echo "This file matches a forbidden pattern and should not be committed."
            echo "If you're sure this is intentional, use: git commit --no-verify"
            echo ""
            exit 1
        fi
    done
done

# Check for hardcoded secrets in staged files
if git diff --cached | grep -qiE "(password|secret|api.?key|token)\s*[:=]\s*['\"][^'\"]{8,}['\"]"; then
    echo -e "${RED}WARNING: Possible hardcoded secrets detected in staged changes${NC}"
    echo ""
    echo "Please review your changes and ensure no secrets are being committed."
    echo "Use environment variables instead of hardcoded values."
    echo ""
    # Don't block, just warn - uncomment below to block
    # exit 1
fi

exit 0
HOOK

# Make it executable
chmod +x "$HOOK_FILE"

echo "Pre-commit hook installed successfully!"
echo ""
echo "The hook will prevent:"
echo "  - .env files from being committed"
echo "  - credentials.json and secrets.json"
echo "  - Private key files (.pem)"
echo "  - And warn about hardcoded secrets"
