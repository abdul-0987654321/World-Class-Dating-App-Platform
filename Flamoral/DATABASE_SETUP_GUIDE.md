# Flamoral Database Setup Guide

This guide provides comprehensive instructions for setting up and configuring databases for the Flamoral dating application.

## Table of Contents
1. [Overview](#overview)
2. [PostgreSQL Setup](#postgresql-setup)
3. [Cosmos DB / MongoDB Setup](#cosmos-db--mongodb-setup)
4. [Redis Setup](#redis-setup)
5. [Configuration Files](#configuration-files)
6. [Running Migrations](#running-migrations)
7. [Service-Specific Setup](#service-specific-setup)
8. [Troubleshooting](#troubleshooting)

## Overview

Flamoral uses multiple database technologies:
- **PostgreSQL**: Primary relational database for most services
- **Cosmos DB / MongoDB**: NoSQL database for messaging service
- **Redis**: Caching and real-time features
- **TimescaleDB**: Time-series data (optional, for analytics)

## PostgreSQL Setup

### Installation

#### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
Download and install from: https://www.postgresql.org/download/windows/

### Create Databases

```bash
# Connect to PostgreSQL
psql -U postgres

# Create main database
CREATE DATABASE flamoral_dev;
CREATE DATABASE flamoral_test;

# Create service-specific databases (optional - for microservices)
CREATE DATABASE flamoral_users;
CREATE DATABASE flamoral_matching;
CREATE DATABASE flamoral_payments;
CREATE DATABASE flamoral_media;
CREATE DATABASE flamoral_notifications;
CREATE DATABASE flamoral_analytics;
CREATE DATABASE flamoral_advertising;
CREATE DATABASE flamoral_moderation;

# Create user (optional)
CREATE USER flamoral WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE flamoral_dev TO flamoral;
GRANT ALL PRIVILEGES ON DATABASE flamoral_test TO flamoral;

# Exit
\q
```

### Enable Required Extensions

```sql
-- Connect to each database
\c flamoral_dev

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable PostGIS (if needed for location features)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enable TimescaleDB (for analytics service)
CREATE EXTENSION IF NOT EXISTS "timescaledb";
```

## Cosmos DB / MongoDB Setup

### Option 1: Azure Cosmos DB

1. Create Cosmos DB account in Azure Portal
2. Select "Core (SQL)" API
3. Create database named "Flamoral"
4. Create containers:
   - Messages (partition key: `/conversationId`)
   - Conversations (partition key: `/matchId`)
   - CallHistory (partition key: `/userId`)
   - CallRecordings (partition key: `/callId`)

5. Get connection details:
   - Endpoint URL
   - Primary Key

### Option 2: MongoDB

#### Installation

##### macOS
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

##### Ubuntu/Debian
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

##### Windows
Download and install from: https://www.mongodb.com/try/download/community

#### Create Database and Collections

```bash
# Connect to MongoDB
mongosh

# Create database
use flamoral_messaging

# Create collections
db.createCollection("messages")
db.createCollection("conversations")
db.createCollection("callHistory")
db.createCollection("callRecordings")

# Create indexes
db.messages.createIndex({ "conversationId": 1, "createdAt": -1 })
db.messages.createIndex({ "senderId": 1 })
db.messages.createIndex({ "receiverId": 1 })

db.conversations.createIndex({ "matchId": 1 })
db.conversations.createIndex({ "participants": 1 })
db.conversations.createIndex({ "lastMessageAt": -1 })

# Exit
exit
```

## Redis Setup

### Installation

#### macOS
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Windows
Download from: https://github.com/microsoftarchive/redis/releases

### Configuration

Edit `/etc/redis/redis.conf` (Linux) or `redis.windows.conf` (Windows):

```conf
# Set password
requirepass your_redis_password

# Set max memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Enable persistence
save 900 1
save 300 10
save 60 10000

# Set database count
databases 16
```

Restart Redis after configuration changes.

## Configuration Files

### 1. Root Database Configuration

The corrected file is at: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/database/knexfile-FIXED.ts`

**To apply:** Rename or replace the original `knexfile.ts` with `knexfile-FIXED.ts`

### 2. Backend Configuration

The corrected file is at: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/knexfile-FIXED.ts`

**To apply:** Rename or replace the original `knexfile.ts` with `knexfile-FIXED.ts`

### 3. Connection Pool Configuration

The corrected file is at: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/shared/database/connection-pool-config-FIXED.ts`

**To apply:** Rename or replace the original `connection-pool-config.ts` with `connection-pool-config-FIXED.ts`

### 4. Service-Specific Configurations

A template is provided at: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/TEMPLATE_SERVICE_knexfile.ts`

**For each service:**
1. Copy the template to the service's infrastructure/database directory
2. Update the database name defaults (search for "CHANGE THIS")
3. Save as `knexfile.ts` in the appropriate location

### 5. Messaging Service Configuration

The corrected file is at: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/messaging-service/src/config/index-FIXED.ts`

**To apply:** Rename or replace the original `index.ts` with `index-FIXED.ts`

### 6. Analytics Service Configuration

The corrected file is at: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/analytics-service/src/config/index-FIXED.ts`

**To apply:** Rename or replace the original `index.ts` with `index-FIXED.ts`

## Environment Variables

Create a `.env` file in the project root and each service directory:

### Root .env Example
```bash
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=10

# SSL (production only)
DB_SSL=false

# Test Database
DB_NAME_TEST=flamoral_test
```

### Messaging Service .env Example
```bash
# Cosmos DB
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_key
COSMOS_DATABASE_ID=Flamoral

# Or MongoDB
MONGODB_URI=mongodb://localhost:27017/flamoral_messaging

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
```

See `DATABASE_ENV_VARIABLES.md` for complete list of environment variables.

## Running Migrations

### Root Database Migrations

```bash
# From project root
cd database

# Run migrations
npx knex migrate:latest

# Rollback last migration
npx knex migrate:rollback

# Check migration status
npx knex migrate:status
```

### Service-Specific Migrations

```bash
# From service directory
cd backend/services/user-service

# Run migrations
npx knex migrate:latest --knexfile src/infrastructure/database/knexfile.ts

# Or use npm scripts if configured
npm run migrate
```

### Create New Migration

```bash
# From database directory
npx knex migrate:make create_table_name

# From service directory
npx knex migrate:make create_table_name --knexfile src/infrastructure/database/knexfile.ts
```

## Service-Specific Setup

### User Service
- Database: `flamoral_users` or `flamoral_dev`
- Migrations: `backend/services/user-service/src/infrastructure/database/migrations`
- Pool: High-traffic (min: 10, max: 50 in production)

### Matching Service
- Database: `flamoral_matching` or `flamoral_dev`
- Migrations: `backend/services/matching-service/src/infrastructure/database/migrations`
- Pool: High-traffic (min: 10, max: 50 in production)

### Payment Service
- Database: `flamoral_payments` or `flamoral_dev`
- Migrations: `backend/services/payment-service/src/infrastructure/database/migrations`
- Pool: Medium-traffic (min: 5, max: 30 in production)

### Media Service
- Database: `flamoral_media` or `flamoral_dev`
- Migrations: `backend/services/media-service/src/infrastructure/database/migrations`
- Pool: Medium-traffic (min: 5, max: 30 in production)

### Messaging Service
- Database: Cosmos DB or MongoDB
- Collections: messages, conversations, callHistory, callRecordings
- Redis: DB 0

### Analytics Service
- Database: `flamoral_analytics` or `flamoral_dev`
- Extensions: TimescaleDB (optional)
- Pool: Low-traffic (min: 3, max: 20 in production)
- Redis: DB 7

### Notification Service
- Database: `flamoral_notifications` or `flamoral_dev`
- Pool: Medium-traffic (min: 5, max: 30 in production)

### Moderation Service
- Database: `flamoral_moderation` or `flamoral_dev`
- Pool: Low-traffic (min: 3, max: 20 in production)

### Advertising Service
- Database: `flamoral_advertising` or `flamoral_dev`
- Pool: Medium-traffic (min: 5, max: 30 in production)

## Applying the Fixes

### Step 1: Backup Existing Files

```bash
# From project root
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral

# Backup existing files
cp database/knexfile.ts database/knexfile.ts.backup
cp backend/knexfile.ts backend/knexfile.ts.backup
cp backend/shared/database/connection-pool-config.ts backend/shared/database/connection-pool-config.ts.backup
```

### Step 2: Replace with Fixed Files

```bash
# Replace root knexfile
mv database/knexfile-FIXED.ts database/knexfile.ts

# Replace backend knexfile
mv backend/knexfile-FIXED.ts backend/knexfile.ts

# Replace connection pool config
mv backend/shared/database/connection-pool-config-FIXED.ts backend/shared/database/connection-pool-config.ts

# Replace messaging service config
mv backend/services/messaging-service/src/config/index-FIXED.ts backend/services/messaging-service/src/config/index.ts

# Replace analytics service config
mv backend/services/analytics-service/src/config/index-FIXED.ts backend/services/analytics-service/src/config/index.ts
```

### Step 3: Verify Configuration

```bash
# Test database connection
npm run db:test

# Run migrations
npm run migrate

# Verify migrations
npm run migrate:status
```

## Troubleshooting

### Connection Refused
- Verify database is running: `systemctl status postgresql` (Linux) or check Task Manager (Windows)
- Check port: `sudo netstat -plnt | grep 5432` (Linux)
- Verify firewall rules

### Authentication Failed
- Check username and password in `.env`
- Verify user exists: `psql -U postgres -c "\du"`
- Grant appropriate permissions

### Migration Errors
- Check migration files for syntax errors
- Verify database exists
- Check user permissions: `GRANT ALL PRIVILEGES ON DATABASE dbname TO username;`
- Review migration logs for specific errors

### Pool Exhausted
- Increase `DB_POOL_MAX` in `.env`
- Check for connection leaks in code
- Review slow queries: `EXPLAIN ANALYZE your_query;`

### SSL Errors
- For development, set `DB_SSL=false`
- For production, ensure certificate is valid
- Check `DB_SSL_REJECT_UNAUTHORIZED` setting

### Cosmos DB / MongoDB Connection Issues
- Verify endpoint and key are correct
- Check network connectivity
- Ensure firewall allows connections
- Verify database and containers exist

### Redis Connection Issues
- Check Redis is running: `redis-cli ping`
- Verify password if set
- Check port and host configuration

## Performance Optimization

### PostgreSQL
1. Create indexes on frequently queried columns
2. Use connection pooling (already configured)
3. Enable query logging to identify slow queries
4. Regular VACUUM and ANALYZE

### MongoDB
1. Create compound indexes for common queries
2. Use projection to limit returned fields
3. Enable sharding for large collections
4. Regular compaction

### Redis
1. Set appropriate TTL values
2. Use pipelining for bulk operations
3. Monitor memory usage
4. Configure eviction policy

## Production Checklist

- [ ] Enable SSL for all database connections
- [ ] Use strong passwords and rotate regularly
- [ ] Configure connection pooling appropriately
- [ ] Set up database backups
- [ ] Enable query logging and monitoring
- [ ] Configure read replicas for high-traffic services
- [ ] Set up database firewall rules
- [ ] Use environment-specific configurations
- [ ] Test failover scenarios
- [ ] Document recovery procedures

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Azure Cosmos DB Documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Redis Documentation](https://redis.io/documentation)
- [Knex.js Documentation](https://knexjs.org/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
