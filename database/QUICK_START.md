# Flamoral Database - Quick Start Guide

**For developers who want to get started immediately.**

---

## Prerequisites

```bash
# Ensure you have:
- PostgreSQL 13+ installed and running
- Node.js 18+ and npm
- Git
```

---

## 5-Minute Setup

### Step 1: Configure Database

```bash
cd DatingPlatform/database

# Copy environment template
cp .env.example .env

# Edit .env and set your credentials:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=flamoral_dev
# DB_USER=postgres
# DB_PASSWORD=your_password
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Run Migrations

```bash
cd scripts
./migrate-all.sh
```

Expected output:
```
✓ Environment configured
✓ Database connection successful
✓ Central migrations completed
✓ user-service migrations completed
...
✓ All migrations completed successfully!
```

### Step 4: Seed Development Data

```bash
./seed-dev.sh
```

You'll get test accounts:
- Email: `test1@flamoral.com` / Password: `password`
- Email: `admin@flamoral.com` / Password: `password` (Ultra tier)

### Step 5: Verify Everything Works

```bash
./health-check.sh
```

Expected health score: 90+/100

---

## Daily Commands

```bash
cd DatingPlatform/database/scripts

# Check health
./health-check.sh --quick

# Create backup
./backup.sh

# View migrations
./migrate-all.sh --status
```

---

## Common Tasks

### Reset Database

```bash
./rollback.sh --all
./migrate-all.sh
./seed-dev.sh
```

### Create New Migration

```bash
cd DatingPlatform/database
npm run migrate:make create_new_table
# Edit the file in migrations/
./scripts/migrate-all.sh
```

### Restore from Backup

```bash
# List backups
./backup.sh --list

# Restore
./restore.sh backup_file.sql.gz
```

---

## Troubleshooting

### Can't connect to database?

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d flamoral_dev
```

### Migration failed?

```bash
# Check status
./migrate-all.sh --status

# Rollback and retry
./rollback.sh
./migrate-all.sh
```

### Need help?

```bash
# All scripts have help
./migrate-all.sh --help
./seed-dev.sh --help
./backup.sh --help
```

---

## What's Available

### Tables (52 total)
- Users & Profiles
- Photos & Prompts
- Swipes & Matches
- Conversations & Messages
- Subscriptions & Payments
- Coins & Boosts
- Analytics & Tracking
- Safety & Moderation
- Notifications

### Test Data
- 5 test users
- 4 subscription plans
- 5 coin packages
- 3 boost products
- 15 profile prompts
- 7 notification templates

---

## Next Steps

1. **Read Full Documentation:**
   - `scripts/README.md` - Complete script guide
   - `DATABASE_COMPLETE_GUIDE.md` - Full schema reference

2. **Configure Production:**
   - Set up automated backups
   - Configure monitoring
   - Review security settings

3. **Start Developing:**
   - Connect your services
   - Run queries
   - Build features

---

## Quick Reference

| Task | Command |
|------|---------|
| Run migrations | `./migrate-all.sh` |
| Seed data | `./seed-dev.sh` |
| Create backup | `./backup.sh` |
| Restore backup | `./restore.sh backup.sql.gz` |
| Check health | `./health-check.sh` |
| Rollback | `./rollback.sh` |
| View status | `./migrate-all.sh --status` |

---

**You're all set! Happy coding! 🚀**
