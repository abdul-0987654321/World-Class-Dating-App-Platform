# Database Scripts - Index & Navigation

Quick navigation guide for all database management tools and documentation.

---

## Scripts Directory

### Core Scripts

| Script | Purpose | Lines | Size |
|--------|---------|-------|------|
| **migrate-all.sh** | Master migration runner | 292 | 8.6K |
| **seed-dev.sh** | Development data seeder | 371 | 14K |
| **backup.sh** | Database backup tool | 381 | 11K |
| **restore.sh** | Database restore tool | 392 | 13K |
| **health-check.sh** | Health monitoring | 493 | 17K |
| **rollback.sh** | Migration rollback | 335 | 10K |

**Total:** 2,264 lines of production-ready scripts

---

## Quick Access

### Most Used Commands

```bash
# Daily operations
./health-check.sh --quick
./backup.sh
./migrate-all.sh --status

# Development
./migrate-all.sh
./seed-dev.sh
./rollback.sh

# Emergency
./backup.sh --full
./restore.sh latest_backup.sql.gz
./rollback.sh
```

---

## Documentation Tree

```
database/
├── scripts/
│   ├── README.md                     📖 Complete scripts guide (591 lines)
│   ├── INDEX.md                      📑 This file - navigation guide
│   ├── migrate-all.sh                🔧 Migration runner
│   ├── seed-dev.sh                   🌱 Data seeder
│   ├── backup.sh                     💾 Backup tool
│   ├── restore.sh                    ↩️  Restore tool
│   ├── health-check.sh               ❤️  Health monitor
│   └── rollback.sh                   ⏮️  Rollback tool
│
├── DATABASE_COMPLETE_GUIDE.md        📚 Full schema reference (1200+ lines)
├── DATABASE_SETUP_SUMMARY.md         📋 Setup summary & overview
├── QUICK_START.md                    ⚡ 5-minute setup guide
├── SCHEMA.md                         📊 Schema overview
├── MIGRATIONS_GUIDE.md               🔄 Migration workflow
├── SEEDS_README.md                   🌾 Seed data guide
│
├── migrations/                       📁 17 migration files
├── seeds/                            📁 5 seed files
└── backups/                          📁 Backup storage (auto-created)
```

---

## By Use Case

### First Time Setup
1. Read: `../QUICK_START.md`
2. Run: `./migrate-all.sh`
3. Run: `./seed-dev.sh`
4. Verify: `./health-check.sh`

### Daily Development
1. Status: `./migrate-all.sh --status`
2. Health: `./health-check.sh --quick`
3. Backup: `./backup.sh`

### Creating Migrations
1. Guide: `../MIGRATIONS_GUIDE.md`
2. Create: `npm run migrate:make name`
3. Test: `./migrate-all.sh`
4. Rollback: `./rollback.sh` (if needed)

### Database Recovery
1. List: `./backup.sh --list`
2. Restore: `./restore.sh backup.sql.gz`
3. Verify: `./health-check.sh`

### Troubleshooting
1. Check: `./health-check.sh --detailed`
2. Status: `./migrate-all.sh --status`
3. Help: `README.md` or `--help` flag

### Production Deployment
1. Read: `README.md` (Best Practices section)
2. Backup: `./backup.sh --full --encrypt`
3. Migrate: `./migrate-all.sh`
4. Monitor: `./health-check.sh`

---

## Documentation Quick Links

### Getting Started
- **[QUICK_START.md](../QUICK_START.md)** - 5-minute setup guide
- **[README.md](README.md)** - Complete scripts documentation

### Reference
- **[DATABASE_COMPLETE_GUIDE.md](../DATABASE_COMPLETE_GUIDE.md)** - Full schema reference with examples
- **[SCHEMA.md](../SCHEMA.md)** - Schema overview and ERD

### Guides
- **[MIGRATIONS_GUIDE.md](../MIGRATIONS_GUIDE.md)** - How to create and manage migrations
- **[SEEDS_README.md](../SEEDS_README.md)** - Seed data documentation
- **[DATABASE_SETUP_SUMMARY.md](../DATABASE_SETUP_SUMMARY.md)** - What was created and why

---

## Script Features Matrix

| Feature | migrate | seed | backup | restore | health | rollback |
|---------|---------|------|--------|---------|--------|----------|
| Safety checks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Confirmation prompts | ⚠️ | ⚠️ | - | ✅ | - | ✅ |
| Pre-operation backup | - | - | - | ✅ | - | ✅ |
| Production protection | ✅ | ✅ | - | ✅ | - | ✅ |
| Status reporting | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Error handling | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Help documentation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multiple modes | ✅ | ✅ | ✅ | - | ✅ | ✅ |

---

## Command Reference Card

### migrate-all.sh
```bash
./migrate-all.sh              # Run migrations
./migrate-all.sh --rollback   # Rollback last batch
./migrate-all.sh --status     # Show status
./migrate-all.sh --verify     # Verify migrations
./migrate-all.sh --help       # Show help
```

### seed-dev.sh
```bash
./seed-dev.sh                 # Run all seeds
./seed-dev.sh --minimal       # Minimal data only
./seed-dev.sh --full          # Full test data
./seed-dev.sh --help          # Show help
```

### backup.sh
```bash
./backup.sh                   # Full backup
./backup.sh --schema-only     # Schema only
./backup.sh --data-only       # Data only
./backup.sh --custom          # Custom format
./backup.sh --full --encrypt  # Encrypted backup
./backup.sh --list            # List backups
./backup.sh --help            # Show help
```

### restore.sh
```bash
./restore.sh file.sql.gz      # Restore backup
./restore.sh file.gz --force  # Skip confirmation
./restore.sh file.enc --decrypt  # Decrypt first
./restore.sh --help           # Show help
```

### health-check.sh
```bash
./health-check.sh             # Detailed check
./health-check.sh --quick     # Quick check
./health-check.sh --json      # JSON output
./health-check.sh --help      # Show help
```

### rollback.sh
```bash
./rollback.sh                 # Rollback last batch
./rollback.sh --all           # Rollback all (dangerous!)
./rollback.sh --help          # Show help
```

---

## Environment Variables

Required in `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=your_password
```

Optional:
```env
DATABASE_URL=postgresql://...  # Alternative connection string
NODE_ENV=development           # Environment
```

---

## Service Migration Locations

All services have migrations in:
```
backend/services/{service}/src/infrastructure/database/migrations/
```

| Service | Migration Count | Tables |
|---------|----------------|--------|
| user-service | 65 | users, profiles, photos, subscriptions, coins, etc. |
| matching-service | 12 | swipes, matches, preferences, boosts |
| messaging-service | - | conversations, messages |
| media-service | 4 | media, videos, voice_notes |
| notification-service | 2 | notifications, batch_jobs |
| payment-service | 2 | transactions, payment_methods |
| moderation-service | 1 | reports, violations |
| analytics-service | 2 | tracking_events, analytics |

**Central database:** 17 migration files in `database/migrations/`

---

## Database Statistics

### Tables by Domain
- **Users & Auth:** 12 tables
- **Matching:** 5 tables
- **Messaging:** 2 tables
- **Payments:** 8 tables
- **Safety:** 6 tables
- **Notifications:** 4 tables
- **Analytics:** 6 tables
- **Media:** 3 tables
- **Privacy:** 2 tables
- **Gamification:** 4 tables

**Total:** ~52 tables

### Indexes
- Primary key indexes: 52
- Foreign key indexes: 100+
- Composite indexes: 50+
- Partial indexes: 10+

**Total:** ~150+ indexes

---

## Support & Help

### Getting Help
1. Check script help: `./script-name.sh --help`
2. Read documentation: `README.md`
3. Check troubleshooting: `README.md` (Troubleshooting section)
4. Review examples: `DATABASE_COMPLETE_GUIDE.md`

### Common Issues
- **Connection errors:** Check PostgreSQL is running, verify credentials
- **Permission errors:** Run `chmod +x *.sh`
- **Migration failures:** Check status, rollback, and retry
- **Backup/restore issues:** Verify file integrity with `gzip -t`

---

## Version Information

- **Created:** 2025-12-11
- **Version:** 1.0.0
- **PostgreSQL:** 13+
- **Node.js:** 18+
- **Knex:** 3.1.0+

---

## Additional Resources

### PostgreSQL
- [Official Documentation](https://www.postgresql.org/docs/)
- [Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Backup & Recovery](https://www.postgresql.org/docs/current/backup.html)

### Knex.js
- [Official Documentation](http://knexjs.org/)
- [Migration Guide](http://knexjs.org/#Migrations)
- [Schema Builder](http://knexjs.org/#Schema)

---

**Last Updated:** 2025-12-11
**Maintainer:** Flamoral Development Team

---

Navigate back to:
- [Scripts README](README.md)
- [Database Root](../)
- [Quick Start Guide](../QUICK_START.md)
