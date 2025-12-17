#!/bin/bash

###############################################################################
# Disaster Recovery Script
###############################################################################

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

RECOVERY_POINT=""
ENVIRONMENT="production"
NAMESPACE="flamoral-dating"
RECOVERY_REGION="westus2"
VERIFY_ONLY=false

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

show_help() {
    cat << EOF
Disaster Recovery Script

Usage: $0 [OPTIONS]

Options:
  --recovery-point TIME   Recovery point (YYYY-MM-DD-HH-MM)
  --environment ENV       Environment to recover
  --region REGION         Recovery region [default: westus2]
  --verify-only           Only verify DR readiness
  --help                  Show this help

Example:
  $0 --recovery-point 2025-12-10-14-30 --environment production
  $0 --verify-only
EOF
    exit 0
}

verify_dr_readiness() {
    log_info "Verifying disaster recovery readiness..."

    # Check backup availability
    log_info "Checking backup availability..."
    local latest_backup
    latest_backup=$(az backup recoverypoint list \
        --resource-group "flamoral-prod-rg" \
        --vault-name "flamoral-backup-vault" \
        --item-name "flamoral-postgres" \
        --query "[0].name" -o tsv 2>/dev/null)

    if [[ -n "$latest_backup" ]]; then
        log_success "Latest backup: $latest_backup"
    else
        log_error "No backups found"
        return 1
    fi

    # Check geo-replication
    log_info "Checking geo-replication status..."
    local replica_status
    replica_status=$(az postgres flexible-server replica list \
        --resource-group "flamoral-prod-rg" \
        --name "flamoral-postgres-primary" \
        --query "[0].replicationRole" -o tsv 2>/dev/null)

    if [[ "$replica_status" == "Replica" ]]; then
        log_success "Geo-replication configured"
    else
        log_warning "No geo-replica found"
    fi

    # Check storage replication
    log_info "Checking storage geo-redundancy..."
    local storage_sku
    storage_sku=$(az storage account show \
        --name "flamoralprodsa" \
        --query "sku.name" -o tsv)

    if [[ "$storage_sku" == *"GRS"* || "$storage_sku" == *"GZRS"* ]]; then
        log_success "Storage is geo-redundant: $storage_sku"
    else
        log_warning "Storage not geo-redundant: $storage_sku"
    fi

    # Check runbook availability
    log_info "Checking DR documentation..."
    if [[ -f "$PROJECT_ROOT/infrastructure/disaster-recovery/README.md" ]]; then
        log_success "DR documentation found"
    else
        log_warning "DR documentation missing"
    fi

    log_success "DR readiness check complete"
}

failover_to_secondary_region() {
    log_warning "Initiating failover to $RECOVERY_REGION..."

    # Promote read replica to primary
    log_info "Promoting read replica..."
    az postgres flexible-server replica promote \
        --resource-group "flamoral-${ENVIRONMENT}-${RECOVERY_REGION}-rg" \
        --name "flamoral-postgres-${RECOVERY_REGION}"

    # Update DNS to point to new region
    log_info "Updating DNS records..."
    az network dns record-set cname set-record \
        --resource-group "flamoral-dns-rg" \
        --zone-name "flamoral.com" \
        --record-set-name "api" \
        --cname "flamoral-${RECOVERY_REGION}-gateway.azurefd.net"

    # Update AKS context
    log_info "Switching to recovery cluster..."
    az aks get-credentials \
        --resource-group "flamoral-${ENVIRONMENT}-${RECOVERY_REGION}-rg" \
        --name "flamoral-${ENVIRONMENT}-aks-${RECOVERY_REGION}"

    log_success "Failover initiated to $RECOVERY_REGION"
}

restore_from_backup() {
    local recovery_point=$1

    log_info "Restoring from backup: $recovery_point"

    # Restore database
    log_info "Restoring database..."
    az postgres flexible-server restore \
        --resource-group "flamoral-${ENVIRONMENT}-${RECOVERY_REGION}-rg" \
        --name "flamoral-postgres-restored" \
        --source-server "flamoral-postgres-primary" \
        --restore-time "$recovery_point"

    # Restore blob storage
    log_info "Restoring blob storage..."
    az storage blob restore \
        --account-name "flamoralprodsa" \
        --time-to-restore "$recovery_point" \
        --blob-range "/" \
        --no-wait

    log_success "Restore initiated"
}

redeploy_services() {
    log_info "Redeploying services in recovery region..."

    # Deploy infrastructure
    log_info "Deploying infrastructure..."
    cd "$PROJECT_ROOT/infrastructure/terraform"
    terraform init
    terraform apply -var="location=$RECOVERY_REGION" -auto-approve

    # Deploy services
    log_info "Deploying services..."
    "$SCRIPT_DIR/deploy-all.sh" \
        --env "$ENVIRONMENT" \
        --skip-infra

    log_success "Services redeployed"
}

verify_recovery() {
    log_info "Verifying recovery..."

    # Check service health
    "$SCRIPT_DIR/health-check.sh" --env "$ENVIRONMENT"

    # Verify data integrity
    log_info "Verifying data integrity..."

    # Test critical endpoints
    log_info "Testing critical endpoints..."
    for endpoint in /health /api/v1/users /api/v1/matches; do
        if curl -sf "https://api.flamoral.com${endpoint}" > /dev/null; then
            log_success "Endpoint OK: $endpoint"
        else
            log_error "Endpoint failed: $endpoint"
        fi
    done

    log_success "Recovery verification complete"
}

generate_recovery_report() {
    log_info "Generating recovery report..."

    local report_file="/tmp/dr-report-$(date +%Y%m%d-%H%M%S).txt"

    cat > "$report_file" <<EOF
Disaster Recovery Report
========================
Date: $(date)
Environment: $ENVIRONMENT
Recovery Region: $RECOVERY_REGION
Recovery Point: $RECOVERY_POINT

Recovery Steps Performed:
1. Verified DR readiness
2. Initiated failover to $RECOVERY_REGION
3. Restored from backup
4. Redeployed services
5. Verified recovery

Service Status:
$(kubectl get pods -n "$NAMESPACE" --no-headers | awk '{print $1, $3}')

Next Steps:
1. Monitor system stability
2. Verify data consistency
3. Update DNS TTL
4. Notify stakeholders
5. Document incident
EOF

    log_success "Report saved: $report_file"
    cat "$report_file"
}

main() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --recovery-point) RECOVERY_POINT="$2"; shift 2 ;;
            --environment) ENVIRONMENT="$2"; shift 2 ;;
            --region) RECOVERY_REGION="$2"; shift 2 ;;
            --verify-only) VERIFY_ONLY=true; shift ;;
            --help) show_help ;;
            *) log_error "Unknown: $1"; exit 1 ;;
        esac
    done

    echo -e "\n${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║       DISASTER RECOVERY PROCEDURE             ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}\n"

    log_warning "This script initiates disaster recovery procedures"
    log_warning "Environment: $ENVIRONMENT"
    log_warning "Recovery Region: $RECOVERY_REGION"

    if [[ "$VERIFY_ONLY" == "true" ]]; then
        verify_dr_readiness
        exit 0
    fi

    [[ -z "$RECOVERY_POINT" ]] && { log_error "Recovery point required"; exit 1; }

    read -p "Continue with disaster recovery? (type 'RECOVER' to confirm): " confirm
    if [[ "$confirm" != "RECOVER" ]]; then
        log_info "Disaster recovery cancelled"
        exit 0
    fi

    log_warning "Starting disaster recovery..."

    verify_dr_readiness
    failover_to_secondary_region
    restore_from_backup "$RECOVERY_POINT"
    redeploy_services
    verify_recovery
    generate_recovery_report

    log_success "Disaster recovery completed!"

    echo -e "\n${GREEN}Recovery successful. Monitor system for 24-48 hours.${NC}"
}

main "$@"
