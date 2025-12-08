#!/bin/bash
# Bash script to generate package-lock.json files for all backend services

echo "Generating package-lock.json files for backend services..."
echo ""

services=(
    "advertising-service"
    "analytics-service"
    "api-gateway"
    "auth-service"
    "matching-service"
    "media-service"
    "messaging-service"
    "moderation-service"
    "notification-service"
    "payment-service"
    "user-service"
)

success_count=0
fail_count=0
declare -a results

for service in "${services[@]}"; do
    service_path="backend/services/$service"
    echo "Processing: $service"

    if [ -d "$service_path" ]; then
        cd "$service_path" || { echo "  ERROR: Could not cd to $service_path"; results+=("  [FAIL] $service - could not cd"); ((fail_count++)); continue; }

        # Run npm install
        if npm install > /dev/null 2>&1; then
            # Check if package-lock.json was created
            if [ -f "package-lock.json" ]; then
                echo "  SUCCESS: Generated package-lock.json for $service"
                results+=("  [OK] $service")
                ((success_count++))
            else
                echo "  ERROR: package-lock.json not created for $service"
                results+=("  [FAIL] $service - package-lock.json not created")
                ((fail_count++))
            fi
        else
            echo "  ERROR: npm install failed for $service"
            results+=("  [FAIL] $service - npm install failed")
            ((fail_count++))
        fi

        cd ../../.. || exit
    else
        echo "  WARNING: Service directory not found: $service_path"
        results+=("  [SKIP] $service - directory not found")
        ((fail_count++))
    fi
    echo ""
done

echo "======================================================================"
echo "SUMMARY"
echo "======================================================================"
echo "Total services processed: ${#services[@]}"
echo "Successful: $success_count"
echo "Failed: $fail_count"
echo ""
echo "Details:"
printf '%s\n' "${results[@]}"
echo "======================================================================"

if [ $fail_count -eq 0 ]; then
    echo ""
    echo "All package-lock.json files generated successfully!"
else
    echo ""
    echo "Some package-lock.json files failed to generate. Please review the errors above."
fi
