#!/bin/bash
# ============================================
# Flamoral - Railway to GoDaddy Migration Script
# Exports database from Railway and prepares for import
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

BACKUP_DIR="/tmp/flamoral-railway-migration"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "============================================"
echo "  Flamoral Railway to GoDaddy Migration"
echo "============================================"
echo ""

# Check for Railway CLI
if ! command -v railway &> /dev/null; then
    warn "Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

log "Starting migration from Railway..."

# ============================================
# Step 1: Export Railway Database
# ============================================
echo ""
echo "Step 1: Exporting Railway PostgreSQL Database"
echo "----------------------------------------------"

# Method 1: Using Railway CLI (if authenticated)
if railway whoami &> /dev/null 2>&1; then
    log "Railway CLI authenticated. Exporting database..."

    # Get database connection string
    RAILWAY_DB_URL=$(railway variables --service postgres --kv | grep DATABASE_URL | cut -d'=' -f2-)

    if [ -n "$RAILWAY_DB_URL" ]; then
        log "Exporting PostgreSQL database..."
        pg_dump "$RAILWAY_DB_URL" \
            --format=custom \
            --verbose \
            --no-owner \
            --no-acl \
            --file="$BACKUP_DIR/flamoral_railway_$TIMESTAMP.dump"

        log "Database exported: flamoral_railway_$TIMESTAMP.dump"
    else
        warn "Could not get DATABASE_URL from Railway"
    fi
else
    echo ""
    echo "Railway CLI not authenticated. Please run:"
    echo "  railway login"
    echo ""
    echo "Or manually export using the connection string from Railway dashboard:"
    echo "  pg_dump 'postgresql://user:pass@host:port/railway' \\"
    echo "    --format=custom \\"
    echo "    --verbose \\"
    echo "    --no-owner \\"
    echo "    --no-acl \\"
    echo "    --file=$BACKUP_DIR/flamoral_railway_$TIMESTAMP.dump"
    echo ""
fi

# ============================================
# Step 2: Export Environment Variables
# ============================================
echo ""
echo "Step 2: Exporting Railway Environment Variables"
echo "------------------------------------------------"

if railway whoami &> /dev/null 2>&1; then
    log "Exporting environment variables..."
    railway variables --kv > "$BACKUP_DIR/railway_env_$TIMESTAMP.txt"
    log "Environment variables exported: railway_env_$TIMESTAMP.txt"
else
    echo "Run this command after authentication:"
    echo "  railway variables --kv > $BACKUP_DIR/railway_env_$TIMESTAMP.txt"
fi

# ============================================
# Step 3: Create GoDaddy Import Script
# ============================================
echo ""
echo "Step 3: Creating GoDaddy Import Script"
echo "---------------------------------------"

cat > "$BACKUP_DIR/import-to-godaddy.sh" << 'IMPORT_SCRIPT'
#!/bin/bash
# Import Railway database to GoDaddy VPS PostgreSQL
# Run this script on the GoDaddy VPS

set -e

BACKUP_FILE="$1"
DB_NAME="flamoral"
DB_USER="flamoral"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.dump>"
    exit 1
fi

echo "Importing database to GoDaddy VPS..."

# Stop services
echo "Stopping application services..."
pm2 stop all || true

# Create database if not exists
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD 'CHANGE_THIS_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Terminate existing connections
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Drop and recreate database for clean import
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME}_old;"
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_old;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Import
echo "Importing data (this may take several minutes)..."
pg_restore \
    --dbname="$DB_NAME" \
    --username="$DB_USER" \
    --no-owner \
    --no-acl \
    --verbose \
    "$BACKUP_FILE"

# Verify
echo "Verifying import..."
sudo -u postgres psql -d "$DB_NAME" -c "\dt" | head -20

# Start services
echo "Starting application services..."
pm2 start all

echo "Import complete!"
IMPORT_SCRIPT

chmod +x "$BACKUP_DIR/import-to-godaddy.sh"
log "Created: import-to-godaddy.sh"

# ============================================
# Step 4: DNS Migration Checklist
# ============================================
echo ""
echo "Step 4: DNS Migration Checklist"
echo "--------------------------------"

cat > "$BACKUP_DIR/DNS_MIGRATION_CHECKLIST.md" << 'DNS_CHECKLIST'
# Flamoral DNS Migration Checklist

## Pre-Migration (24-48 hours before)

- [ ] Lower TTL on all DNS records to 60 seconds
- [ ] Verify GoDaddy VPS is fully configured and tested
- [ ] Verify SSL certificates are installed on GoDaddy VPS
- [ ] Run full backup of Railway database
- [ ] Test application on GoDaddy VPS using IP address

## Current DNS Records (to be changed)

| Record | Type | Current Value | New Value |
|--------|------|---------------|-----------|
| @ | A | 216.150.16.129 | GODADDY_VPS_IP |
| www | A | 216.150.1.1 | GODADDY_VPS_IP |
| api | CNAME | railway.app | GODADDY_VPS_IP (A record) |

## Migration Steps

### 1. Final Backup (T-1 hour)
```bash
# On Railway or local machine
pg_dump $RAILWAY_DATABASE_URL --format=custom -f final_backup.dump
```

### 2. Import to GoDaddy (T-30 minutes)
```bash
# On GoDaddy VPS
./import-to-godaddy.sh final_backup.dump
```

### 3. Verify GoDaddy Services
```bash
# Test API
curl -I https://GODADDY_VPS_IP/health --resolve api.flamoral.com:443:GODADDY_VPS_IP

# Test Frontend
curl -I https://GODADDY_VPS_IP --resolve flamoral.com:443:GODADDY_VPS_IP
```

### 4. Update DNS Records in GoDaddy (T-0)

Login to GoDaddy DNS Management:
https://dcc.godaddy.com/control/portfolio/flamoral.com/settings

1. Delete existing A records for @, www
2. Delete CNAME for api
3. Add new records:
   - @ → A → GODADDY_VPS_IP
   - www → A → GODADDY_VPS_IP
   - api → A → GODADDY_VPS_IP

### 5. Verify Propagation
```bash
# Check DNS propagation
nslookup flamoral.com
nslookup api.flamoral.com
nslookup www.flamoral.com

# Or use online tool
# https://www.whatsmydns.net/
```

### 6. Test Production
```bash
# Test all endpoints
curl -I https://flamoral.com
curl -I https://api.flamoral.com/health
curl -I https://www.flamoral.com

# Test mobile app connectivity
# - Open app, verify login works
# - Send a message
# - Check notifications
```

### 7. Monitor for 24 Hours
- Watch error logs: `pm2 logs`
- Check health endpoints every 5 minutes
- Monitor database connections
- Watch for user complaints

## Rollback Plan

If issues occur within 24 hours:

1. Restore DNS to original values
2. Re-enable Railway services
3. Investigate issues on GoDaddy VPS
4. Plan re-migration

## Post-Migration (After 48 hours stable)

- [ ] Increase TTL back to 3600 seconds
- [ ] Delete Railway project
- [ ] Cancel Railway subscription
- [ ] Remove Vercel project
- [ ] Update documentation
- [ ] Notify team of new infrastructure

DNS_CHECKLIST

log "Created: DNS_MIGRATION_CHECKLIST.md"

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
echo "  Migration Files Created"
echo "============================================"
echo ""
echo "Location: $BACKUP_DIR"
echo ""
ls -la "$BACKUP_DIR"
echo ""
echo "Next Steps:"
echo "1. Authenticate with Railway: railway login"
echo "2. Run this script again to export database"
echo "3. Copy files to GoDaddy VPS"
echo "4. Follow DNS_MIGRATION_CHECKLIST.md"
echo ""
