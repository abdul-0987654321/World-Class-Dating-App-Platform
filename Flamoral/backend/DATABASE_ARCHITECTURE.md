# Flamoral Database Architecture

## Overview

Flamoral uses a **microservices architecture** with **separate databases per service**. Each service has its own PostgreSQL database to ensure proper separation of concerns and independent scalability.

## Database Separation Strategy

### Why Separate Databases?

1. **Service Independence**: Each service can evolve its schema independently
2. **Scalability**: Services can scale their databases based on specific needs
3. **Fault Isolation**: Database issues in one service don't affect others
4. **Clear Boundaries**: Enforces proper service boundaries and reduces coupling

### Service Databases

#### 1. User Service (`flamoral_users`)
**Purpose**: User authentication, profiles, and core user data

**Key Tables**:
- `users` - Core user authentication and account data
- `profiles` - User profile information and preferences
- `preferences` - User matching preferences
- `photos` - User profile photos
- `prompts` / `user_prompts` - Profile prompts and responses
- `verification_tokens` / `refresh_tokens` - Authentication tokens
- `subscriptions` / `subscription_features` - Premium subscriptions
- `coins` / `coin_products` / `coin_transactions` - Coin system
- `boosts` / `boost_products` - Profile boost system
- `blocked_users` - User blocking
- `reports` / `report_categories` - User reporting
- `privacy_settings` - User privacy controls
- `daily_rewards` - Gamification rewards
- `achievements` - User achievements
- `encryption_keys` / `one_time_prekeys` / `session_keys` - E2E encryption
- `gdpr_consent` / `data_export_requests` / `deletion_requests` / `ccpa_opt_outs` - Compliance
- `data_access_logs` - Audit logs
- `login_attempts` / `account_lockouts` / `security_sessions` - Security
- `data_retention_policies` - Data retention rules
- `gamification_streaks` / `gamification_challenges` / `gamification_xp_levels` / `gamification_badges` - Gamification
- `opening_moves` / `opening_move_templates` / `match_opening_responses` - Opening moves feature
- `travel_mode_tables` - Travel mode feature
- `conversations` - Conversation metadata (references matches)
- `messages` - Chat messages

**Note**: User service contains conversations and messages tables even though they reference matches table. This is intentional as messaging is tightly coupled with user interactions.

#### 2. Matching Service (`matching_service_dev`)
**Purpose**: Swipe mechanics, matching algorithm, and match management

**Key Tables**:
- `swipes` - User swipe actions (like/pass/super_like)
- `matches` - Mutual matches between users
- `user_preferences` - Matching algorithm preferences
- `search_filter_presets` - Saved search filters

**Design Notes**:
- Swipes table uses `user_id` and `target_user_id` (different from user-service naming)
- Matches table has compatibility scoring and match status management
- Contains algorithms for matching users based on preferences
- Handles match expiration and women-first messaging rules

#### 3. Media Service (`media_service_dev`)
**Purpose**: Media upload, processing, and storage management

**Key Tables**:
- `media` - Generic media metadata
- `videos` - Video content
- `voice_notes` - Voice message recordings
- `photo_verification_tables` - Photo verification for safety

**Design Notes**:
- Handles integration with Azure Blob Storage
- Manages media transcoding and optimization
- Implements content moderation integration

#### 4. Advertising Service (`advertising_service_dev`)
**Purpose**: Ad management and delivery

**Key Tables**:
- Campaign management
- Ad impressions and analytics
- Targeting rules

#### 5. Moderation Service
**Purpose**: Content moderation and safety

**Key Tables**:
- Moderation queues
- Flagged content
- Moderation decisions
- AI moderation results

#### 6. Payment Service
**Purpose**: Payment processing and subscription management

**Key Tables**:
- Payment transactions
- Subscription management
- Billing history

#### 7. Notification Service
**Purpose**: Push notifications and email delivery

**Key Tables**:
- Notification queues
- Notification preferences
- Delivery status
- Batch jobs

## Database Configuration

### Connection Configuration

Each service has its own `knexfile.ts` with environment-specific configurations:

```typescript
{
  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'service_name_dev',
      user: 'postgres',
      password: 'postgres'
    }
  },
  test: {
    // Test database configuration
  },
  staging: {
    // Staging with SSL and production-like settings
  },
  production: {
    // Production with full SSL, connection pooling, timeouts
  }
}
```

### Migration Directory Structure

All services use consistent migration structure:
```
src/infrastructure/database/
├── knexfile.ts
├── migrations/
│   ├── 20251114000001_create_table_name.ts
│   └── ...
└── seeds/
    ├── 01_seed_name.ts
    └── ...
```

## Important Architectural Decisions

### 1. Duplicate Table Names Across Services

Some table names appear in multiple services (e.g., `swipes`, `matches`):

- **User Service**: Contains `swipes` and `matches` tables for user's own data view
- **Matching Service**: Contains `swipes` and `matches` tables for matching algorithm

**Rationale**:
- Each service maintains its own view of the data
- Services communicate via API/events, not direct database access
- Allows independent scaling and optimization
- Different schemas for different purposes (user view vs algorithm processing)

### 2. Foreign Key References

Since databases are separate:
- **No cross-database foreign keys** are used
- User IDs are stored as UUIDs but NOT enforced with FK constraints across services
- Data consistency is maintained through:
  - API contracts
  - Event-driven updates
  - Eventual consistency patterns
  - Application-level validation

### 3. Transactions Across Services

- Each service handles its own transactions
- For operations requiring multiple services:
  - Use **Saga pattern** for distributed transactions
  - Implement **compensating transactions** for rollback
  - Use **event sourcing** where appropriate

## Migration Management

### Running Migrations

Each service manages its migrations independently:

```bash
# User Service
cd backend/services/user-service
npm run migrate

# Matching Service
cd backend/services/matching-service
npm run migrate

# Media Service
cd backend/services/media-service
npm run migrate
```

### Migration Naming Convention

Format: `YYYYMMDD_HHMMSS_description.ts`

Examples:
- `20251114000001_create_users_table.ts`
- `20251202000006_create_opening_move_templates_table.ts`

### Seed Data vs Migrations

**Migrations**: Schema changes only
- Create tables
- Add/modify columns
- Create indexes
- Add constraints

**Seeds**: Data population
- Reference data (categories, templates)
- Test data
- Initial system configuration

**Important**: Seed data should NEVER be in migrations. Use separate seed files.

## Environment Variables

Each service requires these database environment variables:

```bash
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=service_name_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Connection pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# Timeouts
DB_CONNECTION_TIMEOUT=30000
DB_QUERY_TIMEOUT=60000

# SSL (production)
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA=/path/to/ca-cert.pem

# Test database
DB_NAME_TEST=service_name_test
```

## Development Setup

### 1. Install PostgreSQL

```bash
# macOS
brew install postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql-14

# Windows
# Download installer from postgresql.org
```

### 2. Create Databases

```bash
createdb flamoral_users
createdb flamoral_users_test
createdb matching_service_dev
createdb matching_service_test
createdb media_service_dev
createdb media_service_test
# ... etc for each service
```

### 3. Run Migrations

```bash
# From backend root
npm run migrate:all

# Or per service
cd backend/services/user-service && npm run migrate
cd backend/services/matching-service && npm run migrate
cd backend/services/media-service && npm run migrate
```

### 4. Seed Data

```bash
# Per service
cd backend/services/user-service && npm run seed
```

## Production Considerations

### High Availability

- Use **PostgreSQL replication** for each service database
- Configure **connection pooling** (PgBouncer)
- Implement **read replicas** for read-heavy services
- Use **connection retry logic** with exponential backoff

### Monitoring

- Track connection pool metrics
- Monitor query performance
- Set up alerts for:
  - Connection pool exhaustion
  - Slow queries (> 1s)
  - Failed migrations
  - Replication lag

### Backup Strategy

- **Automated daily backups** for each database
- **Point-in-time recovery** (PITR) enabled
- **Cross-region backup replication**
- **Regular backup testing** (monthly)

### Security

- **SSL/TLS encryption** for all database connections
- **Separate database users** per service with minimal permissions
- **No direct database access** from public internet
- **Network isolation** using VPC/security groups
- **Audit logging** enabled
- **Encryption at rest** for sensitive data

## Troubleshooting

### Migration Issues

**Problem**: Migration fails due to missing path
**Solution**: Ensure knexfile uses `path.join(__dirname, 'migrations')`

**Problem**: Migration runs but seeds don't
**Solution**: Check seeds directory path and loadExtensions configuration

### Connection Issues

**Problem**: Cannot connect to database
**Solution**:
1. Verify PostgreSQL is running
2. Check credentials in .env file
3. Verify database exists
4. Check network connectivity

### Performance Issues

**Problem**: Slow queries
**Solution**:
1. Check indexes are created
2. Use EXPLAIN ANALYZE to identify bottlenecks
3. Consider query optimization
4. Review connection pool settings

## Best Practices

1. **Never use SELECT *** - Always specify columns
2. **Use indexes** - Add indexes for foreign keys and frequently queried columns
3. **Use transactions** - Wrap related operations in transactions
4. **Validate before insert** - Use application-level validation
5. **Use prepared statements** - Knex handles this automatically
6. **Monitor connection pool** - Don't exhaust connections
7. **Use migrations** - Never manually modify production schema
8. **Backup before migrations** - Always backup production before running migrations
9. **Test migrations** - Test on staging before production
10. **Version control** - All migrations and seeds in version control

## Schema Documentation

For detailed schema documentation of each service, see:
- User Service: `backend/services/user-service/SCHEMA.md`
- Matching Service: `backend/services/matching-service/SCHEMA.md`
- Media Service: `backend/services/media-service/SCHEMA.md`

## Database Tools

Recommended tools for database management:

- **pgAdmin** - GUI for PostgreSQL
- **DBeaver** - Universal database tool
- **TablePlus** - Modern database GUI
- **pg_dump/pg_restore** - Backup/restore utilities
- **psql** - PostgreSQL CLI

## References

- [Knex.js Documentation](https://knexjs.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Microservices Database Patterns](https://microservices.io/patterns/data/database-per-service.html)
- [PostgreSQL High Availability](https://www.postgresql.org/docs/current/high-availability.html)
