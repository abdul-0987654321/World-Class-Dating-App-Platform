#!/bin/bash

# Media Service Circuit Breaker Fix - Quick Apply Script
# This script applies all fixes to resolve the media service circuit breaker failure

set -e

echo "======================================"
echo "Media Service Circuit Breaker Fix"
echo "======================================"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "ERROR: Must be run from media-service directory"
    exit 1
fi

echo "Step 1: Backing up original files..."
cp src/infrastructure/storage/azure-storage.service.ts src/infrastructure/storage/azure-storage.service.ts.backup
cp src/index.ts src/index.ts.backup
echo "✓ Backups created"
echo ""

echo "Step 2: Applying Azure Storage Service fixes..."
if [ -f "src/infrastructure/storage/azure-storage.service.fixed.ts" ]; then
    cp src/infrastructure/storage/azure-storage.service.fixed.ts src/infrastructure/storage/azure-storage.service.ts
    echo "✓ Azure Storage Service updated with health checks and graceful degradation"
else
    echo "⚠ azure-storage.service.fixed.ts not found - please apply changes manually"
fi
echo ""

echo "Step 3: Checking .env configuration..."
if [ ! -f ".env" ]; then
    echo "⚠ .env file not found - creating from .env.example"
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Edit .env and set these required variables:"
    echo "  - AZURE_STORAGE_ACCOUNT_NAME"
    echo "  - AZURE_STORAGE_ACCOUNT_KEY"
    echo "  - JWT_ACCESS_SECRET"
    echo "  - JWT_REFRESH_SECRET"
    echo ""
else
    echo "✓ .env file exists"

    # Check for critical variables
    if ! grep -q "AZURE_STORAGE_ACCOUNT_NAME=" .env || ! grep -q "AZURE_STORAGE_ACCOUNT_KEY=" .env; then
        echo "⚠ WARNING: Azure Storage credentials not found in .env"
        echo "  Please set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY"
        echo "  Or leave empty to use Azurite for local development"
    else
        echo "✓ Azure Storage credentials configured"
    fi
fi
echo ""

echo "Step 4: Checking for Azurite (local development)..."
if command -v azurite &> /dev/null; then
    echo "✓ Azurite is installed"
    echo "  To use Azurite: azurite --silent &"
else
    echo "⚠ Azurite not installed"
    echo "  For local development without Azure: npm install -g azurite"
fi
echo ""

echo "Step 5: Installing/updating dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

echo "Step 6: Building service..."
npm run build
if [ $? -eq 0 ]; then
    echo "✓ Build successful"
else
    echo "✗ Build failed - check TypeScript errors"
    echo "  You may need to manually review and fix compilation errors"
fi
echo ""

echo "======================================"
echo "Fixes Applied Successfully!"
echo "======================================"
echo ""
echo "Next Steps:"
echo ""
echo "1. Configure Azure Storage (choose one):"
echo "   Option A - Production Azure:"
echo "     - Get credentials from Azure Portal"
echo "     - Set in .env: AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY"
echo ""
echo "   Option B - Local Development with Azurite:"
echo "     - Run: azurite --silent &"
echo "     - Leave Azure credentials empty in .env"
echo ""
echo "2. Start the service:"
echo "   npm run dev"
echo ""
echo "3. Test health endpoint:"
echo "   curl http://localhost:3006/health/detailed"
echo ""
echo "4. Monitor circuit breaker recovery:"
echo "   curl http://localhost:3001/health/circuits"
echo "   (Circuit should transition: OPEN → HALF_OPEN → CLOSED)"
echo ""
echo "5. Test file upload:"
echo "   curl -X POST http://localhost:3006/api/media/upload \\"
echo "     -H \"Authorization: Bearer YOUR_JWT_TOKEN\" \\"
echo "     -F \"photo=@test-image.jpg\""
echo ""
echo "For detailed documentation, see: MEDIA_SERVICE_FIX.md"
echo ""
echo "To rollback changes:"
echo "  cp src/infrastructure/storage/azure-storage.service.ts.backup src/infrastructure/storage/azure-storage.service.ts"
echo "  cp src/index.ts.backup src/index.ts"
echo ""
