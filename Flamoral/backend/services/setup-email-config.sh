#!/bin/bash

# Email Service Configuration Setup Script
# This script helps configure email services across all backend services
# Usage: ./setup-email-config.sh

set -e

echo "========================================="
echo "Flamoral Email Service Configuration"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to update or add env variable
update_env_var() {
    local file=$1
    local key=$2
    local value=$3

    if [ -f "$file" ]; then
        if grep -q "^${key}=" "$file"; then
            # Update existing
            sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file"
            echo -e "${GREEN}✓${NC} Updated ${key} in ${file}"
        else
            # Add new
            echo "${key}=${value}" >> "$file"
            echo -e "${GREEN}✓${NC} Added ${key} to ${file}"
        fi
    else
        echo -e "${RED}✗${NC} File not found: ${file}"
    fi
}

# Check if running in correct directory
if [ ! -d "user-service" ] && [ ! -d "auth-service" ]; then
    echo -e "${RED}Error: Please run this script from backend/services directory${NC}"
    exit 1
fi

echo "This script will help you configure email services."
echo ""

# Get SendGrid API Key
echo "Do you have a SendGrid API key? (y/n)"
read -r has_sendgrid

if [ "$has_sendgrid" = "y" ] || [ "$has_sendgrid" = "Y" ]; then
    echo "Enter your SendGrid API key (starts with SG.):"
    read -r sendgrid_key

    echo "Enter your sender email (default: noreply@flamoral.com):"
    read -r from_email
    from_email=${from_email:-noreply@flamoral.com}

    echo "Enter your sender name (default: Flamoral):"
    read -r from_name
    from_name=${from_name:-Flamoral}

    echo "Enter your frontend URL (default: http://localhost:3000):"
    read -r frontend_url
    frontend_url=${frontend_url:-http://localhost:3000}

    echo ""
    echo "Updating configuration files..."
    echo ""

    # Update User Service
    if [ -f "user-service/.env" ]; then
        echo "Updating user-service/.env..."
        update_env_var "user-service/.env" "SENDGRID_API_KEY" "$sendgrid_key"
        update_env_var "user-service/.env" "FROM_EMAIL" "$from_email"
        update_env_var "user-service/.env" "FROM_NAME" "$from_name"
        update_env_var "user-service/.env" "WEB_APP_URL" "$frontend_url"
    else
        echo -e "${YELLOW}⚠${NC} user-service/.env not found, creating from example..."
        if [ -f "user-service/.env.example" ]; then
            cp user-service/.env.example user-service/.env
            update_env_var "user-service/.env" "SENDGRID_API_KEY" "$sendgrid_key"
            update_env_var "user-service/.env" "FROM_EMAIL" "$from_email"
            update_env_var "user-service/.env" "FROM_NAME" "$from_name"
            update_env_var "user-service/.env" "WEB_APP_URL" "$frontend_url"
        fi
    fi

    # Update Auth Service
    if [ -f "auth-service/.env" ]; then
        echo "Updating auth-service/.env..."
        update_env_var "auth-service/.env" "SMTP_PASSWORD" "$sendgrid_key"
        update_env_var "auth-service/.env" "EMAIL_FROM" "$from_email"
        update_env_var "auth-service/.env" "FRONTEND_URL" "$frontend_url"
    else
        echo -e "${YELLOW}⚠${NC} auth-service/.env not found"
    fi

    # Update Notification Service
    if [ -f "notification-service/.env" ]; then
        echo "Updating notification-service/.env..."
        update_env_var "notification-service/.env" "SENDGRID_API_KEY" "$sendgrid_key"
        update_env_var "notification-service/.env" "EMAIL_FROM" "$from_email"
        update_env_var "notification-service/.env" "EMAIL_FROM_NAME" "$from_name"
    else
        echo -e "${YELLOW}⚠${NC} notification-service/.env not found, creating from example..."
        if [ -f "notification-service/.env.example" ]; then
            cp notification-service/.env.example notification-service/.env
            update_env_var "notification-service/.env" "SENDGRID_API_KEY" "$sendgrid_key"
            update_env_var "notification-service/.env" "EMAIL_FROM" "$from_email"
            update_env_var "notification-service/.env" "EMAIL_FROM_NAME" "$from_name"
        fi
    fi

    echo ""
    echo -e "${GREEN}✓ Configuration complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify your sender domain in SendGrid"
    echo "2. Add DNS records (SPF, DKIM) for email authentication"
    echo "3. Test email functionality with: npm run test:email"
    echo ""

else
    echo ""
    echo "For local development without SendGrid:"
    echo "1. Install Mailhog: brew install mailhog (macOS) or see docs for other OS"
    echo "2. Run Mailhog: mailhog"
    echo "3. Access web UI: http://localhost:8025"
    echo ""
    echo "Configuring for SMTP/Mailhog..."

    # Update User Service for development
    if [ -f "user-service/.env" ]; then
        update_env_var "user-service/.env" "SENDGRID_API_KEY" ""
        update_env_var "user-service/.env" "SMTP_HOST" "localhost"
        update_env_var "user-service/.env" "SMTP_PORT" "1025"
        update_env_var "user-service/.env" "FROM_EMAIL" "noreply@flamoral.local"
        update_env_var "user-service/.env" "WEB_APP_URL" "http://localhost:3000"
    fi

    # Update Auth Service for development
    if [ -f "auth-service/.env" ]; then
        update_env_var "auth-service/.env" "SMTP_HOST" "localhost"
        update_env_var "auth-service/.env" "SMTP_PORT" "1025"
        update_env_var "auth-service/.env" "SMTP_USER" ""
        update_env_var "auth-service/.env" "SMTP_PASSWORD" "development-disabled"
        update_env_var "auth-service/.env" "EMAIL_FROM" "noreply@flamoral.local"
        update_env_var "auth-service/.env" "FRONTEND_URL" "http://localhost:3000"
    fi

    echo ""
    echo -e "${GREEN}✓ Development configuration complete!${NC}"
    echo "Start Mailhog and restart your services."
fi

echo ""
echo "Configuration Summary:"
echo "---------------------"
echo "User Service:         backend/services/user-service/.env"
echo "Auth Service:         backend/services/auth-service/.env"
echo "Notification Service: backend/services/notification-service/.env"
echo ""
echo "For detailed setup instructions, see: EMAIL_SERVICE_SETUP_GUIDE.md"
echo ""
