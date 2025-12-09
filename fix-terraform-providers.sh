#!/bin/bash
# Fix script to add missing Terraform provider requirements
# This script adds helm and kubernetes providers to all environment main.tf files

set -e

echo "Fixing Terraform provider requirements..."

# Function to add providers to a terraform file
fix_providers() {
    local file=$1
    local env_name=$2

    echo "Processing $env_name environment: $file"

    # Check if helm provider already exists
    if grep -q '"hashicorp/helm"' "$file"; then
        echo "  - helm provider already exists, skipping"
        return 0
    fi

    # Create temporary file with the fix
    awk '
    BEGIN { inserted = 0 }
    {
        print
        # Insert after the random provider block closes
        if (!inserted && /^    }$/ && prev ~ /version.*3\.6\.0/) {
            print "    helm = {"
            print "      source  = \"hashicorp/helm\""
            print "      version = \"~> 2.12\""
            print "    }"
            print "    kubernetes = {"
            print "      source  = \"hashicorp/kubernetes\""
            print "      version = \"~> 2.24\""
            print "    }"
            inserted = 1
        }
        prev = $0
    }
    ' "$file" > "${file}.tmp"

    # Replace original file
    mv "${file}.tmp" "$file"
    echo "  - Added helm and kubernetes providers"
}

# Fix dev environment
fix_providers "C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/terraform/environments/dev/main.tf" "dev"

# Fix test environment
fix_providers "C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/terraform/environments/test/main.tf" "test"

# Fix prod environment
fix_providers "C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/terraform/environments/prod/main.tf" "prod"

echo ""
echo "Provider fixes complete!"
echo ""
echo "Summary:"
echo "--------"
echo "Added the following providers to all environments:"
echo "  - hashicorp/helm ~> 2.12"
echo "  - hashicorp/kubernetes ~> 2.24"
echo ""
echo "Next steps:"
echo "1. Review the changes in each environment's main.tf"
echo "2. Run 'terraform init' in each environment directory"
echo "3. Run 'terraform validate' to verify the configuration"
