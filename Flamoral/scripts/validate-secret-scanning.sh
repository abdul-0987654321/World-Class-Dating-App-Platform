#!/bin/bash

# =============================================================================
# Secret Scanning Validation Script - Flamoral Dating Platform
# =============================================================================
# Validates the secret scanning setup and configuration
# Usage: ./scripts/validate-secret-scanning.sh
# =============================================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================================="
echo "Flamoral Secret Scanning Validation"
echo -e "===================================================================${NC}"
echo ""

VALIDATION_PASSED=true

# =============================================================================
# Check 1: Required Files Exist
# =============================================================================
echo -e "${BLUE}[1/8] Checking required files...${NC}"

FILES_TO_CHECK=(
    ".github/workflows/secret-scan.yml"
    ".gitleaks.toml"
    ".trufflehogignore"
    "docs/security/SECRET-SCANNING-GUIDE.md"
    ".github/workflows/README-SECRET-SCANNING.md"
    "scripts/install-git-hooks.sh"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$REPO_ROOT/$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file (MISSING!)"
        VALIDATION_PASSED=false
    fi
done
echo ""

# =============================================================================
# Check 2: Gitleaks Installation
# =============================================================================
echo -e "${BLUE}[2/8] Checking Gitleaks installation...${NC}"

if command -v gitleaks &> /dev/null; then
    VERSION=$(gitleaks version)
    echo -e "  ${GREEN}✓${NC} Gitleaks is installed: $VERSION"
else
    echo -e "  ${YELLOW}⚠${NC} Gitleaks is not installed"
    echo "     Install with:"
    echo "       macOS:    brew install gitleaks"
    echo "       Windows:  choco install gitleaks"
    echo "       Linux:    See https://github.com/gitleaks/gitleaks#installing"
fi
echo ""

# =============================================================================
# Check 3: Gitleaks Configuration Syntax
# =============================================================================
echo -e "${BLUE}[3/8] Validating Gitleaks configuration...${NC}"

if [ -f "$REPO_ROOT/.gitleaks.toml" ]; then
    # Try to parse the TOML file
    if command -v python3 &> /dev/null; then
        if python3 -c "import tomli; tomli.load(open('$REPO_ROOT/.gitleaks.toml', 'rb'))" 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} .gitleaks.toml syntax is valid"
        else
            if python3 -c "import tomllib; tomllib.load(open('$REPO_ROOT/.gitleaks.toml', 'rb'))" 2>/dev/null; then
                echo -e "  ${GREEN}✓${NC} .gitleaks.toml syntax is valid"
            else
                echo -e "  ${YELLOW}⚠${NC} Could not validate TOML syntax (tomli/tomllib not installed)"
            fi
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} Could not validate TOML syntax (python3 not available)"
    fi

    # Check for required sections
    if grep -q "\[\[rules\]\]" "$REPO_ROOT/.gitleaks.toml"; then
        echo -e "  ${GREEN}✓${NC} Contains custom rules"
    else
        echo -e "  ${RED}✗${NC} No custom rules defined"
        VALIDATION_PASSED=false
    fi

    if grep -q "\[allowlist\]" "$REPO_ROOT/.gitleaks.toml"; then
        echo -e "  ${GREEN}✓${NC} Contains allowlist configuration"
    else
        echo -e "  ${YELLOW}⚠${NC} No allowlist defined"
    fi
else
    echo -e "  ${RED}✗${NC} .gitleaks.toml not found"
    VALIDATION_PASSED=false
fi
echo ""

# =============================================================================
# Check 4: Required Pattern Coverage
# =============================================================================
echo -e "${BLUE}[4/8] Checking pattern coverage...${NC}"

REQUIRED_PATTERNS=(
    "stripe-live-secret-key"
    "paystack-secret-key"
    "flutterwave-secret-key"
    "azure-storage-connection-string"
    "postgres-connection-string"
    "jwt-secret-high-entropy"
)

for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if grep -q "id = \"$pattern\"" "$REPO_ROOT/.gitleaks.toml" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $pattern"
    else
        echo -e "  ${RED}✗${NC} $pattern (MISSING!)"
        VALIDATION_PASSED=false
    fi
done
echo ""

# =============================================================================
# Check 5: Workflow Syntax
# =============================================================================
echo -e "${BLUE}[5/8] Validating workflow syntax...${NC}"

if [ -f "$REPO_ROOT/.github/workflows/secret-scan.yml" ]; then
    # Check for required workflow elements
    WORKFLOW_FILE="$REPO_ROOT/.github/workflows/secret-scan.yml"

    if grep -q "name: Secret Leak Detection" "$WORKFLOW_FILE"; then
        echo -e "  ${GREEN}✓${NC} Workflow name defined"
    else
        echo -e "  ${RED}✗${NC} Workflow name missing"
        VALIDATION_PASSED=false
    fi

    if grep -q "on:" "$WORKFLOW_FILE"; then
        echo -e "  ${GREEN}✓${NC} Trigger events defined"
    else
        echo -e "  ${RED}✗${NC} Trigger events missing"
        VALIDATION_PASSED=false
    fi

    if grep -q "gitleaks/gitleaks-action@v2" "$WORKFLOW_FILE"; then
        echo -e "  ${GREEN}✓${NC} Gitleaks action configured"
    else
        echo -e "  ${RED}✗${NC} Gitleaks action missing"
        VALIDATION_PASSED=false
    fi

    if grep -q "trufflesecurity/trufflehog@main" "$WORKFLOW_FILE"; then
        echo -e "  ${GREEN}✓${NC} TruffleHog action configured"
    else
        echo -e "  ${YELLOW}⚠${NC} TruffleHog action missing"
    fi
else
    echo -e "  ${RED}✗${NC} secret-scan.yml not found"
    VALIDATION_PASSED=false
fi
echo ""

# =============================================================================
# Check 6: CI Integration
# =============================================================================
echo -e "${BLUE}[6/8] Checking CI pipeline integration...${NC}"

CI_FILES=(
    ".github/workflows/main-ci.yml"
    ".github/workflows/unified-ci.yml"
)

for ci_file in "${CI_FILES[@]}"; do
    if [ -f "$REPO_ROOT/$ci_file" ]; then
        if grep -q "secret-scanning" "$REPO_ROOT/$ci_file"; then
            echo -e "  ${GREEN}✓${NC} $ci_file includes secret-scanning job"
        else
            echo -e "  ${YELLOW}⚠${NC} $ci_file missing secret-scanning job"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} $ci_file not found"
    fi
done
echo ""

# =============================================================================
# Check 7: Exclusion Patterns
# =============================================================================
echo -e "${BLUE}[7/8] Validating exclusion patterns...${NC}"

if [ -f "$REPO_ROOT/.gitleaks.toml" ]; then
    # Check for important exclusions
    if grep -q "\.env\.example" "$REPO_ROOT/.gitleaks.toml"; then
        echo -e "  ${GREEN}✓${NC} .env.example files excluded"
    else
        echo -e "  ${YELLOW}⚠${NC} .env.example files not excluded"
    fi

    if grep -q "node_modules" "$REPO_ROOT/.gitleaks.toml"; then
        echo -e "  ${GREEN}✓${NC} node_modules excluded"
    else
        echo -e "  ${YELLOW}⚠${NC} node_modules not excluded"
    fi

    if grep -q "tests/fixtures" "$REPO_ROOT/.gitleaks.toml"; then
        echo -e "  ${GREEN}✓${NC} Test fixtures excluded"
    else
        echo -e "  ${YELLOW}⚠${NC} Test fixtures not excluded"
    fi
fi
echo ""

# =============================================================================
# Check 8: Test Scan (if Gitleaks is available)
# =============================================================================
echo -e "${BLUE}[8/8] Running test scan...${NC}"

if command -v gitleaks &> /dev/null; then
    # Create a temporary test file with a fake secret
    TEST_DIR="$REPO_ROOT/.secret-scan-test"
    mkdir -p "$TEST_DIR"

    # Test 1: Detect a Stripe live key
    echo "STRIPE_SECRET_KEY=sk_live_123456789012345678901234567890abcd" > "$TEST_DIR/test1.txt"

    if gitleaks detect --config="$REPO_ROOT/.gitleaks.toml" --source="$TEST_DIR/test1.txt" --no-git &>/dev/null; then
        echo -e "  ${RED}✗${NC} Failed to detect test secret (Stripe live key)"
        VALIDATION_PASSED=false
    else
        echo -e "  ${GREEN}✓${NC} Correctly detected test secret (Stripe live key)"
    fi

    # Test 2: Ignore .env.example file
    echo "STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here" > "$TEST_DIR/.env.example"

    if gitleaks detect --config="$REPO_ROOT/.gitleaks.toml" --source="$TEST_DIR/.env.example" --no-git &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Correctly ignored .env.example file"
    else
        echo -e "  ${YELLOW}⚠${NC} False positive on .env.example file"
    fi

    # Test 3: Detect Azure storage key
    echo "AZURE_STORAGE_KEY=dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdGtleXRlc3RrZXk9PQ==" > "$TEST_DIR/test3.txt"

    if gitleaks detect --config="$REPO_ROOT/.gitleaks.toml" --source="$TEST_DIR/test3.txt" --no-git &>/dev/null; then
        echo -e "  ${RED}✗${NC} Failed to detect Azure storage key"
    else
        echo -e "  ${GREEN}✓${NC} Correctly detected Azure storage key"
    fi

    # Cleanup
    rm -rf "$TEST_DIR"
else
    echo -e "  ${YELLOW}⚠${NC} Skipped (Gitleaks not installed)"
fi
echo ""

# =============================================================================
# Summary
# =============================================================================
echo -e "${BLUE}==================================================================="
echo "Validation Summary"
echo -e "===================================================================${NC}"
echo ""

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✓ All critical validations passed!${NC}"
    echo ""
    echo "Secret scanning is properly configured and ready to use."
    echo ""
    echo "Next steps:"
    echo "  1. Install git hooks: ./scripts/install-git-hooks.sh"
    echo "  2. Review documentation: docs/security/SECRET-SCANNING-GUIDE.md"
    echo "  3. Test with a PR to ensure workflow runs correctly"
    echo "  4. Configure branch protection rules"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some validations failed!${NC}"
    echo ""
    echo "Please review the errors above and fix the issues."
    echo ""
    echo "For help, see:"
    echo "  - .github/workflows/README-SECRET-SCANNING.md"
    echo "  - docs/security/SECRET-SCANNING-GUIDE.md"
    echo ""
    exit 1
fi
