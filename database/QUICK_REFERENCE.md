# Database Quick Reference Card

One-page reference for common database operations.

## Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

## First Time Setup

```bash
# Install dependencies
npm install

# Run migrations and seed data
npm run db:setup
```

## Daily Development Commands

| Command | Description |
|---------|-------------|
| `npm run migrate:latest` | Run pending migrations |
| `npm run migrate:status` | Check what's been run |
| `npm run seed:run` | Populate with test data |
| `npm run db:reset` | Complete reset (rollback + migrate + seed) |
| `npm run db:fresh` | Fresh migrations (no seeds) |

## Creating Migrations

```bash
# Create new migration
npm run migrate:make add_feature_name

# Example
npm run migrate:make add_email_verification
```

## Migration Management

| Command | Description |
|---------|-------------|
| `npm run migrate:latest` | Run all pending migrations |
| `npm run migrate:rollback` | Rollback last batch |
| `npm run migrate:rollback:all` | Rollback everything |
| `npm run migrate:up` | Run next migration |
| `npm run migrate:down` | Rollback last migration |
| `npm run migrate:list` | List all migrations |
| `npm run migrate:status` | Show migration status |
| `npm run migrate:currentVersion` | Show current version |

## Seed Management

| Command | Description |
|---------|-------------|
| `npm run seed:run` | Run all seed files |
| `npm run seed:make <name>` | Create new seed file |
| `npm run db:seed:dev` | Run development seeds |

## Database Utilities

| Command | Description |
|---------|-------------|
| `npm run db:setup` | Initial setup (migrate + seed) |
| `npm run db:reset` | Full reset (rollback all + migrate + seed) |
| `npm run db:fresh` | Fresh migrations (no seeds) |
| `npm run db:status` | Check migration status |

## Production Commands

| Command | Description |
|---------|-------------|
| `npm run db:migrate:prod` | Run migrations in production |
| `npm run db:migrate:staging` | Run migrations in staging |

**Warning:** Never run seeds in production!

## Test Users (Development)

All test users use password: `Test123!`

| Email | Subscription | Location |
|-------|-------------|----------|
| alice.johnson@example.com | Ultra | San Francisco |
| bob.smith@example.com | Mid | Los Angeles |
| carol.williams@example.com | Basic | New York |
| david.brown@example.com | Free | Austin |
| emily.davis@example.com | Mid | Chicago |
| frank.miller@example.com | Basic (Trial) | Seattle |

## PostgreSQL Commands

```bash
# Connect to database
psql -U postgres -d flamoral_dev

# List all tables
\dt

# Describe a table
\d users

# View data
SELECT * FROM users;

# Exit
\q
```

## Common Queries

```sql
-- Check users
SELECT id, email, subscription_tier FROM users;

-- Check matches
SELECT * FROM matches WHERE status = 'active';

-- Check messages
SELECT * FROM messages ORDER BY sent_at DESC LIMIT 10;

-- Check subscriptions
SELECT u.email, sp.display_name, s.status
FROM subscriptions s
JOIN users u ON s.user_id = u.id
JOIN subscription_plans sp ON s.plan_id = sp.id;
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot connect | Check PostgreSQL is running: `pg_isready` |
| Table exists error | Run `npm run db:reset` |
| Permission denied | Grant privileges in psql |
| TypeScript errors | Run `npm install` |
| Seed conflicts | Run `npm run db:reset` |

## File Structure

```
database/
├── migrations/          # Migration files
├── seeds/              # Seed files
├── knexfile.ts         # Knex configuration
├── package.json        # Scripts and dependencies
├── .env               # Environment variables (not in git)
└── .env.example       # Environment template
```

## Migration Template

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('table_name', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('table_name');
}
```

## Seed Template

```typescript
import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('table_name').del();
  await knex('table_name').insert([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ]);
}
```

## Common Table Patterns

### UUID Primary Key
```typescript
table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
```

### Foreign Key
```typescript
table.uuid('user_id')
  .notNullable()
  .references('id')
  .inTable('users')
  .onDelete('CASCADE');
```

### Timestamps
```typescript
table.timestamps(true, true); // created_at, updated_at
```

### Index
```typescript
table.index('column_name');
table.index(['column1', 'column2']); // Composite
```

### Enum
```typescript
table.enum('status', ['active', 'inactive', 'banned'])
  .defaultTo('active');
```

### JSONB
```typescript
table.jsonb('metadata').defaultTo('{}');
```

## Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=your_password

# Optional: Connection String
DATABASE_URL=postgresql://user:password@host:5432/database?ssl=true
```

## Backup & Restore

```bash
# Backup
pg_dump -U postgres -d flamoral_dev > backup.sql

# Restore
psql -U postgres -d flamoral_dev < backup.sql

# Backup with gzip
pg_dump -U postgres -d flamoral_dev | gzip > backup.sql.gz

# Restore from gzip
gunzip -c backup.sql.gz | psql -U postgres -d flamoral_dev
```

## Documentation Links

- [GET_STARTED.md](./GET_STARTED.md) - First-time setup guide
- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) - Complete migration docs
- [SEEDS_README.md](./SEEDS_README.md) - Seed data documentation
- [README.md](./README.md) - Main documentation

## Key Points to Remember

1. **Always test rollbacks** before deploying
2. **Never modify existing migrations** in production
3. **Use transactions** for complex migrations
4. **Add indexes** for foreign keys and frequent queries
5. **Document complex logic** in migration comments
6. **Backup before migrations** in production
7. **Never run seeds** in production
8. **Test migrations** in staging first

## Quick Workflow

```bash
# 1. Create migration
npm run migrate:make add_new_feature

# 2. Edit the generated file in migrations/

# 3. Test it
npm run migrate:latest
npm run migrate:rollback
npm run migrate:latest

# 4. Verify
npm run migrate:status

# 5. Commit to git
git add database/migrations/
git commit -m "Add new feature migration"
```

## Need Help?

1. Check this quick reference
2. Read [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md)
3. Review existing migration files
4. Check [Knex.js docs](https://knexjs.org/)
5. Contact the dev team
