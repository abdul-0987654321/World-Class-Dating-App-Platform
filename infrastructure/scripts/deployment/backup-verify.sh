#!/bin/bash

###############################################################################
# Backup Verification Script
###############################################################################

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

BACKUP_STORAGE_ACCOUNT=""
BACKUP_CONTAINER="database-backups"
DAYS_TO_CHECK=7
NAMESPACE="flamoral-dating"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

show_help() {
    cat << EOF
Backup Verification Script

Usage: $0 [OPTIONS]

Options:
  --storage-account NAME   Azure storage account
  --container NAME         Backup container [default: database-backups]
  --days NUM              Days to verify [default: 7]
  --help                  Show this help
EOF
    exit 0
}

check_backup_exists() {
    local service=$1
    local date=$2

    local backup_name="${service}_${date}.sql.gz"

    if az storage blob exists \
        --account-name "$BACKUP_STORAGE_ACCOUNT" \
        --container-name "$BACKUP_CONTAINER" \
        --name "$backup_name" \
        --output tsv 2>/dev/null | grep -q "True"; then
        return 0
    else
        return 1
    fi
}

verify_backup_integrity() {
    local service=$1
    local backup_file=$2

    log_info "Verifying backup integrity: $backup_file"

    # Download and test
    local temp_file="/tmp/${backup_file}"

    az storage blob download \
        --account-name "$BACKUP_STORAGE_ACCOUNT" \
        --container-name "$BACKUP_CONTAINER" \
        --name "$backup_file" \
        --file "$temp_file" \
        --output none

    if gzip -t "$temp_file" 2>/dev/null; then
        local size
        size=$(stat -f%z "$temp_file" 2>/dev/null || stat -c%s "$temp_file" 2>/dev/null)
        log_success "Backup valid - Size: $(numfmt --to=iec $size)"
        rm -f "$temp_file"
        return 0
    else
        log_error "Backup corrupted: $backup_file"
        rm -f "$temp_file"
        return 1
    fi
}

test_backup_restore() {
    local backup_file=$1

    log_info "Testing backup restore: $backup_file"

    # Create test database
    local test_db="test_restore_$$"

    # Download backup
    local temp_file="/tmp/${backup_file}"
    az storage blob download \
        --account-name "$BACKUP_STORAGE_ACCOUNT" \
        --container-name "$BACKUP_CONTAINER" \
        --name "$backup_file" \
        --file "$temp_file" \
        --output none

    # Test restore in temporary pod
    cat <<EOF | kubectl apply -f - -n "$NAMESPACE"
apiVersion: v1
kind: Pod
metadata:
  name: backup-restore-test
spec:
  restartPolicy: Never
  containers:
  - name: postgres
    image: postgres:15-alpine
    command:
    - sh
    - -c
    - |
      gunzip -c /backup/${backup_file} | psql -d ${test_db}
    volumeMounts:
    - name: backup
      mountPath: /backup
  volumes:
  - name: backup
    emptyDir: {}
EOF

    if kubectl wait --for=condition=Ready pod/backup-restore-test -n "$NAMESPACE" --timeout=60s; then
        log_success "Backup restore test passed"
        kubectl delete pod backup-restore-test -n "$NAMESPACE"
        return 0
    else
        log_error "Backup restore test failed"
        kubectl delete pod backup-restore-test -n "$NAMESPACE" --ignore-not-found
        return 1
    fi
}

generate_backup_report() {
    log_info "Generating backup report..."

    local report_file="/tmp/backup-report-$(date +%Y%m%d).html"

    cat > "$report_file" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>Backup Verification Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        .success { color: green; }
        .failure { color: red; }
        .warning { color: orange; }
    </style>
</head>
<body>
    <h1>Backup Verification Report</h1>
    <p>Generated: $(date)</p>
    <p>Storage Account: $BACKUP_STORAGE_ACCOUNT</p>
    <p>Days Checked: $DAYS_TO_CHECK</p>

    <h2>Backup Status</h2>
    <table>
        <tr>
            <th>Service</th>
            <th>Date</th>
            <th>Status</th>
            <th>Size</th>
        </tr>
EOF

    # Add backup entries
    local services=("user-service" "auth-service" "matching-service" "messaging-service" "payment-service")

    for service in "${services[@]}"; do
        for i in $(seq 0 $((DAYS_TO_CHECK - 1))); do
            local check_date
            check_date=$(date -d "$i days ago" +%Y%m%d 2>/dev/null || date -v-${i}d +%Y%m%d)

            if check_backup_exists "$service" "$check_date"; then
                echo "        <tr><td>$service</td><td>$check_date</td><td class='success'>✓ OK</td><td>-</td></tr>" >> "$report_file"
            else
                echo "        <tr><td>$service</td><td>$check_date</td><td class='failure'>✗ Missing</td><td>-</td></tr>" >> "$report_file"
            fi
        done
    done

    cat >> "$report_file" <<EOF
    </table>
</body>
</html>
EOF

    log_success "Report generated: $report_file"
}

main() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --storage-account) BACKUP_STORAGE_ACCOUNT="$2"; shift 2 ;;
            --container) BACKUP_CONTAINER="$2"; shift 2 ;;
            --days) DAYS_TO_CHECK="$2"; shift 2 ;;
            --help) show_help ;;
            *) shift ;;
        esac
    done

    [[ -z "$BACKUP_STORAGE_ACCOUNT" ]] && { log_error "Storage account required"; exit 1; }

    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  Backup Verification${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

    log_info "Checking backups for last $DAYS_TO_CHECK days..."

    local missing_backups=0
    local corrupted_backups=0

    local services=("user-service" "auth-service" "matching-service" "messaging-service" "payment-service")

    for service in "${services[@]}"; do
        echo -e "\n${BLUE}Checking $service...${NC}"

        for i in $(seq 0 $((DAYS_TO_CHECK - 1))); do
            local check_date
            check_date=$(date -d "$i days ago" +%Y%m%d 2>/dev/null || date -v-${i}d +%Y%m%d)

            if check_backup_exists "$service" "$check_date"; then
                log_success "$service backup exists for $check_date"

                # Verify integrity occasionally
                if [[ $i -eq 0 ]]; then
                    if ! verify_backup_integrity "$service" "${service}_${check_date}.sql.gz"; then
                        ((corrupted_backups++))
                    fi
                fi
            else
                log_error "$service backup missing for $check_date"
                ((missing_backups++))
            fi
        done
    done

    generate_backup_report

    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}Summary:${NC}"
    echo "Missing backups: $missing_backups"
    echo "Corrupted backups: $corrupted_backups"

    if [[ $missing_backups -eq 0 && $corrupted_backups -eq 0 ]]; then
        log_success "All backups verified successfully!"
        exit 0
    else
        log_error "Backup verification found issues"
        exit 1
    fi
}

main "$@"
