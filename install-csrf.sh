#!/bin/bash

# CSRF Protection Installation Script
# Installs dependencies and verifies the CSRF implementation

set -e

echo "==========================================="
echo "CSRF Protection Installation Script"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "$1"
}

# Check if we're in the correct directory
if [ ! -d "backend/services/api-gateway" ]; then
    print_error "Error: Must run from project root directory"
    exit 1
fi

print_success "Found project root directory"

# Install backend dependencies
print_info ""
print_info "Step 1: Installing backend dependencies..."
cd backend/services/api-gateway

if [ -f "package.json" ]; then
    print_info "Installing cookie-parser..."
    npm install cookie-parser @types/cookie-parser
    print_success "Backend dependencies installed"
else
    print_error "package.json not found in api-gateway"
    exit 1
fi

cd ../../..

# Verify file structure
print_info ""
print_info "Step 2: Verifying CSRF files..."

FILES=(
    "backend/services/api-gateway/src/middleware/csrf.middleware.ts"
    "backend/services/api-gateway/src/guards/csrf.guard.ts"
    "backend/services/api-gateway/src/decorators/csrf.decorator.ts"
    "backend/services/api-gateway/src/controllers/csrf.controller.ts"
    "apps/web-app/src/services/csrf.service.ts"
    "apps/web-app/src/hooks/useCsrfToken.ts"
    "apps/web-app/src/components/common/CsrfProtectedForm.tsx"
)

MISSING_FILES=()

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file"
    else
        print_error "$file - MISSING"
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    print_error ""
    print_error "Missing files detected. Please ensure all CSRF files are created."
    exit 1
fi

# Verify documentation
print_info ""
print_info "Step 3: Verifying documentation..."

DOCS=(
    "CSRF_IMPLEMENTATION.md"
    "CSRF_QUICK_START.md"
    "CSRF_MIGRATION_EXAMPLES.md"
    "CSRF_FILES_SUMMARY.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        print_success "$doc"
    else
        print_warning "$doc - MISSING (optional)"
    fi
done

# Check environment configuration
print_info ""
print_info "Step 4: Checking environment configuration..."

if [ -f "backend/services/api-gateway/.env" ]; then
    if grep -q "CORS_ORIGINS" backend/services/api-gateway/.env; then
        print_success "CORS_ORIGINS configured"
    else
        print_warning "CORS_ORIGINS not found in .env"
        print_info "  Add: CORS_ORIGINS=http://localhost:5173,http://localhost:3000"
    fi

    if grep -q "CORS_CREDENTIALS" backend/services/api-gateway/.env; then
        print_success "CORS_CREDENTIALS configured"
    else
        print_warning "CORS_CREDENTIALS not found in .env"
        print_info "  Add: CORS_CREDENTIALS=true"
    fi
else
    print_warning ".env file not found in api-gateway"
    print_info "  Create .env with:"
    print_info "    CORS_ORIGINS=http://localhost:5173,http://localhost:3000"
    print_info "    CORS_CREDENTIALS=true"
    print_info "    NODE_ENV=development"
fi

if [ -f "apps/web-app/.env" ]; then
    if grep -q "VITE_API_URL" apps/web-app/.env; then
        print_success "VITE_API_URL configured"
    else
        print_warning "VITE_API_URL not found in .env"
        print_info "  Add: VITE_API_URL=http://localhost:4000"
    fi
else
    print_warning ".env file not found in web-app"
    print_info "  Create .env with:"
    print_info "    VITE_API_URL=http://localhost:4000"
fi

# Test compilation (optional)
print_info ""
print_info "Step 5: Testing TypeScript compilation (optional)..."
read -p "Test compilation? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd backend/services/api-gateway
    print_info "Building API Gateway..."
    if npm run build; then
        print_success "API Gateway builds successfully"
    else
        print_error "API Gateway build failed"
        print_warning "This might be due to missing dependencies or TypeScript errors"
    fi
    cd ../../..
fi

# Summary
print_info ""
print_info "==========================================="
print_info "Installation Summary"
print_info "==========================================="
print_success "Dependencies installed"
print_success "CSRF files verified"
print_success "Documentation available"
print_info ""

# Next steps
print_info "Next Steps:"
print_info "1. Review environment configuration above"
print_info "2. Start the backend: cd backend/services/api-gateway && npm run start:dev"
print_info "3. Start the frontend: cd apps/web-app && npm run dev"
print_info "4. Test CSRF token endpoint: curl http://localhost:4000/api/v1/csrf/token"
print_info "5. Read documentation: CSRF_QUICK_START.md"
print_info ""

# Testing instructions
print_info "Testing CSRF Protection:"
print_info "------------------------"
print_info "1. Get CSRF token:"
print_info "   curl -c cookies.txt http://localhost:4000/api/v1/csrf/token"
print_info ""
print_info "2. Use token in POST request:"
print_info "   TOKEN=\$(curl -c cookies.txt http://localhost:4000/api/v1/csrf/token | jq -r '.csrfToken')"
print_info "   curl -b cookies.txt -H \"X-CSRF-Token: \$TOKEN\" -H \"Content-Type: application/json\" \\"
print_info "        -d '{\"test\":\"data\"}' http://localhost:4000/api/v1/endpoint"
print_info ""

print_success "CSRF Protection installation complete!"
print_info ""
print_info "For detailed documentation, see:"
print_info "  - CSRF_IMPLEMENTATION.md (comprehensive guide)"
print_info "  - CSRF_QUICK_START.md (quick reference)"
print_info "  - CSRF_MIGRATION_EXAMPLES.md (code examples)"
print_info ""
