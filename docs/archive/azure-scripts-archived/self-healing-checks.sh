#!/bin/bash
# ============================================================================
# FLAMORAL SELF-HEALING VALIDATION
# Infrastructure + Identity + Authorization Checks
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="${DOMAIN:-flamoral.com}"
API_ENDPOINT="${API_ENDPOINT:-https://api.flamoral.com}"
B2C_TENANT="${B2C_TENANT:-flamoralb2c}"
FRONT_DOOR_ID="${FRONT_DOOR_ID:-}"
ENVIRONMENT="${ENVIRONMENT:-prod}"

# Counters
PASSED=0
FAILED=0
WARNINGS=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASSED++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAILED++)); }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; ((WARNINGS++)); }
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# ============================================================================
# DNS CHECKS
# ============================================================================

check_dns() {
    log_info "========== DNS CHECKS =========="

    # Nameservers
    NS=$(dig NS "$DOMAIN" +short 2>/dev/null | head -1 || echo "")
    if [[ "$NS" == *"azure-dns"* ]]; then
        log_pass "Nameservers point to Azure DNS"
    else
        log_fail "Nameservers NOT Azure DNS: $NS"
    fi

    # Apex record
    APEX=$(dig A "$DOMAIN" +short 2>/dev/null || echo "")
    [[ -n "$APEX" ]] && log_pass "Apex A record exists: $APEX" || log_fail "Apex A record missing"

    # API subdomain
    API_RECORD=$(dig CNAME "api.$DOMAIN" +short 2>/dev/null || dig A "api.$DOMAIN" +short 2>/dev/null || echo "")
    [[ -n "$API_RECORD" ]] && log_pass "API record exists: $API_RECORD" || log_fail "API record missing"

    # Email records
    MX=$(dig MX "$DOMAIN" +short 2>/dev/null || echo "")
    SPF=$(dig TXT "$DOMAIN" +short 2>/dev/null | grep -i spf || echo "")
    DMARC=$(dig TXT "_dmarc.$DOMAIN" +short 2>/dev/null || echo "")

    [[ -n "$MX" ]] && log_pass "MX record exists" || log_warn "MX record missing"
    [[ -n "$SPF" ]] && log_pass "SPF record exists" || log_warn "SPF record missing"
    [[ -n "$DMARC" ]] && log_pass "DMARC record exists" || log_warn "DMARC record missing"
}

# ============================================================================
# TLS CHECKS
# ============================================================================

check_tls() {
    log_info "========== TLS CHECKS =========="

    # Certificate validity
    EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | \
             openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")

    if [[ -n "$EXPIRY" ]]; then
        log_pass "TLS certificate present"

        # Calculate days remaining
        if command -v date &> /dev/null; then
            EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
            if [[ "$EXPIRY_EPOCH" != "0" ]]; then
                DAYS_LEFT=$(( (EXPIRY_EPOCH - $(date +%s)) / 86400 ))

                if [[ $DAYS_LEFT -gt 30 ]]; then
                    log_pass "Certificate valid for $DAYS_LEFT days"
                elif [[ $DAYS_LEFT -gt 7 ]]; then
                    log_warn "Certificate expires in $DAYS_LEFT days"
                else
                    log_fail "Certificate expires in $DAYS_LEFT days (CRITICAL)"
                fi
            fi
        fi
    else
        log_fail "TLS certificate missing or invalid"
    fi
}

# ============================================================================
# HTTPS ENFORCEMENT
# ============================================================================

check_https_enforcement() {
    log_info "========== HTTPS ENFORCEMENT =========="

    # Check HTTP redirect
    HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{redirect_url}" "http://$DOMAIN" --max-time 10 2>/dev/null || echo "")

    if [[ "$HTTP_REDIRECT" == *"https://"* ]]; then
        log_pass "HTTP redirects to HTTPS"
    else
        log_fail "HTTP does NOT redirect to HTTPS"
    fi

    # Check HTTPS response
    HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" --max-time 10 2>/dev/null || echo "000")

    if [[ "$HTTPS_CODE" == "200" ]] || [[ "$HTTPS_CODE" == "301" ]] || [[ "$HTTPS_CODE" == "302" ]]; then
        log_pass "HTTPS returns valid response: $HTTPS_CODE"
    else
        log_fail "HTTPS returns: $HTTPS_CODE"
    fi
}

# ============================================================================
# FRONT DOOR CHECKS
# ============================================================================

check_frontdoor() {
    log_info "========== FRONT DOOR CHECKS =========="

    HEADERS=$(curl -s -I "https://$DOMAIN" --max-time 10 2>/dev/null || echo "")

    if echo "$HEADERS" | grep -qi "x-azure-ref"; then
        log_pass "Traffic routed through Azure Front Door"
    else
        log_warn "Cannot confirm Front Door routing"
    fi

    # Check WAF headers
    if echo "$HEADERS" | grep -qi "x-ms-azurefd"; then
        log_pass "Front Door WAF headers present"
    else
        log_warn "Front Door WAF headers not detected"
    fi
}

# ============================================================================
# ORIGIN PROTECTION CHECKS
# ============================================================================

check_origin_protection() {
    log_info "========== ORIGIN PROTECTION CHECKS =========="

    if [[ -z "$FRONT_DOOR_ID" ]]; then
        log_warn "FRONT_DOOR_ID not set - skipping origin protection check"
        return
    fi

    # Try to access backend directly (should fail)
    # This requires knowing the AKS ingress IP
    INGRESS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

    if [[ -n "$INGRESS_IP" ]]; then
        DIRECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$INGRESS_IP/api/health" \
                      -H "Host: api.$DOMAIN" --max-time 10 2>/dev/null || echo "000")

        if [[ "$DIRECT_CODE" == "403" ]]; then
            log_pass "Direct backend access blocked (403)"
        elif [[ "$DIRECT_CODE" == "200" ]]; then
            log_fail "Direct backend access NOT blocked (200) - SECURITY RISK"
        else
            log_warn "Direct backend access returned: $DIRECT_CODE"
        fi
    else
        log_warn "Cannot get ingress IP - skipping direct access check"
    fi
}

# ============================================================================
# IDENTITY CHECKS
# ============================================================================

check_identity() {
    log_info "========== IDENTITY CHECKS =========="

    # B2C metadata endpoint
    B2C_META=$(curl -s "https://${B2C_TENANT}.b2clogin.com/${B2C_TENANT}.onmicrosoft.com/v2.0/.well-known/openid-configuration" \
               --max-time 10 2>/dev/null || echo "")

    if [[ "$B2C_META" == *"authorization_endpoint"* ]]; then
        log_pass "B2C tenant accessible"
    else
        log_fail "B2C tenant not accessible"
    fi

    # Check security groups exist (requires Azure CLI auth)
    if command -v az &> /dev/null && az account show &> /dev/null 2>&1; then
        log_info "Checking security groups..."

        GROUPS=("flamoral-free" "flamoral-premium" "flamoral-verified" "flamoral-moderator" "flamoral-admin" "flamoral-banned")

        for GROUP in "${GROUPS[@]}"; do
            GROUP_NAME="${GROUP}-${ENVIRONMENT}"
            COUNT=$(az ad group list --display-name "$GROUP_NAME" --query "length(@)" -o tsv 2>/dev/null || echo "0")
            if [[ "$COUNT" -gt 0 ]]; then
                log_pass "Group exists: $GROUP_NAME"
            else
                log_fail "Group missing: $GROUP_NAME"
            fi
        done
    else
        log_warn "Azure CLI not authenticated - skipping group checks"
    fi
}

# ============================================================================
# API HEALTH CHECKS
# ============================================================================

check_api() {
    log_info "========== API HEALTH CHECKS =========="

    # Health endpoint
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT/health" --max-time 10 2>/dev/null || echo "000")

    if [[ "$HEALTH" == "200" ]]; then
        log_pass "API health endpoint OK"
    else
        log_fail "API health endpoint: $HEALTH"
    fi

    # Readiness endpoint
    READY=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT/health/ready" --max-time 10 2>/dev/null || echo "000")

    if [[ "$READY" == "200" ]]; then
        log_pass "API readiness endpoint OK"
    else
        log_warn "API readiness endpoint: $READY"
    fi

    # Auth required endpoint (should return 401)
    AUTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT/api/v1/profile" --max-time 10 2>/dev/null || echo "000")

    if [[ "$AUTH_CHECK" == "401" ]]; then
        log_pass "API properly rejects unauthenticated requests"
    else
        log_fail "API auth check returned: $AUTH_CHECK (expected 401)"
    fi
}

# ============================================================================
# KUBERNETES CHECKS
# ============================================================================

check_kubernetes() {
    log_info "========== KUBERNETES CHECKS =========="

    if ! command -v kubectl &> /dev/null; then
        log_warn "kubectl not available - skipping K8s checks"
        return
    fi

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_warn "Cannot connect to Kubernetes cluster"
        return
    fi

    # Pod status
    UNHEALTHY=$(kubectl get pods -n flamoral-prod --no-headers 2>/dev/null | grep -v "Running\|Completed" | wc -l || echo "0")

    if [[ "$UNHEALTHY" -eq 0 ]]; then
        log_pass "All pods healthy"
    else
        log_fail "$UNHEALTHY unhealthy pods"
        kubectl get pods -n flamoral-prod --no-headers | grep -v "Running\|Completed" || true
    fi

    # Network policies
    NETPOL=$(kubectl get networkpolicies -n flamoral-prod --no-headers 2>/dev/null | wc -l || echo "0")

    if [[ "$NETPOL" -gt 0 ]]; then
        log_pass "Network policies configured: $NETPOL"
    else
        log_warn "No network policies found"
    fi

    # Ingress
    INGRESS=$(kubectl get ingress -n flamoral-prod --no-headers 2>/dev/null | wc -l || echo "0")

    if [[ "$INGRESS" -gt 0 ]]; then
        log_pass "Ingress resources configured: $INGRESS"
    else
        log_fail "No ingress resources found"
    fi

    # Secrets
    SECRETS=$(kubectl get secrets -n flamoral-prod --no-headers 2>/dev/null | wc -l || echo "0")

    if [[ "$SECRETS" -gt 0 ]]; then
        log_pass "Secrets configured: $SECRETS"
    else
        log_warn "No secrets found"
    fi
}

# ============================================================================
# DATABASE CHECKS
# ============================================================================

check_databases() {
    log_info "========== DATABASE CHECKS =========="

    if ! command -v kubectl &> /dev/null; then
        log_warn "kubectl not available - skipping database checks"
        return
    fi

    # PostgreSQL pod
    PG_STATUS=$(kubectl get pods -n flamoral-prod -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "Unknown")

    if [[ "$PG_STATUS" == "Running" ]]; then
        log_pass "PostgreSQL pod running"
    else
        log_fail "PostgreSQL pod status: $PG_STATUS"
    fi

    # Redis pod
    REDIS_STATUS=$(kubectl get pods -n flamoral-prod -l app.kubernetes.io/name=redis -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "Unknown")

    if [[ "$REDIS_STATUS" == "Running" ]]; then
        log_pass "Redis pod running"
    else
        log_fail "Redis pod status: $REDIS_STATUS"
    fi
}

# ============================================================================
# SUMMARY
# ============================================================================

print_summary() {
    echo ""
    echo "============================================"
    echo "        FLAMORAL VALIDATION SUMMARY"
    echo "============================================"
    echo -e "Environment: ${BLUE}$ENVIRONMENT${NC}"
    echo -e "Domain:      ${BLUE}$DOMAIN${NC}"
    echo -e "Time:        ${BLUE}$(date -u +"%Y-%m-%dT%H:%M:%SZ")${NC}"
    echo "--------------------------------------------"
    echo -e "Passed:      ${GREEN}$PASSED${NC}"
    echo -e "Failed:      ${RED}$FAILED${NC}"
    echo -e "Warnings:    ${YELLOW}$WARNINGS${NC}"
    echo "============================================"

    if [[ $FAILED -gt 0 ]]; then
        echo -e "${RED}VALIDATION FAILED${NC}"
        exit 1
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}PASSED WITH WARNINGS${NC}"
        exit 0
    else
        echo -e "${GREEN}ALL CHECKS PASSED${NC}"
        exit 0
    fi
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    echo "============================================"
    echo "     FLAMORAL Self-Healing Validation"
    echo "============================================"
    echo "Domain:      $DOMAIN"
    echo "API:         $API_ENDPOINT"
    echo "Environment: $ENVIRONMENT"
    echo "Time:        $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "============================================"
    echo ""

    check_dns
    check_tls
    check_https_enforcement
    check_frontdoor
    check_origin_protection
    check_identity
    check_api
    check_kubernetes
    check_databases

    print_summary
}

main "$@"
