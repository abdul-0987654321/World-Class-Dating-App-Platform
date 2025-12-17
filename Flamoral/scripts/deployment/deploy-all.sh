#!/bin/bash

###############################################################################
# Flamoral Dating Platform - Complete Production Deployment Script
#
# This script orchestrates the complete deployment of all services,
# infrastructure, and dependencies in the correct order.
#
# Usage:
#   ./deploy-all.sh [OPTIONS]
#
# Options:
#   --env ENV              Environment (dev|staging|production) [default: production]
#   --dry-run              Show what would be deployed without making changes
#   --skip-infra           Skip infrastructure deployment
#   --skip-db              Skip database migrations
#   --skip-services        Skip service deployments
#   --services SERVICE     Deploy specific services only (comma-separated)
#   --notification EMAIL   Send notifications to this email
#   --slack-webhook URL    Send notifications to Slack
#   --rollback-on-fail     Automatically rollback on deployment failure
#   --help                 Show this help message
#
###############################################################################

set -euo pipefail

# Script metadata
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="$PROJECT_ROOT/logs/deployment"
LOG_FILE="$LOG_DIR/deploy-all-${TIMESTAMP}.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
DRY_RUN=false
SKIP_INFRA=false
SKIP_DB=false
SKIP_SERVICES=false
SPECIFIC_SERVICES=""
NOTIFICATION_EMAIL=""
SLACK_WEBHOOK=""
ROLLBACK_ON_FAIL=false

# Service deployment order (respects dependencies)
ALL_SERVICES=(
    "auth-service"
    "user-service"
    "media-service"
    "matching-service"
    "messaging-service"
    "notification-service"
    "payment-service"
    "analytics-service"
    "moderation-service"
    "admin-service"
    "realtime-service"
    "api-gateway"
    "advertising-service"
    "automation-service"
    "workflow-engine"
)

# Deployment state tracking
DEPLOYMENT_ID="deploy-${TIMESTAMP}"
STATE_FILE="$LOG_DIR/deployment-state-${DEPLOYMENT_ID}.json"
DEPLOYED_SERVICES=()
FAILED_SERVICES=()

###############################################################################
# Utility Functions
###############################################################################

# Logging functions
log_info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$LOG_FILE"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$LOG_FILE"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message" | tee -a "$LOG_FILE"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE"
}

log_step() {
    local message="$1"
    echo -e "${CYAN}[STEP]${NC} $message" | tee -a "$LOG_FILE"
}

# Print header
print_header() {
    local title="$1"
    echo -e "\n${MAGENTA}========================================${NC}" | tee -a "$LOG_FILE"
    echo -e "${MAGENTA}  $title${NC}" | tee -a "$LOG_FILE"
    echo -e "${MAGENTA}========================================${NC}\n" | tee -a "$LOG_FILE"
}

# Show help
show_help() {
    cat << EOF
Flamoral Dating Platform - Complete Production Deployment

Usage: $0 [OPTIONS]

Options:
  --env ENV              Environment (dev|staging|production) [default: production]
  --dry-run              Show what would be deployed without making changes
  --skip-infra           Skip infrastructure deployment
  --skip-db              Skip database migrations
  --skip-services        Skip service deployments
  --services SERVICE     Deploy specific services only (comma-separated)
  --notification EMAIL   Send notifications to this email
  --slack-webhook URL    Send notifications to Slack
  --rollback-on-fail     Automatically rollback on deployment failure
  --help                 Show this help message

Examples:
  # Full production deployment
  $0 --env production

  # Dry run to see what would be deployed
  $0 --env production --dry-run

  # Deploy specific services only
  $0 --env production --services user-service,api-gateway

  # Deploy with notifications
  $0 --env production --notification admin@flamoral.com

  # Deploy with automatic rollback on failure
  $0 --env production --rollback-on-fail

EOF
    exit 0
}

# Save deployment state
save_state() {
    cat > "$STATE_FILE" <<EOF
{
  "deployment_id": "$DEPLOYMENT_ID",
  "environment": "$ENVIRONMENT",
  "timestamp": "$TIMESTAMP",
  "deployed_services": [$(printf '"%s",' "${DEPLOYED_SERVICES[@]}" | sed 's/,$//')],
  "failed_services": [$(printf '"%s",' "${FAILED_SERVICES[@]}" | sed 's/,$//')]
}
EOF
}

# Send notification
send_notification() {
    local subject="$1"
    local message="$2"
    local status="$3" # success|failure|warning

    # Email notification
    if [[ -n "$NOTIFICATION_EMAIL" ]]; then
        echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL" 2>/dev/null || true
    fi

    # Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        [[ "$status" == "failure" ]] && color="danger"
        [[ "$status" == "warning" ]] && color="warning"

        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$subject\",
                    \"text\": \"$message\",
                    \"footer\": \"Flamoral Deployment System\",
                    \"ts\": $(date +%s)
                }]
            }" 2>/dev/null || true
    fi
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing_tools=()

    # Check required tools
    for tool in kubectl helm az docker git jq; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install the missing tools before continuing"
        exit 1
    fi

    log_success "All required tools are installed"

    # Check Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    log_success "Successfully connected to Kubernetes cluster"

    # Check Azure connection
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure"
        log_info "Please run: az login"
        exit 1
    fi

    log_success "Successfully authenticated with Azure"

    # Verify environment configuration
    if [[ ! -f "$PROJECT_ROOT/infrastructure/terraform/environments/$ENVIRONMENT/terraform.tfvars" ]]; then
        log_error "Environment configuration not found for: $ENVIRONMENT"
        exit 1
    fi

    log_success "Environment configuration found: $ENVIRONMENT"
}

###############################################################################
# Pre-Deployment Checks
###############################################################################

pre_deployment_checks() {
    print_header "Pre-Deployment Checks"

    log_step "Running pre-deployment validation..."

    # Check cluster resources
    log_info "Checking cluster resources..."
    local available_nodes
    available_nodes=$(kubectl get nodes --no-headers | grep -c "Ready" || echo "0")
    if [[ "$available_nodes" -lt 3 ]]; then
        log_warning "Only $available_nodes nodes available. Recommended: 3+"
    else
        log_success "Cluster has $available_nodes nodes available"
    fi

    # Check namespace
    if ! kubectl get namespace flamoral-dating &> /dev/null; then
        log_info "Creating namespace: flamoral-dating"
        if [[ "$DRY_RUN" == "false" ]]; then
            kubectl create namespace flamoral-dating
        fi
    fi

    # Check disk space
    log_info "Checking available storage..."
    local storage_classes
    storage_classes=$(kubectl get storageclasses --no-headers | wc -l)
    if [[ "$storage_classes" -eq 0 ]]; then
        log_error "No storage classes found in cluster"
        exit 1
    fi
    log_success "Storage classes configured: $storage_classes"

    # Check secrets
    log_info "Verifying required secrets..."
    local required_secrets=("database-credentials" "api-keys" "jwt-secrets")
    local missing_secrets=()

    for secret in "${required_secrets[@]}"; do
        if ! kubectl get secret "$secret" -n flamoral-dating &> /dev/null; then
            missing_secrets+=("$secret")
        fi
    done

    if [[ ${#missing_secrets[@]} -gt 0 ]]; then
        log_warning "Missing secrets: ${missing_secrets[*]}"
        log_warning "Deployment may fail without these secrets"
    else
        log_success "All required secrets are present"
    fi

    # Backup current state
    log_info "Backing up current deployment state..."
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl get all -n flamoral-dating -o yaml > "$LOG_DIR/pre-deployment-state-${TIMESTAMP}.yaml"
        log_success "Backup saved to: $LOG_DIR/pre-deployment-state-${TIMESTAMP}.yaml"
    fi
}

###############################################################################
# Infrastructure Deployment
###############################################################################

deploy_infrastructure() {
    print_header "Infrastructure Deployment"

    if [[ "$SKIP_INFRA" == "true" ]]; then
        log_warning "Skipping infrastructure deployment (--skip-infra)"
        return 0
    fi

    log_step "Deploying infrastructure with Terraform..."

    cd "$PROJECT_ROOT/infrastructure/terraform"

    # Initialize Terraform
    log_info "Initializing Terraform..."
    if [[ "$DRY_RUN" == "false" ]]; then
        terraform init -upgrade
    fi

    # Plan
    log_info "Creating Terraform plan..."
    if [[ "$DRY_RUN" == "false" ]]; then
        terraform plan \
            -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
            -out="tfplan-${TIMESTAMP}"
    else
        terraform plan \
            -var-file="environments/$ENVIRONMENT/terraform.tfvars"
    fi

    # Apply
    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Applying Terraform changes..."
        if terraform apply "tfplan-${TIMESTAMP}"; then
            log_success "Infrastructure deployed successfully"
        else
            log_error "Infrastructure deployment failed"
            return 1
        fi
    else
        log_info "DRY RUN: Would apply Terraform changes"
    fi

    cd "$PROJECT_ROOT"
}

###############################################################################
# Database Migrations
###############################################################################

run_database_migrations() {
    print_header "Database Migrations"

    if [[ "$SKIP_DB" == "true" ]]; then
        log_warning "Skipping database migrations (--skip-db)"
        return 0
    fi

    log_step "Running database migrations..."

    if [[ "$DRY_RUN" == "false" ]]; then
        if "$SCRIPT_DIR/migrate-databases.sh" --env "$ENVIRONMENT"; then
            log_success "Database migrations completed successfully"
        else
            log_error "Database migrations failed"
            return 1
        fi
    else
        log_info "DRY RUN: Would run database migrations"
    fi
}

###############################################################################
# Service Deployment
###############################################################################

deploy_service() {
    local service_name="$1"

    log_step "Deploying $service_name..."

    if [[ "$DRY_RUN" == "false" ]]; then
        if "$SCRIPT_DIR/deploy-service.sh" \
            --service "$service_name" \
            --env "$ENVIRONMENT"; then
            log_success "$service_name deployed successfully"
            DEPLOYED_SERVICES+=("$service_name")
            return 0
        else
            log_error "$service_name deployment failed"
            FAILED_SERVICES+=("$service_name")
            return 1
        fi
    else
        log_info "DRY RUN: Would deploy $service_name"
        return 0
    fi
}

deploy_all_services() {
    print_header "Service Deployment"

    if [[ "$SKIP_SERVICES" == "true" ]]; then
        log_warning "Skipping service deployment (--skip-services)"
        return 0
    fi

    local services_to_deploy=()

    if [[ -n "$SPECIFIC_SERVICES" ]]; then
        IFS=',' read -ra services_to_deploy <<< "$SPECIFIC_SERVICES"
        log_info "Deploying specific services: ${services_to_deploy[*]}"
    else
        services_to_deploy=("${ALL_SERVICES[@]}")
        log_info "Deploying all services in dependency order"
    fi

    local failed=false

    for service in "${services_to_deploy[@]}"; do
        if ! deploy_service "$service"; then
            failed=true

            if [[ "$ROLLBACK_ON_FAIL" == "true" ]]; then
                log_error "Deployment failed. Initiating automatic rollback..."
                rollback_deployment
                exit 1
            else
                log_error "Deployment failed. Manual intervention required."
                log_info "To rollback: $SCRIPT_DIR/rollback.sh --deployment-id $DEPLOYMENT_ID"
            fi
        fi

        # Wait between deployments
        sleep 5
    done

    if [[ "$failed" == "true" ]]; then
        return 1
    fi

    log_success "All services deployed successfully"
}

###############################################################################
# Post-Deployment Verification
###############################################################################

verify_deployment() {
    print_header "Post-Deployment Verification"

    log_step "Running health checks..."

    if [[ "$DRY_RUN" == "false" ]]; then
        if "$SCRIPT_DIR/health-check.sh" --env "$ENVIRONMENT"; then
            log_success "All health checks passed"
        else
            log_error "Health checks failed"
            return 1
        fi
    else
        log_info "DRY RUN: Would run health checks"
    fi

    # Verify service endpoints
    log_info "Verifying service endpoints..."

    local all_healthy=true
    for service in "${DEPLOYED_SERVICES[@]}"; do
        if kubectl get pods -n flamoral-dating -l "app=$service" -o json | \
           jq -e '.items[].status.conditions[] | select(.type=="Ready" and .status=="True")' &> /dev/null; then
            log_success "$service is healthy"
        else
            log_error "$service is not healthy"
            all_healthy=false
        fi
    done

    if [[ "$all_healthy" == "false" ]]; then
        return 1
    fi
}

###############################################################################
# Rollback Function
###############################################################################

rollback_deployment() {
    print_header "Rolling Back Deployment"

    log_warning "Initiating rollback for deployment: $DEPLOYMENT_ID"

    if [[ "$DRY_RUN" == "false" ]]; then
        "$SCRIPT_DIR/rollback.sh" --deployment-id "$DEPLOYMENT_ID"
    else
        log_info "DRY RUN: Would rollback deployment"
    fi
}

###############################################################################
# Cleanup
###############################################################################

cleanup() {
    log_info "Performing cleanup..."
    save_state
}

###############################################################################
# Main Execution
###############################################################################

main() {
    # Create log directory
    mkdir -p "$LOG_DIR"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-infra)
                SKIP_INFRA=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --skip-services)
                SKIP_SERVICES=true
                shift
                ;;
            --services)
                SPECIFIC_SERVICES="$2"
                shift 2
                ;;
            --notification)
                NOTIFICATION_EMAIL="$2"
                shift 2
                ;;
            --slack-webhook)
                SLACK_WEBHOOK="$2"
                shift 2
                ;;
            --rollback-on-fail)
                ROLLBACK_ON_FAIL=true
                shift
                ;;
            --help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done

    # Trap errors
    trap cleanup EXIT

    print_header "Flamoral Dating Platform - Full Deployment"

    log_info "Deployment ID: $DEPLOYMENT_ID"
    log_info "Environment: $ENVIRONMENT"
    log_info "Dry Run: $DRY_RUN"
    log_info "Log File: $LOG_FILE"

    # Send start notification
    send_notification \
        "Deployment Started" \
        "Deployment $DEPLOYMENT_ID started for environment: $ENVIRONMENT" \
        "warning"

    # Execute deployment steps
    local start_time
    start_time=$(date +%s)

    check_prerequisites
    pre_deployment_checks

    if ! deploy_infrastructure; then
        log_error "Infrastructure deployment failed"
        send_notification \
            "Deployment Failed" \
            "Infrastructure deployment failed for $DEPLOYMENT_ID" \
            "failure"
        exit 1
    fi

    if ! run_database_migrations; then
        log_error "Database migrations failed"
        send_notification \
            "Deployment Failed" \
            "Database migrations failed for $DEPLOYMENT_ID" \
            "failure"
        exit 1
    fi

    if ! deploy_all_services; then
        log_error "Service deployment failed"
        send_notification \
            "Deployment Failed" \
            "Service deployment failed for $DEPLOYMENT_ID" \
            "failure"
        exit 1
    fi

    if ! verify_deployment; then
        log_error "Post-deployment verification failed"
        send_notification \
            "Deployment Warning" \
            "Deployment completed but verification failed for $DEPLOYMENT_ID" \
            "warning"
        exit 1
    fi

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_header "Deployment Complete"
    log_success "Deployment completed in $duration seconds"
    log_info "Deployed services: ${DEPLOYED_SERVICES[*]}"

    # Send success notification
    send_notification \
        "Deployment Successful" \
        "Deployment $DEPLOYMENT_ID completed successfully in $duration seconds. Services: ${DEPLOYED_SERVICES[*]}" \
        "success"
}

# Run main function
main "$@"
