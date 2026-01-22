#!/bin/bash
# EAS Build Post-Install Hook
# Fixes Kotlin version and dependency issues AFTER npm install
# This runs after dependencies are installed but before prebuild/gradle

set -e

echo "🔧 Running EAS Build Post-Install Hook..."

# Navigate to project root
cd "$EAS_BUILD_WORKINGDIR" || cd /home/expo/workingdir/build/apps/mobile-app || cd .

# Step 1: Patch React Native libs.versions.toml to force Kotlin 1.9.24
TOML_PATH="node_modules/react-native/gradle/libs.versions.toml"
if [ -f "$TOML_PATH" ]; then
  echo "📝 Patching $TOML_PATH..."
  sed -i 's/kotlin = "1.9.25"/kotlin = "1.9.24"/g' "$TOML_PATH"
  grep "kotlin = " "$TOML_PATH"
  echo "✅ Patched Kotlin version to 1.9.24"
else
  echo "⚠️ libs.versions.toml not found at $TOML_PATH"
fi

# Also check monorepo root
MONOREPO_TOML="../../node_modules/react-native/gradle/libs.versions.toml"
if [ -f "$MONOREPO_TOML" ]; then
  echo "📝 Patching monorepo $MONOREPO_TOML..."
  sed -i 's/kotlin = "1.9.25"/kotlin = "1.9.24"/g' "$MONOREPO_TOML"
  grep "kotlin = " "$MONOREPO_TOML"
  echo "✅ Patched monorepo Kotlin version to 1.9.24"
fi

# Step 2: Fix Expo SDK compatibility issues
echo "🔧 Fixing Expo SDK compatibility..."
npx expo install --fix || true

echo "✅ EAS Build Post-Install Hook complete"
