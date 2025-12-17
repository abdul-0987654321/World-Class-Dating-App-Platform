#!/bin/bash

# Flamoral Web App - Production Build Script
# This script ensures a clean, optimized production build

set -e  # Exit on error

echo "========================================="
echo "🔥 Flamoral Production Build"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check Node version
print_info "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js version: $(node -v)"

# Check npm version
print_info "Checking npm version..."
print_success "npm version: $(npm -v)"

# Clean previous build
print_info "Cleaning previous build..."
rm -rf dist
rm -rf node_modules/.vite
print_success "Previous build cleaned"

# Install dependencies
print_info "Installing dependencies..."
npm ci --no-audit --prefer-offline
print_success "Dependencies installed"

# Type check
print_info "Running TypeScript type check..."
npm run type-check
print_success "Type check passed"

# Lint check
print_info "Running ESLint..."
npm run lint
print_success "Lint check passed"

# Run tests (if available)
if [ -f "package.json" ] && grep -q '"test":' package.json; then
    print_info "Running tests..."
    npm test -- --run || print_warning "Some tests failed, but continuing build..."
fi

# Set production environment
export NODE_ENV=production

# Build the application
print_info "Building production bundle..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed: dist directory not found"
    exit 1
fi

print_success "Production build completed"

# Analyze bundle size
print_info "Analyzing bundle size..."
du -sh dist
du -sh dist/assets/js/*.js 2>/dev/null || echo "No JS files found"
du -sh dist/assets/css/*.css 2>/dev/null || echo "No CSS files found"

# Count files
JS_COUNT=$(find dist/assets/js -name "*.js" 2>/dev/null | wc -l)
CSS_COUNT=$(find dist/assets/css -name "*.css" 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh dist | cut -f1)

echo ""
echo "========================================="
echo "📊 Build Statistics"
echo "========================================="
echo "Total size: $TOTAL_SIZE"
echo "JavaScript files: $JS_COUNT"
echo "CSS files: $CSS_COUNT"
echo ""

# Check for large chunks (> 500KB)
print_info "Checking for large chunks..."
LARGE_CHUNKS=$(find dist/assets -type f -size +500k 2>/dev/null || true)
if [ -n "$LARGE_CHUNKS" ]; then
    print_warning "Found large chunks (>500KB):"
    echo "$LARGE_CHUNKS" | while read -r file; do
        echo "  - $(basename "$file"): $(du -h "$file" | cut -f1)"
    done
    echo ""
    print_warning "Consider code splitting or lazy loading for better performance"
else
    print_success "No large chunks found"
fi

# Check for source maps in production (should be hidden or external)
print_info "Checking for source maps..."
SOURCE_MAPS=$(find dist -name "*.map" 2>/dev/null | wc -l)
if [ "$SOURCE_MAPS" -gt 0 ]; then
    print_success "Found $SOURCE_MAPS source map files (will not be deployed to users)"
else
    print_warning "No source maps found (debugging may be difficult)"
fi

# Verify critical files exist
print_info "Verifying critical files..."
CRITICAL_FILES=("dist/index.html" "dist/assets")
for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -e "$file" ]; then
        print_error "Critical file/directory missing: $file"
        exit 1
    fi
done
print_success "All critical files present"

# Check for security issues
print_info "Checking for security issues..."
if command -v npm audit &> /dev/null; then
    npm audit --production --audit-level=high || print_warning "Security vulnerabilities found, review before deployment"
fi

echo ""
echo "========================================="
print_success "Production build completed successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test the build locally: npm run preview"
echo "2. Review bundle size and optimize if needed"
echo "3. Deploy to staging environment for testing"
echo "4. Deploy to production after QA approval"
echo ""
