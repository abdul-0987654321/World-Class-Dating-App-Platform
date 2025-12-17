-- Create required databases for Flamoral Dating Platform
-- This script creates all service-specific databases

-- Create databases
CREATE DATABASE flamoral_users;
CREATE DATABASE flamoral_matching;
CREATE DATABASE flamoral_media;
CREATE DATABASE flamoral_payments;
CREATE DATABASE flamoral_notifications;

-- Grant privileges to flamoraladmin
GRANT ALL PRIVILEGES ON DATABASE flamoral_users TO flamoraladmin;
GRANT ALL PRIVILEGES ON DATABASE flamoral_matching TO flamoraladmin;
GRANT ALL PRIVILEGES ON DATABASE flamoral_media TO flamoraladmin;
GRANT ALL PRIVILEGES ON DATABASE flamoral_payments TO flamoraladmin;
GRANT ALL PRIVILEGES ON DATABASE flamoral_notifications TO flamoraladmin;
