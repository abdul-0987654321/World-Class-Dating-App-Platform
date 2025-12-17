# Database Configuration Fixes Summary

## Overview
This document summarizes all database configuration and migration fixes applied to the Flamoral codebase.

## Fixes Applied

### 1. Knexfile Configuration Standardization

#### Issues Found:
- Migration directory paths using relative paths (`./migrations`) instead of absolute paths
- Missing `path` import in several knexfile configurations
- Inconsistent `parseInt` radix parameters (missing second parameter)
- Missing pool timeout configurations
- Missing seed directory configurations in some environments
- Missing staging environment in advertising-service
- Missing knexfiles for payment-service and notification-service

#### Files Fixed:

##### User Service
**File**: `backend/services/user-service/src/infrastructure/database/knexfile.ts`
- Already had proper configuration with `path.join(__dirname, 'migrations')`
- No changes needed

##### Matching Service
**File**: `backend/services/matching-service/src/infrastructure/database/knexfile.ts`

Changes:
- Added `import path from 'path'`
- Changed all `directory: './migrations'` to `directory: path.join(__dirname, 'migrations')`
- Changed all `directory: './seeds'` to `directory: path.join(__dirname, 'seeds')`
- Fixed `parseInt()` calls to include radix: `parseInt(value, 10)`
- Added missing `loadExtensions` in test environment
- Added seed configurations for staging and production
- Added `reapIntervalMillis: 1000` to staging pool config

##### Media Service
**File**: `backend/services/media-service/src/infrastructure/database/knexfile.ts`

Changes:
- Added `import path from 'path'`
- Changed all migration and seed directories to use `path.join(__dirname, ...)`
- Fixed `parseInt()` calls to include radix parameter
- Added seed configurations for test, staging, and production environments
- Added `reapIntervalMillis: 1000` to staging pool config

##### Advertising Service
**File**: `backend/services/advertising-service/src/infrastructure/database/knexfile.ts`

Changes:
- Added `import path from 'path'`
- Changed all migration directories to use `path.join(__dirname, 'migrations')`
- Added seed configurations for all environments
- Added pool timeout configurations (acquireTimeoutMillis, idleTimeoutMillis, reapIntervalMillis)
- Added complete staging environment configuration with SSL support
- Enhanced production environment with DATABASE_URL support, SSL, and comprehensive timeouts
- Fixed `parseInt()` calls to include radix parameter
- Changed test pool min from 1 to 0 (best practice)

##### Moderation Service
**File**: `backend/services/moderation-service/src/infrastructure/database/knexfile.ts`

Changes:
- Added `import path from 'path'`
- Changed all migration and seed directories to use `path.join(__dirname, ...)`
- Added seed configurations for test, staging, and production environments
- Added `loadExtensions` configurations
- Added `reapIntervalMillis: 1000` to staging pool config

##### Database (Main)
**File**: `database/knexfile.ts`

Changes:
- Added `import path from 'path'`
- Changed all migration and seed directories to use `path.join(__dirname, ...)`
- Fixed `parseInt()` calls to include radix parameter
- Added `reapIntervalMillis: 1000` to staging pool config

##### Payment Service
**File**: `backend/services/payment-service/src/infrastructure/database/knexfile.ts`

**Status**: Created new file (previously missing)

Features:
- Complete development, test, staging, and production configurations
- Proper path handling with `path.join(__dirname, ...)`
- SSL configuration support
- Connection pooling with timeouts
- Migration and seed directory configurations
- Environment variable support with sensible defaults
- Database name: `payment_service_dev` / `payment_service_test`

**Also Fixed**:
**File**: `backend/services/payment-service/src/infrastructure/database/connection.ts`
- Added `import path from 'path'`
- Changed migration/seed directories to use `path.join(__dirname, ...)`

##### Notification Service
**File**: `backend/services/notification-service/src/infrastructure/database/knexfile.ts`

**Status**: Created new file (previously missing)

Features:
- Complete development, test, staging, and production configurations
- Proper path handling with `path.join(__dirname, ...)`
- SSL configuration support
- Connection pooling with timeouts
- Migration and seed directory configurations
- Environment variable support with sensible defaults
- Database name: `notification_service_dev` / `notification_service_test`

### 2. Migration vs Seed Data Separation

#### Issue:
Migration file `20251202000008_seed_opening_move_templates.ts` contained seed data instead of schema changes.

#### Fix:
**File**: `backend/services/user-service/src/infrastructure/database/migrations/20251202000008_seed_opening_move_templates.ts`

- Converted to no-op migration with deprecation notice
- Added comments explaining data moved to seed file

**New File**: `backend/services/user-service/src/infrastructure/database/seeds/05_opening_move_templates.ts`

- Created proper seed file with 30 opening move templates
- Organized by category: interests, date_ideas, travel, fun, conversation, food, entertainment
- Includes proper deletion of existing system templates before insert
- Added console log for visibility

### 3. Database Architecture Documentation

#### Created: `backend/DATABASE_ARCHITECTURE.md`

Comprehensive documentation covering:
- **Database Separation Strategy**: Explains microservices architecture with separate databases
- **Service Databases**: Detailed breakdown of all service databases and their tables
- **Important Architectural Decisions**: Why duplicate table names exist, foreign key handling
- **Migration Management**: How to run migrations, naming conventions
- **Seed Data vs Migrations**: Clear guidelines on when to use each
- **Environment Variables**: Complete list of required variables
- **Development Setup**: Step-by-step setup instructions
- **Production Considerations**: HA, monitoring, backup, security
- **Troubleshooting**: Common issues and solutions
- **Best Practices**: Database development guidelines

#### Created: `backend/DATABASE_QUICK_START.md`

Quick reference guide covering:
- **Quick Commands**: Fast commands for common tasks
- **Environment Setup**: .env file examples
- **Common Issues & Solutions**: Practical troubleshooting
- **Database Reset**: Development database reset procedures
- **PostgreSQL Commands**: Useful psql commands
- **Migration Development**: Templates for migrations and seeds
- **Testing**: Test database setup
- **Production Checklist**: Pre-deployment verification
- **Monitoring**: Database health queries

### 4. Configuration Standardization

All knexfile configurations now include:

#### Development Environment:
```typescript
{
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'service_name_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 60000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
}
```

#### Test Environment:
- Min pool connections: 0
- Max pool connections: 5
- Reduced timeouts for faster tests
- Separate test database naming: `service_name_test`

#### Staging Environment:
- DATABASE_URL support for cloud deployments
- SSL configuration with certificate authority support
- Connection and statement timeouts
- Larger pool sizes (2-20 connections)
- Both .ts and .js file support for compiled code

#### Production Environment:
- DATABASE_URL primary, fallback to individual variables
- Mandatory SSL with configurable rejectUnauthorized
- Connection pooling (5-20 connections default)
- All timeout configurations
- Error propagation control
- Both .ts and .js file support

## Database Services Summary

### Services with Databases:

1. **User Service** (`flamoral_users`)
   - 40+ tables including users, profiles, subscriptions, coins, messaging, etc.
   - Most complex schema with authentication, gamification, compliance features

2. **Matching Service** (`matching_service_dev`)
   - Swipes, matches, preferences
   - Matching algorithm and compatibility scoring

3. **Media Service** (`media_service_dev`)
   - Media files, videos, voice notes
   - Photo verification

4. **Moderation Service**
   - Content moderation
   - Flagged content and decisions

5. **Advertising Service** (`advertising_service_dev`)
   - Ad campaigns and delivery

6. **Payment Service** (`payment_service_dev`)
   - Payment transactions
   - Subscription billing

7. **Notification Service** (`notification_service_dev`)
   - Notification queue and delivery
   - Batch jobs

8. **Main Database** (`flamoral_dev`)
   - Shared/central database (if used)

## Migration Status

All services now have:
- ✅ Proper knexfile.ts configuration
- ✅ Absolute path handling for migrations/seeds
- ✅ Complete environment configurations (dev, test, staging, prod)
- ✅ Connection pooling with timeouts
- ✅ SSL support for production
- ✅ Consistent naming conventions

## Breaking Changes

None. All changes are configuration improvements that maintain backward compatibility.

## Required Actions

### 1. Create Missing Databases

Run these commands to create all service databases:

```bash
createdb flamoral_users
createdb flamoral_users_test
createdb matching_service_dev
createdb matching_service_test
createdb media_service_dev
createdb media_service_test
createdb moderation_service_dev
createdb moderation_service_test
createdb advertising_service_dev
createdb advertising_service_test
createdb payment_service_dev
createdb payment_service_test
createdb notification_service_dev
createdb notification_service_test
createdb flamoral_dev
createdb flamoral_test
```

### 2. Run Migrations

For each service:

```bash
# User Service
cd backend/services/user-service
npm run migrate
npm run seed

# Matching Service
cd backend/services/matching-service
npm run migrate

# Media Service
cd backend/services/media-service
npm run migrate

# Moderation Service
cd backend/services/moderation-service
npm run migrate

# Advertising Service
cd backend/services/advertising-service
npm run migrate

# Payment Service
cd backend/services/payment-service
npm run migrate

# Notification Service
cd backend/services/notification-service
npm run migrate
```

### 3. Verify Seed Data

User service includes seed data for:
- Coin products (4 packages)
- Boost products
- Report categories
- Subscription features
- Opening move templates (30 templates) - NEW

Run seeds:
```bash
cd backend/services/user-service
npm run seed
```

## Testing

### Test Database Setup

Each service should set up test databases before running tests:

```bash
cd backend/services/user-service
npm run migrate:test
npm run seed:test
npm test
```

## Production Deployment

Before deploying to production:

1. **Backup all databases**
2. **Test migrations on staging**
3. **Review DATABASE_ARCHITECTURE.md**
4. **Set all environment variables**
5. **Configure SSL certificates**
6. **Set up monitoring and alerts**
7. **Run migrations during low-traffic window**
8. **Verify application functionality**

## Environment Variables

All services need these variables in their `.env` files:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=service_name_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Test
DB_NAME_TEST=service_name_test

# Pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# Timeouts
DB_CONNECTION_TIMEOUT=30000
DB_QUERY_TIMEOUT=60000

# SSL (production)
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA=/path/to/ca-cert.pem

# Or use DATABASE_URL
DATABASE_URL=postgresql://user:pass@host:5432/dbname?ssl=true
```

## Documentation Files

Three new documentation files created:

1. **DATABASE_ARCHITECTURE.md** - Comprehensive architecture guide
2. **DATABASE_QUICK_START.md** - Quick reference and commands
3. **DATABASE_FIXES_SUMMARY.md** - This file

## Benefits of These Fixes

1. **Reliability**: Absolute paths prevent migration loading issues
2. **Consistency**: All services follow same configuration pattern
3. **Maintainability**: Clear separation of schema vs data
4. **Scalability**: Proper connection pooling and timeout handling
5. **Security**: SSL support and secure defaults
6. **Documentation**: Clear guides for developers
7. **Best Practices**: Follows Knex.js and PostgreSQL recommendations

## Next Steps

1. ✅ Review this summary
2. ✅ Read DATABASE_ARCHITECTURE.md for understanding
3. ✅ Create all databases using commands above
4. ✅ Run all migrations
5. ✅ Run seed data for user service
6. ✅ Test each service's database connection
7. ✅ Update CI/CD to run migrations
8. ✅ Set up database monitoring

## Support

For issues or questions:
- Check **DATABASE_QUICK_START.md** for common solutions
- Review **DATABASE_ARCHITECTURE.md** for design decisions
- Check migration logs in each service
- Verify environment variables are set correctly

## Conclusion

All database configurations are now standardized, properly configured, and documented. The codebase follows microservices best practices with separate databases per service, proper migration management, and clear separation between schema and data.
