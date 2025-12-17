-- Migration: Add comprehensive security and safety features
-- Date: 2025-01-20
-- Description: Two-factor authentication, biometric auth, photo verification, and enhanced security

-- ============================================
-- Two-Factor Authentication Tables
-- ============================================

-- User 2FA Configuration
CREATE TABLE IF NOT EXISTS user_two_factor_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL CHECK (method IN ('2fa_totp', '2fa_sms', '2fa_email')),
  secret VARCHAR(255), -- TOTP secret (base32 encoded)
  phone_number VARCHAR(20), -- For SMS 2FA
  email VARCHAR(255), -- For email 2FA
  is_enabled BOOLEAN DEFAULT false,
  enabled_at TIMESTAMP,
  disabled_at TIMESTAMP,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, method)
);

CREATE INDEX idx_2fa_user_id ON user_two_factor_auth(user_id);
CREATE INDEX idx_2fa_enabled ON user_two_factor_auth(user_id, is_enabled);

-- Backup Codes for 2FA
CREATE TABLE IF NOT EXISTS user_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL, -- SHA-256 hashed backup code
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP
);

CREATE INDEX idx_backup_codes_user_id ON user_backup_codes(user_id);
CREATE INDEX idx_backup_codes_unused ON user_backup_codes(user_id, is_used);

-- Verification Codes (SMS, Email)
CREATE TABLE IF NOT EXISTS user_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('2fa_sms', '2fa_email', 'phone_verification', 'email_verification')),
  phone_number VARCHAR(20),
  email VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_codes_user ON user_verification_codes(user_id, type);
CREATE INDEX idx_verification_codes_expiry ON user_verification_codes(expires_at);

-- ============================================
-- Biometric Authentication Tables
-- ============================================

-- User Devices for Biometric Auth
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50), -- 'ios', 'android', 'web'
  biometric_type VARCHAR(50) CHECK (biometric_type IN ('face_id', 'touch_id', 'fingerprint')),
  biometric_public_key TEXT, -- RSA public key for signature verification
  biometric_enrolled_at TIMESTAMP,
  last_biometric_auth TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_devices_active ON user_devices(user_id, is_active);

-- Biometric Challenges
CREATE TABLE IF NOT EXISTS biometric_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  challenge TEXT NOT NULL, -- Random challenge string
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP
);

CREATE INDEX idx_biometric_challenges_user ON biometric_challenges(user_id, device_id);
CREATE INDEX idx_biometric_challenges_expiry ON biometric_challenges(expires_at);

-- ============================================
-- Photo Verification Tables
-- ============================================

-- Photo Verification Requests
CREATE TABLE IF NOT EXISTS photo_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_pose VARCHAR(50) NOT NULL, -- 'smile', 'neutral', 'look_left', 'look_right', etc.
  photo_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  confidence_score DECIMAL(5,4), -- 0.0000 to 1.0000
  liveness_detected BOOLEAN,
  face_matched BOOLEAN,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_photo_verification_user ON photo_verification_requests(user_id);
CREATE INDEX idx_photo_verification_status ON photo_verification_requests(status);

-- ============================================
-- Enhanced Security Tables
-- ============================================

-- Login Attempts (for rate limiting and security monitoring)
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45) NOT NULL, -- IPv6 compatible
  user_agent TEXT,
  successful BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  location VARCHAR(255), -- Geographic location
  device_fingerprint VARCHAR(255),
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email, attempted_at DESC);
CREATE INDEX idx_login_attempts_user ON login_attempts(user_id, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, attempted_at DESC);

-- Account Lockouts
CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  lockout_reason VARCHAR(50) NOT NULL, -- 'failed_login_attempts', 'admin_action', 'security_violation'
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unlock_at TIMESTAMP,
  unlocked_at TIMESTAMP,
  is_permanent BOOLEAN DEFAULT false,
  failed_attempts_count INTEGER,
  unlock_token VARCHAR(255), -- Token for email unlock
  notes TEXT,
  ip_address VARCHAR(45)
);

CREATE INDEX idx_lockouts_user ON account_lockouts(user_id);
CREATE INDEX idx_lockouts_active ON account_lockouts(user_id, unlocked_at);

-- Security Sessions (enhanced session management)
CREATE TABLE IF NOT EXISTS security_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  refresh_token VARCHAR(255),
  device_fingerprint VARCHAR(255),
  device_name VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_trusted_device BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  revoked_reason VARCHAR(255)
);

CREATE INDEX idx_sessions_user ON security_sessions(user_id);
CREATE INDEX idx_sessions_token ON security_sessions(session_token);
CREATE INDEX idx_sessions_active ON security_sessions(user_id, is_active);

-- ============================================
-- User Safety and Privacy Tables
-- ============================================

-- User Badges (verification badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL CHECK (badge_type IN ('photo_verified', 'phone_verified', 'email_verified', 'premium', 'vip')),
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, badge_type)
);

CREATE INDEX idx_badges_user ON user_badges(user_id, is_active);

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  relationship VARCHAR(100),
  can_notify BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);

-- Safety Check-ins
CREATE TABLE IF NOT EXISTS safety_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id),
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  scheduled_time TIMESTAMP NOT NULL,
  checked_in_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'emergency')),
  emergency_triggered BOOLEAN DEFAULT false,
  emergency_notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_safety_checkins_user ON safety_checkins(user_id);
CREATE INDEX idx_safety_checkins_status ON safety_checkins(status, scheduled_time);

-- ============================================
-- Alter existing users table for new fields
-- ============================================

-- Add new security-related columns to users table
DO $$
BEGIN
  -- Photo verification status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='photo_verified') THEN
    ALTER TABLE users ADD COLUMN photo_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='photo_verified_at') THEN
    ALTER TABLE users ADD COLUMN photo_verified_at TIMESTAMP;
  END IF;

  -- Phone verification status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_verified') THEN
    ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_verified_at') THEN
    ALTER TABLE users ADD COLUMN phone_verified_at TIMESTAMP;
  END IF;

  -- 2FA requirement
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='require_2fa_setup') THEN
    ALTER TABLE users ADD COLUMN require_2fa_setup BOOLEAN DEFAULT false;
  END IF;

  -- Last security audit
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_security_audit') THEN
    ALTER TABLE users ADD COLUMN last_security_audit TIMESTAMP;
  END IF;
END $$;

-- ============================================
-- Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_photo_verified ON users(photo_verified);
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_two_factor_auth_updated_at
  BEFORE UPDATE ON user_two_factor_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE user_two_factor_auth IS 'Stores two-factor authentication configuration for users';
COMMENT ON TABLE user_backup_codes IS 'Backup codes for 2FA recovery';
COMMENT ON TABLE user_verification_codes IS 'Temporary verification codes for SMS/Email verification';
COMMENT ON TABLE user_devices IS 'Registered devices for biometric authentication';
COMMENT ON TABLE biometric_challenges IS 'Challenges for biometric authentication flow';
COMMENT ON TABLE photo_verification_requests IS 'Photo verification requests for user identity verification';
COMMENT ON TABLE login_attempts IS 'Login attempt history for security monitoring';
COMMENT ON TABLE account_lockouts IS 'Account lockout records for security';
COMMENT ON TABLE security_sessions IS 'Enhanced session management with device tracking';
COMMENT ON TABLE user_badges IS 'User verification and achievement badges';
COMMENT ON TABLE emergency_contacts IS 'Emergency contacts for safety features';
COMMENT ON TABLE safety_checkins IS 'Safety check-in records for date safety';
