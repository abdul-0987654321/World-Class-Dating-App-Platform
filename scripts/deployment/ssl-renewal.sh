#!/bin/bash

###############################################################################
# SSL Certificate Renewal Script
###############################################################################

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

NAMESPACE="flamoral-dating"
CERT_MANAGER_NAMESPACE="cert-manager"
DOMAINS=("flamoral.com" "*.flamoral.com" "api.flamoral.com")
ISSUER="letsencrypt-prod"
CHECK_ONLY=false

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

show_help() {
    cat << EOF
SSL Certificate Renewal Script

Usage: $0 [OPTIONS]

Options:
  --check-only       Only check certificate status
  --namespace NS     Target namespace
  --help             Show this help
EOF
    exit 0
}

check_cert_manager() {
    log_info "Checking cert-manager installation..."

    if ! kubectl get namespace "$CERT_MANAGER_NAMESPACE" &>/dev/null; then
        log_error "cert-manager not installed"
        return 1
    fi

    local ready_pods
    ready_pods=$(kubectl get pods -n "$CERT_MANAGER_NAMESPACE" \
        -o json | jq '[.items[].status.conditions[] | select(.type=="Ready" and .status=="True")] | length')

    if [[ $ready_pods -gt 0 ]]; then
        log_success "cert-manager is running"
    else
        log_error "cert-manager pods not ready"
        return 1
    fi
}

check_certificate_status() {
    log_info "Checking certificate status..."

    kubectl get certificates -n "$NAMESPACE" -o wide

    local certs
    certs=$(kubectl get certificates -n "$NAMESPACE" -o json)

    echo "$certs" | jq -r '.items[] | "\(.metadata.name): \(.status.conditions[0].type) - \(.status.conditions[0].reason)"'
}

renew_certificate() {
    local cert_name=$1

    log_info "Renewing certificate: $cert_name"

    # Delete existing certificate to force renewal
    kubectl delete certificate "$cert_name" -n "$NAMESPACE"

    # Recreate certificate
    cat <<EOF | kubectl apply -f - -n "$NAMESPACE"
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: $cert_name
spec:
  secretName: ${cert_name}-tls
  issuerRef:
    name: $ISSUER
    kind: ClusterIssuer
  dnsNames:
  - ${cert_name#flamoral-}
  renewBefore: 720h # 30 days
EOF

    # Wait for renewal
    sleep 10

    if kubectl wait --for=condition=Ready \
        certificate/"$cert_name" -n "$NAMESPACE" --timeout=300s; then
        log_success "Certificate renewed: $cert_name"
    else
        log_error "Certificate renewal failed: $cert_name"
        return 1
    fi
}

main() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --check-only) CHECK_ONLY=true; shift ;;
            --namespace) NAMESPACE="$2"; shift 2 ;;
            --help) show_help ;;
            *) shift ;;
        esac
    done

    check_cert_manager

    if [[ "$CHECK_ONLY" == "true" ]]; then
        check_certificate_status
        exit 0
    fi

    log_info "Starting SSL certificate renewal..."

    for cert in flamoral-com flamoral-api flamoral-wildcard; do
        renew_certificate "$cert"
    done

    log_success "All certificates renewed successfully"
}

main "$@"
