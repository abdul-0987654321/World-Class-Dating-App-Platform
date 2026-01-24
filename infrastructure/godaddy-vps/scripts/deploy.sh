#!/bin/bash
#===============================================================================
# Flamoral Deployment Script
# Deploys the latest code to the production server
#
# Usage:
#   ./deploy.sh              # Full deployment
#   ./deploy.sh --backend    # Backend only
#   ./deploy.sh --frontend   # Frontend only
#   ./deploy.sh --quick      # Skip build (restart services only)
#
# Author: Flamoral DevOps Team
# Version: 1.0.0
#===============================================================================

set -euo pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
APP_DIR="/home/flamoral/app"
BACKEND_DIR="${APP_DIR}/backend"
FRONTEND_DIR="${APP_DIR}/frontend"
LOG_DIR="/var/log/flamoral"
DEPLOY_LOG="${LOG_DIR}/deploy.log"
ECOSYSTEM_CONFIG="${APP_DIR}/infrastructure/godaddy-vps/pm2/ecosystem.config.js"
GIT_BRANCH="${GIT_BRANCH:-main}"
DEPLOY_USER="flamoral"

# Notification webhook (optional)
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log() {
    echo -e "[$(timestamp)] $1" | tee -a "${DEPLOY_LOG}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log "[INFO] $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log "[SUCCESS] $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "[WARNING] $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "[ERROR] $1"
}

log_step() {
    echo -e "\n${CYAN}=== $1 ===${NC}"
    log "=== $1 ==="
}

# Send notification to Slack
notify_slack() {
    local message="$1"
    local color="${2:-good}"

    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        curl -s -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"text\": \"${message}\",
                    \"footer\": \"Flamoral Deployment\",
                    \"ts\": $(date +%s)
                }]
            }" > /dev/null 2>&1 || true
    fi
}

# Send notification to Discord
notify_discord() {
    local message="$1"
    local color="${2:-3066993}"  # Green default

    if [[ -n "${DISCORD_WEBHOOK_URL}" ]]; then
        curl -s -X POST "${DISCORD_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{
                \"embeds\": [{
                    \"description\": \"${message}\",
                    \"color\": ${color},
                    \"footer\": {\"text\": \"Flamoral Deployment\"},
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                }]
            }" > /dev/null 2>&1 || true
    fi
}

notify() {
    local message="$1"
    local type="${2:-success}"

    case "${type}" in
        success)
            notify_slack "${message}" "good"
            notify_discord "${message}" "3066993"
            ;;
        warning)
            notify_slack "${message}" "warning"
            notify_discord "${message}" "16776960"
            ;;
        error)
            notify_slack "${message}" "danger"
            notify_discord "${message}" "15158332"
            ;;
    esac
}

# Check if user is flamoral
check_user() {
    if [[ "$(whoami)" != "${DEPLOY_USER}" ]]; then
        log_error "This script must be run as ${DEPLOY_USER} user"
        log_info "Run: sudo -u ${DEPLOY_USER} $0"
        exit 1
    fi
}

# Load NVM
load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
}

#-------------------------------------------------------------------------------
# Pre-deployment Checks
#-------------------------------------------------------------------------------
pre_deploy_checks() {
    log_step "Running pre-deployment checks"

    # Check disk space
    local available_space=$(df -BG "${APP_DIR}" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ ${available_space} -lt 5 ]]; then
        log_error "Insufficient disk space: ${available_space}GB available (minimum 5GB required)"
        exit 1
    fi
    log_info "Disk space: ${available_space}GB available"

    # Check if services are running
    if pm2 list 2>/dev/null | grep -q "online"; then
        log_info "PM2 services are running"
    else
        log_warning "No PM2 services are currently running"
    fi

    # Check database connectivity
    if PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h localhost -U flamoral -d flamoral_production -c '\q' 2>/dev/null; then
        log_info "Database connection successful"
    else
        log_warning "Could not verify database connection"
    fi

    # Check Redis connectivity
    if redis-cli -a "${REDIS_PASSWORD:-}" ping 2>/dev/null | grep -q "PONG"; then
        log_info "Redis connection successful"
    else
        log_warning "Could not verify Redis connection"
    fi

    log_success "Pre-deployment checks passed"
}

#-------------------------------------------------------------------------------
# Backup Before Deploy
#-------------------------------------------------------------------------------
create_backup() {
    log_step "Creating pre-deployment backup"

    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="/var/backups/flamoral/pre-deploy-${backup_timestamp}"

    mkdir -p "${backup_dir}"

    # Backup current code (quick tar of important files)
    log_info "Backing up current code..."
    tar -czf "${backup_dir}/code-backup.tar.gz" \
        -C "${APP_DIR}" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='build' \
        . 2>/dev/null || true

    # Backup PM2 state
    log_info "Backing up PM2 state..."
    pm2 save 2>/dev/null || true
    cp -r ~/.pm2/dump.pm2 "${backup_dir}/" 2>/dev/null || true

    # Create rollback script
    cat > "${backup_dir}/rollback.sh" << EOF
#!/bin/bash
# Rollback script for deployment ${backup_timestamp}
echo "Rolling back to pre-deployment state..."
cd "${APP_DIR}"
tar -xzf "${backup_dir}/code-backup.tar.gz" -C "${APP_DIR}"
pm2 reload ${ECOSYSTEM_CONFIG}
echo "Rollback complete"
EOF
    chmod +x "${backup_dir}/rollback.sh"

    log_success "Backup created at ${backup_dir}"
    echo "${backup_dir}" > /tmp/last_backup_dir
}

#-------------------------------------------------------------------------------
# Pull Latest Code
#-------------------------------------------------------------------------------
pull_code() {
    log_step "Pulling latest code from Git"

    cd "${APP_DIR}"

    # Stash any local changes
    if [[ -n "$(git status --porcelain)" ]]; then
        log_warning "Stashing local changes..."
        git stash push -m "Auto-stash before deployment $(date)"
    fi

    # Fetch and checkout
    log_info "Fetching from origin..."
    git fetch origin

    log_info "Checking out ${GIT_BRANCH}..."
    git checkout "${GIT_BRANCH}"

    log_info "Pulling latest changes..."
    git pull origin "${GIT_BRANCH}"

    # Get commit info
    local commit_hash=$(git rev-parse --short HEAD)
    local commit_message=$(git log -1 --pretty=%B | head -n1)
    log_success "Updated to commit ${commit_hash}: ${commit_message}"

    echo "${commit_hash}" > /tmp/deploy_commit
}

#-------------------------------------------------------------------------------
# Install Dependencies
#-------------------------------------------------------------------------------
install_dependencies() {
    log_step "Installing dependencies"

    cd "${APP_DIR}"

    # Install root dependencies
    log_info "Installing root dependencies..."
    npm ci --production=false

    # Install backend dependencies
    if [[ -d "${BACKEND_DIR}" ]]; then
        log_info "Installing backend dependencies..."
        cd "${BACKEND_DIR}"
        npm ci --production=false
    fi

    # Install frontend dependencies
    if [[ -d "${FRONTEND_DIR}" ]]; then
        log_info "Installing frontend dependencies..."
        cd "${FRONTEND_DIR}"
        npm ci --production=false
    fi

    log_success "Dependencies installed"
}

#-------------------------------------------------------------------------------
# Build Backend
#-------------------------------------------------------------------------------
build_backend() {
    log_step "Building backend"

    cd "${BACKEND_DIR}"

    log_info "Compiling TypeScript..."
    npm run build

    log_success "Backend built successfully"
}

#-------------------------------------------------------------------------------
# Build Frontend
#-------------------------------------------------------------------------------
build_frontend() {
    log_step "Building frontend"

    cd "${FRONTEND_DIR}"

    log_info "Building production bundle..."
    npm run build

    # Verify build output
    if [[ -d "dist" ]]; then
        local bundle_size=$(du -sh dist | cut -f1)
        log_success "Frontend built successfully (${bundle_size})"
    else
        log_error "Frontend build failed - dist directory not found"
        exit 1
    fi
}

#-------------------------------------------------------------------------------
# Run Database Migrations
#-------------------------------------------------------------------------------
run_migrations() {
    log_step "Running database migrations"

    cd "${BACKEND_DIR}"

    # Check if migration script exists
    if npm run --silent | grep -q "migrate"; then
        log_info "Running migrations..."
        npm run migrate

        # Run seeds in development/staging only
        if [[ "${NODE_ENV:-production}" != "production" ]]; then
            if npm run --silent | grep -q "seed"; then
                log_info "Running seeds..."
                npm run seed
            fi
        fi

        log_success "Migrations completed"
    else
        log_warning "No migration script found, skipping..."
    fi
}

#-------------------------------------------------------------------------------
# Restart Services
#-------------------------------------------------------------------------------
restart_services() {
    log_step "Restarting PM2 services"

    # Reload all services with zero-downtime
    log_info "Reloading services..."
    pm2 reload "${ECOSYSTEM_CONFIG}" --update-env

    # Wait for services to stabilize
    log_info "Waiting for services to stabilize (15s)..."
    sleep 15

    # Check service status
    pm2 list

    log_success "Services restarted"
}

#-------------------------------------------------------------------------------
# Health Checks
#-------------------------------------------------------------------------------
run_health_checks() {
    log_step "Running health checks"

    local health_check_passed=true
    local max_retries=5
    local retry_delay=5

    # Define endpoints to check
    declare -A endpoints=(
        ["Frontend"]="http://localhost:5173/health"
        ["API Gateway"]="http://localhost:4000/health"
        ["WebSocket"]="http://localhost:5000/health"
    )

    for name in "${!endpoints[@]}"; do
        local url="${endpoints[$name]}"
        local success=false

        for ((i=1; i<=max_retries; i++)); do
            log_info "Checking ${name} (attempt ${i}/${max_retries})..."

            if curl -sf "${url}" > /dev/null 2>&1; then
                log_success "${name} is healthy"
                success=true
                break
            fi

            if [[ ${i} -lt ${max_retries} ]]; then
                sleep ${retry_delay}
            fi
        done

        if [[ "${success}" != "true" ]]; then
            log_error "${name} health check failed"
            health_check_passed=false
        fi
    done

    # Check PM2 process status
    log_info "Checking PM2 process status..."
    local errored_processes=$(pm2 jlist | jq -r '.[] | select(.pm2_env.status != "online") | .name' 2>/dev/null || echo "")

    if [[ -n "${errored_processes}" ]]; then
        log_error "Some processes are not online:"
        echo "${errored_processes}"
        health_check_passed=false
    fi

    if [[ "${health_check_passed}" == "true" ]]; then
        log_success "All health checks passed"
        return 0
    else
        log_error "Some health checks failed"
        return 1
    fi
}

#-------------------------------------------------------------------------------
# Rollback
#-------------------------------------------------------------------------------
rollback() {
    log_step "Rolling back deployment"

    if [[ -f /tmp/last_backup_dir ]]; then
        local backup_dir=$(cat /tmp/last_backup_dir)
        if [[ -f "${backup_dir}/rollback.sh" ]]; then
            log_info "Executing rollback script..."
            bash "${backup_dir}/rollback.sh"
            log_success "Rollback completed"
            notify "Deployment rolled back to previous version" "warning"
        else
            log_error "Rollback script not found"
            exit 1
        fi
    else
        log_error "No backup found for rollback"
        exit 1
    fi
}

#-------------------------------------------------------------------------------
# Cleanup
#-------------------------------------------------------------------------------
cleanup() {
    log_step "Cleaning up"

    # Clear npm cache
    npm cache clean --force 2>/dev/null || true

    # Remove old logs (keep last 7 days)
    find "${LOG_DIR}" -name "*.log" -mtime +7 -delete 2>/dev/null || true

    # Remove old backups (keep last 5)
    ls -dt /var/backups/flamoral/pre-deploy-* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true

    log_success "Cleanup completed"
}

#-------------------------------------------------------------------------------
# Main Deployment
#-------------------------------------------------------------------------------
deploy_full() {
    local start_time=$(date +%s)
    local commit_hash=""

    log_step "Starting full deployment"
    notify "Starting deployment to production" "warning"

    # Run deployment steps
    pre_deploy_checks
    create_backup
    pull_code
    install_dependencies
    build_backend
    build_frontend
    run_migrations
    restart_services

    # Health checks
    if ! run_health_checks; then
        log_error "Health checks failed, initiating rollback..."
        rollback
        notify "Deployment failed - rolled back to previous version" "error"
        exit 1
    fi

    cleanup

    # Calculate deployment time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Get deployed commit
    if [[ -f /tmp/deploy_commit ]]; then
        commit_hash=$(cat /tmp/deploy_commit)
    fi

    log_success "Deployment completed successfully in ${duration} seconds"
    notify "Deployment successful! Commit: ${commit_hash}, Duration: ${duration}s" "success"
}

deploy_backend_only() {
    log_step "Deploying backend only"
    notify "Starting backend deployment" "warning"

    pre_deploy_checks
    create_backup
    pull_code
    install_dependencies
    build_backend
    run_migrations

    # Restart only backend services
    pm2 reload "${ECOSYSTEM_CONFIG}" --only api-gateway,auth-service,user-service,matching-service,messaging-service

    if ! run_health_checks; then
        rollback
        exit 1
    fi

    cleanup
    log_success "Backend deployment completed"
    notify "Backend deployment successful!" "success"
}

deploy_frontend_only() {
    log_step "Deploying frontend only"
    notify "Starting frontend deployment" "warning"

    pre_deploy_checks
    create_backup
    pull_code
    install_dependencies
    build_frontend

    # Restart only frontend
    pm2 reload "${ECOSYSTEM_CONFIG}" --only frontend

    cleanup
    log_success "Frontend deployment completed"
    notify "Frontend deployment successful!" "success"
}

deploy_quick() {
    log_step "Quick deployment (restart only)"

    restart_services

    if ! run_health_checks; then
        log_error "Health checks failed after restart"
        exit 1
    fi

    log_success "Quick deployment completed"
}

#-------------------------------------------------------------------------------
# Command Line Arguments
#-------------------------------------------------------------------------------
show_help() {
    cat << EOF
Flamoral Deployment Script

Usage: $0 [OPTIONS]

Options:
    --backend       Deploy backend only
    --frontend      Deploy frontend only
    --quick         Restart services only (no build)
    --rollback      Rollback to previous deployment
    --help          Show this help message

Environment Variables:
    GIT_BRANCH              Git branch to deploy (default: main)
    SLACK_WEBHOOK_URL       Slack webhook for notifications
    DISCORD_WEBHOOK_URL     Discord webhook for notifications
    POSTGRES_PASSWORD       PostgreSQL password for health checks
    REDIS_PASSWORD          Redis password for health checks

Examples:
    $0                      # Full deployment
    $0 --backend            # Backend only
    $0 --frontend           # Frontend only
    $0 --quick              # Restart services
    GIT_BRANCH=develop $0   # Deploy develop branch

EOF
}

#-------------------------------------------------------------------------------
# Main Entry Point
#-------------------------------------------------------------------------------
main() {
    # Create log directory if it doesn't exist
    mkdir -p "${LOG_DIR}"

    # Check user
    check_user

    # Load NVM
    load_nvm

    # Parse arguments
    case "${1:-}" in
        --backend)
            deploy_backend_only
            ;;
        --frontend)
            deploy_frontend_only
            ;;
        --quick)
            deploy_quick
            ;;
        --rollback)
            rollback
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        "")
            deploy_full
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
