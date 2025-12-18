#!/bin/bash
# Flamoral Dating Platform - Health Check Verification Script
# This script verifies that health check configurations are correct

set -e

NAMESPACE="flamoral-dating"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_header() {
    echo -e "${CYAN}$1${NC}"
}

# Check if deployment exists
deployment_exists() {
    kubectl get deployment "$1" -n "$NAMESPACE" &> /dev/null
    return $?
}

# Get probe configuration for a deployment
get_probe_path() {
    local SERVICE=$1
    local PROBE_TYPE=$2  # livenessProbe or readinessProbe

    kubectl get deployment "$SERVICE" -n "$NAMESPACE" \
        -o jsonpath="{.spec.template.spec.containers[0].$PROBE_TYPE.httpGet.path}" 2>/dev/null || echo "N/A"
}

# Get probe port for a deployment
get_probe_port() {
    local SERVICE=$1
    local PROBE_TYPE=$2

    kubectl get deployment "$SERVICE" -n "$NAMESPACE" \
        -o jsonpath="{.spec.template.spec.containers[0].$PROBE_TYPE.httpGet.port}" 2>/dev/null || echo "N/A"
}

# Get pod status
get_pod_status() {
    local SERVICE=$1
    kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" \
        -o jsonpath='{.items[*].status.phase}' 2>/dev/null | head -1 || echo "N/A"
}

# Get ready pod count
get_ready_pods() {
    local SERVICE=$1
    local READY=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" \
        -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}' 2>/dev/null | grep -c "True" || echo "0")
    local TOTAL=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" --no-headers 2>/dev/null | wc -l)
    echo "$READY/$TOTAL"
}

# Test health endpoint
test_health_endpoint() {
    local SERVICE=$1
    local PORT=$2
    local PATH=$3

    # Try to port-forward and curl (with timeout)
    print_info "Testing $SERVICE health endpoint at $PATH..."

    # Get a running pod
    local POD=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -z "$POD" ]; then
        print_error "No pods found for $SERVICE"
        return 1
    fi

    # Test the endpoint directly from within the pod
    if kubectl exec -n "$NAMESPACE" "$POD" -- wget -qO- --timeout=5 "http://localhost:$PORT$PATH" &>/dev/null; then
        print_success "Health endpoint responding correctly"
        return 0
    else
        print_error "Health endpoint not responding"
        return 1
    fi
}

# Main script
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Flamoral - Health Check Verification Report                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed"
    exit 1
fi

CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
print_info "Cluster Context: $CURRENT_CONTEXT"
print_info "Namespace: $NAMESPACE"
echo ""

# Verify namespace exists
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    print_error "Namespace $NAMESPACE does not exist"
    exit 1
fi

# Services to check
ALL_SERVICES=(
    "api-gateway"
    "user-service"
    "auth-service"
    "matching-service"
    "messaging-service"
    "media-service"
    "payment-service"
    "notification-service"
    "analytics-service"
    "moderation-service"
    "admin-service"
    "advertising-service"
    "automation-service"
    "realtime-service"
    "workflow-engine"
    "ai-recommendation-service"
    "nlp-service"
    "content-generator"
)

print_header "═══════════════════════════════════════════════════════════════"
print_header "Service Health Check Configuration"
print_header "═══════════════════════════════════════════════════════════════"
echo ""

printf "%-30s %-12s %-12s %-10s %-12s\n" "SERVICE" "LIVENESS" "READINESS" "STATUS" "READY PODS"
printf "%-30s %-12s %-12s %-10s %-12s\n" "-------" "--------" "---------" "------" "----------"

CORRECT_COUNT=0
INCORRECT_COUNT=0
MISSING_COUNT=0

for SERVICE in "${ALL_SERVICES[@]}"; do
    if ! deployment_exists "$SERVICE"; then
        printf "%-30s %-12s %-12s %-10s %-12s\n" "$SERVICE" "N/A" "N/A" "NOT FOUND" "0/0"
        ((MISSING_COUNT++))
        continue
    fi

    LIVENESS_PATH=$(get_probe_path "$SERVICE" "livenessProbe")
    READINESS_PATH=$(get_probe_path "$SERVICE" "readinessProbe")
    POD_STATUS=$(get_pod_status "$SERVICE")
    READY_PODS=$(get_ready_pods "$SERVICE")

    printf "%-30s %-12s %-12s %-10s %-12s\n" \
        "$SERVICE" "$LIVENESS_PATH" "$READINESS_PATH" "$POD_STATUS" "$READY_PODS"

    # Check if paths are correct
    if [ "$LIVENESS_PATH" = "/health" ] && [ "$READINESS_PATH" = "/health" ]; then
        ((CORRECT_COUNT++))
    elif [ "$LIVENESS_PATH" = "/health" ] && [ "$READINESS_PATH" = "/ready" ]; then
        ((CORRECT_COUNT++))
    else
        ((INCORRECT_COUNT++))
    fi
done

echo ""
print_header "═══════════════════════════════════════════════════════════════"
print_header "Summary"
print_header "═══════════════════════════════════════════════════════════════"
echo ""

print_success "Correct configurations: $CORRECT_COUNT"
print_error "Incorrect configurations: $INCORRECT_COUNT"
print_warning "Services not found: $MISSING_COUNT"

echo ""
print_header "═══════════════════════════════════════════════════════════════"
print_header "Pod Health Status"
print_header "═══════════════════════════════════════════════════════════════"
echo ""

# Get pod status details
kubectl get pods -n "$NAMESPACE" -o wide 2>/dev/null || print_error "Failed to get pods"

echo ""
print_header "═══════════════════════════════════════════════════════════════"
print_header "Recent Health Check Related Events"
print_header "═══════════════════════════════════════════════════════════════"
echo ""

# Get recent events related to health checks
kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' 2>/dev/null | \
    grep -i -E 'liveness|readiness|unhealthy|health|probe' | tail -20 || \
    print_info "No health check related events found"

echo ""
print_header "═══════════════════════════════════════════════════════════════"
print_header "Deployment Readiness"
print_header "═══════════════════════════════════════════════════════════════"
echo ""

# Check deployment status
kubectl get deployments -n "$NAMESPACE" 2>/dev/null || print_error "Failed to get deployments"

echo ""
print_header "═══════════════════════════════════════════════════════════════"
print_header "Recommendations"
print_header "═══════════════════════════════════════════════════════════════"
echo ""

if [ $INCORRECT_COUNT -gt 0 ]; then
    print_warning "Found $INCORRECT_COUNT services with incorrect health check paths"
    echo "  → Run: ./fix-health-checks.sh"
fi

if [ $MISSING_COUNT -gt 0 ]; then
    print_info "$MISSING_COUNT services were not found in the cluster"
    echo "  → These may not be deployed yet or have different names"
fi

# Check for unhealthy pods
UNHEALTHY_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running 2>/dev/null | tail -n +2 | wc -l)
if [ "$UNHEALTHY_PODS" -gt 0 ]; then
    print_error "Found $UNHEALTHY_PODS unhealthy pods"
    echo "  → Check: kubectl describe pod <pod-name> -n $NAMESPACE"
    echo "  → Check logs: kubectl logs <pod-name> -n $NAMESPACE"
fi

# Check for pods with restart count > 0
HIGH_RESTART_PODS=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.containerStatuses[0].restartCount}{"\n"}{end}' 2>/dev/null | awk '$2 > 0' | wc -l)
if [ "$HIGH_RESTART_PODS" -gt 0 ]; then
    print_warning "Found $HIGH_RESTART_PODS pods with restarts"
    echo ""
    print_info "Pods with restarts:"
    kubectl get pods -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.name}{" restarts: "}{.status.containerStatuses[0].restartCount}{"\n"}{end}' 2>/dev/null | awk '$3 > 0'
fi

echo ""
print_header "═══════════════════════════════════════════════════════════════"

if [ $INCORRECT_COUNT -eq 0 ] && [ $UNHEALTHY_PODS -eq 0 ]; then
    print_success "All health checks are configured correctly!"
    exit 0
else
    print_warning "Some issues detected. Review the report above."
    exit 1
fi
