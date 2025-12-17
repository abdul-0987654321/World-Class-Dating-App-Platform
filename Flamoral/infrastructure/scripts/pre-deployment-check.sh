#!/bin/bash
# =============================================================================
# Flamoral Pre-Deployment Checklist Script
# =============================================================================
# This script verifies that all prerequisites are met before deployment
# Run this before executing deploy-production.sh
# =============================================================================
# Author: Flamoral DevOps Team
# Version: 1.0.0
# Date: 2025-12-13
# =============================================================================

set -eo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

# Azure Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-flamoral-prod-rg}"
AKS_CLUSTER="${AKS_CLUSTER:-flamoral-prod-aks}"
ACR_NAME="${ACR_NAME:-flamoralacr}"
KEY_VAULT_NAME="${KEY_VAULT_NAME:-flamoral-prod-kv}"
NAMESPACE="${NAMESPACE:-flamoral}"

# =============================================================================
# Color Codes
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# =============================================================================
# Helper Functions
# =============================================================================
print_header() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${WHITE}Flamoral Pre-Deployment Checklist${NC}                        ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_pass() {
    ((TOTAL_CHECKS++))
    ((PASSED_CHECKS++))
    echo -e "  ${GREEN}✓${NC} $1"
}

check_fail() {
    ((TOTAL_CHECKS++))
    ((FAILED_CHECKS++))
    echo -e "  ${RED}✗${NC} $1"
}

check_warn() {
    ((TOTAL_CHECKS++))
    ((WARNING_CHECKS++))
    echo -e "  ${YELLOW}⚠${NC} $1"
}

check_info() {
    echo -e "  ${CYAN}ℹ${NC} $1"
}

# =============================================================================
# Check Functions
# =============================================================================

check_required_tools() {
    print_section "1. Required Tools"

    # Azure CLI
    if command -v az &> /dev/null; then
        local version=$(az version --query '"azure-cli"' -o tsv 2>/dev/null || echo "unknown")
        check_pass "Azure CLI installed (version: $version)"
    else
        check_fail "Azure CLI not installed"
        check_info "Install from: https://docs.microsoft.com/cli/azure/install-azure-cli"
        return 1
    fi

    # kubectl
    if command -v kubectl &> /dev/null; then
        local version=$(kubectl version --client --short 2>/dev/null | grep -oP 'v\d+\.\d+\.\d+' || echo "unknown")
        check_pass "kubectl installed (version: $version)"
    else
        check_fail "kubectl not installed"
        check_info "Install from: https://kubernetes.io/docs/tasks/tools/"
        return 1
    fi

    # helm
    if command -v helm &> /dev/null; then
        local version=$(helm version --short 2>/dev/null | grep -oP 'v\d+\.\d+\.\d+' || echo "unknown")
        check_pass "helm installed (version: $version)"
    else
        check_warn "helm not installed (optional but recommended)"
        check_info "Install from: https://helm.sh/docs/intro/install/"
    fi

    # jq
    if command -v jq &> /dev/null; then
        local version=$(jq --version 2>/dev/null | grep -oP '\d+\.\d+' || echo "unknown")
        check_pass "jq installed (version: $version)"
    else
        check_fail "jq not installed"
        check_info "Install with: apt-get install jq  (or brew install jq on macOS)"
        return 1
    fi

    # dig (DNS lookup tool)
    if command -v dig &> /dev/null; then
        check_pass "dig installed"
    else
        check_warn "dig not installed (used for DNS verification)"
        check_info "Install with: apt-get install dnsutils"
    fi

    # curl
    if command -v curl &> /dev/null; then
        check_pass "curl installed"
    else
        check_fail "curl not installed"
        return 1
    fi

    # git
    if command -v git &> /dev/null; then
        local version=$(git --version | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
        check_pass "git installed (version: $version)"
    else
        check_warn "git not installed"
    fi

    return 0
}

check_azure_authentication() {
    print_section "2. Azure CLI Authentication"

    if ! az account show &> /dev/null; then
        check_fail "Not authenticated with Azure CLI"
        check_info "Run: az login"
        return 1
    fi

    local account_name=$(az account show --query user.name -o tsv)
    local subscription_id=$(az account show --query id -o tsv)
    local subscription_name=$(az account show --query name -o tsv)
    local tenant_id=$(az account show --query tenantId -o tsv)

    check_pass "Azure CLI authenticated"
    check_info "Account: $account_name"
    check_info "Subscription: $subscription_name ($subscription_id)"
    check_info "Tenant ID: $tenant_id"

    return 0
}

check_kubectl_configuration() {
    print_section "3. kubectl Configuration"

    if ! kubectl cluster-info &> /dev/null; then
        check_fail "kubectl not configured or cluster not accessible"
        check_info "Run: az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER"
        return 1
    fi

    local context=$(kubectl config current-context)
    local cluster=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')
    local namespace=$(kubectl config view --minify -o jsonpath='{.contexts[0].context.namespace}')

    check_pass "kubectl configured and cluster accessible"
    check_info "Current context: $context"
    check_info "Cluster: $cluster"
    check_info "Default namespace: ${namespace:-default}"

    # Test cluster connectivity
    if kubectl get nodes &> /dev/null; then
        local node_count=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
        check_pass "Cluster connection verified ($node_count nodes)"
    else
        check_fail "Cannot access cluster nodes"
        return 1
    fi

    return 0
}

check_azure_resources() {
    print_section "4. Azure Resources"

    # Resource Group
    if az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        local location=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
        check_pass "Resource group exists: $RESOURCE_GROUP (location: $location)"
    else
        check_fail "Resource group does not exist: $RESOURCE_GROUP"
        check_info "Create with: az group create --name $RESOURCE_GROUP --location eastus"
        return 1
    fi

    # AKS Cluster
    if az aks show --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" &> /dev/null 2>&1; then
        local k8s_version=$(az aks show --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --query kubernetesVersion -o tsv 2>/dev/null)
        local node_count=$(az aks show --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --query agentPoolProfiles[0].count -o tsv 2>/dev/null)
        check_pass "AKS cluster exists: $AKS_CLUSTER (K8s: $k8s_version, nodes: $node_count)"
    else
        check_fail "AKS cluster does not exist: $AKS_CLUSTER"
        return 1
    fi

    # Container Registry
    if az acr show --name "$ACR_NAME" &> /dev/null 2>&1; then
        local acr_login_server=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv 2>/dev/null)
        check_pass "Container Registry exists: $ACR_NAME ($acr_login_server)"
    else
        check_warn "Container Registry does not exist: $ACR_NAME (may be created during deployment)"
    fi

    # Key Vault
    if az keyvault show --name "$KEY_VAULT_NAME" &> /dev/null 2>&1; then
        local vault_uri=$(az keyvault show --name "$KEY_VAULT_NAME" --query properties.vaultUri -o tsv 2>/dev/null)
        check_pass "Key Vault exists: $KEY_VAULT_NAME ($vault_uri)"
    else
        check_fail "Key Vault does not exist: $KEY_VAULT_NAME"
        return 1
    fi

    return 0
}

check_keyvault_secrets() {
    print_section "5. Key Vault Secrets"

    local required_secrets=(
        "database-password:Database password"
        "database-url:Database connection URL"
        "jwt-secret:JWT signing secret"
        "jwt-access-secret:JWT access token secret"
        "jwt-refresh-secret:JWT refresh token secret"
        "stripe-secret-key:Stripe API secret key"
        "sendgrid-api-key:SendGrid API key"
        "twilio-auth-token:Twilio auth token"
    )

    local missing_count=0

    for secret_info in "${required_secrets[@]}"; do
        IFS=':' read -r secret_name secret_desc <<< "$secret_info"

        if az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$secret_name" &> /dev/null 2>&1; then
            check_pass "$secret_desc ($secret_name)"
        else
            check_fail "$secret_desc ($secret_name) - MISSING"
            ((missing_count++))
        fi
    done

    if [ $missing_count -gt 0 ]; then
        check_info "Add missing secrets using: az keyvault secret set --vault-name $KEY_VAULT_NAME --name SECRET_NAME --value 'SECRET_VALUE'"
        return 1
    fi

    return 0
}

check_kubernetes_prerequisites() {
    print_section "6. Kubernetes Prerequisites"

    # Check if nginx-ingress is installed
    if kubectl get namespace ingress-nginx &> /dev/null 2>&1; then
        check_pass "NGINX Ingress Controller namespace exists"

        if kubectl get deployment -n ingress-nginx ingress-nginx-controller &> /dev/null 2>&1; then
            local replicas=$(kubectl get deployment -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
            check_pass "NGINX Ingress Controller deployed (ready replicas: $replicas)"
        else
            check_warn "NGINX Ingress Controller not deployed"
        fi
    else
        check_warn "NGINX Ingress Controller not installed (will be installed during deployment)"
    fi

    # Check if cert-manager is installed
    if kubectl get namespace cert-manager &> /dev/null 2>&1; then
        check_pass "cert-manager namespace exists"

        if kubectl get deployment -n cert-manager cert-manager &> /dev/null 2>&1; then
            check_pass "cert-manager deployed"
        else
            check_warn "cert-manager not deployed"
        fi
    else
        check_warn "cert-manager not installed (will be installed during deployment)"
    fi

    # Check if CSI driver is installed
    if kubectl get csidriver secrets-store.csi.k8s.io &> /dev/null 2>&1; then
        check_pass "Secrets Store CSI Driver installed"
    else
        check_warn "Secrets Store CSI Driver not installed (needed for Azure Key Vault integration)"
    fi

    return 0
}

check_git_status() {
    print_section "7. Git Repository Status"

    if ! command -v git &> /dev/null; then
        check_warn "git not available - skipping repository checks"
        return 0
    fi

    # Check if we're in a git repository
    if ! git rev-parse --git-dir &> /dev/null 2>&1; then
        check_warn "Not in a git repository"
        return 0
    fi

    # Check for uncommitted changes
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        check_pass "No uncommitted changes"
    else
        check_warn "Repository has uncommitted changes"
        check_info "Consider committing changes before deployment"
    fi

    # Check current branch
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    check_info "Current branch: $branch"

    # Check for unpushed commits
    local unpushed=$(git log --branches --not --remotes --oneline 2>/dev/null | wc -l || echo "0")
    if [ "$unpushed" -gt 0 ]; then
        check_warn "$unpushed unpushed commit(s)"
        check_info "Consider pushing changes before deployment"
    else
        check_pass "All commits pushed to remote"
    fi

    return 0
}

check_deployment_files() {
    print_section "8. Deployment Files"

    local required_files=(
        "infrastructure/dns/configure-dns.sh:DNS configuration script"
        "infrastructure/azure/deploy-frontdoor-routes.sh:Front Door deployment script"
        "infrastructure/kubernetes/secrets/azure-keyvault-secretprovider.yaml:Key Vault provider config"
    )

    local missing_count=0

    for file_info in "${required_files[@]}"; do
        IFS=':' read -r file_path file_desc <<< "$file_info"
        local full_path="${INFRA_DIR}/../${file_path}"

        if [ -f "$full_path" ]; then
            check_pass "$file_desc"
        else
            check_fail "$file_desc - NOT FOUND"
            check_info "Expected at: $full_path"
            ((missing_count++))
        fi
    done

    if [ $missing_count -gt 0 ]; then
        return 1
    fi

    return 0
}

check_network_connectivity() {
    print_section "9. Network Connectivity"

    # Azure endpoint
    if curl -sf -o /dev/null --max-time 5 https://management.azure.com &> /dev/null; then
        check_pass "Azure Management API reachable"
    else
        check_fail "Cannot reach Azure Management API"
        return 1
    fi

    # Container registry
    if curl -sf -o /dev/null --max-time 5 https://mcr.microsoft.com &> /dev/null; then
        check_pass "Microsoft Container Registry reachable"
    else
        check_warn "Cannot reach Microsoft Container Registry"
    fi

    # GitHub (for cert-manager and other installations)
    if curl -sf -o /dev/null --max-time 5 https://github.com &> /dev/null; then
        check_pass "GitHub reachable"
    else
        check_warn "Cannot reach GitHub (may affect cert-manager installation)"
    fi

    # Helm repos
    if curl -sf -o /dev/null --max-time 5 https://charts.external-secrets.io &> /dev/null; then
        check_pass "External Secrets Helm repository reachable"
    else
        check_warn "Cannot reach External Secrets Helm repository"
    fi

    return 0
}

check_permissions() {
    print_section "10. Azure Permissions"

    # Check if user can create resources in resource group
    local account_id=$(az account show --query user.name -o tsv)

    # Test resource group permissions
    if az role assignment list --resource-group "$RESOURCE_GROUP" --assignee "$account_id" &> /dev/null 2>&1; then
        check_pass "Can access resource group role assignments"
    else
        check_warn "Cannot verify role assignments (may have limited permissions)"
    fi

    # Check AKS admin credentials access
    if az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --admin --dry-run &> /dev/null 2>&1; then
        check_pass "Can access AKS admin credentials"
    else
        check_warn "Cannot access AKS admin credentials (user credentials will be used)"
    fi

    # Check Key Vault access
    if az keyvault secret list --vault-name "$KEY_VAULT_NAME" &> /dev/null 2>&1; then
        check_pass "Can list Key Vault secrets"
    else
        check_fail "Cannot list Key Vault secrets - insufficient permissions"
        check_info "Required permissions: Key Vault Secrets Officer or Key Vault Administrator"
        return 1
    fi

    return 0
}

# =============================================================================
# Summary Report
# =============================================================================
print_summary() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}Pre-Deployment Check Summary${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Total checks:    $TOTAL_CHECKS"
    echo -e "  ${GREEN}✓ Passed:${NC}        $PASSED_CHECKS"
    echo -e "  ${YELLOW}⚠ Warnings:${NC}      $WARNING_CHECKS"
    echo -e "  ${RED}✗ Failed:${NC}        $FAILED_CHECKS"
    echo ""

    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}  ${WHITE}✓ All critical checks passed!${NC}                             ${GREEN}║${NC}"
        echo -e "${GREEN}║${NC}  ${WHITE}You are ready to proceed with deployment.${NC}                ${GREEN}║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""

        if [ $WARNING_CHECKS -gt 0 ]; then
            echo -e "${YELLOW}Note: $WARNING_CHECKS warning(s) were found. These are not critical${NC}"
            echo -e "${YELLOW}but you may want to review them before proceeding.${NC}"
            echo ""
        fi

        echo -e "${CYAN}Next step:${NC}"
        echo -e "  ${WHITE}./deploy-production.sh${NC}"
        echo ""
        echo -e "${CYAN}Or for a dry run:${NC}"
        echo -e "  ${WHITE}./deploy-production.sh --dry-run${NC}"
        echo ""

        return 0
    else
        echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║${NC}  ${WHITE}✗ Pre-deployment checks failed!${NC}                           ${RED}║${NC}"
        echo -e "${RED}║${NC}  ${WHITE}Please resolve the issues above before deployment.${NC}        ${RED}║${NC}"
        echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}Review the failed checks above and take corrective action.${NC}"
        echo ""

        return 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    print_header

    # Run all checks
    check_required_tools || true
    check_azure_authentication || true
    check_kubectl_configuration || true
    check_azure_resources || true
    check_keyvault_secrets || true
    check_kubernetes_prerequisites || true
    check_git_status || true
    check_deployment_files || true
    check_network_connectivity || true
    check_permissions || true

    # Print summary
    print_summary
}

# Execute main function
main "$@"
