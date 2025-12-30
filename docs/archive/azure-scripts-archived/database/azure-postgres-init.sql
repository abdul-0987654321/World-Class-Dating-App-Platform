-- Azure Database for PostgreSQL initialization script
-- Specific configurations for Azure Flexible Server

-- Create databases for each environment
CREATE DATABASE dating_app_development;
CREATE DATABASE dating_app_staging;
CREATE DATABASE dating_app_production;

-- Create application users
CREATE USER datingapp_dev WITH ENCRYPTED PASSWORD 'dev_password_change_me';
CREATE USER datingapp_staging WITH ENCRYPTED PASSWORD 'staging_password_change_me';
CREATE USER datingapp_prod WITH ENCRYPTED PASSWORD 'prod_password_change_me';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dating_app_development TO datingapp_dev;
GRANT ALL PRIVILEGES ON DATABASE dating_app_staging TO datingapp_staging;
GRANT ALL PRIVILEGES ON DATABASE dating_app_production TO datingapp_prod;

-- Connect to production database and set up extensions
\c dating_app_production

-- Enable Azure-specific extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "azure"; -- Azure-specific extension

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO datingapp_prod;
GRANT USAGE ON SCHEMA public TO datingapp_prod;

-- Create audit table for Azure Monitor integration
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_name TEXT,
    database_name TEXT,
    client_addr INET,
    application_name TEXT,
    event_type TEXT,
    object_type TEXT,
    object_name TEXT,
    command_text TEXT,
    azure_subscription_id TEXT,
    azure_resource_group TEXT
);

-- Create index for audit log queries
CREATE INDEX idx_audit_log_time ON audit_log(event_time);
CREATE INDEX idx_audit_log_user ON audit_log(user_name);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);

-- Configure Azure Monitor integration
ALTER DATABASE dating_app_production SET azure.enable_monitor TO 'on';

-- Set connection pooling parameters for Azure
ALTER SYSTEM SET max_connections = 500;
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '10485kB';

-- Azure-specific performance settings
ALTER SYSTEM SET azure.extensions = 'pg_stat_statements,pgcrypto,uuid-ossp';
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Reload configuration
SELECT pg_reload_conf();

-- Setup staging database
\c dating_app_staging
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";
GRANT ALL ON SCHEMA public TO datingapp_staging;

-- Setup development database
\c dating_app_development
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
GRANT ALL ON SCHEMA public TO datingapp_dev;
