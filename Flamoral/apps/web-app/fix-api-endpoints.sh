#!/bin/bash
# Fix API Endpoints - Remove duplicate /api/ prefix
# VITE_API_URL already includes /api/v1, so we should remove /api/ from all service endpoints

echo "Fixing API endpoints in service files..."

# Find all TypeScript service files
find ./src/services -name "*.ts" -type f | while read -r file; do
    # Replace '/api/ with '/ (removes the /api prefix from all endpoints)
    # This works for both single and double quotes
    sed -i "s|['\"]\/api\/|'/|g" "$file"
    sed -i 's|"/api/|"/|g' "$file"
    sed -i 's|`/api/|`/|g' "$file"
    echo "  Fixed $(basename "$file")"
done

echo ""
echo "Completed! All service endpoints now use paths relative to VITE_API_URL (/api/v1)"
