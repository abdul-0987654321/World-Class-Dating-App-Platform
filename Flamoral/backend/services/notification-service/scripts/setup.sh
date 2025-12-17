#!/bin/bash

# Notification Service Setup Script
# This script helps you set up the notification service for the first time

set -e

echo "================================================"
echo "  Flamoral Notification Service Setup"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
    else
        cp .env.example .env
        echo -e "${GREEN}✅ Created new .env from template${NC}"
    fi
else
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env from template${NC}"
fi

echo ""
echo "================================================"
echo "  Installing Dependencies"
echo "================================================"
echo ""

npm install

echo ""
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo ""
echo "================================================"
echo "  Configuration Check"
echo "================================================"
echo ""

# Run validation
npm run validate || true

echo ""
echo "================================================"
echo "  Next Steps"
echo "================================================"
echo ""
echo "1. Configure your .env file with real credentials:"
echo "   - Database connection (PostgreSQL)"
echo "   - Redis connection"
echo "   - Email provider (SendGrid, AWS SES, or SMTP)"
echo "   - Push notification providers (Firebase, APNs)"
echo "   - SMS provider (Twilio) - optional"
echo ""
echo "2. Set up the database:"
echo "   - Ensure PostgreSQL is running"
echo "   - Create database: CREATE DATABASE flamoral_notifications;"
echo "   - Run migrations: npm run migrate"
echo ""
echo "3. Ensure Redis is running:"
echo "   - Test with: redis-cli ping"
echo ""
echo "4. Validate configuration:"
echo "   npm run validate"
echo ""
echo "5. Start the service:"
echo "   npm run dev      # Development mode"
echo "   npm run build    # Build for production"
echo "   npm start        # Run in production"
echo ""
echo "For detailed setup instructions, see:"
echo "  - SERVICE_HEALTH_CHECK.md"
echo "  - FIXES_APPLIED.md"
echo "  - README.md"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
