#!/bin/bash

# Mobile App Configuration Setup Script
# This script installs and configures react-native-config and applies all necessary fixes

set -e

echo "======================================"
echo "Flamoral Mobile App Configuration Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# 1. Install react-native-config
echo ""
print_status "Installing react-native-config..."
npm install react-native-config --save

# 2. Install react-native-dotenv for additional support
echo ""
print_status "Installing react-native-dotenv..."
npm install -D react-native-dotenv

# 3. Apply configuration fixes
echo ""
print_status "Applying configuration fixes..."

# Backup original files
echo "Creating backups of original files..."
cp babel.config.js babel.config.js.backup 2>/dev/null || true
cp app.json app.json.backup 2>/dev/null || true
cp android/app/build.gradle android/app/build.gradle.backup 2>/dev/null || true
cp android/app/src/main/AndroidManifest.xml android/app/src/main/AndroidManifest.xml.backup 2>/dev/null || true
cp src/services/api/config.ts src/services/api/config.ts.backup 2>/dev/null || true

# Apply fixes
echo "Applying fixed configurations..."
cp babel.config.js.fixed babel.config.js 2>/dev/null && print_status "babel.config.js updated" || print_warning "babel.config.js.fixed not found"
cp app.json.fixed app.json 2>/dev/null && print_status "app.json updated" || print_warning "app.json.fixed not found"
cp android/app/build.gradle.fixed android/app/build.gradle 2>/dev/null && print_status "build.gradle updated" || print_warning "build.gradle.fixed not found"
cp android/app/src/main/AndroidManifest.xml.fixed android/app/src/main/AndroidManifest.xml 2>/dev/null && print_status "AndroidManifest.xml updated" || print_warning "AndroidManifest.xml.fixed not found"
cp src/services/api/config.fixed.ts src/services/api/config.ts 2>/dev/null && print_status "API config updated" || print_warning "config.fixed.ts not found"

# 4. Update package.json to include react-native-config
echo ""
print_status "Ensuring package.json has react-native-config..."

# 5. Install iOS pods
echo ""
print_status "Installing iOS dependencies..."
cd ios
pod install || print_error "Pod install failed. Please run 'cd ios && pod install' manually"
cd ..

# 6. Clean build artifacts
echo ""
print_status "Cleaning build artifacts..."
rm -rf android/build 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true
rm -rf ios/build 2>/dev/null || true

# 7. Verify .env file exists
echo ""
if [ -f ".env" ]; then
    print_status ".env file exists"
else
    print_warning ".env file not found. Creating from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status ".env file created from .env.example"
    else
        print_error ".env file not found and no .env.example available"
        echo "Please create a .env file with your configuration"
    fi
fi

# 8. Summary
echo ""
echo "======================================"
echo "Configuration Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Review your .env file and update values as needed"
echo "2. Update any Java/Kotlin files that reference com.flamoral.app to com.flamoral"
echo "3. Clean and rebuild:"
echo "   - Android: cd android && ./gradlew clean && cd .."
echo "   - iOS: cd ios && xcodebuild clean && cd .."
echo "4. Run the app:"
echo "   - Android: npm run android"
echo "   - iOS: npm run ios"
echo ""
echo "Backup files created:"
echo "  - babel.config.js.backup"
echo "  - app.json.backup"
echo "  - android/app/build.gradle.backup"
echo "  - android/app/src/main/AndroidManifest.xml.backup"
echo "  - src/services/api/config.ts.backup"
echo ""
print_status "Setup complete!"
