#!/bin/bash
# Flamoral Dating Platform - Automated Backup Scripts

set -euo pipefail

# Configuration
BACKUP_BUCKET="s3://flamoral-backups"
BACKUP_REGION="us-east-1"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/var/log/flamoral-backup-${TIMESTAMP}.log"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    # Send alert
    curl -X POST https://hooks.slack.com/services/YOUR_WEBHOOK \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"Backup Failed: $1\"}"
    exit 1
}

# ============================================================================
# PostgreSQL Backup
# ============================================================================
backup_postgresql() {
    log "Starting PostgreSQL backup..."

    local DATABASES=("flamoral_users" "flamoral_auth" "flamoral_matching" "flamoral_messaging" "flamoral_payments")

    for DB in "${DATABASES[@]}"; do
        log "Backing up database: ${DB}"

        # Full backup
        pg_dump -h postgres-primary.flamoral-dating.svc.cluster.local \
                -U flamoral \
                -d "${DB}" \
                -F c \
                -f "/tmp/${DB}-${TIMESTAMP}.dump" \
            || error_exit "PostgreSQL backup failed for ${DB}"

        # Compress
        gzip "/tmp/${DB}-${TIMESTAMP}.dump"

        # Upload to S3
        aws s3 cp "/tmp/${DB}-${TIMESTAMP}.dump.gz" \
            "${BACKUP_BUCKET}/postgresql/${DB}/${DB}-${TIMESTAMP}.dump.gz" \
            --storage-class STANDARD_IA \
            || error_exit "Failed to upload ${DB} backup to S3"

        # Cleanup local file
        rm "/tmp/${DB}-${TIMESTAMP}.dump.gz"

        log "Completed backup for ${DB}"
    done

    # Backup WAL files
    log "Syncing WAL files..."
    aws s3 sync /var/lib/postgresql/wal/ \
        "${BACKUP_BUCKET}/postgresql/wal/" \
        --delete \
        || error_exit "WAL sync failed"

    log "PostgreSQL backup completed successfully"
}

# ============================================================================
# MongoDB Backup
# ============================================================================
backup_mongodb() {
    log "Starting MongoDB backup..."

    local MONGODB_HOST="mongodb.flamoral-dating.svc.cluster.local"
    local MONGODB_PORT="27017"
    local BACKUP_DIR="/tmp/mongodb-${TIMESTAMP}"

    # Create backup directory
    mkdir -p "${BACKUP_DIR}"

    # Dump with oplog
    mongodump --host="${MONGODB_HOST}" \
              --port="${MONGODB_PORT}" \
              --username="flamoral" \
              --password="${MONGODB_PASSWORD}" \
              --oplog \
              --out="${BACKUP_DIR}" \
        || error_exit "MongoDB dump failed"

    # Compress
    tar -czf "${BACKUP_DIR}.tar.gz" -C /tmp "mongodb-${TIMESTAMP}"

    # Upload to S3
    aws s3 cp "${BACKUP_DIR}.tar.gz" \
        "${BACKUP_BUCKET}/mongodb/mongodb-${TIMESTAMP}.tar.gz" \
        --storage-class STANDARD_IA \
        || error_exit "Failed to upload MongoDB backup to S3"

    # Cleanup
    rm -rf "${BACKUP_DIR}" "${BACKUP_DIR}.tar.gz"

    log "MongoDB backup completed successfully"
}

# ============================================================================
# Redis Backup
# ============================================================================
backup_redis() {
    log "Starting Redis backup..."

    local REDIS_HOST="redis-cluster.flamoral-dating.svc.cluster.local"
    local REDIS_PORT="6379"

    # Trigger BGSAVE
    redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" BGSAVE

    # Wait for backup to complete
    while [ "$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" LASTSAVE)" == "$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" LASTSAVE)" ]; do
        sleep 5
    done

    # Copy dump.rdb
    kubectl cp flamoral-dating/redis-master-0:/data/dump.rdb "/tmp/redis-${TIMESTAMP}.rdb"

    # Compress
    gzip "/tmp/redis-${TIMESTAMP}.rdb"

    # Upload to S3
    aws s3 cp "/tmp/redis-${TIMESTAMP}.rdb.gz" \
        "${BACKUP_BUCKET}/redis/redis-${TIMESTAMP}.rdb.gz" \
        || error_exit "Failed to upload Redis backup to S3"

    # Cleanup
    rm "/tmp/redis-${TIMESTAMP}.rdb.gz"

    log "Redis backup completed successfully"
}

# ============================================================================
# Kubernetes Resources Backup (Velero)
# ============================================================================
backup_kubernetes() {
    log "Starting Kubernetes resources backup..."

    # Create Velero backup
    velero backup create "flamoral-${TIMESTAMP}" \
        --include-namespaces flamoral-dating,flamoral-ai,monitoring,logging,tracing \
        --wait \
        || error_exit "Velero backup failed"

    # Verify backup
    velero backup describe "flamoral-${TIMESTAMP}" \
        || error_exit "Backup verification failed"

    log "Kubernetes backup completed successfully"
}

# ============================================================================
# Configuration Backup
# ============================================================================
backup_configurations() {
    log "Starting configuration backup..."

    local CONFIG_DIR="/tmp/config-${TIMESTAMP}"
    mkdir -p "${CONFIG_DIR}"

    # Export ConfigMaps
    kubectl get configmaps -n flamoral-dating -o yaml > "${CONFIG_DIR}/configmaps.yaml"

    # Export Secrets (encrypted)
    kubectl get secrets -n flamoral-dating -o yaml | \
        gpg --encrypt --recipient backup@flamoral.com > "${CONFIG_DIR}/secrets.yaml.gpg"

    # Export Ingress rules
    kubectl get ingress -n flamoral-dating -o yaml > "${CONFIG_DIR}/ingress.yaml"

    # Export ServiceMonitors
    kubectl get servicemonitors -n flamoral-dating -o yaml > "${CONFIG_DIR}/servicemonitors.yaml"

    # Compress
    tar -czf "${CONFIG_DIR}.tar.gz" -C /tmp "config-${TIMESTAMP}"

    # Upload to S3
    aws s3 cp "${CONFIG_DIR}.tar.gz" \
        "${BACKUP_BUCKET}/configurations/config-${TIMESTAMP}.tar.gz" \
        || error_exit "Failed to upload configuration backup"

    # Cleanup
    rm -rf "${CONFIG_DIR}" "${CONFIG_DIR}.tar.gz"

    log "Configuration backup completed successfully"
}

# ============================================================================
# Media Files Backup
# ============================================================================
backup_media_files() {
    log "Starting media files backup..."

    # S3 to S3 cross-region replication
    aws s3 sync s3://flamoral-media-production/ \
        s3://flamoral-media-backup-us-west-2/ \
        --source-region us-east-1 \
        --region us-west-2 \
        --storage-class GLACIER \
        || error_exit "Media files backup failed"

    log "Media files backup completed successfully"
}

# ============================================================================
# Cleanup Old Backups
# ============================================================================
cleanup_old_backups() {
    log "Cleaning up old backups..."

    local CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)

    # PostgreSQL
    aws s3 ls "${BACKUP_BUCKET}/postgresql/" --recursive | \
        awk '{print $4}' | \
        grep -E "[0-9]{8}" | \
        while read file; do
            FILE_DATE=$(echo "$file" | grep -oE "[0-9]{8}" | head -1)
            if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
                aws s3 rm "${BACKUP_BUCKET}/${file}"
                log "Deleted old backup: ${file}"
            fi
        done

    # MongoDB
    aws s3 ls "${BACKUP_BUCKET}/mongodb/" --recursive | \
        awk '{print $4}' | \
        grep -E "[0-9]{8}" | \
        while read file; do
            FILE_DATE=$(echo "$file" | grep -oE "[0-9]{8}" | head -1)
            if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
                aws s3 rm "${BACKUP_BUCKET}/${file}"
                log "Deleted old backup: ${file}"
            fi
        done

    # Velero
    velero backup delete --selector "created<${CUTOFF_DATE}" --confirm

    log "Cleanup completed"
}

# ============================================================================
# Verify Backups
# ============================================================================
verify_backups() {
    log "Verifying backups..."

    # Verify PostgreSQL backups exist
    for DB in "flamoral_users" "flamoral_auth" "flamoral_matching"; do
        aws s3 ls "${BACKUP_BUCKET}/postgresql/${DB}/" | grep "${TIMESTAMP}" \
            || error_exit "PostgreSQL backup verification failed for ${DB}"
    done

    # Verify MongoDB backup
    aws s3 ls "${BACKUP_BUCKET}/mongodb/" | grep "${TIMESTAMP}" \
        || error_exit "MongoDB backup verification failed"

    # Verify Velero backup
    velero backup describe "flamoral-${TIMESTAMP}" | grep "Completed" \
        || error_exit "Velero backup verification failed"

    log "All backups verified successfully"
}

# ============================================================================
# Send Backup Report
# ============================================================================
send_backup_report() {
    log "Sending backup report..."

    local REPORT="/tmp/backup-report-${TIMESTAMP}.txt"

    cat > "${REPORT}" <<EOF
Flamoral Backup Report
=====================
Date: $(date)
Timestamp: ${TIMESTAMP}

Backup Status: SUCCESS

Components Backed Up:
- PostgreSQL (All databases)
- MongoDB
- Redis
- Kubernetes Resources (Velero)
- Configurations
- Media Files

Backup Locations:
- S3 Bucket: ${BACKUP_BUCKET}
- Cross-Region Replica: s3://flamoral-media-backup-us-west-2

Retention Policy: ${RETENTION_DAYS} days

Next Scheduled Backup: $(date -d "tomorrow 2:00" +"%Y-%m-%d %H:%M")

Log File: ${LOG_FILE}
EOF

    # Send to Slack
    curl -X POST https://hooks.slack.com/services/YOUR_WEBHOOK \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"$(cat ${REPORT})\"}"

    # Email report
    mail -s "Flamoral Backup Report - ${TIMESTAMP}" \
        devops@flamoral.com < "${REPORT}"

    log "Backup report sent"
}

# ============================================================================
# Main Execution
# ============================================================================
main() {
    log "========================================="
    log "Starting Flamoral Backup Process"
    log "========================================="

    # Execute backups
    backup_postgresql
    backup_mongodb
    backup_redis
    backup_kubernetes
    backup_configurations
    backup_media_files

    # Verify
    verify_backups

    # Cleanup
    cleanup_old_backups

    # Report
    send_backup_report

    log "========================================="
    log "Backup Process Completed Successfully"
    log "========================================="
}

# Run main function
main "$@"
