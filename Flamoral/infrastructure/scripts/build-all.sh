#!/bin/bash

set -e

echo "🏗️  Building all packages..."
echo ""

# Build shared packages first (they're dependencies)
echo "📦 Building shared packages..."
cd packages/shared/types && npm run build && cd ../../..
cd packages/shared/constants && npm run build && cd ../../..
cd packages/shared/utils && npm run build && cd ../../..
cd packages/shared/validators && npm run build && cd ../../..
cd packages/shared/api-client && npm run build && cd ../../..

echo "✅ Shared packages built successfully!"
echo ""

# Build backend
echo "🔧 Building backend..."
cd backend && npm run build && cd ..
echo "✅ Backend built successfully!"
echo ""

# Build web frontend
echo "🌐 Building web frontend..."
cd apps/web && npm run build && cd ../..
echo "✅ Web frontend built successfully!"
echo ""

# Note: Mobile apps are built separately with native tools
echo "📱 Mobile app builds:"
echo "   iOS:     cd apps/mobile && npm run ios -- --configuration Release"
echo "   Android: cd apps/mobile && npm run android -- --variant=release"
echo ""

echo "✨ All builds completed successfully!"
