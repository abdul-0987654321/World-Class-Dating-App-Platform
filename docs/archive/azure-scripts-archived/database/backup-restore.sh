#!/bin/bash
# Database Backup and Restore Script
# Usage: ./backup-restore.sh [backup|restore] [environment]

set -e

# Configuration
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to backup database
backup_database() {
    local env=$1
    local db_name="dating_app_${env}"
    local backup_file="${BACKUP_DIR}/${db_name}_${TIMESTAMP}.sql.gz"

    print_message "$YELLOW" "Starting backup for ${db_name}..."

    # Create backup directory if it doesn't exist
    mkdir -p ${BACKUP_DIR}

    # Perform backup
    pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${db_name} | gzip > ${backup_file}

    if [ $? -eq 0 ]; then
        print_message "$GREEN" "Backup completed successfully: ${backup_file}"

        # Calculate backup size
        backup_size=$(du -h ${backup_file} | cut -f1)
        print_message "$GREEN" "Backup size: ${backup_size}"

        # Upload to S3 if configured
        if [ ! -z "${S3_BUCKET}" ]; then
            print_message "$YELLOW" "Uploading backup to S3..."
            aws s3 cp ${backup_file} s3://${S3_BUCKET}/database-backups/
            print_message "$GREEN" "Upload completed"
        fi

        # Clean up old backups
        find ${BACKUP_DIR} -name "${db_name}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
        print_message "$GREEN" "Cleaned up old backups (older than ${RETENTION_DAYS} days)"
    else
        print_message "$RED" "Backup failed!"
        exit 1
    fi
}

# Function to restore database
restore_database() {
    local backup_file=$1
    local env=$2
    local db_name="dating_app_${env}"

    if [ ! -f "${backup_file}" ]; then
        print_message "$RED" "Backup file not found: ${backup_file}"
        exit 1
    fi

    print_message "$YELLOW" "Restoring ${db_name} from ${backup_file}..."

    # Prompt for confirmation
    read -p "This will overwrite the existing database. Are you sure? (yes/no): " confirmation
    if [ "$confirmation" != "yes" ]; then
        print_message "$YELLOW" "Restore cancelled"
        exit 0
    fi

    # Terminate existing connections
    psql -h ${DB_HOST} -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db_name}' AND pid <> pg_backend_pid();"

    # Drop and recreate database
    psql -h ${DB_HOST} -U postgres -c "DROP DATABASE IF EXISTS ${db_name};"
    psql -h ${DB_HOST} -U postgres -c "CREATE DATABASE ${db_name};"

    # Restore from backup
    gunzip < ${backup_file} | psql -h ${DB_HOST} -U ${DB_USER} -d ${db_name}

    if [ $? -eq 0 ]; then
        print_message "$GREEN" "Restore completed successfully"
    else
        print_message "$RED" "Restore failed!"
        exit 1
    fi
}

# Function to create point-in-time recovery backup
create_pitr_backup() {
    local env=$1
    print_message "$YELLOW" "Creating Point-In-Time Recovery backup..."

    pg_basebackup -h ${DB_HOST} -U replicator -D ${BACKUP_DIR}/pitr/${env}_${TIMESTAMP} -Fp -Xs -P

    if [ $? -eq 0 ]; then
        print_message "$GREEN" "PITR backup completed"
    else
        print_message "$RED" "PITR backup failed!"
        exit 1
    fi
}

# Function to list available backups
list_backups() {
    local env=$1
    print_message "$YELLOW" "Available backups for ${env}:"
    ls -lh ${BACKUP_DIR}/dating_app_${env}_*.sql.gz 2>/dev/null || print_message "$RED" "No backups found"
}

# Main script logic
case "$1" in
    backup)
        if [ -z "$2" ]; then
            print_message "$RED" "Usage: $0 backup [development|staging|production]"
            exit 1
        fi
        backup_database $2
        ;;
    restore)
        if [ -z "$2" ] || [ -z "$3" ]; then
            print_message "$RED" "Usage: $0 restore [backup_file] [environment]"
            exit 1
        fi
        restore_database $2 $3
        ;;
    pitr)
        if [ -z "$2" ]; then
            print_message "$RED" "Usage: $0 pitr [environment]"
            exit 1
        fi
        create_pitr_backup $2
        ;;
    list)
        if [ -z "$2" ]; then
            print_message "$RED" "Usage: $0 list [environment]"
            exit 1
        fi
        list_backups $2
        ;;
    *)
        print_message "$RED" "Usage: $0 {backup|restore|pitr|list} [options]"
        exit 1
        ;;
esac
