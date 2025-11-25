#!/bin/bash

set -e

echo "🚀 ConnectSphere - Development Environment Setup"
echo "=================================================="
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "✓ Node.js $NODE_VERSION"
echo ""

# Check Yarn
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn not found. Please install Yarn first:"
    echo "   npm install -g yarn"
    exit 1
fi

YARN_VERSION=$(yarn -v)
echo "✓ Yarn $YARN_VERSION"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
yarn install
echo "✅ Dependencies installed"
echo ""

# Build shared packages
echo "🏗️  Building shared packages..."
cd packages/shared/types && yarn build && cd ../../..
cd packages/shared/constants && yarn build && cd ../../..
cd packages/shared/utils && yarn build && cd ../../..
cd packages/shared/validators && yarn build && cd ../../..
cd packages/shared/api-client && yarn build && cd ../../..
echo "✅ Shared packages built"
echo ""

# Setup environment files
echo "📝 Setting up environment files..."
if [ ! -f backend/.env ]; then
    if [ -f backend/.env.example ]; then
        cp backend/.env.example backend/.env
        echo "✓ Created backend/.env from template"
    fi
fi

if [ ! -f apps/web/.env ]; then
    echo "REACT_APP_API_URL=http://localhost:3000/api" > apps/web/.env
    echo "REACT_APP_WS_URL=http://localhost:3000" >> apps/web/.env
    echo "✓ Created apps/web/.env"
fi

if [ ! -f apps/mobile/.env ]; then
    echo "API_URL=http://localhost:3000/api" > apps/mobile/.env
    echo "WS_URL=http://localhost:3000" >> apps/mobile/.env
    echo "✓ Created apps/mobile/.env"
fi
echo ""

# Seed database
echo "🌱 Seeding database..."
yarn seed
echo ""

echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "─────────────────────────────────────────"
echo "1. Start services:        docker-compose up -d"
echo "2. Start backend:         yarn dev:backend"
echo "3. Start web:             yarn dev:web"
echo "4. Start mobile:          yarn dev:mobile"
echo ""
echo "Or start everything:     yarn setup:dev"
echo "─────────────────────────────────────────"
echo ""
echo "📚 Documentation: ./docs/"
echo "🐛 Issues: https://github.com/yourusername/connectsphere/issues"
echo ""
