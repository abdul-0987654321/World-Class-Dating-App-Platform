# Flamoral Database - Quick Start Guide

Get your Flamoral Dating Platform database up and running in 5 minutes!

## Prerequisites

- PostgreSQL 13+ installed and running
- Node.js 18+ installed
- Git (for cloning the repository)

## Step 1: Install PostgreSQL (if not installed)

### macOS (Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Download and install from: https://www.postgresql.org/download/windows/

## Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE flamoral_dev;

# Enable UUID extension
\c flamoral_dev
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

# Exit psql
\q
```

## Step 3: Setup Project

```bash
# Navigate to database directory
cd C:\Users\Dell\OneDrive\Documents\Dating\World-Class-Dating-App-Platform\database

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## Step 4: Configure Environment

Edit `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

## Step 5: Run Migrations

```bash
# Run all migrations
npm run migrate:latest
```

You should see:
```
Batch 1 ran the following migrations:
20250101000001_create_users_and_profiles.ts
20250101000002_create_photos_and_prompts.ts
20250101000003_create_matching_tables.ts
20250101000004_create_messaging_tables.ts
20250101000005_create_subscription_tables.ts
20250101000006_create_coin_system.ts
20250101000007_create_boost_system.ts
20250101000008_create_safety_tables.ts
20250101000009_create_privacy_settings.ts
20250101000010_create_notification_tables.ts
20250101000011_create_analytics_tables.ts
```

## Step 6: Verify Installation

```bash
# Check migration status
npm run migrate:status

# Connect to database and verify tables
psql -U postgres -d flamoral_dev -c "\dt"
```

You should see 40 tables created!

## Step 7: Explore the Database

### View Subscription Plans
```bash
psql -U postgres -d flamoral_dev -c "SELECT name, price_monthly FROM subscription_plans;"
```

### View Coin Packages
```bash
psql -U postgres -d flamoral_dev -c "SELECT name, coins, price FROM coin_packages;"
```

### View Prompts
```bash
psql -U postgres -d flamoral_dev -c "SELECT question FROM prompts;"
```

### View Notification Templates
```bash
psql -U postgres -d flamoral_dev -c "SELECT code, title FROM notification_templates;"
```

## Common Commands

### Database Management
```bash
# Run migrations
npm run migrate:latest

# Rollback last batch
npm run migrate:rollback

# Check status
npm run migrate:status

# Fresh database (rollback all + migrate all)
npm run db:fresh
```

### Creating New Migrations
```bash
# Create a new migration
npm run migrate:make add_new_feature
```

### Troubleshooting

#### Connection refused
```bash
# Check if PostgreSQL is running
# macOS/Linux
pg_isready

# Windows
psql -U postgres -c "SELECT version();"
```

#### Permission denied
```bash
# Reset PostgreSQL password
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
\q
```

#### Table already exists
```bash
# Rollback and try again
npm run migrate:rollback --all
npm run migrate:latest
```

## Database GUI Tools

For easier database exploration, use:

- **pgAdmin 4**: https://www.pgadmin.org/
- **DBeaver**: https://dbeaver.io/
- **TablePlus**: https://tableplus.com/
- **DataGrip**: https://www.jetbrains.com/datagrip/

### Example: Connect with pgAdmin

1. Open pgAdmin
2. Right-click "Servers" → "Register" → "Server"
3. Name: Flamoral Dev
4. Connection tab:
   - Host: localhost
   - Port: 5432
   - Database: flamoral_dev
   - Username: postgres
   - Password: your_password
5. Save

## Next Steps

### 1. Seed Test Data
Create a seed file for testing:
```bash
npm run seed:make initial_test_data
```

### 2. Set Up Your Application
Update your application's database configuration to use the consolidated database.

### 3. Run Tests
Test your application with the new database schema.

### 4. Monitor Performance
Use PostgreSQL's built-in tools:
```sql
-- View table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

## Production Deployment

### 1. Use Environment Variables
```bash
# .env.production
DB_HOST=your-production-host.com
DB_PORT=5432
DB_NAME=flamoral_production
DB_USER=flamoral_app
DB_PASSWORD=secure_random_password
```

### 2. Run Migrations
```bash
NODE_ENV=production npm run migrate:latest
```

### 3. Enable SSL
Update `knexfile.ts`:
```typescript
connection: {
  // ... other config
  ssl: { rejectUnauthorized: false }
}
```

### 4. Set Up Backups
```bash
# Daily backup script
pg_dump -U postgres flamoral_production > backup_$(date +%Y%m%d).sql
```

## Support & Resources

- **README.md** - Detailed setup instructions
- **SCHEMA.md** - Complete schema documentation
- **MIGRATION_SUMMARY.md** - Overview of all migrations
- **Migration files** - Inline comments explain each table

## Quick Reference

### Database Info
- **Database Name**: flamoral_dev
- **Total Tables**: 40
- **Total Indexes**: 150+
- **Default Plans**: 4 subscription tiers
- **Default Packages**: 5 coin packages
- **Default Boosts**: 3 boost products
- **Default Prompts**: 8 prompts
- **Default Templates**: 10 notification templates

### Key Tables
- `users` - User accounts
- `profiles` - User profiles
- `photos` - User photos
- `swipes` - Swipe actions
- `matches` - Matched users
- `messages` - Chat messages
- `subscriptions` - User subscriptions
- `coins` - Coin balances
- `boosts` - Profile boosts
- `notifications` - Notification history

### Connection String Format
```
postgresql://[user]:[password]@[host]:[port]/[database]?ssl=true
```

Example:
```
postgresql://postgres:password@localhost:5432/flamoral_dev
```

---

**Ready to build amazing dating experiences!** 💝

For questions or issues, refer to the detailed documentation or check the migration files directly.
