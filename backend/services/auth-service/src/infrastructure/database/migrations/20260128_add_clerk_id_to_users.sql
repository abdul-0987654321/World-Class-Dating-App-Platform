-- Migration: Add clerk_id column to users table for Clerk authentication integration
-- Date: 2026-01-28

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id) WHERE clerk_id IS NOT NULL;
