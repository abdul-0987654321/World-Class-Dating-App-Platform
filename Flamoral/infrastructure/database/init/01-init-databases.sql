-- Database Initialization Script
-- Creates all required databases and users for the Dating App Platform

-- Create databases for each environment
CREATE DATABASE dating_app_development;
CREATE DATABASE dating_app_test;
CREATE DATABASE dating_app_staging;
CREATE DATABASE dating_app_production;

-- Create Grafana database
CREATE DATABASE grafana;

-- Create application users
CREATE USER datingapp_dev WITH ENCRYPTED PASSWORD 'dev_password_change_me';
CREATE USER datingapp_test WITH ENCRYPTED PASSWORD 'test_password_change_me';
CREATE USER datingapp_staging WITH ENCRYPTED PASSWORD 'staging_password_change_me';
CREATE USER datingapp_prod WITH ENCRYPTED PASSWORD 'prod_password_change_me';
CREATE USER grafana WITH ENCRYPTED PASSWORD 'grafana_password_change_me';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dating_app_development TO datingapp_dev;
GRANT ALL PRIVILEGES ON DATABASE dating_app_test TO datingapp_test;
GRANT ALL PRIVILEGES ON DATABASE dating_app_staging TO datingapp_staging;
GRANT ALL PRIVILEGES ON DATABASE dating_app_production TO datingapp_prod;
GRANT ALL PRIVILEGES ON DATABASE grafana TO grafana;

-- Connect to each database and create extensions
\c dating_app_development
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";
GRANT ALL ON SCHEMA public TO datingapp_dev;

\c dating_app_test
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";
GRANT ALL ON SCHEMA public TO datingapp_test;

\c dating_app_staging
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";
GRANT ALL ON SCHEMA public TO datingapp_staging;

\c dating_app_production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";
GRANT ALL ON SCHEMA public TO datingapp_prod;

\c grafana
GRANT ALL ON SCHEMA public TO grafana;
