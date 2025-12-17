#!/bin/bash

# Flamoral Mobile App - Install Missing Dependencies
# This script installs all required npm packages and performs iOS pod install

echo "=================================================="
echo "Flamoral Mobile App - Dependency Installation"
echo "=================================================="
echo ""

# Navigate to mobile app directory
cd "C:/Users/citad/OneDrive/Documents/Dating/Flamoral/apps/mobile-app" || exit 1

echo "Current directory: $(pwd)"
echo ""

# Install npm packages
echo "Step 1: Installing npm packages..."
echo "=================================================="
npm install \
  @react-native-firebase/app@^18.7.0 \
  @react-native-firebase/messaging@^18.7.0 \
  expo-local-authentication@^13.8.0 \
  react-native-keychain@^8.1.2 \
  react-native-config@^1.5.1 \
  babel-plugin-module-resolver@^5.0.0

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ npm packages installed successfully"
else
  echo ""
  echo "✗ npm installation failed"
  exit 1
fi

echo ""
echo "Step 2: Installing iOS pods..."
echo "=================================================="
cd ios || exit 1
pod install

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ iOS pods installed successfully"
else
  echo ""
  echo "✗ Pod installation failed"
  exit 1
fi

cd ..

echo ""
echo "=================================================="
echo "Installation Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Add Firebase configuration files:"
echo "   - android/app/google-services.json"
echo "   - ios/FlavoralApp/GoogleService-Info.plist"
echo ""
echo "2. Update deep linking domains (see SETUP_INSTRUCTIONS.md)"
echo ""
echo "3. Update babel.config.js (see SETUP_INSTRUCTIONS.md)"
echo ""
echo "4. Run the app:"
echo "   npm run android  # For Android"
echo "   npm run ios      # For iOS"
echo ""
