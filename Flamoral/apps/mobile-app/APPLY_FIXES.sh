#!/bin/bash

# ============================================================================
# Flamoral Mobile App - Apply Configuration Fixes
# ============================================================================
# This script applies all the corrected configuration files
# Run this from the mobile-app directory
# ============================================================================

set -e  # Exit on error

echo "=========================================="
echo "Applying Flamoral Mobile App Config Fixes"
echo "=========================================="
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Backup function
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo "  📦 Backing up: $file"
        cp "$file" "$file.backup.$(date +%Y%m%d_%H%M%S)"
    fi
}

echo "Step 1: Backing up original files..."
echo "--------------------------------------"
backup_file ".env.example"
backup_file "src/api/client.ts"
backup_file "src/services/api/config.ts"
backup_file "src/config/sslPinning.config.ts"
backup_file "app.json"
backup_file "android/app/build.gradle"
backup_file "android/app/src/main/AndroidManifest.xml"
backup_file "ios/FlavoralApp/Info.plist"
echo ""

echo "Step 2: Applying fixed environment configuration..."
echo "----------------------------------------------------"
if [ -f ".env.example.fixed" ]; then
    cp .env.example.fixed .env.example
    echo "  ✅ Applied .env.example.fixed"
else
    echo "  ⚠️  Warning: .env.example.fixed not found"
fi
echo ""

echo "Step 3: Applying fixed API client..."
echo "------------------------------------"
if [ -f "src/api/client.fixed.ts" ]; then
    cp src/api/client.fixed.ts src/api/client.ts
    echo "  ✅ Applied src/api/client.fixed.ts"
else
    echo "  ⚠️  Warning: src/api/client.fixed.ts not found"
fi
echo ""

echo "Step 4: Applying fixed API config..."
echo "------------------------------------"
if [ -f "src/services/api/config.ts.fixed" ]; then
    cp src/services/api/config.ts.fixed src/services/api/config.ts
    echo "  ✅ Applied src/services/api/config.ts.fixed"
else
    echo "  ⚠️  Warning: src/services/api/config.ts.fixed not found"
fi
echo ""

echo "Step 5: Applying fixed SSL pinning config..."
echo "--------------------------------------------"
if [ -f "src/config/sslPinning.config.ts.fixed" ]; then
    cp src/config/sslPinning.config.ts.fixed src/config/sslPinning.config.ts
    echo "  ✅ Applied src/config/sslPinning.config.ts.fixed"
else
    echo "  ⚠️  Warning: src/config/sslPinning.config.ts.fixed not found"
fi
echo ""

echo "Step 6: Applying fixed app.json..."
echo "----------------------------------"
if [ -f "app.json.corrected" ]; then
    cp app.json.corrected app.json
    echo "  ✅ Applied app.json.corrected"
else
    echo "  ⚠️  Warning: app.json.corrected not found"
fi
echo ""

echo "Step 7: Applying fixed Android build.gradle..."
echo "----------------------------------------------"
if [ -f "android/app/build.gradle.corrected" ]; then
    cp android/app/build.gradle.corrected android/app/build.gradle
    echo "  ✅ Applied android/app/build.gradle.corrected"
else
    echo "  ⚠️  Warning: android/app/build.gradle.corrected not found"
fi
echo ""

echo "Step 8: Applying fixed Android AndroidManifest.xml..."
echo "----------------------------------------------------"
if [ -f "android/app/src/main/AndroidManifest.xml.corrected" ]; then
    cp android/app/src/main/AndroidManifest.xml.corrected android/app/src/main/AndroidManifest.xml
    echo "  ✅ Applied android/app/src/main/AndroidManifest.xml.corrected"
else
    echo "  ⚠️  Warning: android/app/src/main/AndroidManifest.xml.corrected not found"
fi
echo ""

echo "Step 9: Applying fixed iOS Info.plist..."
echo "----------------------------------------"
if [ -f "ios/FlavoralApp/Info.plist.fixed" ]; then
    cp ios/FlavoralApp/Info.plist.fixed ios/FlavoralApp/Info.plist
    echo "  ✅ Applied ios/FlavoralApp/Info.plist.fixed"
else
    echo "  ⚠️  Warning: ios/FlavoralApp/Info.plist.fixed not found"
fi
echo ""

echo "=========================================="
echo "✅ Configuration fixes applied successfully!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "----------"
echo "1. Copy .env.example to .env and add your API keys"
echo "2. Download Firebase config files:"
echo "   - google-services.json → android/app/"
echo "   - GoogleService-Info.plist → ios/FlavoralApp/"
echo "3. Configure keystores for release builds"
echo "4. Generate SSL pins for production"
echo "5. Test the app: npm run ios / npm run android"
echo ""
echo "See MOBILE_CONFIG_FIXES_COMPLETE.md for detailed instructions"
echo ""
