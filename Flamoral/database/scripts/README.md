# Flamoral Dating Platform - Database Management Scripts

Comprehensive suite of database management scripts for the Flamoral Dating Platform.

## Overview

This directory contains production-ready scripts for managing the PostgreSQL database, including migrations, backups, restores, health checks, and rollbacks.

## Scripts

### 1. migrate-all.sh - Master Migration Runner

Runs all database migrations across all services in the correct dependency order.

**Usage:**
```bash
# Run all migrations
./migrate-all.sh

# Show migration status
./migrate-all.sh --status

# Verify migrations
./migrate-all.sh --verify

# Rollback last batch
./migrate-all.sh --rollback

# Show help
./migrate-all.sh --help
```

**Features:**
- Checks environment configuration
- Validates database connection
- Runs central migrations first
- Executes service migrations in dependency order
- Supports both Knex (TypeScript) and raw SQL migrations
- Comprehensive error handling and reporting

**Services Order:**
1. Central database migrations
2. user-service
3. auth-service
4. matching-service
5. messaging-service
6. media-service
7. notification-service
8. payment-service
9. moderation-service
10. analytics-service
11. automation-service
12. workflow-engine
13. advertising-service

---

### 2. seed-dev.sh - Development Data Seeder

Seeds the database with development and testing data.

**Usage:**
```bash
# Run all seeds
./seed-dev.sh

# Run minimal seeds only
./seed-dev.sh --minimal

# Run comprehensive seeds
./seed-dev.sh --full

# Show help
./seed-dev.sh --help
```

**Seeded Data:**
- Test user accounts
- Subscription plans (Free, Basic, Mid, Ultra)
- Coin packages (10, 25, 50, 100, 250 coins)
- Boost products (Standard, Prime Time, Spotlight)
- Profile prompts (15 default prompts)
- Notification templates (7 default templates)

**Test Credentials:**
```
Email: test1@flamoral.com
Password: password

Email: admin@flamoral.com (Ultra tier)
Password: password
```

**Safety:**
- Only works on dev/test/local databases
- Confirmation required for other environments
- Uses conflict-safe inserts (ON CONFLICT DO NOTHING)

---

### 3. backup.sh - Database Backup

Creates compressed backups of the PostgreSQL database.

**Usage:**
```bash
# Create full backup
./backup.sh

# Create schema-only backup
./backup.sh --schema-only

# Create data-only backup
./backup.sh --data-only

# Create custom format backup (for parallel restore)
./backup.sh --custom

# Create encrypted backup
./backup.sh --full --encrypt

# List existing backups
./backup.sh --list

# Show help
./backup.sh --help
```

**Features:**
- Multiple backup formats (plain SQL, custom)
- Automatic compression with gzip
- Optional encryption with OpenSSL (AES-256-CBC)
- Metadata file generation
- Database size reporting
- Automatic cleanup of old backups (30+ days)
- Backup verification

**Backup Naming:**
- Full: `{database}_full_{timestamp}.sql.gz`
- Schema: `{database}_schema_{timestamp}.sql.gz`
- Data: `{database}_data_{timestamp}.sql.gz`
- Custom: `{database}_custom_{timestamp}.dump`

**Storage Location:**
`../backups/`

---

### 4. restore.sh - Database Restore

Restores PostgreSQL database from backup files.

**Usage:**
```bash
# Restore from backup
./restore.sh backup_file.sql.gz

# Force restore (skip confirmation)
./restore.sh backup_file.sql.gz --force

# Restore from encrypted backup
./restore.sh backup_file.sql.gz.enc --decrypt

# Show available backups
./restore.sh --help
```

**Features:**
- Supports multiple backup formats (.sql.gz, .dump, .enc)
- Pre-restore safety backup
- Connection termination before restore
- Database drop and recreate
- Post-restore optimization (VACUUM, ANALYZE)
- Restore verification
- Safety checks for production databases

**Safety Features:**
1. Creates pre-restore backup automatically
2. Requires explicit confirmation
3. Force flag required for production databases
4. Validates backup file before restore
5. Supports encrypted backups

---

### 5. health-check.sh - Database Health Monitor

Comprehensive database health monitoring and diagnostics.

**Usage:**
```bash
# Run detailed health check (default)
./health-check.sh

# Run quick health check
./health-check.sh --quick

# Output as JSON
./health-check.sh --json

# Show help
./health-check.sh --help
```

**Health Checks:**

**Basic Checks:**
- Database connection
- PostgreSQL version
- Database size
- Active connections
- Migration status

**Detailed Checks:**
- Database locks
- Long running queries
- Replication status and lag
- Table bloat analysis
- Index health (unused/missing indexes)
- Cache hit ratio
- Transaction statistics
- Table row counts

**Health Score:**
- 90-100: Excellent
- 70-89: Good
- 50-69: Fair
- 0-49: Poor

**Scoring Factors:**
- Connection usage (< 60% = good, > 80% = critical)
- Cache hit ratio (> 95% = excellent, < 90% = poor)
- Lock count
- Query performance
- Replication lag

---

### 6. rollback.sh - Migration Rollback

Safely rollback database migrations with comprehensive safety checks.

**Usage:**
```bash
# Rollback last batch
./rollback.sh

# Rollback all migrations
./rollback.sh --all

# Show help
./rollback.sh --help
```

**Features:**
- Pre-rollback backup creation
- Confirmation prompts
- Production database protection
- Service migration rollback in reverse order
- Rollback verification
- Migration status display

**Safety Features:**
1. Automatic pre-rollback backup
2. Confirmation required
3. Production databases require special confirmation
4. Rollback verification
5. Clear rollback plan display

**Rollback Order (Reverse of Migration):**
1. advertising-service
2. workflow-engine
3. automation-service
4. analytics-service
5. moderation-service
6. payment-service
7. notification-service
8. media-service
9. messaging-service
10. matching-service
11. auth-service
12. user-service
13. Central migrations

---

## Prerequisites

### Required Tools
- PostgreSQL 13+
- Node.js 18+
- npm
- psql (PostgreSQL client)
- pg_dump / pg_restore
- bash
- gzip
- openssl (for encrypted backups)

### Environment Setup

1. **Create .env file:**
```bash
cp ../env.example ../.env
```

2. **Configure database credentials:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=your_password
```

### Make Scripts Executable

```bash
chmod +x *.sh
```

---

## Quick Start Guide

### Initial Database Setup

```bash
# 1. Run all migrations
./migrate-all.sh

# 2. Seed development data
./seed-dev.sh

# 3. Verify health
./health-check.sh
```

### Daily Operations

```bash
# Check database health
./health-check.sh --quick

# Create backup
./backup.sh

# View migration status
./migrate-all.sh --status
```

### Development Workflow

```bash
# Reset database
./rollback.sh --all
./migrate-all.sh
./seed-dev.sh

# Create new migration
cd ..
npm run migrate:make migration_name

# Test migration
./scripts/migrate-all.sh
```

---

## Best Practices

### Backups

1. **Daily Production Backups:**
   ```bash
   # Schedule with cron
   0 2 * * * /path/to/backup.sh --full
   ```

2. **Pre-Deployment Backups:**
   ```bash
   ./backup.sh --full
   ```

3. **Long-term Storage:**
   ```bash
   ./backup.sh --full --encrypt
   # Move to secure storage
   ```

### Health Monitoring

1. **Regular Health Checks:**
   ```bash
   # Schedule with cron
   */30 * * * * /path/to/health-check.sh --quick
   ```

2. **Before/After Deployments:**
   ```bash
   ./health-check.sh --detailed
   ```

### Migrations

1. **Always backup before migrations:**
   ```bash
   ./backup.sh && ./migrate-all.sh
   ```

2. **Test migrations locally first:**
   ```bash
   # On dev database
   ./migrate-all.sh
   # Test application
   # If OK, proceed to staging
   ```

3. **Have rollback plan:**
   ```bash
   # If something goes wrong
   ./rollback.sh
   # Or restore from backup
   ./restore.sh latest_backup.sql.gz
   ```

---

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME

# Check if PostgreSQL is running
pg_isready -h $DB_HOST -p $DB_PORT
```

### Permission Errors

```bash
# Make scripts executable
chmod +x *.sh

# Check database user permissions
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c '\du'
```

### Migration Failures

```bash
# Check migration status
./migrate-all.sh --status

# View migration files
./migrate-all.sh --verify

# Rollback and retry
./rollback.sh
./migrate-all.sh
```

### Restore Failures

```bash
# Check backup file integrity
gzip -t backup_file.sql.gz

# Manually restore (for debugging)
gunzip -c backup_file.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

---

## Automation & CI/CD

### GitHub Actions Example

```yaml
name: Database Migration

on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup PostgreSQL
        uses: harmon758/postgresql-action@v1

      - name: Configure environment
        run: |
          echo "DB_HOST=localhost" >> .env
          echo "DB_NAME=flamoral_test" >> .env

      - name: Run migrations
        run: |
          cd database/scripts
          ./migrate-all.sh

      - name: Health check
        run: |
          cd database/scripts
          ./health-check.sh --quick
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: flamoral_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  migrate:
    build: .
    depends_on:
      - postgres
    command: ["./database/scripts/migrate-all.sh"]

volumes:
  postgres_data:
```

---

## Monitoring & Alerts

### Health Check Alerts

```bash
# Add to crontab for monitoring
*/30 * * * * /path/to/health-check.sh --quick | grep -E '(ERROR|CRITICAL)' && notify-admin
```

### Backup Verification

```bash
# Verify backups exist and are recent
find /path/to/backups -name "*.sql.gz" -mtime -1 | wc -l
```

---

## Security Considerations

1. **Environment Variables:**
   - Never commit .env files
   - Use secrets management in production
   - Rotate credentials regularly

2. **Backup Encryption:**
   - Always encrypt production backups
   - Store encryption keys securely
   - Test decryption regularly

3. **Access Control:**
   - Limit script execution to authorized users
   - Use read-only users for health checks
   - Audit database access logs

4. **Network Security:**
   - Use SSL/TLS for database connections
   - Restrict database access by IP
   - Use VPN for remote access

---

## Support & Documentation

- **Main Documentation:** `../README.md`
- **Schema Documentation:** `../SCHEMA.md`
- **Migration Guide:** `../MIGRATIONS_GUIDE.md`
- **Seed Data Guide:** `../SEEDS_README.md`

---

## License

Copyright © 2025 Flamoral Dating Platform. All rights reserved.
