-- PostgreSQL Streaming Replication Configuration
-- Run this on the PRIMARY database server

-- Create replication user
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replication_password_change_me';

-- Configure replication slots (for each replica)
SELECT pg_create_physical_replication_slot('replica_1_slot');
SELECT pg_create_physical_replication_slot('replica_2_slot');

-- Grant connection privileges
GRANT CONNECT ON DATABASE postgres TO replicator;

-- Configure pg_hba.conf (add these lines manually):
-- host    replication     replicator     10.0.0.0/8            md5
-- host    replication     replicator     172.16.0.0/12         md5

-- Configure postgresql.conf (add these settings manually):
-- wal_level = replica
-- max_wal_senders = 10
-- max_replication_slots = 10
-- hot_standby = on
-- archive_mode = on
-- archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f'
