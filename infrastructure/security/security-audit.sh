#!/bin/bash
# Security Audit Script for Dating App Platform
# Performs comprehensive security checks and generates report

set -euo pipefail

REPORT_DIR="/tmp/security-audit-$(date +%Y%m%d)"
REPORT_FILE="${REPORT_DIR}/security-audit-report.html"
mkdir -p "${REPORT_DIR}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $*"
    echo "<p class='pass'>[PASS] $*</p>" >> "${REPORT_FILE}"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $*"
    echo "<p class='fail'>[FAIL] $*</p>" >> "${REPORT_FILE}"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
    echo "<p class='warn'>[WARN] $*</p>" >> "${REPORT_FILE}"
}

log_info() {
    echo "[INFO] $*"
    echo "<p class='info'>[INFO] $*</p>" >> "${REPORT_FILE}"
}

# Initialize HTML report
cat > "${REPORT_FILE}" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>Security Audit Report - $(date)</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        h2 { color: #666; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
        .pass { color: green; }
        .fail { color: red; font-weight: bold; }
        .warn { color: orange; }
        .info { color: blue; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        .summary { background-color: #f0f0f0; padding: 15px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Security Audit Report</h1>
    <p>Generated: $(date)</p>
    <p>Environment: Production</p>
EOF

# ====================================
# 1. Kubernetes Security Checks
# ====================================
echo "<h2>1. Kubernetes Security Checks</h2>" >> "${REPORT_FILE}"
log_info "Starting Kubernetes security audit..."

# Check RBAC is enabled
log_info "Checking RBAC configuration..."
if kubectl auth can-i --list > /dev/null 2>&1; then
    log_pass "RBAC is enabled"
else
    log_fail "RBAC is not properly configured"
fi

# Check for pods running as root
log_info "Checking for pods running as root..."
ROOT_PODS=$(kubectl get pods -n dating-app-production -o json | \
    jq -r '.items[] | select(.spec.containers[].securityContext.runAsUser == 0) | .metadata.name' | wc -l)
if [ "${ROOT_PODS}" -eq 0 ]; then
    log_pass "No pods running as root"
else
    log_fail "${ROOT_PODS} pods running as root (security risk)"
fi

# Check for privileged containers
log_info "Checking for privileged containers..."
PRIV_PODS=$(kubectl get pods -n dating-app-production -o json | \
    jq -r '.items[] | select(.spec.containers[].securityContext.privileged == true) | .metadata.name' | wc -l)
if [ "${PRIV_PODS}" -eq 0 ]; then
    log_pass "No privileged containers found"
else
    log_fail "${PRIV_PODS} privileged containers found (critical risk)"
fi

# Check Pod Security Policies
log_info "Checking Pod Security Policies..."
if kubectl get psp restricted > /dev/null 2>&1; then
    log_pass "Pod Security Policy is configured"
else
    log_warn "Pod Security Policy not found"
fi

# Check Network Policies
log_info "Checking Network Policies..."
NP_COUNT=$(kubectl get networkpolicies -n dating-app-production --no-headers | wc -l)
if [ "${NP_COUNT}" -gt 0 ]; then
    log_pass "${NP_COUNT} Network Policies configured"
else
    log_fail "No Network Policies found (pods can communicate freely)"
fi

# Check for default service account usage
log_info "Checking service account usage..."
DEFAULT_SA=$(kubectl get pods -n dating-app-production -o json | \
    jq -r '.items[] | select(.spec.serviceAccountName == "default") | .metadata.name' | wc -l)
if [ "${DEFAULT_SA}" -eq 0 ]; then
    log_pass "No pods using default service account"
else
    log_warn "${DEFAULT_SA} pods using default service account"
fi

# ====================================
# 2. Azure Resource Security Checks
# ====================================
echo "<h2>2. Azure Resource Security Checks</h2>" >> "${REPORT_FILE}"
log_info "Starting Azure security audit..."

# Check if Defender for Cloud is enabled
log_info "Checking Microsoft Defender for Cloud..."
DEFENDER_STATUS=$(az security pricing list --query "[?pricingTier=='Standard'].name" -o tsv | wc -l)
if [ "${DEFENDER_STATUS}" -gt 5 ]; then
    log_pass "Microsoft Defender for Cloud is enabled"
else
    log_warn "Some Defender for Cloud services are not enabled"
fi

# Check Key Vault access policies
log_info "Checking Key Vault security..."
KV_POLICIES=$(az keyvault show --name production-dating-kv \
    --query "properties.accessPolicies | length(@)" -o tsv 2>/dev/null || echo "0")
if [ "${KV_POLICIES}" -gt 0 ]; then
    log_pass "Key Vault has ${KV_POLICIES} access policies"
else
    log_fail "Key Vault has no access policies configured"
fi

# Check if storage accounts require HTTPS
log_info "Checking storage account HTTPS requirements..."
STORAGE_HTTPS=$(az storage account list -g production-dating-app-rg \
    --query "[?enableHttpsTrafficOnly==\`false\`].name" -o tsv | wc -l)
if [ "${STORAGE_HTTPS}" -eq 0 ]; then
    log_pass "All storage accounts require HTTPS"
else
    log_fail "${STORAGE_HTTPS} storage accounts allow HTTP traffic"
fi

# Check PostgreSQL firewall rules
log_info "Checking PostgreSQL firewall rules..."
PG_RULES=$(az postgres flexible-server firewall-rule list \
    -g production-dating-app-rg \
    --name production-dating-app-postgres \
    --query "length(@)" -o tsv 2>/dev/null || echo "0")
log_info "PostgreSQL has ${PG_RULES} firewall rules"

# Check if DDoS protection is enabled
log_info "Checking DDoS protection..."
DDOS_STATUS=$(az network ddos-protection list \
    --query "length(@)" -o tsv 2>/dev/null || echo "0")
if [ "${DDOS_STATUS}" -gt 0 ]; then
    log_pass "DDoS protection plan is configured"
else
    log_warn "DDoS protection plan not found"
fi

# ====================================
# 3. Certificate and TLS Checks
# ====================================
echo "<h2>3. Certificate and TLS Checks</h2>" >> "${REPORT_FILE}"
log_info "Starting certificate audit..."

# Check certificate expiration
log_info "Checking certificate expiration..."
kubectl get certificates -n dating-app-production -o json | \
    jq -r '.items[] | "\(.metadata.name): \(.status.notAfter)"' | \
    while read -r line; do
        log_info "Certificate: ${line}"
    done

# Check TLS version
log_info "Checking minimum TLS version..."
TLS_VERSION=$(az postgres flexible-server show \
    -g production-dating-app-rg \
    -n production-dating-app-postgres \
    --query "minimalTlsVersion" -o tsv 2>/dev/null || echo "unknown")
if [ "${TLS_VERSION}" = "TLS1_2" ] || [ "${TLS_VERSION}" = "TLS1_3" ]; then
    log_pass "PostgreSQL uses TLS ${TLS_VERSION}"
else
    log_fail "PostgreSQL TLS version is ${TLS_VERSION} (should be 1.2 or higher)"
fi

# ====================================
# 4. Secrets and Credentials
# ====================================
echo "<h2>4. Secrets and Credentials Audit</h2>" >> "${REPORT_FILE}"
log_info "Starting secrets audit..."

# Check for hardcoded secrets in ConfigMaps
log_info "Checking for potential secrets in ConfigMaps..."
SUSPICIOUS_CM=$(kubectl get configmaps -n dating-app-production -o json | \
    jq -r '.items[].data | to_entries[] | select(.value | test("password|secret|key|token"; "i")) | .key' | wc -l)
if [ "${SUSPICIOUS_CM}" -eq 0 ]; then
    log_pass "No suspicious values found in ConfigMaps"
else
    log_warn "${SUSPICIOUS_CM} suspicious values found in ConfigMaps (review needed)"
fi

# Check External Secrets Operator
log_info "Checking External Secrets Operator..."
if kubectl get externalsecrets -n dating-app-production > /dev/null 2>&1; then
    log_pass "External Secrets Operator is deployed"
else
    log_warn "External Secrets Operator not found"
fi

# ====================================
# 5. Container Image Security
# ====================================
echo "<h2>5. Container Image Security</h2>" >> "${REPORT_FILE}"
log_info "Starting container image audit..."

# Run Trivy scan on deployed images
log_info "Scanning container images with Trivy..."
kubectl get pods -n dating-app-production -o json | \
    jq -r '.items[].spec.containers[].image' | sort -u | \
    while read -r image; do
        log_info "Scanning image: ${image}"
        trivy image --severity HIGH,CRITICAL "${image}" > "${REPORT_DIR}/trivy-${image##*/}.txt" 2>&1 || true
    done

# ====================================
# 6. Compliance Checks
# ====================================
echo "<h2>6. Compliance Checks</h2>" >> "${REPORT_FILE}"
log_info "Starting compliance audit..."

# Check audit logging
log_info "Checking Kubernetes audit logging..."
if kubectl get configmap -n kube-system kube-apiserver > /dev/null 2>&1; then
    log_pass "Audit logging appears to be configured"
else
    log_warn "Cannot verify audit logging configuration"
fi

# Check backup configuration
log_info "Checking backup configuration..."
if az backup vault list -g production-dating-app-rg --query "length(@)" -o tsv | grep -q "1"; then
    log_pass "Backup vault is configured"
else
    log_warn "Backup vault not found or not configured"
fi

# ====================================
# 7. Generate Summary
# ====================================
echo "<h2>Summary</h2>" >> "${REPORT_FILE}"
PASS_COUNT=$(grep -c "\[PASS\]" "${REPORT_FILE}" || echo "0")
FAIL_COUNT=$(grep -c "\[FAIL\]" "${REPORT_FILE}" || echo "0")
WARN_COUNT=$(grep -c "\[WARN\]" "${REPORT_FILE}" || echo "0")

cat >> "${REPORT_FILE}" <<EOF
<div class="summary">
    <h3>Audit Summary</h3>
    <p>Total Checks: $((PASS_COUNT + FAIL_COUNT + WARN_COUNT))</p>
    <p class="pass">Passed: ${PASS_COUNT}</p>
    <p class="fail">Failed: ${FAIL_COUNT}</p>
    <p class="warn">Warnings: ${WARN_COUNT}</p>
</div>
EOF

# Close HTML
echo "</body></html>" >> "${REPORT_FILE}"

log_info "Security audit complete. Report saved to: ${REPORT_FILE}"

# Upload report to Azure Storage
az storage blob upload \
    --account-name productiondatingappbackup \
    --container-name security-reports \
    --name "security-audit-$(date +%Y%m%d).html" \
    --file "${REPORT_FILE}" \
    2>/dev/null || log_warn "Failed to upload report to Azure Storage"

# Send notification
if [ "${FAIL_COUNT}" -gt 0 ]; then
    log_fail "Security audit found ${FAIL_COUNT} critical issues!"
    exit 1
else
    log_pass "Security audit completed successfully with no critical issues"
    exit 0
fi
