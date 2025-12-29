-- Migration: Add Two-Factor Authentication (2FA) columns to users table
-- Created: 2025-12-29
-- Description: Adds columns to support TOTP-based 2FA with backup codes
--
-- SECURITY NOTE: Password verification is required before any 2FA changes
-- This migration enables the 2FA implementation in the auth-service

-- Add 2FA columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_temp_secret TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[];

-- Add index for 2FA-enabled users (useful for login flow optimization)
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled) WHERE two_factor_enabled = TRUE;

-- Add comment to document the columns
COMMENT ON COLUMN users.two_factor_enabled IS '2FA status: true if 2FA is enabled for this account';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret for authenticator apps (base32 encoded)';
COMMENT ON COLUMN users.two_factor_temp_secret IS 'Temporary secret during 2FA setup (before verification)';
COMMENT ON COLUMN users.two_factor_backup_codes IS 'Array of backup codes for account recovery (format: XXXX-XXXX)';

-- Rollback SQL (if needed):
-- ALTER TABLE users
--   DROP COLUMN IF EXISTS two_factor_enabled,
--   DROP COLUMN IF EXISTS two_factor_secret,
--   DROP COLUMN IF EXISTS two_factor_temp_secret,
--   DROP COLUMN IF EXISTS two_factor_backup_codes;
-- DROP INDEX IF EXISTS idx_users_two_factor_enabled;
