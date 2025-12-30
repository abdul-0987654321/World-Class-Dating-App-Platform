#!/bin/bash

##############################################################################
# Flamoral Dating Platform - Development Seed Data Script
# Purpose: Seed database with development and testing data
# Usage: ./seed-dev.sh [--force|--minimal|--full]
##############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$DATABASE_DIR/.env"

# Seed mode
SEED_MODE="${1:-full}"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${MAGENTA}Flamoral Dating Platform - Development Seed Script${NC}          ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "\n${BLUE}▶ $1${NC}"
    echo -e "${BLUE}$(printf '─%.0s' {1..70})${NC}"
}

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
    echo -e "${CYAN}ℹ $1${NC}"
}

##############################################################################
# Environment Setup
##############################################################################

check_environment() {
    print_section "Checking Environment"

    # Check if .env exists
    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env file not found at $ENV_FILE"
        exit 1
    fi

    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a

    # Verify database name contains dev/test
    if [[ ! "$DB_NAME" =~ (dev|test|local) ]]; then
        print_error "Safety check failed!"
        print_warning "Seeding is only allowed on dev/test/local databases"
        print_info "Current database: $DB_NAME"
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " confirmation
        if [ "$confirmation" != "yes" ]; then
            print_info "Seeding cancelled"
            exit 0
        fi
    fi

    print_success "Environment configured"
    print_info "Database: ${DB_NAME} at ${DB_HOST}:${DB_PORT}"
}

##############################################################################
# Database Connection Check
##############################################################################

check_database_connection() {
    print_section "Checking Database Connection"

    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        print_success "Database connection successful"
    else
        print_error "Cannot connect to database"
        exit 1
    fi
}

##############################################################################
# Seeding Functions
##############################################################################

run_knex_seeds() {
    print_section "Running Knex Seed Files"

    cd "$DATABASE_DIR"

    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install --silent
    fi

    case $SEED_MODE in
        --minimal)
            print_info "Running minimal seeds (basic data only)..."
            npm run seed:run
            print_success "Minimal seeds completed"
            ;;
        --full|--force)
            print_info "Running full seeds (comprehensive test data)..."
            npm run seed:run
            print_success "Full seeds completed"
            ;;
        *)
            npm run seed:run
            print_success "Seeds completed"
            ;;
    esac
}

create_test_users() {
    print_section "Creating Test Users"

    local sql="
-- Test Users for Development
INSERT INTO users (email, password_hash, status, subscription_tier, is_email_verified, is_phone_verified)
VALUES
  ('admin@flamoral.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', 'ultra', true, true),
  ('test1@flamoral.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', 'free', true, true),
  ('test2@flamoral.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', 'basic', true, true),
  ('test3@flamoral.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', 'mid', true, true),
  ('premium@flamoral.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', 'ultra', true, true)
ON CONFLICT (email) DO NOTHING;
"

    echo "$sql" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q

    print_success "Test users created"
    print_info "Test account credentials:"
    echo "  Email: test1@flamoral.com"
    echo "  Password: password"
    echo ""
    echo "  Email: admin@flamoral.com (Ultra tier)"
    echo "  Password: password"
}

seed_subscription_plans() {
    print_section "Seeding Subscription Plans"

    local sql="
-- Subscription Plans
INSERT INTO subscription_plans (name, tier, display_name, description, price_monthly, price_yearly,
  daily_swipes, daily_super_likes, monthly_boosts, is_active, sort_order, features)
VALUES
  ('free', 'free', 'Free', 'Get started with basic features', 0.00, 0.00, 50, 1, 0, true, 1,
   '{\"unlimited_likes\": false, \"see_who_likes_you\": false, \"rewind_enabled\": false, \"unlimited_super_likes\": false,
     \"profile_boost\": false, \"advanced_filters\": false, \"incognito_mode\": false, \"passport_mode\": false,
     \"no_ads\": false, \"priority_support\": false, \"read_receipts\": false, \"see_who_viewed\": false}'::jsonb),

  ('basic', 'basic', 'Flamoral Basic', 'See who likes you and more', 9.99, 79.99, -1, 5, 1, true, 2,
   '{\"unlimited_likes\": true, \"see_who_likes_you\": true, \"rewind_enabled\": true, \"unlimited_super_likes\": false,
     \"profile_boost\": false, \"advanced_filters\": false, \"incognito_mode\": false, \"passport_mode\": false,
     \"no_ads\": true, \"priority_support\": false, \"read_receipts\": false, \"see_who_viewed\": false}'::jsonb),

  ('mid', 'mid', 'Flamoral Mid', 'Premium features unlocked', 19.99, 159.99, -1, -1, 2, true, 3,
   '{\"unlimited_likes\": true, \"see_who_likes_you\": true, \"rewind_enabled\": true, \"unlimited_super_likes\": true,
     \"profile_boost\": true, \"advanced_filters\": true, \"incognito_mode\": false, \"passport_mode\": false,
     \"no_ads\": true, \"priority_support\": true, \"read_receipts\": true, \"see_who_viewed\": true}'::jsonb),

  ('ultra', 'ultra', 'Flamoral Ultra', 'All features, maximum visibility', 34.99, 279.99, -1, -1, 5, true, 4,
   '{\"unlimited_likes\": true, \"see_who_likes_you\": true, \"rewind_enabled\": true, \"unlimited_super_likes\": true,
     \"profile_boost\": true, \"advanced_filters\": true, \"incognito_mode\": true, \"passport_mode\": true,
     \"no_ads\": true, \"priority_support\": true, \"read_receipts\": true, \"see_who_viewed\": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;
"

    echo "$sql" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q

    print_success "Subscription plans seeded"
}

seed_coin_packages() {
    print_section "Seeding Coin Packages"

    local sql="
-- Coin Packages
INSERT INTO coin_packages (name, sku, coins, bonus_coins, price, currency, is_popular, is_active, sort_order, description)
VALUES
  ('10 Coins', 'coins_10', 10, 0, 4.99, 'USD', false, true, 1, 'Small coin pack'),
  ('25 Coins', 'coins_25', 25, 2, 9.99, 'USD', false, true, 2, 'Get 2 bonus coins'),
  ('50 Coins', 'coins_50', 50, 5, 17.99, 'USD', true, true, 3, 'Popular - Get 5 bonus coins'),
  ('100 Coins', 'coins_100', 100, 15, 29.99, 'USD', false, true, 4, 'Best value - Get 15 bonus coins'),
  ('250 Coins', 'coins_250', 250, 50, 59.99, 'USD', false, true, 5, 'Ultimate pack - Get 50 bonus coins')
ON CONFLICT (sku) DO NOTHING;
"

    echo "$sql" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q

    print_success "Coin packages seeded"
}

seed_boost_products() {
    print_section "Seeding Boost Products"

    local sql="
-- Boost Products
INSERT INTO boost_products (name, sku, description, type, duration_minutes, coin_cost, usd_price,
  visibility_multiplier, is_active, is_featured, sort_order)
VALUES
  ('Standard Boost', 'boost_standard', 'Be a top profile in your area for 30 minutes', 'standard', 30, 5, 4.99, 10, true, false, 1),
  ('Prime Time Boost', 'boost_prime', 'Extended boost during peak hours for 60 minutes', 'prime_time', 60, 10, 8.99, 15, true, true, 2),
  ('Spotlight', 'boost_spotlight', 'Maximum visibility for 60 minutes', 'spotlight', 60, 15, 12.99, 20, true, true, 3)
ON CONFLICT (sku) DO NOTHING;
"

    echo "$sql" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q

    print_success "Boost products seeded"
}

seed_prompts() {
    print_section "Seeding Profile Prompts"

    local sql="
-- Profile Prompts
INSERT INTO prompts (question, category, is_active, display_order)
VALUES
  ('My ideal Sunday looks like...', 'lifestyle', true, 1),
  ('I geek out on...', 'personality', true, 2),
  ('A perfect first date would be...', 'fun', true, 3),
  ('The way to win me over is...', 'personality', true, 4),
  ('I''m looking for someone who...', 'personality', true, 5),
  ('My greatest adventure was...', 'lifestyle', true, 6),
  ('I spend most of my free time...', 'lifestyle', true, 7),
  ('My love language is...', 'personality', true, 8),
  ('You should NOT date me if...', 'fun', true, 9),
  ('I''m weirdly attracted to...', 'fun', true, 10),
  ('The best way to ask me out is by...', 'fun', true, 11),
  ('Two truths and a lie...', 'fun', true, 12),
  ('My simple pleasures...', 'lifestyle', true, 13),
  ('I''m overly competitive about...', 'personality', true, 14),
  ('The key to my heart is...', 'personality', true, 15)
ON CONFLICT DO NOTHING;
"

    echo "$sql" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q

    print_success "Profile prompts seeded"
}

seed_notification_templates() {
    print_section "Seeding Notification Templates"

    local sql="
-- Notification Templates
INSERT INTO notification_templates (name, code, type, category, subject, title, body, is_active, priority, variables)
VALUES
  ('New Match', 'NEW_MATCH', 'push', 'match', 'New Match!', 'It''s a Match! 🎉',
   'You and {{matchName}} liked each other!', true, 10,
   '{\"matchName\": \"string\", \"matchPhoto\": \"string\"}'::jsonb),

  ('New Message', 'NEW_MESSAGE', 'push', 'message', 'New Message', 'New message from {{senderName}}',
   '{{messagePreview}}', true, 10,
   '{\"senderName\": \"string\", \"messagePreview\": \"string\"}'::jsonb),

  ('New Like', 'NEW_LIKE', 'push', 'like', 'Someone likes you!', 'Someone likes you! 💖',
   'See who liked your profile', true, 5, '{}'::jsonb),

  ('Super Like', 'NEW_SUPER_LIKE', 'push', 'super_like', 'You got a Super Like!', 'Someone Super Liked you! ⭐',
   '{{userName}} thinks you''re amazing!', true, 8,
   '{\"userName\": \"string\"}'::jsonb),

  ('Boost Expiring', 'BOOST_EXPIRING', 'push', 'boost', 'Boost Expiring Soon', 'Your boost expires in 5 minutes',
   'Your profile boost will end soon', true, 3, '{}'::jsonb),

  ('Boost Results', 'BOOST_RESULTS', 'push', 'boost', 'Boost Results', 'Your boost is complete! 🚀',
   'You got {{views}} profile views and {{likes}} new likes!', true, 3,
   '{\"views\": \"number\", \"likes\": \"number\"}'::jsonb),

  ('Welcome Email', 'WELCOME_EMAIL', 'email', 'system', 'Welcome to Flamoral!', 'Welcome to Flamoral Dating!',
   'Thanks for joining our community. Let''s set up your profile!', true, 10,
   '{\"userName\": \"string\"}'::jsonb)
ON CONFLICT (code) DO NOTHING;
"

    echo "$sql" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q

    print_success "Notification templates seeded"
}

display_seed_summary() {
    print_section "Seed Data Summary"

    echo ""
    print_info "Development data has been seeded successfully!"
    echo ""
    echo "Test Credentials:"
    echo "  📧 Email: test1@flamoral.com"
    echo "  🔑 Password: password"
    echo ""
    echo "  📧 Email: admin@flamoral.com (Ultra tier)"
    echo "  🔑 Password: password"
    echo ""
    print_info "You can now start development and testing!"
    echo ""
}

##############################################################################
# Main Execution
##############################################################################

main() {
    print_header

    # Parse arguments
    case $SEED_MODE in
        --help|-h)
            echo "Usage: $0 [--minimal|--full|--force|--help]"
            echo ""
            echo "Options:"
            echo "  (no args)    Run all seed files"
            echo "  --minimal    Run minimal seeds only"
            echo "  --full       Run comprehensive seeds (default)"
            echo "  --force      Force seeding (same as --full)"
            echo "  --help       Show this help message"
            exit 0
            ;;
    esac

    check_environment
    check_database_connection

    # Run seeds
    run_knex_seeds

    # Additional seeding
    print_section "Seeding Additional Data"

    seed_subscription_plans
    seed_coin_packages
    seed_boost_products
    seed_prompts
    seed_notification_templates

    # Summary
    display_seed_summary
}

# Run main function
main "$@"
