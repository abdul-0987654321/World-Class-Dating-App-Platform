#!/bin/bash
# Script to check deployment health and metrics
# Usage: ./check-deployment-health.sh [blue|green|canary|stable]

set -e

DEPLOYMENT_TYPE=${1:-blue}
NAMESPACE="dating-app"
PROMETHEUS_URL=${PROMETHEUS_URL:-"http://prometheus.monitoring.svc.cluster.local:9090"}

echo "================================================"
echo "Checking health for $DEPLOYMENT_TYPE deployment"
echo "================================================"

# Function to query Prometheus
query_prometheus() {
    local query=$1
    local result=$(curl -s -G --data-urlencode "query=$query" "$PROMETHEUS_URL/api/v1/query" | jq -r '.data.result[0].value[1]')
    echo $result
}

# Check error rate
echo -e "\n[1] Checking Error Rate..."
ERROR_RATE_QUERY="sum(rate(http_requests_total{version=\"$DEPLOYMENT_TYPE\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{version=\"$DEPLOYMENT_TYPE\"}[5m])) * 100"
ERROR_RATE=$(query_prometheus "$ERROR_RATE_QUERY")

if [ ! -z "$ERROR_RATE" ] && [ "$ERROR_RATE" != "null" ]; then
    ERROR_RATE_PERCENT=$(printf "%.2f" $ERROR_RATE)
    echo "   Error Rate: ${ERROR_RATE_PERCENT}%"

    if (( $(echo "$ERROR_RATE > 5" | bc -l) )); then
        echo "   ❌ ERROR: Error rate too high (threshold: 5%)"
        exit 1
    else
        echo "   ✅ Error rate is acceptable"
    fi
else
    echo "   ⚠️  WARNING: Could not retrieve error rate"
fi

# Check response time
echo -e "\n[2] Checking Response Time (p95)..."
RESPONSE_TIME_QUERY="histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{version=\"$DEPLOYMENT_TYPE\"}[5m])) by (le))"
RESPONSE_TIME=$(query_prometheus "$RESPONSE_TIME_QUERY")

if [ ! -z "$RESPONSE_TIME" ] && [ "$RESPONSE_TIME" != "null" ]; then
    RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc)
    echo "   P95 Response Time: ${RESPONSE_TIME_MS}ms"

    if (( $(echo "$RESPONSE_TIME > 1" | bc -l) )); then
        echo "   ⚠️  WARNING: Response time is high (threshold: 1000ms)"
    else
        echo "   ✅ Response time is acceptable"
    fi
else
    echo "   ⚠️  WARNING: Could not retrieve response time"
fi

# Check CPU usage
echo -e "\n[3] Checking CPU Usage..."
CPU_QUERY="avg(rate(container_cpu_usage_seconds_total{pod=~\".*-$DEPLOYMENT_TYPE-.*\"}[5m])) * 100"
CPU_USAGE=$(query_prometheus "$CPU_QUERY")

if [ ! -z "$CPU_USAGE" ] && [ "$CPU_USAGE" != "null" ]; then
    CPU_PERCENT=$(printf "%.2f" $CPU_USAGE)
    echo "   CPU Usage: ${CPU_PERCENT}%"

    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        echo "   ⚠️  WARNING: CPU usage is high"
    else
        echo "   ✅ CPU usage is acceptable"
    fi
else
    echo "   ⚠️  WARNING: Could not retrieve CPU usage"
fi

# Check memory usage
echo -e "\n[4] Checking Memory Usage..."
MEMORY_QUERY="avg(container_memory_usage_bytes{pod=~\".*-$DEPLOYMENT_TYPE-.*\"} / container_spec_memory_limit_bytes{pod=~\".*-$DEPLOYMENT_TYPE-.*\"}) * 100"
MEMORY_USAGE=$(query_prometheus "$MEMORY_QUERY")

if [ ! -z "$MEMORY_USAGE" ] && [ "$MEMORY_USAGE" != "null" ]; then
    MEMORY_PERCENT=$(printf "%.2f" $MEMORY_USAGE)
    echo "   Memory Usage: ${MEMORY_PERCENT}%"

    if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
        echo "   ⚠️  WARNING: Memory usage is high"
    else
        echo "   ✅ Memory usage is acceptable"
    fi
else
    echo "   ⚠️  WARNING: Could not retrieve memory usage"
fi

# Check pod status
echo -e "\n[5] Checking Pod Status..."
READY_PODS=$(kubectl get pods -n $NAMESPACE -l version=$DEPLOYMENT_TYPE -o json | jq -r '.items | map(select(.status.conditions[] | select(.type=="Ready" and .status=="True"))) | length')
TOTAL_PODS=$(kubectl get pods -n $NAMESPACE -l version=$DEPLOYMENT_TYPE -o json | jq -r '.items | length')

echo "   Ready Pods: $READY_PODS/$TOTAL_PODS"

if [ "$READY_PODS" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -gt 0 ]; then
    echo "   ✅ All pods are ready"
else
    echo "   ❌ ERROR: Not all pods are ready"
    exit 1
fi

# Check pod restarts
echo -e "\n[6] Checking Pod Restarts..."
RESTART_COUNT=$(kubectl get pods -n $NAMESPACE -l version=$DEPLOYMENT_TYPE -o json | jq -r '[.items[].status.containerStatuses[].restartCount] | add')

echo "   Total Restarts: $RESTART_COUNT"

if [ "$RESTART_COUNT" -gt 5 ]; then
    echo "   ⚠️  WARNING: High number of pod restarts"
else
    echo "   ✅ Restart count is acceptable"
fi

# Check request rate
echo -e "\n[7] Checking Request Rate..."
REQUEST_RATE_QUERY="sum(rate(http_requests_total{version=\"$DEPLOYMENT_TYPE\"}[5m]))"
REQUEST_RATE=$(query_prometheus "$REQUEST_RATE_QUERY")

if [ ! -z "$REQUEST_RATE" ] && [ "$REQUEST_RATE" != "null" ]; then
    REQUEST_RATE_NUM=$(printf "%.2f" $REQUEST_RATE)
    echo "   Request Rate: ${REQUEST_RATE_NUM} req/s"
    echo "   ✅ Service is receiving traffic"
else
    echo "   ⚠️  WARNING: Could not retrieve request rate or no traffic"
fi

# Final summary
echo -e "\n================================================"
echo "Health Check Summary for $DEPLOYMENT_TYPE"
echo "================================================"
echo "Status: ✅ HEALTHY"
echo "The deployment is functioning within acceptable parameters"
echo "================================================"

exit 0
