#!/bin/bash

# Verification script for cost management implementation
echo "=========================================="
echo "Cost Management Implementation Verification"
echo "=========================================="
echo ""

SUCCESS=0
FAILED=0
BASE_DIR="C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform"

check_file() {
    local file="$1"
    local description="$2"
    
    if [[ -f "$file" ]]; then
        local lines=$(wc -l < "$file")
        echo "✓ $description ($lines lines)"
        ((SUCCESS++))
    else
        echo "✗ MISSING: $description"
        echo "  Expected: $file"
        ((FAILED++))
    fi
}

echo "Checking Terraform Module Files..."
echo "-----------------------------------"
check_file "$BASE_DIR/infrastructure/terraform/modules/cost-management/main.tf" "Module main.tf"
check_file "$BASE_DIR/infrastructure/terraform/modules/cost-management/variables.tf" "Module variables.tf"
check_file "$BASE_DIR/infrastructure/terraform/modules/cost-management/outputs.tf" "Module outputs.tf"
check_file "$BASE_DIR/infrastructure/terraform/modules/cost-management/README.md" "Module README"
check_file "$BASE_DIR/infrastructure/terraform/modules/cost-management/DEPLOYMENT.md" "Module Deployment Guide"
echo ""

echo "Checking Azure Configuration Files..."
echo "-------------------------------------"
check_file "$BASE_DIR/infrastructure/azure/budget-alerts.json" "Budget Alerts ARM Template"
check_file "$BASE_DIR/infrastructure/azure/cost-tags-policy.json" "Cost Tags Policy"
check_file "$BASE_DIR/infrastructure/azure/setup-cost-export.sh" "Cost Export Setup Script"
check_file "$BASE_DIR/infrastructure/azure/README-COST-MANAGEMENT.md" "Azure Cost Management README"
echo ""

echo "Checking Scripts..."
echo "-------------------"
check_file "$BASE_DIR/scripts/check-cost-recommendations.sh" "Cost Recommendations Script"
echo ""

echo "Checking Documentation..."
echo "-------------------------"
check_file "$BASE_DIR/COST_MANAGEMENT_GUIDE.md" "Cost Management Guide"
check_file "$BASE_DIR/COST_MANAGEMENT_IMPLEMENTATION_SUMMARY.md" "Implementation Summary"
check_file "$BASE_DIR/infrastructure/cost-control/QUICK_START.md" "Quick Start Guide"
check_file "$BASE_DIR/infrastructure/FILE_MANIFEST.md" "File Manifest"
echo ""

echo "Checking Updated Files..."
echo "-------------------------"
check_file "$BASE_DIR/infrastructure/terraform/variables.tf" "Terraform variables.tf (updated)"
check_file "$BASE_DIR/infrastructure/terraform/main.tf" "Terraform main.tf (updated)"
check_file "$BASE_DIR/infrastructure/terraform/environments/prod/terraform.tfvars" "Production tfvars (updated)"
echo ""

echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo "✓ Files found: $SUCCESS"
echo "✗ Files missing: $FAILED"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo "🎉 All cost management files created successfully!"
    echo ""
    echo "Next Steps:"
    echo "1. cd infrastructure/terraform/environments/prod"
    echo "2. terraform apply -target=module.cost_management"
    echo "3. cd ../../../scripts"
    echo "4. ./check-cost-recommendations.sh -o markdown -f report.md"
    echo ""
    exit 0
else
    echo "⚠️  Some files are missing. Please review the implementation."
    exit 1
fi
