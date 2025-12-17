#!/bin/bash

################################################################################
# Flamoral Platform - Health Dashboard Script
################################################################################
# This script provides a real-time health dashboard showing the status of all
# services, resource utilization, error rates, and performance metrics.
#
# Usage:
#   ./health-dashboard.sh [options]
#
# Options:
#   -w, --watch SECONDS     Auto-refresh dashboard every N seconds
#   -n, --namespace NAME    Kubernetes namespace (default: flamoral)
#   -j, --json              Output in JSON format
#   -h, --help              Show this help message
#
# Exit Codes:
#   0 - Success
#   1 - Error occurred
#   2 - Script usage error
################################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="flamoral"
WATCH_INTERVAL=0
JSON_OUTPUT=false
PROMETHEUS_URL=""

# Check if Prometheus is available
if kubectl get service -n monitoring prometheus-server &> /dev/null 2>&1; then
    PROMETHEUS_PORT=$(kubectl get service -n monitoring prometheus-server -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "9090")
    PROMETHEUS_URL="http://localhost:${PROMETHEUS_PORT}"
fi

################################################################################
# Helper Functions
################################################################################

print_header() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
        printf "${BLUE}║${NC} ${WHITE}%-62s${NC} ${BLUE}║${NC}\n" "$1"
        echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
    fi
}

print_subheader() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${CYAN}▶ $1${NC}"
    fi
}

format_bytes() {
    local bytes=$1
    if [ "$bytes" -lt 1024 ]; then
        echo "${bytes}B"
    elif [ "$bytes" -lt 1048576 ]; then
        echo "$((bytes / 1024))KB"
    elif [ "$bytes" -lt 1073741824 ]; then
        echo "$((bytes / 1048576))MB"
    else
        echo "$((bytes / 1073741824))GB"
    fi
}

get_status_color() {
    local status=$1
    case $status in
        "Running"|"Succeeded"|"Ready"|"Healthy")
            echo "$GREEN"
            ;;
        "Pending"|"Creating"|"Warning")
            echo "$YELLOW"
            ;;
        "Failed"|"CrashLoopBackOff"|"Error"|"Critical")
            echo "$RED"
            ;;
        *)
            echo "$WHITE"
            ;;
    esac
}

show_help() {
    cat << EOF
Flamoral Platform Health Dashboard

Usage: $0 [options]

Options:
    -w, --watch SECONDS     Auto-refresh dashboard every N seconds
    -n, --namespace NAME    Kubernetes namespace (default: flamoral)
    -j, --json              Output in JSON format
    -h, --help              Show this help message

Examples:
    $0                      # Show dashboard once
    $0 --watch 5            # Refresh every 5 seconds
    $0 --json               # Output in JSON format
    $0 -n production -w 10  # Watch production namespace

EOF
    exit 0
}

################################################################################
# Parse Arguments
################################################################################

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -w|--watch)
                WATCH_INTERVAL="$2"
                shift 2
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -j|--json)
                JSON_OUTPUT=true
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                ;;
        esac
    done
}

################################################################################
# Get Pod Status
################################################################################

get_pod_status() {
    print_header "Pod Status - Namespace: $NAMESPACE"

    local pods_json=$(kubectl get pods -n "$NAMESPACE" -o json 2>/dev/null || echo '{"items":[]}')

    if [ "$JSON_OUTPUT" = true ]; then
        echo "$pods_json" | jq '{pods: [.items[] | {name: .metadata.name, status: .status.phase, ready: (.status.conditions[] | select(.type=="Ready") | .status), restarts: (.status.containerStatuses[0].restartCount // 0), age: .metadata.creationTimestamp}]}'
        return
    fi

    # Count pods by status
    local total_pods=$(echo "$pods_json" | jq '.items | length')
    local running_pods=$(echo "$pods_json" | jq '[.items[] | select(.status.phase=="Running")] | length')
    local pending_pods=$(echo "$pods_json" | jq '[.items[] | select(.status.phase=="Pending")] | length')
    local failed_pods=$(echo "$pods_json" | jq '[.items[] | select(.status.phase=="Failed")] | length')

    echo -e "${WHITE}Summary:${NC} Total: $total_pods | ${GREEN}Running: $running_pods${NC} | ${YELLOW}Pending: $pending_pods${NC} | ${RED}Failed: $failed_pods${NC}\n"

    # Display pod details
    printf "%-40s %-15s %-8s %-10s %-10s\n" "POD NAME" "STATUS" "READY" "RESTARTS" "AGE"
    echo "─────────────────────────────────────────────────────────────────────────────────────"

    echo "$pods_json" | jq -r '.items[] | [.metadata.name, .status.phase, ((.status.conditions[] | select(.type=="Ready") | .status) // "Unknown"), ((.status.containerStatuses[0].restartCount // 0) | tostring), .metadata.creationTimestamp] | @tsv' | while IFS=$'\t' read -r name status ready restarts created_at; do
        # Calculate age
        if command -v gdate &> /dev/null; then
            created_epoch=$(gdate -d "$created_at" +%s 2>/dev/null || echo "0")
        else
            created_epoch=$(date -d "$created_at" +%s 2>/dev/null || echo "0")
        fi
        current_epoch=$(date +%s)
        age_seconds=$((current_epoch - created_epoch))

        if [ $age_seconds -lt 60 ]; then
            age="${age_seconds}s"
        elif [ $age_seconds -lt 3600 ]; then
            age="$((age_seconds / 60))m"
        elif [ $age_seconds -lt 86400 ]; then
            age="$((age_seconds / 3600))h"
        else
            age="$((age_seconds / 86400))d"
        fi

        # Color code status
        local color=$(get_status_color "$status")
        local ready_color=$GREEN
        [ "$ready" = "False" ] && ready_color=$RED
        [ "$ready" = "Unknown" ] && ready_color=$YELLOW

        printf "%-40s ${color}%-15s${NC} ${ready_color}%-8s${NC} %-10s %-10s\n" \
            "${name:0:40}" "$status" "$ready" "$restarts" "$age"
    done

    echo ""
}

################################################################################
# Get Service Status
################################################################################

get_service_status() {
    print_header "Service Status"

    local services_json=$(kubectl get services -n "$NAMESPACE" -o json 2>/dev/null || echo '{"items":[]}')

    if [ "$JSON_OUTPUT" = true ]; then
        echo "$services_json" | jq '{services: [.items[] | {name: .metadata.name, type: .spec.type, clusterIP: .spec.clusterIP, externalIP: (.status.loadBalancer.ingress[0].ip // "N/A"), ports: [.spec.ports[] | {port: .port, targetPort: .targetPort, protocol: .protocol}]}]}'
        return
    fi

    printf "%-35s %-15s %-15s %-20s\n" "SERVICE NAME" "TYPE" "CLUSTER IP" "PORTS"
    echo "─────────────────────────────────────────────────────────────────────────────────────"

    echo "$services_json" | jq -r '.items[] | [.metadata.name, .spec.type, .spec.clusterIP, ([.spec.ports[] | "\(.port):\(.targetPort)/\(.protocol)"] | join(","))] | @tsv' | while IFS=$'\t' read -r name type cluster_ip ports; do
        printf "%-35s %-15s %-15s %-20s\n" "${name:0:35}" "$type" "$cluster_ip" "${ports:0:20}"
    done

    echo ""
}

################################################################################
# Get Resource Utilization
################################################################################

get_resource_utilization() {
    print_header "Resource Utilization"

    if ! kubectl top pods -n "$NAMESPACE" &> /dev/null; then
        echo -e "${YELLOW}Metrics server not available. Install metrics-server to view resource usage.${NC}\n"
        return
    fi

    local metrics=$(kubectl top pods -n "$NAMESPACE" --no-headers 2>/dev/null || echo "")

    if [ -z "$metrics" ]; then
        echo -e "${YELLOW}No metrics available${NC}\n"
        return
    fi

    if [ "$JSON_OUTPUT" = true ]; then
        # Convert to JSON
        echo '{"resources":['
        first=true
        echo "$metrics" | while read -r name cpu memory; do
            [ "$first" = false ] && echo ","
            first=false
            echo "{\"name\":\"$name\",\"cpu\":\"$cpu\",\"memory\":\"$memory\"}"
        done
        echo ']}'
        return
    fi

    printf "%-40s %-15s %-15s\n" "POD NAME" "CPU" "MEMORY"
    echo "─────────────────────────────────────────────────────────────────────────────────────"

    echo "$metrics" | while read -r name cpu memory; do
        # Color code based on usage (simple heuristic)
        local cpu_color=$GREEN
        local mem_color=$GREEN

        # Extract numeric value (remove 'm' or 'Mi')
        local cpu_val=$(echo "$cpu" | sed 's/[^0-9]//g')
        local mem_val=$(echo "$memory" | sed 's/[^0-9]//g')

        # Simple thresholds
        [ "${cpu_val:-0}" -gt 500 ] && cpu_color=$YELLOW
        [ "${cpu_val:-0}" -gt 1000 ] && cpu_color=$RED
        [ "${mem_val:-0}" -gt 500 ] && mem_color=$YELLOW
        [ "${mem_val:-0}" -gt 1000 ] && mem_color=$RED

        printf "%-40s ${cpu_color}%-15s${NC} ${mem_color}%-15s${NC}\n" "${name:0:40}" "$cpu" "$memory"
    done

    # Calculate totals
    local total_cpu=$(echo "$metrics" | awk '{sum += $2} END {print sum}')
    local total_mem=$(echo "$metrics" | awk '{sum += $3} END {print sum}')

    echo "─────────────────────────────────────────────────────────────────────────────────────"
    printf "${WHITE}%-40s %-15s %-15s${NC}\n" "TOTAL" "${total_cpu}m" "${total_mem}Mi"
    echo ""
}

################################################################################
# Get Error Rates from Logs
################################################################################

get_error_rates() {
    print_header "Error Rates (Last 5 Minutes)"

    local pods=$(kubectl get pods -n "$NAMESPACE" -o json | jq -r '.items[].metadata.name')

    if [ "$JSON_OUTPUT" = true ]; then
        echo '{"error_rates":['
        first=true
        for pod in $pods; do
            local logs=$(kubectl logs --since=5m -n "$NAMESPACE" "$pod" 2>/dev/null || echo "")
            local total_lines=$(echo "$logs" | wc -l)
            local error_lines=$(echo "$logs" | grep -i "error\|exception\|fatal" | wc -l)

            [ "$first" = false ] && echo ","
            first=false
            echo "{\"pod\":\"$pod\",\"total_logs\":$total_lines,\"error_logs\":$error_lines}"
        done
        echo ']}'
        return
    fi

    printf "%-40s %-15s %-15s %-10s\n" "POD NAME" "TOTAL LOGS" "ERROR LOGS" "ERROR %"
    echo "─────────────────────────────────────────────────────────────────────────────────────"

    for pod in $pods; do
        local logs=$(kubectl logs --since=5m -n "$NAMESPACE" "$pod" 2>/dev/null || echo "")

        if [ -z "$logs" ]; then
            continue
        fi

        local total_lines=$(echo "$logs" | wc -l | tr -d ' ')
        local error_lines=$(echo "$logs" | grep -iE "error|exception|fatal|critical" | wc -l | tr -d ' ')

        if [ "$total_lines" -gt 0 ]; then
            local error_pct=$((error_lines * 100 / total_lines))

            local color=$GREEN
            [ "$error_pct" -gt 5 ] && color=$YELLOW
            [ "$error_pct" -gt 10 ] && color=$RED

            printf "%-40s %-15s ${color}%-15s %-10s${NC}\n" \
                "${pod:0:40}" "$total_lines" "$error_lines" "${error_pct}%"
        fi
    done

    echo ""
}

################################################################################
# Get Response Times from Prometheus
################################################################################

get_response_times() {
    print_header "Response Times (95th Percentile)"

    if [ -z "$PROMETHEUS_URL" ]; then
        echo -e "${YELLOW}Prometheus not available. Configure Prometheus to view response times.${NC}\n"
        return
    fi

    # Port forward to Prometheus if not already forwarded
    if ! curl -s "$PROMETHEUS_URL/api/v1/query" &> /dev/null; then
        echo -e "${YELLOW}Prometheus not accessible at $PROMETHEUS_URL${NC}\n"
        return
    fi

    # Query for 95th percentile response times
    local query='histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le))'
    local result=$(curl -s "${PROMETHEUS_URL}/api/v1/query" --data-urlencode "query=$query" 2>/dev/null || echo "")

    if [ -z "$result" ] || ! echo "$result" | jq -e '.data.result[]' &> /dev/null; then
        echo -e "${YELLOW}No response time data available${NC}\n"
        return
    fi

    if [ "$JSON_OUTPUT" = true ]; then
        echo "$result" | jq '.data.result[] | {service: .metric.service, response_time_ms: ((.value[1] | tonumber) * 1000)}'
        return
    fi

    printf "%-35s %-20s\n" "SERVICE" "95TH PERCENTILE (ms)"
    echo "─────────────────────────────────────────────────────────────────────────────────────"

    echo "$result" | jq -r '.data.result[] | [.metric.service, ((.value[1] | tonumber) * 1000 | floor)] | @tsv' | while IFS=$'\t' read -r service response_time; do
        local color=$GREEN
        [ "$response_time" -gt 1000 ] && color=$YELLOW
        [ "$response_time" -gt 2000 ] && color=$RED

        printf "%-35s ${color}%-20s${NC}\n" "${service:0:35}" "${response_time}ms"
    done

    echo ""
}

################################################################################
# Get Cache Hit Rates
################################################################################

get_cache_hit_rates() {
    print_header "Cache Hit Rates (Redis)"

    if [ -z "$PROMETHEUS_URL" ]; then
        echo -e "${YELLOW}Prometheus not available. Configure Prometheus to view cache hit rates.${NC}\n"
        return
    fi

    # Query for cache hit rate
    local query='sum(rate(redis_keyspace_hits_total[5m])) / (sum(rate(redis_keyspace_hits_total[5m])) + sum(rate(redis_keyspace_misses_total[5m])))'
    local result=$(curl -s "${PROMETHEUS_URL}/api/v1/query" --data-urlencode "query=$query" 2>/dev/null || echo "")

    if [ -z "$result" ] || ! echo "$result" | jq -e '.data.result[]' &> /dev/null; then
        echo -e "${YELLOW}No cache metrics available${NC}\n"
        return
    fi

    if [ "$JSON_OUTPUT" = true ]; then
        echo "$result" | jq '.data.result[] | {cache_hit_rate: ((.value[1] | tonumber) * 100)}'
        return
    fi

    local hit_rate=$(echo "$result" | jq -r '.data.result[0].value[1] // 0' | awk '{printf "%.2f", $1 * 100}')

    local color=$RED
    [ "$(echo "$hit_rate > 50" | bc -l 2>/dev/null || echo 0)" -eq 1 ] && color=$YELLOW
    [ "$(echo "$hit_rate > 80" | bc -l 2>/dev/null || echo 0)" -eq 1 ] && color=$GREEN

    echo -e "Redis Cache Hit Rate: ${color}${hit_rate}%${NC}\n"
}

################################################################################
# Get Ingress Status
################################################################################

get_ingress_status() {
    print_header "Ingress Configuration"

    local ingress_json=$(kubectl get ingress -n "$NAMESPACE" -o json 2>/dev/null || echo '{"items":[]}')

    if [ "$JSON_OUTPUT" = true ]; then
        echo "$ingress_json" | jq '{ingress: [.items[] | {name: .metadata.name, hosts: [.spec.rules[].host], address: .status.loadBalancer.ingress[0].ip}]}'
        return
    fi

    printf "%-30s %-40s %-20s\n" "INGRESS NAME" "HOSTS" "ADDRESS"
    echo "─────────────────────────────────────────────────────────────────────────────────────"

    echo "$ingress_json" | jq -r '.items[] | [.metadata.name, ([.spec.rules[].host] | join(", ")), (.status.loadBalancer.ingress[0].ip // "Pending")] | @tsv' | while IFS=$'\t' read -r name hosts address; do
        local color=$GREEN
        [ "$address" = "Pending" ] && color=$YELLOW

        printf "%-30s %-40s ${color}%-20s${NC}\n" "${name:0:30}" "${hosts:0:40}" "$address"
    done

    echo ""
}

################################################################################
# Generate Dashboard
################################################################################

generate_dashboard() {
    if [ "$JSON_OUTPUT" = false ]; then
        clear
        echo -e "${MAGENTA}"
        cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════════╗
║                    FLAMORAL PLATFORM HEALTH DASHBOARD                     ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
        echo -e "${NC}"
        echo -e "${WHITE}Last Updated: $(date)${NC}"
        echo -e "${WHITE}Namespace: ${CYAN}$NAMESPACE${NC}\n"
    fi

    get_pod_status
    get_service_status
    get_ingress_status
    get_resource_utilization
    get_error_rates
    get_response_times
    get_cache_hit_rates

    if [ "$JSON_OUTPUT" = false ] && [ "$WATCH_INTERVAL" -gt 0 ]; then
        echo -e "${YELLOW}Refreshing in ${WATCH_INTERVAL} seconds... (Press Ctrl+C to stop)${NC}"
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    parse_args "$@"

    # Check prerequisites
    if ! command -v kubectl &> /dev/null; then
        echo "Error: kubectl is required but not installed."
        exit 2
    fi

    if ! command -v jq &> /dev/null; then
        echo "Error: jq is required but not installed."
        exit 2
    fi

    # Verify namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        echo "Error: Namespace '$NAMESPACE' not found."
        exit 1
    fi

    # Generate dashboard
    if [ "$WATCH_INTERVAL" -gt 0 ]; then
        while true; do
            generate_dashboard
            sleep "$WATCH_INTERVAL"
        done
    else
        generate_dashboard
    fi
}

# Run main function with all arguments
main "$@"
