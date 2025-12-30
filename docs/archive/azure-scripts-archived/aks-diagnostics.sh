#!/bin/bash
set -euo pipefail

# =============================================================================
# FLAMORAL AKS DIAGNOSTICS & SELF-HEALING SCRIPT
# Implements parallel agent checks for AKS cluster health
# =============================================================================

NAMESPACE="${NAMESPACE:-flamoral}"
OUTPUT_DIR="./aks-diagnostics-$(date +%Y%m%d-%H%M%S)"
AUTO_FIX="${AUTO_FIX:-false}"
AUTO_FIX_MAX_TIER="${AUTO_FIX_MAX_TIER:-2}"
PRODUCTION="${PRODUCTION:-true}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}=== FLAMORAL AKS DIAGNOSTICS ===${NC}"
echo "Namespace: $NAMESPACE"
echo "Output: $OUTPUT_DIR"
echo "Auto-fix: $AUTO_FIX (Max Tier: $AUTO_FIX_MAX_TIER)"

# =============================================================================
# EVIDENCE COLLECTION (Run First, Always)
# =============================================================================
collect_evidence() {
    echo -e "${BLUE}[1/8] Collecting Evidence...${NC}"

    kubectl get pods -A -o wide > "$OUTPUT_DIR/pods-all.txt" 2>&1 || true
    kubectl get pods -n "$NAMESPACE" -o wide > "$OUTPUT_DIR/pods-namespace.txt" 2>&1 || true
    kubectl get deploy,rs,svc,ep,ing -A > "$OUTPUT_DIR/resources.txt" 2>&1 || true
    kubectl get events -A --sort-by=.lastTimestamp | tail -n 200 > "$OUTPUT_DIR/events.txt" 2>&1 || true
    kubectl top pods -A > "$OUTPUT_DIR/pod-metrics.txt" 2>&1 || true
    kubectl top nodes > "$OUTPUT_DIR/node-metrics.txt" 2>&1 || true
    kubectl get nodes -o wide > "$OUTPUT_DIR/nodes.txt" 2>&1 || true
    kubectl -n kube-system get pods -o wide > "$OUTPUT_DIR/kube-system-pods.txt" 2>&1 || true

    # Ingress controller logs
    kubectl -n ingress-nginx get pods -o wide > "$OUTPUT_DIR/ingress-pods.txt" 2>&1 || true
    kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --tail=200 > "$OUTPUT_DIR/ingress-logs.txt" 2>&1 || true

    echo -e "${GREEN}Evidence collected to $OUTPUT_DIR${NC}"
}

# =============================================================================
# AGENT A: Workload Health
# =============================================================================
agent_a_workload() {
    echo -e "${BLUE}[Agent A] Checking Workload Health...${NC}"
    local issues=0
    local report="$OUTPUT_DIR/agent-a-workload.md"

    echo "# Agent A: Workload Health Report" > "$report"
    echo "Generated: $(date)" >> "$report"
    echo "" >> "$report"

    # Check for CrashLoopBackOff
    crashloop=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$crashloop" ]; then
        echo "## CrashLoopBackOff/Failed Pods" >> "$report"
        echo "$crashloop" >> "$report"
        issues=$((issues + 1))
    fi

    # Check for ImagePullBackOff
    imagepull=$(kubectl get pods -n "$NAMESPACE" -o json | grep -c "ImagePullBackOff" || echo "0")
    if [ "$imagepull" -gt 0 ]; then
        echo "## ImagePullBackOff Issues: $imagepull" >> "$report"
        issues=$((issues + 1))
    fi

    # Check probe failures in events
    probe_failures=$(grep -i "probe failed\|Unhealthy" "$OUTPUT_DIR/events.txt" 2>/dev/null | wc -l || echo "0")
    if [ "$probe_failures" -gt 0 ]; then
        echo "## Probe Failures: $probe_failures" >> "$report"
        issues=$((issues + 1))
    fi

    echo "## Summary: $issues issues found" >> "$report"

    if [ $issues -gt 0 ]; then
        echo -e "${YELLOW}[Agent A] Found $issues workload issues${NC}"
        return 1
    else
        echo -e "${GREEN}[Agent A] Workloads healthy${NC}"
        return 0
    fi
}

# =============================================================================
# AGENT B: Scheduling & Nodes
# =============================================================================
agent_b_scheduling() {
    echo -e "${BLUE}[Agent B] Checking Scheduling & Nodes...${NC}"
    local issues=0
    local report="$OUTPUT_DIR/agent-b-scheduling.md"

    echo "# Agent B: Scheduling & Node Health Report" > "$report"

    # Check for NotReady nodes
    notready=$(kubectl get nodes --no-headers | grep -v " Ready" | wc -l || echo "0")
    if [ "$notready" -gt 0 ]; then
        echo "## NotReady Nodes: $notready" >> "$report"
        kubectl get nodes --no-headers | grep -v " Ready" >> "$report"
        issues=$((issues + 1))
    fi

    # Check for scheduling failures
    sched_fail=$(grep -i "FailedScheduling\|Insufficient" "$OUTPUT_DIR/events.txt" 2>/dev/null | wc -l || echo "0")
    if [ "$sched_fail" -gt 0 ]; then
        echo "## Scheduling Failures: $sched_fail" >> "$report"
        issues=$((issues + 1))
    fi

    # Check for node pressure
    pressure=$(kubectl get nodes -o json | grep -E "DiskPressure|MemoryPressure|PIDPressure" | grep -c "True" || echo "0")
    if [ "$pressure" -gt 0 ]; then
        echo "## Node Pressure Conditions: $pressure" >> "$report"
        issues=$((issues + 1))
    fi

    echo "## Summary: $issues issues found" >> "$report"

    if [ $issues -gt 0 ]; then
        echo -e "${YELLOW}[Agent B] Found $issues scheduling/node issues${NC}"
        return 1
    else
        echo -e "${GREEN}[Agent B] Nodes healthy${NC}"
        return 0
    fi
}

# =============================================================================
# AGENT C: Service Routing
# =============================================================================
agent_c_routing() {
    echo -e "${BLUE}[Agent C] Checking Service Routing...${NC}"
    local issues=0
    local report="$OUTPUT_DIR/agent-c-routing.md"

    echo "# Agent C: Service Routing Report" > "$report"

    # Check for services with no endpoints
    no_endpoints=$(kubectl get endpoints -n "$NAMESPACE" -o json | jq -r '.items[] | select(.subsets == null or .subsets == []) | .metadata.name' 2>/dev/null || echo "")
    if [ -n "$no_endpoints" ]; then
        echo "## Services with NO Endpoints:" >> "$report"
        echo "$no_endpoints" >> "$report"
        issues=$((issues + 1))
    fi

    echo "## Summary: $issues issues found" >> "$report"

    if [ $issues -gt 0 ]; then
        echo -e "${YELLOW}[Agent C] Found $issues routing issues${NC}"
        return 1
    else
        echo -e "${GREEN}[Agent C] Routing healthy${NC}"
        return 0
    fi
}

# =============================================================================
# AGENT D: kube-proxy & Node Networking
# =============================================================================
agent_d_kubeproxy() {
    echo -e "${BLUE}[Agent D] Checking kube-proxy...${NC}"
    local issues=0
    local report="$OUTPUT_DIR/agent-d-kubeproxy.md"

    echo "# Agent D: kube-proxy Report" > "$report"

    # Check kube-proxy pods
    kp_status=$(kubectl -n kube-system get pods -l component=kube-proxy --no-headers 2>/dev/null | grep -v "Running" | wc -l || echo "0")
    if [ "$kp_status" -gt 0 ]; then
        echo "## Unhealthy kube-proxy pods: $kp_status" >> "$report"
        issues=$((issues + 1))
    fi

    echo "## Summary: $issues issues found" >> "$report"

    if [ $issues -gt 0 ]; then
        echo -e "${YELLOW}[Agent D] Found $issues kube-proxy issues${NC}"
        return 1
    else
        echo -e "${GREEN}[Agent D] kube-proxy healthy${NC}"
        return 0
    fi
}

# =============================================================================
# AGENT E: DNS/CoreDNS
# =============================================================================
agent_e_dns() {
    echo -e "${BLUE}[Agent E] Checking CoreDNS...${NC}"
    local issues=0
    local report="$OUTPUT_DIR/agent-e-dns.md"

    echo "# Agent E: CoreDNS Report" > "$report"

    # Check CoreDNS pods
    coredns_bad=$(kubectl -n kube-system get pods -l k8s-app=kube-dns --no-headers 2>/dev/null | grep -v "Running" | wc -l || echo "0")
    if [ "$coredns_bad" -gt 0 ]; then
        echo "## Unhealthy CoreDNS pods: $coredns_bad" >> "$report"
        issues=$((issues + 1))
    fi

    # Check for DNS errors in logs
    kubectl -n kube-system logs -l k8s-app=kube-dns --tail=100 > "$OUTPUT_DIR/coredns-logs.txt" 2>&1 || true
    dns_errors=$(grep -ci "SERVFAIL\|error\|timeout" "$OUTPUT_DIR/coredns-logs.txt" 2>/dev/null || echo "0")
    if [ "$dns_errors" -gt 10 ]; then
        echo "## DNS Errors in logs: $dns_errors" >> "$report"
        issues=$((issues + 1))
    fi

    echo "## Summary: $issues issues found" >> "$report"

    if [ $issues -gt 0 ]; then
        echo -e "${YELLOW}[Agent E] Found $issues DNS issues${NC}"
        return 1
    else
        echo -e "${GREEN}[Agent E] DNS healthy${NC}"
        return 0
    fi
}

# =============================================================================
# AGENT F: CNI / Azure Networking
# =============================================================================
agent_f_cni() {
    echo -e "${BLUE}[Agent F] Checking CNI/Networking...${NC}"
    local issues=0
    local report="$OUTPUT_DIR/agent-f-cni.md"

    echo "# Agent F: CNI/Network Report" > "$report"

    # Check for sandbox creation errors
    sandbox_errors=$(grep -ci "Failed to create pod sandbox\|network\|CNI" "$OUTPUT_DIR/events.txt" 2>/dev/null || echo "0")
    if [ "$sandbox_errors" -gt 0 ]; then
        echo "## Network/CNI errors in events: $sandbox_errors" >> "$report"
        issues=$((issues + 1))
    fi

    echo "## Summary: $issues issues found" >> "$report"

    if [ $issues -gt 0 ]; then
        echo -e "${YELLOW}[Agent F] Found $issues CNI issues${NC}"
        return 1
    else
        echo -e "${GREEN}[Agent F] CNI healthy${NC}"
        return 0
    fi
}

# =============================================================================
# AGENT G: Ingress + TLS
# =============================================================================
agent_g_ingress() {
    echo -e "${BLUE}[Agent G] Checking Ingress...${NC}"
    local issues=0
    local report="$OUTPUT_DIR/agent-g-ingress.md"

    echo "# Agent G: Ingress Report" > "$report"

    # Check ingress controller
    ing_status=$(kubectl -n ingress-nginx get pods --no-headers 2>/dev/null | grep -v "Running" | wc -l || echo "0")
    if [ "$ing_status" -gt 0 ]; then
        echo "## Unhealthy ingress pods: $ing_status" >> "$report"
        issues=$((issues + 1))
    fi

    # Check for 502/503 errors
    ing_errors=$(grep -ci "502\|503\|upstream" "$OUTPUT_DIR/ingress-logs.txt" 2>/dev/null || echo "0")
    if [ "$ing_errors" -gt 10 ]; then
        echo "## Ingress backend errors: $ing_errors" >> "$report"
        issues=$((issues + 1))
    fi

    echo "## Summary: $issues issues found" >> "$report"

    if [ $issues -gt 0 ]; then
        echo -e "${YELLOW}[Agent G] Found $issues ingress issues${NC}"
        return 1
    else
        echo -e "${GREEN}[Agent G] Ingress healthy${NC}"
        return 0
    fi
}

# =============================================================================
# GENERATE FINAL REPORT
# =============================================================================
generate_report() {
    local report="$OUTPUT_DIR/DIAGNOSIS_REPORT.md"

    echo "# AKS Diagnosis Report" > "$report"
    echo "Generated: $(date)" >> "$report"
    echo "Namespace: $NAMESPACE" >> "$report"
    echo "" >> "$report"

    # Merge all agent reports
    for agent_report in "$OUTPUT_DIR"/agent-*.md; do
        if [ -f "$agent_report" ]; then
            echo "" >> "$report"
            cat "$agent_report" >> "$report"
        fi
    done

    echo -e "${GREEN}Report generated: $report${NC}"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    collect_evidence

    # Run agents in parallel
    echo -e "${BLUE}[2/8] Running Parallel Agents...${NC}"

    agent_a_workload &
    pid_a=$!
    agent_b_scheduling &
    pid_b=$!
    agent_c_routing &
    pid_c=$!
    agent_d_kubeproxy &
    pid_d=$!
    agent_e_dns &
    pid_e=$!
    agent_f_cni &
    pid_f=$!
    agent_g_ingress &
    pid_g=$!

    # Wait for all agents
    wait $pid_a || true
    wait $pid_b || true
    wait $pid_c || true
    wait $pid_d || true
    wait $pid_e || true
    wait $pid_f || true
    wait $pid_g || true

    generate_report

    echo -e "${BLUE}=== DIAGNOSIS COMPLETE ===${NC}"
    echo "Output directory: $OUTPUT_DIR"
}

main "$@"
