#!/bin/bash
# =============================================================================
# Validate All Terraform Configurations
# Runs init and validate on all environments without applying
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$SCRIPT_DIR/.."

echo "=============================================="
echo "Terraform Validation - All Environments"
echo "=============================================="
echo ""

# Check for Azure providers across all Terraform files (excluding .terraform directories and binaries)
echo "Checking for forbidden Azure providers..."
if grep -rE "(azurerm|azuread|azure)" "$BASE_DIR/environments/" "$BASE_DIR/modules/" \
    --include="*.tf" --include="*.tfvars" 2>/dev/null | \
    grep -v "# Azure" | grep -v "azure-to-aws" | grep -v "\.terraform"; then
    echo "ERROR: Azure providers detected!"
    exit 1
fi
echo "No Azure providers detected"
echo ""

ERRORS=0

for ENV in dev staging prod; do
    ENV_DIR="$BASE_DIR/environments/$ENV"

    if [ ! -d "$ENV_DIR" ]; then
        echo "SKIP: $ENV (directory not found)"
        continue
    fi

    echo "----------------------------------------"
    echo "Validating: $ENV"
    echo "----------------------------------------"

    cd "$ENV_DIR"

    # Init without backend (for validation only)
    echo "  Initializing (no backend)..."
    if terraform init -backend=false > /dev/null 2>&1; then
        echo "  Init: OK"
    else
        echo "  Init: FAILED"
        ERRORS=$((ERRORS + 1))
        continue
    fi

    # Validate
    echo "  Validating..."
    if terraform validate > /dev/null 2>&1; then
        echo "  Validate: OK"
    else
        echo "  Validate: FAILED"
        terraform validate
        ERRORS=$((ERRORS + 1))
    fi

    # Format check
    echo "  Checking format..."
    if terraform fmt -check -recursive > /dev/null 2>&1; then
        echo "  Format: OK"
    else
        echo "  Format: NEEDS FORMATTING"
    fi

    echo ""
done

echo "=============================================="
if [ $ERRORS -eq 0 ]; then
    echo "All environments validated successfully!"
    exit 0
else
    echo "Validation failed with $ERRORS errors"
    exit 1
fi
