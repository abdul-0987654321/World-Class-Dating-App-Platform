# Getting Started with Database Migrations

Quick start guide for setting up the Flamoral Dating Platform database.

## Prerequisites

Before you begin, ensure you have:

- [x] PostgreSQL 14+ installed and running
- [x] Node.js 18+ installed
- [x] npm or yarn package manager
- [x] Git (for version control)

## Quick Setup (5 minutes)

### Step 1: Install PostgreSQL

If you don't have PostgreSQL installed:

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE flamoral_dev;

# Create user (optional, if not using postgres)
CREATE USER flamoral_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE flamoral_dev TO flamoral_user;

# Exit psql
\q
```

### Step 3: Configure Environment

```bash
cd database

# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# Use your favorite editor (nano, vim, vscode, etc.)
nano .env
```

Update the `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### Step 4: Install Dependencies

```bash
npm install
```

This will install:
- Knex.js (migration tool)
- pg (PostgreSQL driver)
- bcrypt (for password hashing in seeds)
- TypeScript and related dev dependencies

### Step 5: Run Migrations and Seeds

```bash
# Run all migrations and populate with test data
npm run db:setup
```

This single command will:
1. Run all database migrations (create tables, indexes, triggers)
2. Populate the database with development seed data

### Step 6: Verify Setup

```bash
# Check migration status
npm run migrate:status

# You should see output like:
# Found X migration files
# Completed X migration files
```

Connect to database and verify:

```bash
psql -U postgres -d flamoral_dev

# List tables
\dt

# Check users table
SELECT id, email, subscription_tier FROM users;

# Exit
\q
```

## What Gets Created?

### Database Tables

After running migrations, you'll have these tables:

**Core Tables:**
- `users` - User accounts and authentication
- `profiles` - User profile information
- `photos` - User photos and verification
- `prompts` - Profile prompt questions
- `user_prompts` - User answers to prompts

**Matching System:**
- `swipes` - User swipe actions (like/pass/super-like)
- `matches` - Matched users
- `user_preferences` - User matching preferences

**Messaging:**
- `conversations` - Chat conversations between matches
- `messages` - Individual messages

**Subscriptions & Payments:**
- `subscription_plans` - Available subscription tiers
- `subscriptions` - User subscriptions
- `payment_methods` - User payment methods
- `transactions` - Payment transaction history

**And more...**
- Gamification tables (badges, achievements, rewards)
- Analytics tables
- Notification tables
- Video/voice call tables
- Safety and moderation tables

### Test Data

The seed files create:

- **6 Test Users** with complete profiles
- **10+ Photos** across users
- **15+ Prompt Answers**
- **18 Swipe Actions**
- **4 Active Matches**
- **4 Conversations** with message history
- **20+ Messages** between users
- **5 Active Subscriptions** (mix of tiers)
- **5 Payment Methods**
- **6 Transaction Records**

## Development Workflow

### Daily Development

```bash
# Check what migrations are pending
npm run migrate:status

# Run pending migrations
npm run migrate:latest

# If you need fresh data
npm run db:reset
```

### Creating New Migrations

```bash
# Create a new migration
npm run migrate:make add_feature_name

# Example: Add a new column to users table
npm run migrate:make add_last_seen_to_users
```

Edit the generated file in `migrations/`:

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.timestamp('last_seen_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('last_seen_at');
  });
}
```

### Testing Your Changes

```bash
# Run your migration
npm run migrate:latest

# Test rollback works
npm run migrate:rollback

# Run it again
npm run migrate:latest
```

### Resetting Database

If things go wrong or you want to start fresh:

```bash
# Complete reset: rollback all + migrate + seed
npm run db:reset

# Fresh migrations only (no seed data)
npm run db:fresh
```

## Common Commands Cheat Sheet

```bash
# Migration commands
npm run migrate:latest          # Run all pending migrations
npm run migrate:rollback        # Rollback last batch
npm run migrate:rollback:all    # Rollback all migrations
npm run migrate:status          # Check migration status
npm run migrate:list            # List all migrations
npm run migrate:make <name>     # Create new migration

# Seed commands
npm run seed:run                # Run all seed files
npm run seed:make <name>        # Create new seed file

# Database management
npm run db:setup                # Initial setup (migrate + seed)
npm run db:reset                # Full reset (rollback all + migrate + seed)
npm run db:fresh                # Fresh migrations (no seeds)
npm run db:status               # Check migration status

# Environment-specific
npm run db:migrate:prod         # Run migrations in production
npm run db:migrate:staging      # Run migrations in staging
```

## Troubleshooting

### Cannot connect to database

**Error:** `Connection refused` or `ECONNREFUSED`

**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env`
3. Check PostgreSQL port: `lsof -i :5432` (macOS/Linux)

### Migration already exists

**Error:** `relation "table_name" already exists`

**Solution:**
```bash
# Check what's been run
npm run migrate:status

# Rollback if needed
npm run migrate:rollback

# Or reset completely
npm run db:reset
```

### Permission denied

**Error:** `permission denied for database`

**Solution:**
```bash
# Grant permissions in psql
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE flamoral_dev TO your_user;
```

### TypeScript errors

**Error:** `Cannot find module` or TypeScript compilation errors

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Seed data conflicts

**Error:** `duplicate key value violates unique constraint`

**Solution:**
```bash
# Reset database completely
npm run db:reset
```

## Next Steps

After successful setup:

1. **Read the Documentation:**
   - [Migrations Guide](./MIGRATIONS_GUIDE.md) - Detailed migration documentation
   - [Seeds README](./SEEDS_README.md) - Information about test data
   - [Database Schema](./SCHEMA.md) - Complete schema documentation

2. **Explore the Data:**
   ```bash
   psql -U postgres -d flamoral_dev

   # Try these queries:
   SELECT * FROM users;
   SELECT * FROM matches;
   SELECT * FROM messages LIMIT 10;
   ```

3. **Test Authentication:**
   Use these credentials in your app:
   - Email: `alice.johnson@example.com`
   - Password: `Test123!`

4. **Start Backend Services:**
   ```bash
   cd ../backend
   npm install
   npm run dev
   ```

## Production Deployment

For production deployment:

1. **Never use seed data in production!**
2. Use environment variables for credentials
3. Run migrations carefully:
   ```bash
   NODE_ENV=production npm run db:migrate:prod
   ```
4. Always backup before migrations:
   ```bash
   pg_dump -h host -U user -d database > backup.sql
   ```

## Additional Resources

- [Knex.js Documentation](https://knexjs.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Getting Help

If you encounter issues:

1. Check this guide and the troubleshooting section
2. Review [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) for detailed information
3. Check existing migrations for examples
4. Search the [Knex.js documentation](https://knexjs.org/)
5. Contact the development team

## Success Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created (`flamoral_dev`)
- [ ] `.env` file configured
- [ ] Dependencies installed (`npm install`)
- [ ] Migrations run (`npm run migrate:latest`)
- [ ] Seeds populated (`npm run seed:run`)
- [ ] Can query database and see test users
- [ ] Migration status shows all migrations complete

Congratulations! Your database is ready for development!
