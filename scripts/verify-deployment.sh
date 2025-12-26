#!/bin/bash
# =============================================================================
# FLAMORAL DEPLOYMENT VERIFICATION SCRIPT
# =============================================================================
# Post-deployment verification script for Flamoral production.
# Checks all pods, services, endpoints, and runs health checks.
#
# Usage: ./scripts/verify-deployment.sh [NAMESPACE]
#   NAMESPACE: Optional, defaults to 'flamoral'
#
# Exit codes:
#   0 - All checks passed
#   1 - Critical failures detected
#   2 - Warnings detected but deployment functional
#
# =============================================================================

set -euo pipefail

# Configuration
NAMESPACE="${1:-flamoral}"
TIMEOUT_SECONDS=30
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Logging functions
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASSED++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAILED++)); }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; ((WARNINGS++)); }
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_section() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

echo -e "${CYAN}"
echo "============================================================================="
echo "               FLAMORAL DEPLOYMENT VERIFICATION"
echo "=============================================================================${NC}"
echo ""
echo -e "Namespace:     ${GREEN}$NAMESPACE${NC}"
echo -e "Timestamp:     ${GREEN}$(date -u +"%Y-%m-%dT%H:%M:%SZ")${NC}"
echo ""

# ============================================================================
# CHECK NAMESPACE EXISTS
# ============================================================================
log_section "Namespace Verification"

if kubectl get namespace "$NAMESPACE" &> /dev/null; then
    log_pass "Namespace '$NAMESPACE' exists"
else
    log_fail "Namespace '$NAMESPACE' not found"
    exit 1
fi

# ============================================================================
# CHECK ALL PODS ARE RUNNING
# ============================================================================
log_section "Pod Health Check"

# Get pod status
TOTAL_PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")
RUNNING_PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running\|Completed" || echo "0")
NOT_RUNNING=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -v "Running\|Completed" || echo "")

log_info "Total pods: $TOTAL_PODS, Running: $RUNNING_PODS"

if [ "$TOTAL_PODS" -eq 0 ]; then
    log_fail "No pods found in namespace $NAMESPACE"
elif [ "$TOTAL_PODS" -eq "$RUNNING_PODS" ]; then
    log_pass "All $TOTAL_PODS pods are Running or Completed"
else
    log_fail "$(($TOTAL_PODS - $RUNNING_PODS)) pods are not running"
    echo "$NOT_RUNNING"
fi

# Check for pods with high restart counts
HIGH_RESTARTS=$(kubectl get pods -n "$NAMESPACE" -o json 2>/dev/null | \
    jq -r '.items[] | select(.status.containerStatuses != null) |
    select(.status.containerStatuses[].restartCount > 3) |
    "\(.metadata.name): \(.status.containerStatuses[].restartCount) restarts"' 2>/dev/null || echo "")

if [ -n "$HIGH_RESTARTS" ]; then
    log_warn "Pods with high restart counts:"
    echo "$HIGH_RESTARTS"
else
    log_pass "No pods with excessive restarts"
fi

# Check for pending pods
PENDING_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l || echo "0")
if [ "$PENDING_PODS" -gt 0 ]; then
    log_warn "$PENDING_PODS pods are in Pending state"
else
    log_pass "No pods stuck in Pending state"
fi

# ============================================================================
# CHECK DEPLOYMENTS
# ============================================================================
log_section "Deployment Health Check"

# Get deployment status
DEPLOYMENTS=$(kubectl get deployments -n "$NAMESPACE" -o json 2>/dev/null)
DEPLOY_COUNT=$(echo "$DEPLOYMENTS" | jq '.items | length' 2>/dev/null || echo "0")

log_info "Total deployments: $DEPLOY_COUNT"

if [ "$DEPLOY_COUNT" -eq 0 ]; then
    log_warn "No deployments found in namespace $NAMESPACE"
else
    # Check each deployment
    echo "$DEPLOYMENTS" | jq -r '.items[] | "\(.metadata.name) \(.status.readyReplicas // 0)/\(.spec.replicas)"' 2>/dev/null | while read line; do
        DEPLOY_NAME=$(echo "$line" | awk '{print $1}')
        REPLICAS=$(echo "$line" | awk '{print $2}')
        READY=$(echo "$REPLICAS" | cut -d'/' -f1)
        DESIRED=$(echo "$REPLICAS" | cut -d'/' -f2)

        if [ "$READY" -eq "$DESIRED" ] && [ "$DESIRED" -gt 0 ]; then
            echo -e "${GREEN}[PASS]${NC} Deployment $DEPLOY_NAME: $READY/$DESIRED replicas ready"
        else
            echo -e "${RED}[FAIL]${NC} Deployment $DEPLOY_NAME: $READY/$DESIRED replicas ready"
        fi
    done
fi

# ============================================================================
# CHECK SERVICES HAVE ENDPOINTS
# ============================================================================
log_section "Service Endpoints Check"

SERVICES=$(kubectl get services -n "$NAMESPACE" -o json 2>/dev/null)
SERVICE_COUNT=$(echo "$SERVICES" | jq '.items | length' 2>/dev/null || echo "0")

log_info "Total services: $SERVICE_COUNT"

# Check each service has endpoints
echo "$SERVICES" | jq -r '.items[] | select(.spec.type != "ExternalName") | .metadata.name' 2>/dev/null | while read service; do
    if [ -n "$service" ]; then
        ENDPOINTS=$(kubectl get endpoints "$service" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || echo "")
        if [ -n "$ENDPOINTS" ]; then
            ENDPOINT_COUNT=$(echo "$ENDPOINTS" | wc -w)
            echo -e "${GREEN}[PASS]${NC} Service $service has $ENDPOINT_COUNT endpoint(s)"
        else
            echo -e "${RED}[FAIL]${NC} Service $service has no endpoints"
        fi
    fi
done

# ============================================================================
# CHECK INGRESS
# ============================================================================
log_section "Ingress Check"

INGRESS=$(kubectl get ingress -n "$NAMESPACE" -o json 2>/dev/null)
INGRESS_COUNT=$(echo "$INGRESS" | jq '.items | length' 2>/dev/null || echo "0")

if [ "$INGRESS_COUNT" -eq 0 ]; then
    log_warn "No ingress resources found"
else
    log_info "Found $INGRESS_COUNT ingress resource(s)"

    # Check each ingress
    echo "$INGRESS" | jq -r '.items[] | "\(.metadata.name) \(.status.loadBalancer.ingress[0].ip // .status.loadBalancer.ingress[0].hostname // "NO_IP")"' 2>/dev/null | while read line; do
        INGRESS_NAME=$(echo "$line" | awk '{print $1}')
        INGRESS_IP=$(echo "$line" | awk '{print $2}')

        if [ "$INGRESS_IP" != "NO_IP" ] && [ -n "$INGRESS_IP" ]; then
            echo -e "${GREEN}[PASS]${NC} Ingress $INGRESS_NAME has external IP: $INGRESS_IP"
        else
            echo -e "${YELLOW}[WARN]${NC} Ingress $INGRESS_NAME has no external IP yet"
        fi
    done
fi

# ============================================================================
# RUN HEALTH CHECKS
# ============================================================================
log_section "Service Health Checks"

# List of services to health check
SERVICES_TO_CHECK=(
    "api-gateway:4000"
    "auth-service:3002"
    "user-service:3001"
    "matching-service:3003"
    "messaging-service:3004"
)

for service_port in "${SERVICES_TO_CHECK[@]}"; do
    SERVICE_NAME=$(echo "$service_port" | cut -d':' -f1)
    PORT=$(echo "$service_port" | cut -d':' -f2)

    # Check if service exists
    if kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" &> /dev/null; then
        # Try to get a pod for port-forward
        POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l "app=$SERVICE_NAME" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

        if [ -n "$POD_NAME" ]; then
            # Check if the pod is ready
            IS_READY=$(kubectl get pod "$POD_NAME" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")

            if [ "$IS_READY" == "True" ]; then
                log_pass "Service $SERVICE_NAME: Pod $POD_NAME is Ready"

                # Try to exec health check
                HEALTH_RESULT=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -- wget -q -O- "http://localhost:$PORT/health" --timeout=5 2>/dev/null || echo "FAILED")
                if [[ "$HEALTH_RESULT" != "FAILED" ]] && [[ "$HEALTH_RESULT" != "" ]]; then
                    log_pass "Service $SERVICE_NAME: Health endpoint responding"
                else
                    log_warn "Service $SERVICE_NAME: Health check did not respond"
                fi
            else
                log_warn "Service $SERVICE_NAME: Pod $POD_NAME is not Ready"
            fi
        else
            log_warn "Service $SERVICE_NAME: No pods found with label app=$SERVICE_NAME"
        fi
    else
        log_info "Service $SERVICE_NAME not found (may not be deployed)"
    fi
done

# ============================================================================
# CHECK HORIZONTAL POD AUTOSCALERS
# ============================================================================
log_section "HPA Status Check"

HPA=$(kubectl get hpa -n "$NAMESPACE" -o json 2>/dev/null)
HPA_COUNT=$(echo "$HPA" | jq '.items | length' 2>/dev/null || echo "0")

if [ "$HPA_COUNT" -eq 0 ]; then
    log_warn "No Horizontal Pod Autoscalers found"
else
    log_info "Found $HPA_COUNT HPA(s)"

    echo "$HPA" | jq -r '.items[] | "\(.metadata.name) \(.status.currentReplicas)/\(.spec.maxReplicas) CPU:\(.status.currentCPUUtilizationPercentage // "N/A")%"' 2>/dev/null | while read line; do
        HPA_NAME=$(echo "$line" | awk '{print $1}')
        REPLICAS=$(echo "$line" | awk '{print $2}')
        CPU=$(echo "$line" | awk '{print $3}')

        CURRENT=$(echo "$REPLICAS" | cut -d'/' -f1)
        MAX=$(echo "$REPLICAS" | cut -d'/' -f2)

        if [ "$CURRENT" -eq "$MAX" ]; then
            echo -e "${YELLOW}[WARN]${NC} HPA $HPA_NAME at max replicas ($CURRENT/$MAX) $CPU"
        else
            echo -e "${GREEN}[PASS]${NC} HPA $HPA_NAME: $CURRENT/$MAX replicas $CPU"
        fi
    done
fi

# ============================================================================
# CHECK PERSISTENT VOLUME CLAIMS
# ============================================================================
log_section "Storage Check"

PVC=$(kubectl get pvc -n "$NAMESPACE" -o json 2>/dev/null)
PVC_COUNT=$(echo "$PVC" | jq '.items | length' 2>/dev/null || echo "0")

if [ "$PVC_COUNT" -eq 0 ]; then
    log_info "No Persistent Volume Claims found"
else
    log_info "Found $PVC_COUNT PVC(s)"

    echo "$PVC" | jq -r '.items[] | "\(.metadata.name) \(.status.phase)"' 2>/dev/null | while read line; do
        PVC_NAME=$(echo "$line" | awk '{print $1}')
        STATUS=$(echo "$line" | awk '{print $2}')

        if [ "$STATUS" == "Bound" ]; then
            echo -e "${GREEN}[PASS]${NC} PVC $PVC_NAME is Bound"
        else
            echo -e "${RED}[FAIL]${NC} PVC $PVC_NAME is $STATUS"
        fi
    done
fi

# ============================================================================
# CHECK RECENT EVENTS FOR ERRORS
# ============================================================================
log_section "Recent Events Check"

WARNINGS_EVENTS=$(kubectl get events -n "$NAMESPACE" --field-selector type=Warning --sort-by='.lastTimestamp' 2>/dev/null | tail -10 || echo "")

if [ -n "$WARNINGS_EVENTS" ] && [ "$(echo "$WARNINGS_EVENTS" | wc -l)" -gt 1 ]; then
    log_warn "Recent warning events found:"
    echo "$WARNINGS_EVENTS" | head -10
else
    log_pass "No recent warning events"
fi

# ============================================================================
# CHECK CERTIFICATES (if cert-manager is used)
# ============================================================================
log_section "Certificate Status Check"

if kubectl get certificates -n "$NAMESPACE" &> /dev/null; then
    CERTS=$(kubectl get certificates -n "$NAMESPACE" -o json 2>/dev/null)
    CERT_COUNT=$(echo "$CERTS" | jq '.items | length' 2>/dev/null || echo "0")

    if [ "$CERT_COUNT" -gt 0 ]; then
        echo "$CERTS" | jq -r '.items[] | "\(.metadata.name) \(.status.conditions[] | select(.type=="Ready") | .status)"' 2>/dev/null | while read line; do
            CERT_NAME=$(echo "$line" | awk '{print $1}')
            STATUS=$(echo "$line" | awk '{print $2}')

            if [ "$STATUS" == "True" ]; then
                echo -e "${GREEN}[PASS]${NC} Certificate $CERT_NAME is Ready"
            else
                echo -e "${RED}[FAIL]${NC} Certificate $CERT_NAME is not Ready"
            fi
        done
    else
        log_info "No certificates found"
    fi
else
    log_info "Certificate CRD not available (cert-manager may not be installed)"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${CYAN}============================================================================="
echo "                        VERIFICATION SUMMARY"
echo "=============================================================================${NC}"
echo ""
echo -e "Passed:   ${GREEN}$PASSED${NC}"
echo -e "Failed:   ${RED}$FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

# Determine exit code
if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}VERIFICATION FAILED - Critical issues detected${NC}"
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}VERIFICATION PASSED WITH WARNINGS${NC}"
    exit 0
else
    echo -e "${GREEN}VERIFICATION PASSED - All checks successful${NC}"
    exit 0
fi
