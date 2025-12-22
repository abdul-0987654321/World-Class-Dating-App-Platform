#!/bin/bash
# Flamoral Monitoring Verification Script
# Run this after deployment to verify everything is working

set -euo pipefail

NAMESPACE="monitoring"
RELEASE_NAME="flamoral-prometheus"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if "$@"; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

echo ""
echo "=============================================="
echo "   FLAMORAL MONITORING VERIFICATION          "
echo "=============================================="
echo ""

# 1. Check namespace exists
log_info "Checking namespace..."
if kubectl get namespace ${NAMESPACE} &> /dev/null; then
    check log_success "Namespace '${NAMESPACE}' exists"
else
    check log_error "Namespace '${NAMESPACE}' not found"
fi

# 2. Check Prometheus is running
log_info "Checking Prometheus..."
PROMETHEUS_PODS=$(kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "")
if [[ "$PROMETHEUS_PODS" == *"Running"* ]]; then
    check log_success "Prometheus pods are running"
else
    check log_error "Prometheus pods are not running"
fi

# 3. Check Alertmanager is running
log_info "Checking Alertmanager..."
ALERTMANAGER_PODS=$(kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/name=alertmanager -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "")
if [[ "$ALERTMANAGER_PODS" == *"Running"* ]]; then
    check log_success "Alertmanager pods are running"
else
    check log_error "Alertmanager pods are not running"
fi

# 4. Check Grafana is running
log_info "Checking Grafana..."
GRAFANA_PODS=$(kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/name=grafana -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "")
if [[ "$GRAFANA_PODS" == *"Running"* ]]; then
    check log_success "Grafana pods are running"
else
    check log_error "Grafana pods are not running"
fi

# 5. Check node-exporter is running
log_info "Checking node-exporter..."
NODE_EXPORTER_PODS=$(kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/name=node-exporter -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "")
if [[ "$NODE_EXPORTER_PODS" == *"Running"* ]]; then
    check log_success "Node-exporter pods are running"
else
    check log_error "Node-exporter pods are not running"
fi

# 6. Check kube-state-metrics is running
log_info "Checking kube-state-metrics..."
KSM_PODS=$(kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/name=kube-state-metrics -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "")
if [[ "$KSM_PODS" == *"Running"* ]]; then
    check log_success "kube-state-metrics pods are running"
else
    check log_error "kube-state-metrics pods are not running"
fi

# 7. Check ServiceMonitors exist
log_info "Checking ServiceMonitors..."
SM_COUNT=$(kubectl get servicemonitors -n ${NAMESPACE} --no-headers 2>/dev/null | wc -l)
if [ "$SM_COUNT" -gt 0 ]; then
    check log_success "Found ${SM_COUNT} ServiceMonitors"
else
    check log_error "No ServiceMonitors found"
fi

# 8. Check PrometheusRules exist
log_info "Checking PrometheusRules..."
PR_COUNT=$(kubectl get prometheusrules -n ${NAMESPACE} --no-headers 2>/dev/null | wc -l)
if [ "$PR_COUNT" -gt 0 ]; then
    check log_success "Found ${PR_COUNT} PrometheusRules"
else
    check log_error "No PrometheusRules found"
fi

# 9. Check Grafana dashboards ConfigMap
log_info "Checking Grafana dashboards ConfigMap..."
if kubectl get configmap grafana-flamoral-dashboards -n ${NAMESPACE} &> /dev/null; then
    check log_success "Grafana dashboards ConfigMap exists"
else
    check log_warning "Grafana dashboards ConfigMap not found (may be OK if using different provisioning)"
fi

# 10. Verify Prometheus is scraping targets
log_info "Checking Prometheus targets..."
echo ""
log_info "Starting port-forward to check Prometheus targets..."

# Start port-forward in background
kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-prometheus 9090:9090 &>/dev/null &
PF_PID=$!
sleep 3

# Check targets via API
if curl -s http://localhost:9090/api/v1/targets 2>/dev/null | grep -q '"health":"up"'; then
    UP_TARGETS=$(curl -s http://localhost:9090/api/v1/targets 2>/dev/null | grep -o '"health":"up"' | wc -l)
    check log_success "Prometheus is scraping ${UP_TARGETS} healthy targets"
else
    check log_warning "Could not verify Prometheus targets (port-forward may have failed)"
fi

# Kill port-forward
kill $PF_PID 2>/dev/null || true

# 11. Verify Grafana is accessible
log_info "Checking Grafana health..."
kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-grafana 3000:80 &>/dev/null &
PF_PID=$!
sleep 3

if curl -s http://localhost:3000/api/health 2>/dev/null | grep -q '"database":"ok"'; then
    check log_success "Grafana is healthy"
else
    check log_warning "Could not verify Grafana health (port-forward may have failed)"
fi

kill $PF_PID 2>/dev/null || true

# 12. Check Ingress resources
log_info "Checking Ingress resources..."
INGRESS_COUNT=$(kubectl get ingress -n ${NAMESPACE} --no-headers 2>/dev/null | wc -l)
if [ "$INGRESS_COUNT" -gt 0 ]; then
    check log_success "Found ${INGRESS_COUNT} Ingress resources"
    kubectl get ingress -n ${NAMESPACE}
else
    check log_warning "No Ingress resources found (using port-forward mode)"
fi

# 13. Check TLS certificates (if cert-manager is used)
log_info "Checking TLS certificates..."
CERT_COUNT=$(kubectl get certificates -n ${NAMESPACE} --no-headers 2>/dev/null | wc -l)
if [ "$CERT_COUNT" -gt 0 ]; then
    check log_success "Found ${CERT_COUNT} TLS certificates"
else
    check log_warning "No TLS certificates found (may need cert-manager)"
fi

# Summary
echo ""
echo "=============================================="
echo "           VERIFICATION SUMMARY               "
echo "=============================================="
echo ""
echo -e "Total Checks: ${TOTAL_CHECKS}"
echo -e "${GREEN}Passed: ${PASSED_CHECKS}${NC}"
echo -e "${RED}Failed: ${FAILED_CHECKS}${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    log_success "All checks passed! Monitoring is operational."
else
    log_warning "Some checks failed. Please review the output above."
fi

echo ""
echo "=============================================="
echo "          QUICK ACCESS COMMANDS               "
echo "=============================================="
echo ""
echo "Grafana (port-forward):"
echo "  kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-grafana 3000:80"
echo "  Open: http://localhost:3000"
echo ""
echo "Prometheus (port-forward):"
echo "  kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-prometheus 9090:9090"
echo "  Open: http://localhost:9090"
echo ""
echo "Alertmanager (port-forward):"
echo "  kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-alertmanager 9093:9093"
echo "  Open: http://localhost:9093"
echo ""
echo "Get Grafana admin password:"
echo "  kubectl get secret -n ${NAMESPACE} ${RELEASE_NAME}-grafana -o jsonpath='{.data.admin-password}' | base64 --decode"
echo ""

# Test Alert instructions
echo "=============================================="
echo "            TEST ALERT RULE                   "
echo "=============================================="
echo ""
echo "To test alerting, you can temporarily trigger an alert:"
echo ""
echo "1. Create a failing pod (triggers PodCrashLooping):"
echo "   kubectl run test-crash --image=alpine -n flamoral -- /bin/sh -c 'exit 1'"
echo ""
echo "2. Check alerts in Prometheus:"
echo "   http://localhost:9090/alerts"
echo ""
echo "3. Clean up test pod:"
echo "   kubectl delete pod test-crash -n flamoral"
echo ""
