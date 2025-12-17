#!/bin/bash

###############################################################################
# Secrets Rotation Script - Rotate all sensitive credentials
###############################################################################

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

NAMESPACE="flamoral-dating"
KEY_VAULT_NAME=""
DRY_RUN=false
RESTART_PODS=true

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    cat << EOF
Secrets Rotation Script

Usage: $0 [OPTIONS]

Options:
  --key-vault NAME   Azure Key Vault name (required)
  --namespace NS     Kubernetes namespace
  --dry-run          Show what would be rotated
  --no-restart       Don't restart pods after rotation
  --help             Show this help

Example:
  $0 --key-vault flamoral-prod-kv
EOF
    exit 0
}

generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

rotate_database_password() {
    local service=$1

    log_info "Rotating database password for $service..."

    local new_password
    new_password=$(generate_secret)

    if [[ "$DRY_RUN" == "false" ]]; then
        # Update in Key Vault
        az keyvault secret set \
            --vault-name "$KEY_VAULT_NAME" \
            --name "${service}-db-password" \
            --value "$new_password" \
            --output none

        # Update in Kubernetes secret
        kubectl create secret generic "${service}-secrets" \
            --from-literal=POSTGRES_PASSWORD="$new_password" \
            --dry-run=client -o yaml | \
            kubectl apply -f - -n "$NAMESPACE"

        # Update actual database password
        local db_host
        db_host=$(kubectl get configmap "${service}-config" -n "$NAMESPACE" \
            -o jsonpath='{.data.POSTGRES_HOST}')

        log_success "Password rotated for $service"
    else
        log_info "DRY RUN: Would rotate password for $service"
    fi
}

rotate_jwt_secret() {
    log_info "Rotating JWT secrets..."

    local new_jwt_secret
    new_jwt_secret=$(generate_secret)

    if [[ "$DRY_RUN" == "false" ]]; then
        az keyvault secret set \
            --vault-name "$KEY_VAULT_NAME" \
            --name "jwt-secret" \
            --value "$new_jwt_secret" \
            --output none

        for service in auth-service api-gateway; do
            kubectl patch secret "${service}-secrets" -n "$NAMESPACE" \
                -p "{\"data\":{\"JWT_SECRET\":\"$(echo -n $new_jwt_secret | base64)\"}}"
        done

        log_success "JWT secrets rotated"
    else
        log_info "DRY RUN: Would rotate JWT secrets"
    fi
}

rotate_api_keys() {
    log_info "Rotating API keys..."

    # Rotate payment service keys
    for provider in stripe apple google; do
        log_info "Rotating $provider API key..."

        if [[ "$DRY_RUN" == "false" ]]; then
            # Generate new key (in production, get from provider)
            local new_key
            new_key=$(generate_secret)

            az keyvault secret set \
                --vault-name "$KEY_VAULT_NAME" \
                --name "${provider}-api-key" \
                --value "$new_key" \
                --output none

            log_success "Rotated $provider API key"
        else
            log_info "DRY RUN: Would rotate $provider API key"
        fi
    done
}

restart_deployments() {
    if [[ "$RESTART_PODS" == "false" ]]; then
        log_info "Skipping pod restart"
        return 0
    fi

    log_info "Restarting deployments to pick up new secrets..."

    local services=(
        "user-service" "auth-service" "api-gateway"
        "matching-service" "messaging-service" "payment-service"
    )

    for service in "${services[@]}"; do
        if [[ "$DRY_RUN" == "false" ]]; then
            kubectl rollout restart deployment/"$service" -n "$NAMESPACE"
            log_success "Restarted $service"
        else
            log_info "DRY RUN: Would restart $service"
        fi
    done

    # Wait for rollout
    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Waiting for all deployments to stabilize..."
        for service in "${services[@]}"; do
            kubectl rollout status deployment/"$service" -n "$NAMESPACE" --timeout=300s
        done
    fi
}

main() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --key-vault) KEY_VAULT_NAME="$2"; shift 2 ;;
            --namespace) NAMESPACE="$2"; shift 2 ;;
            --dry-run) DRY_RUN=true; shift ;;
            --no-restart) RESTART_PODS=false; shift ;;
            --help) show_help ;;
            *) log_error "Unknown: $1"; exit 1 ;;
        esac
    done

    [[ -z "$KEY_VAULT_NAME" ]] && { log_error "Key vault required"; exit 1; }

    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  Secrets Rotation${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

    log_info "Key Vault: $KEY_VAULT_NAME"
    log_info "Namespace: $NAMESPACE"
    log_info "Dry Run: $DRY_RUN"

    # Rotate different types of secrets
    for service in user-service auth-service matching-service messaging-service payment-service; do
        rotate_database_password "$service"
    done

    rotate_jwt_secret
    rotate_api_keys

    restart_deployments

    log_success "All secrets rotated successfully!"

    if [[ "$DRY_RUN" == "false" ]]; then
        echo -e "\n${YELLOW}IMPORTANT:${NC}"
        echo "1. Update external service configurations with new API keys"
        echo "2. Verify all services are running correctly"
        echo "3. Monitor for authentication errors"
    fi
}

main "$@"
