#!/bin/bash
# =============================================================================
# External Secrets Deployment Script for Flamoral Dating Platform
# =============================================================================
# This script deploys External Secrets Operator and configures Azure Key Vault
# integration for production secrets management.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="flamoral"
KEY_VAULT_NAME="flamoral-prod-kv"
KEY_VAULT_URL="https://flamoral-prod-kv.vault.azure.net"
ESO_NAMESPACE="external-secrets-system"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    if ! command_exists kubectl; then
        print_error "kubectl is not installed"
        exit 1
    fi

    if ! command_exists helm; then
        print_error "helm is not installed"
        exit 1
    fi

    if ! command_exists az; then
        print_error "Azure CLI is not installed"
        exit 1
    fi

    print_info "All prerequisites satisfied"
}

# Check environment variables
check_env_vars() {
    print_info "Checking environment variables..."

    if [ -z "$AZURE_CLIENT_ID" ]; then
        print_error "AZURE_CLIENT_ID environment variable is not set"
        exit 1
    fi

    if [ -z "$AZURE_TENANT_ID" ]; then
        print_error "AZURE_TENANT_ID environment variable is not set"
        exit 1
    fi

    print_info "Environment variables are set"
    print_info "  AZURE_CLIENT_ID: $AZURE_CLIENT_ID"
    print_info "  AZURE_TENANT_ID: $AZURE_TENANT_ID"
}

# Install External Secrets Operator
install_eso() {
    print_info "Checking if External Secrets Operator is installed..."

    if helm list -n $ESO_NAMESPACE | grep -q external-secrets; then
        print_warn "External Secrets Operator is already installed"
        read -p "Do you want to upgrade it? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Upgrading External Secrets Operator..."
            helm upgrade external-secrets external-secrets/external-secrets \
                -n $ESO_NAMESPACE
        fi
    else
        print_info "Installing External Secrets Operator..."
        helm repo add external-secrets https://charts.external-secrets.io
        helm repo update
        helm install external-secrets external-secrets/external-secrets \
            -n $ESO_NAMESPACE \
            --create-namespace \
            --wait
    fi

    print_info "External Secrets Operator installed successfully"
}

# Create namespace
create_namespace() {
    print_info "Creating namespace $NAMESPACE..."

    if kubectl get namespace $NAMESPACE >/dev/null 2>&1; then
        print_warn "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace $NAMESPACE
        print_info "Namespace $NAMESPACE created"
    fi
}

# Verify Key Vault access
verify_keyvault_access() {
    print_info "Verifying access to Azure Key Vault..."

    if az keyvault show --name $KEY_VAULT_NAME >/dev/null 2>&1; then
        print_info "Successfully connected to Key Vault: $KEY_VAULT_NAME"
    else
        print_error "Cannot access Key Vault: $KEY_VAULT_NAME"
        print_error "Please verify your Azure credentials and Key Vault name"
        exit 1
    fi
}

# List missing secrets in Key Vault
check_keyvault_secrets() {
    print_info "Checking for required secrets in Key Vault..."

    # List of required secrets
    required_secrets=(
        "jwt-secret"
        "jwt-access-secret"
        "jwt-refresh-secret"
        "service-api-key"
        "session-secret"
        "stripe-secret-key"
        "stripe-webhook-secret"
        "stripe-publishable-key"
        "sendgrid-api-key"
        "twilio-account-sid"
        "twilio-auth-token"
        "firebase-private-key"
        "db-host"
        "db-name"
        "db-user"
        "db-password"
        "redis-host"
        "redis-password"
        "azure-storage-key"
        "azure-storage-connection-string"
    )

    missing_secrets=()

    for secret in "${required_secrets[@]}"; do
        if ! az keyvault secret show --vault-name $KEY_VAULT_NAME --name "$secret" >/dev/null 2>&1; then
            missing_secrets+=("$secret")
        fi
    done

    if [ ${#missing_secrets[@]} -gt 0 ]; then
        print_warn "The following secrets are missing in Key Vault:"
        for secret in "${missing_secrets[@]}"; do
            echo "  - $secret"
        done
        print_warn "Please add these secrets before proceeding"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_info "All required secrets found in Key Vault"
    fi
}

# Deploy SecretStore
deploy_secretstore() {
    print_info "Deploying SecretStore..."

    # Replace environment variables in secret-store.yaml
    envsubst < secret-store.yaml | kubectl apply -f -

    print_info "SecretStore deployed successfully"
}

# Deploy ExternalSecrets
deploy_external_secrets() {
    print_info "Deploying ExternalSecrets..."

    kubectl apply -f auth-secrets.yaml
    kubectl apply -f payment-secrets.yaml
    kubectl apply -f notification-secrets.yaml
    kubectl apply -f media-secrets.yaml
    kubectl apply -f database-secrets.yaml

    print_info "ExternalSecrets deployed successfully"
}

# Verify ExternalSecrets
verify_external_secrets() {
    print_info "Verifying ExternalSecrets..."

    sleep 5  # Wait for reconciliation

    external_secrets=(
        "flamoral-auth-secrets"
        "flamoral-payment-secrets"
        "flamoral-notification-secrets"
        "flamoral-media-secrets"
        "flamoral-database-secrets"
    )

    all_ready=true

    for es in "${external_secrets[@]}"; do
        if kubectl get externalsecret $es -n $NAMESPACE >/dev/null 2>&1; then
            status=$(kubectl get externalsecret $es -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
            if [ "$status" = "True" ]; then
                print_info "✓ $es is ready"
            else
                print_warn "✗ $es is not ready"
                all_ready=false
            fi
        else
            print_error "✗ $es not found"
            all_ready=false
        fi
    done

    if [ "$all_ready" = true ]; then
        print_info "All ExternalSecrets are ready"
    else
        print_warn "Some ExternalSecrets are not ready. Check logs for details:"
        print_warn "  kubectl describe externalsecret -n $NAMESPACE"
        print_warn "  kubectl logs -n $ESO_NAMESPACE -l app.kubernetes.io/name=external-secrets"
    fi
}

# Verify created Kubernetes secrets
verify_k8s_secrets() {
    print_info "Verifying created Kubernetes secrets..."

    secrets=(
        "flamoral-auth-secrets"
        "flamoral-payment-secrets"
        "flamoral-notification-secrets"
        "flamoral-media-secrets"
        "flamoral-database-secrets"
    )

    for secret in "${secrets[@]}"; do
        if kubectl get secret $secret -n $NAMESPACE >/dev/null 2>&1; then
            print_info "✓ Secret $secret exists"
        else
            print_warn "✗ Secret $secret does not exist"
        fi
    done
}

# Main deployment flow
main() {
    echo "======================================================================="
    echo "  Flamoral Dating Platform - External Secrets Deployment"
    echo "======================================================================="
    echo

    check_prerequisites
    check_env_vars
    verify_keyvault_access
    check_keyvault_secrets
    install_eso
    create_namespace
    deploy_secretstore
    deploy_external_secrets
    verify_external_secrets
    verify_k8s_secrets

    echo
    print_info "======================================================================="
    print_info "  Deployment completed successfully!"
    print_info "======================================================================="
    echo
    print_info "Next steps:"
    echo "  1. Verify secrets are synced:"
    echo "     kubectl get externalsecrets -n $NAMESPACE"
    echo
    echo "  2. Check secret data (be careful in production):"
    echo "     kubectl describe secret flamoral-auth-secrets -n $NAMESPACE"
    echo
    echo "  3. Monitor External Secrets Operator logs:"
    echo "     kubectl logs -n $ESO_NAMESPACE -l app.kubernetes.io/name=external-secrets -f"
    echo
}

# Run main function
main
