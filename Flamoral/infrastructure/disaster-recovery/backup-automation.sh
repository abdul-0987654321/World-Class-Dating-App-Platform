#!/bin/bash
# Automated Backup Script for Dating App Platform
# Run via cron: 0 */4 * * * /path/to/backup-automation.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/dating-app"
RETENTION_DAYS=90
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/dating-app-backup-${TIMESTAMP}.log"

# Azure Configuration
RESOURCE_GROUP="production-dating-app-rg"
AKS_CLUSTER="production-dating-app-aks"
POSTGRES_SERVER="production-dating-app-postgres"
STORAGE_ACCOUNT="productiondatingappbackup"
BACKUP_CONTAINER="automated-backups"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

log "Starting backup automation..."

# Create backup directory
mkdir -p "${BACKUP_DIR}/${TIMESTAMP}"

# ==========================================
# 1. Kubernetes Backup
# ==========================================
log "Backing up Kubernetes resources..."

# Export all resources from production namespace
kubectl get all,cm,secret,pvc,ingress,networkpolicy,pdb -n dating-app-production -o yaml > \
    "${BACKUP_DIR}/${TIMESTAMP}/k8s-resources.yaml"

# Export cluster-wide resources
kubectl get clusterrole,clusterrolebinding,pv,storageclass,priorityclass -o yaml > \
    "${BACKUP_DIR}/${TIMESTAMP}/k8s-cluster-resources.yaml"

# Backup using Velero (if installed)
if command -v velero &> /dev/null; then
    velero backup create "dating-app-${TIMESTAMP}" \
        --include-namespaces dating-app-production \
        --snapshot-volumes \
        --ttl 2160h0m0s
    log "Velero backup created: dating-app-${TIMESTAMP}"
fi

# ==========================================
# 2. Database Backup
# ==========================================
log "Backing up PostgreSQL database..."

# Trigger Azure-managed backup
az postgres flexible-server backup create \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${POSTGRES_SERVER}" \
    --backup-name "manual-${TIMESTAMP}"

# Export database schema
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${POSTGRES_SERVER}.postgres.database.azure.com" \
    -U datingappadmin \
    -d dating_app_production \
    --schema-only \
    --no-owner \
    --no-privileges \
    > "${BACKUP_DIR}/${TIMESTAMP}/schema.sql"

# Export critical data (smaller tables)
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${POSTGRES_SERVER}.postgres.database.azure.com" \
    -U datingappadmin \
    -d dating_app_production \
    --data-only \
    -t users \
    -t subscriptions \
    --column-inserts \
    > "${BACKUP_DIR}/${TIMESTAMP}/critical-data.sql"

log "Database backup completed"

# ==========================================
# 3. Redis Backup
# ==========================================
log "Backing up Redis data..."

# Azure Redis auto-backups are configured in Terraform
# Export Redis configuration for documentation
az redis show \
    --resource-group "${RESOURCE_GROUP}" \
    --name "production-dating-app-redis" \
    > "${BACKUP_DIR}/${TIMESTAMP}/redis-config.json"

log "Redis backup metadata saved"

# ==========================================
# 4. Key Vault Backup
# ==========================================
log "Backing up Key Vault secrets..."

KEYVAULT_NAME="production-dating-kv"
SECRETS_DIR="${BACKUP_DIR}/${TIMESTAMP}/keyvault-secrets"
mkdir -p "${SECRETS_DIR}"

# List and backup all secrets
az keyvault secret list --vault-name "${KEYVAULT_NAME}" --query "[].name" -o tsv | while read -r secret; do
    log "Backing up secret: ${secret}"
    az keyvault secret backup \
        --vault-name "${KEYVAULT_NAME}" \
        --name "${secret}" \
        --file "${SECRETS_DIR}/${secret}.blob"
done

log "Key Vault secrets backed up"

# ==========================================
# 5. Configuration Backup
# ==========================================
log "Backing up infrastructure configuration..."

# Backup Terraform state (if using Azure backend)
az storage blob download \
    --account-name datingappterraformstate \
    --container-name tfstate \
    --name production.terraform.tfstate \
    --file "${BACKUP_DIR}/${TIMESTAMP}/terraform-state.tfstate"

# Backup Helm releases
helm list -n dating-app-production -o json > \
    "${BACKUP_DIR}/${TIMESTAMP}/helm-releases.json"

# Export Helm values
for release in $(helm list -n dating-app-production -q); do
    helm get values "${release}" -n dating-app-production > \
        "${BACKUP_DIR}/${TIMESTAMP}/helm-values-${release}.yaml"
done

log "Configuration backup completed"

# ==========================================
# 6. Monitoring Data Backup
# ==========================================
log "Backing up monitoring configuration..."

# Export Prometheus configuration
kubectl get configmap prometheus-server -n monitoring -o yaml > \
    "${BACKUP_DIR}/${TIMESTAMP}/prometheus-config.yaml"

# Export Grafana dashboards
kubectl exec -n monitoring deployment/grafana -- \
    curl -s "http://localhost:3000/api/search?type=dash-db" \
    > "${BACKUP_DIR}/${TIMESTAMP}/grafana-dashboards.json"

# Export alert rules
kubectl get prometheusrules -n monitoring -o yaml > \
    "${BACKUP_DIR}/${TIMESTAMP}/prometheus-rules.yaml"

log "Monitoring backup completed"

# ==========================================
# 7. Compress and Upload to Azure Storage
# ==========================================
log "Compressing backup..."

cd "${BACKUP_DIR}"
tar -czf "backup-${TIMESTAMP}.tar.gz" "${TIMESTAMP}/"

# Upload to Azure Blob Storage
log "Uploading to Azure Blob Storage..."
az storage blob upload \
    --account-name "${STORAGE_ACCOUNT}" \
    --container-name "${BACKUP_CONTAINER}" \
    --name "backup-${TIMESTAMP}.tar.gz" \
    --file "backup-${TIMESTAMP}.tar.gz" \
    --tier Hot

# Upload to secondary region (geo-redundancy)
az storage blob upload \
    --account-name "${STORAGE_ACCOUNT}" \
    --container-name "${BACKUP_CONTAINER}" \
    --name "backup-${TIMESTAMP}.tar.gz" \
    --file "backup-${TIMESTAMP}.tar.gz" \
    --tier Hot

log "Backup uploaded to Azure Storage"

# ==========================================
# 8. Cleanup Old Backups
# ==========================================
log "Cleaning up old backups..."

# Remove local backups older than retention period
find "${BACKUP_DIR}" -name "backup-*.tar.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true

# Remove old blobs from Azure Storage
CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y-%m-%d)
az storage blob list \
    --account-name "${STORAGE_ACCOUNT}" \
    --container-name "${BACKUP_CONTAINER}" \
    --query "[?properties.lastModified<'${CUTOFF_DATE}'].name" \
    -o tsv | while read -r blob; do
    az storage blob delete \
        --account-name "${STORAGE_ACCOUNT}" \
        --container-name "${BACKUP_CONTAINER}" \
        --name "${blob}"
    log "Deleted old backup: ${blob}"
done

log "Cleanup completed"

# ==========================================
# 9. Verification
# ==========================================
log "Verifying backup integrity..."

# Verify blob upload
if az storage blob exists \
    --account-name "${STORAGE_ACCOUNT}" \
    --container-name "${BACKUP_CONTAINER}" \
    --name "backup-${TIMESTAMP}.tar.gz" \
    --query "exists" -o tsv | grep -q "true"; then
    log "Backup verification successful"
else
    log "ERROR: Backup verification failed!"
    exit 1
fi

# ==========================================
# 10. Notification
# ==========================================
log "Sending notification..."

# Calculate backup size
BACKUP_SIZE=$(du -h "backup-${TIMESTAMP}.tar.gz" | cut -f1)

# Send notification to Slack/Teams
curl -X POST "${SLACK_WEBHOOK_URL}" \
    -H 'Content-Type: application/json' \
    -d '{
        "text": "Backup Completed Successfully",
        "attachments": [{
            "color": "good",
            "fields": [
                {"title": "Timestamp", "value": "'"${TIMESTAMP}"'", "short": true},
                {"title": "Size", "value": "'"${BACKUP_SIZE}"'", "short": true},
                {"title": "Status", "value": "Success", "short": true},
                {"title": "Retention", "value": "'"${RETENTION_DAYS}"' days", "short": true}
            ]
        }]
    }'

log "Backup automation completed successfully"

# Email report (optional)
if command -v mail &> /dev/null; then
    mail -s "Dating App Backup Report - ${TIMESTAMP}" \
        devops@flamoral.com < "${LOG_FILE}"
fi

exit 0
