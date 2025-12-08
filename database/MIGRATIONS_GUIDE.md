# Database Migrations Guide

This guide provides comprehensive information about database migrations for the Flamoral Dating Platform.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Migration Scripts](#migration-scripts)
4. [Seed Scripts](#seed-scripts)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Overview

The Flamoral Dating Platform uses **Knex.js** for database migrations and schema management. Knex provides a query builder and migration system for PostgreSQL.

### Technologies

- **Database**: PostgreSQL
- **Migration Tool**: Knex.js v3.1.0
- **Language**: TypeScript
- **ORM Alternative**: We use Knex for maximum control and performance

### Directory Structure

```
database/
├── migrations/          # Database migration files
│   ├── 20250101000001_create_users_and_profiles.ts
│   ├── 20250101000002_create_photos_and_prompts.ts
│   ├── 20250101000003_create_matching_tables.ts
│   ├── 20250101000004_create_messaging_tables.ts
│   ├── 20250101000005_create_subscription_tables.ts
│   └── ...
├── seeds/              # Database seed files for development
│   ├── 001_dev_users_and_profiles.ts
│   ├── 002_dev_photos_and_prompts.ts
│   ├── 003_dev_matching_data.ts
│   ├── 004_dev_conversations_messages.ts
│   └── 005_dev_subscriptions.ts
├── knexfile.ts         # Knex configuration
├── package.json        # Database-specific scripts and dependencies
├── .env.example        # Environment variables template
└── README.md           # Quick reference guide
```

## Getting Started

### Prerequisites

1. PostgreSQL 14+ installed and running
2. Node.js 18+ and npm/yarn installed
3. Environment variables configured

### Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Update the `.env` file with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### Install Dependencies

```bash
cd database
npm install
```

### Initial Setup

Run migrations and seed the database with development data:

```bash
npm run db:setup
```

This command will:
1. Run all pending migrations
2. Seed the database with development data

## Migration Scripts

### Available Commands

#### Running Migrations

```bash
# Run all pending migrations
npm run migrate:latest

# Rollback the last batch of migrations
npm run migrate:rollback

# Rollback all migrations
npm run migrate:rollback:all

# Run the next migration that has not yet been run
npm run migrate:up

# Undo the last migration that was run
npm run migrate:down

# List all completed and pending migrations
npm run migrate:list

# Check migration status
npm run migrate:status

# Get the current migration version
npm run migrate:currentVersion
```

#### Production/Staging Migrations

```bash
# Run migrations in production
npm run db:migrate:prod

# Run migrations in staging
npm run db:migrate:staging
```

#### Creating New Migrations

```bash
# Create a new migration file
npm run migrate:make migration_name

# Example:
npm run migrate:make add_user_verification_status
```

This will create a new file in the `migrations/` directory with a timestamp prefix.

### Migration File Structure

Each migration file must export two functions: `up` and `down`.

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create or modify database schema
  await knex.schema.createTable('table_name', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Reverse the changes made in 'up'
  await knex.schema.dropTableIfExists('table_name');
}
```

### Migration Naming Convention

Use descriptive names with the following format:

```
YYYYMMDDHHMMSS_description_of_changes.ts

Examples:
20250101000001_create_users_and_profiles.ts
20250101000002_add_email_verification_to_users.ts
20250101000003_create_subscription_tables.ts
```

## Seed Scripts

Seeds are used to populate the database with test/development data.

### Available Commands

```bash
# Run all seed files
npm run seed:run

# Create a new seed file
npm run seed:make seed_name

# Example:
npm run seed:make dev_test_users
```

### Seed File Structure

```typescript
import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('table_name').del();

  // Insert seed data
  await knex('table_name').insert([
    { id: 1, name: 'Test User 1' },
    { id: 2, name: 'Test User 2' },
  ]);
}
```

### Existing Seed Files

1. **001_dev_users_and_profiles.ts**: Creates 6 test users with complete profiles
2. **002_dev_photos_and_prompts.ts**: Adds photos and prompt answers for users
3. **003_dev_matching_data.ts**: Creates swipes and matches between users
4. **004_dev_conversations_messages.ts**: Adds conversations and messages
5. **005_dev_subscriptions.ts**: Creates subscription and payment data

### Development Database Reset

To completely reset your development database:

```bash
# Reset database: rollback all + migrate + seed
npm run db:reset

# Fresh database: rollback all + migrate (no seed)
npm run db:fresh
```

## Best Practices

### 1. Always Test Rollbacks

Before deploying a migration, test both `up` and `down` functions:

```bash
npm run migrate:latest
npm run migrate:rollback
npm run migrate:latest
```

### 2. Use Transactions

For complex migrations, wrap operations in transactions:

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    await trx.schema.createTable('table1', ...);
    await trx.schema.createTable('table2', ...);
  });
}
```

### 3. Never Modify Existing Migrations

Once a migration has been run in production, never modify it. Create a new migration instead.

### 4. Use Descriptive Names

Make migration names self-documenting:

Good:
- `create_user_preferences_table.ts`
- `add_verification_status_to_users.ts`
- `create_indexes_for_matching_performance.ts`

Bad:
- `migration1.ts`
- `update.ts`
- `fix.ts`

### 5. Include Indexes

Always add indexes for foreign keys and frequently queried columns:

```typescript
table.index('user_id');
table.index(['created_at', 'status']);
```

### 6. Add Foreign Key Constraints

Use foreign key constraints to maintain referential integrity:

```typescript
table.uuid('user_id')
  .notNullable()
  .references('id')
  .inTable('users')
  .onDelete('CASCADE');
```

### 7. Use Timestamps

Always include created_at and updated_at timestamps:

```typescript
table.timestamps(true, true); // useTimestamps, defaultToNow
```

### 8. Document Complex Migrations

Add comments for complex logic:

```typescript
/**
 * Migration: Add Geolocation Support
 * Description: Adds PostGIS extension and location columns for proximity matching
 * Dependencies: Requires PostGIS extension to be available
 */
export async function up(knex: Knex): Promise<void> {
  // Enable PostGIS extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');

  // Add location column
  await knex.schema.alterTable('profiles', (table) => {
    table.specificType('location', 'geography(POINT, 4326)');
  });
}
```

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution**: Check if the migration was partially applied. You may need to manually rollback:

```bash
npm run migrate:rollback
```

### Issue: Cannot connect to database

**Solution**: Verify your `.env` file has correct database credentials and the database is running:

```bash
# Check if PostgreSQL is running
psql -h localhost -U postgres -d flamoral_dev
```

### Issue: Seed data conflicts with existing data

**Solution**: Reset the database completely:

```bash
npm run db:reset
```

### Issue: Migration takes too long

**Solution**: Break large migrations into smaller ones, or use batch processing:

```typescript
export async function up(knex: Knex): Promise<void> {
  const batchSize = 1000;
  let offset = 0;

  while (true) {
    const rows = await knex('large_table')
      .select('*')
      .limit(batchSize)
      .offset(offset);

    if (rows.length === 0) break;

    // Process batch
    await processBatch(rows);

    offset += batchSize;
  }
}
```

### Issue: TypeScript errors in migration files

**Solution**: Ensure you have the correct type definitions:

```bash
npm install --save-dev @types/node typescript ts-node
```

## Database Backup and Restore

### Backup Production Database

```bash
pg_dump -h your-host -U your-user -d flamoral_prod > backup.sql
```

### Restore from Backup

```bash
psql -h localhost -U postgres -d flamoral_dev < backup.sql
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Database Migrations
  run: |
    cd database
    npm install
    npm run migrate:latest
  env:
    DB_HOST: ${{ secrets.DB_HOST }}
    DB_USER: ${{ secrets.DB_USER }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    DB_NAME: ${{ secrets.DB_NAME }}
```

### Azure DevOps Example

```yaml
- script: |
    cd database
    npm install
    npm run db:migrate:prod
  displayName: 'Run Database Migrations'
  env:
    DB_HOST: $(DB_HOST)
    DB_USER: $(DB_USER)
    DB_PASSWORD: $(DB_PASSWORD)
    DB_NAME: $(DB_NAME)
```

## Additional Resources

- [Knex.js Documentation](https://knexjs.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Schema Documentation](./SCHEMA.md)
- [Migration Setup Report](./MIGRATION_SETUP_REPORT.md)

## Support

For questions or issues related to database migrations, please:

1. Check this documentation
2. Review existing migration files for examples
3. Check the [Knex.js documentation](https://knexjs.org/)
4. Contact the development team

## Version History

- **v1.0.0** (2025-01-01): Initial migration infrastructure
  - Users and profiles
  - Photos and prompts
  - Matching system (swipes, matches, preferences)
  - Messaging system (conversations, messages)
  - Subscription and payment system
  - Gamification system
  - Analytics and notifications
  - Video/voice features
