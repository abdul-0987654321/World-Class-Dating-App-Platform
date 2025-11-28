/**
 * Account Security Service
 * Handles comprehensive account security features including:
 * - Two-factor authentication (2FA)
 * - Session management
 * - Login monitoring and alerts
 * - Device fingerprinting
 * - Account recovery
 * - Password security
 */

import { SafetyRepository } from '../../repositories/Safety.repository';
import { UserRepository } from '../../repositories';
import { logger } from '../../utils/logger';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import {
  UserSecuritySettings,
  TwoFactorMethod,
  LoginAttempt,
  ActiveSession,
  DeviceType,
  PasswordResetToken,
} from '../../models/Safety.model';

interface DeviceInfo {
  fingerprint: string;
  name?: string;
  type: DeviceType;
  browser?: string;
  os?: string;
  ipAddress?: string;
  geolocation?: {
    city?: string;
    region?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
}

interface TwoFactorSetupResult {
  secret: string;
  qrCode?: string;
  backupCodes: string[];
  method: TwoFactorMethod;
}

interface LoginSecurityCheck {
  allowed: boolean;
  requiresTwoFactor: boolean;
  requiresDeviceVerification: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
}

export class AccountSecurityService {
  private safetyRepo: SafetyRepository;
  private userRepo: UserRepository;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;
  private readonly SUSPICIOUS_IP_THRESHOLD = 3;

  constructor(safetyRepo: SafetyRepository, userRepo: UserRepository) {
    this.safetyRepo = safetyRepo;
    this.userRepo = userRepo;
  }

  // ============================================
  // Two-Factor Authentication
  // ============================================

  /**
   * Setup two-factor authentication
   */
  async setupTwoFactor(
    userId: string,
    method: TwoFactorMethod
  ): Promise<TwoFactorSetupResult> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let result: TwoFactorSetupResult;

    switch (method) {
      case 'authenticator':
        result = await this.setupAuthenticatorApp(user.email);
        break;

      case 'sms':
        if (!user.phone_verified) {
          throw new Error('Phone number must be verified before enabling SMS 2FA');
        }
        result = await this.setupSms2FA(user.phone);
        break;

      case 'email':
        result = await this.setupEmail2FA(user.email);
        break;

      case 'biometric':
        result = await this.setupBiometric2FA(userId);
        break;

      default:
        throw new Error(`Unsupported 2FA method: ${method}`);
    }

    // Store settings (not yet enabled - user must verify first)
    await this.safetyRepo.getOrCreateSecuritySettings(userId);
    await this.safetyRepo.updateSecuritySettings(userId, {
      two_factor_method: method,
      two_factor_secret: this.encryptSecret(result.secret),
      backup_codes: this.encryptBackupCodes(result.backupCodes),
    });

    return result;
  }

  /**
   * Verify and enable two-factor authentication
   */
  async verifyAndEnableTwoFactor(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    const settings = await this.safetyRepo.getOrCreateSecuritySettings(userId);

    if (!settings.two_factor_secret || !settings.two_factor_method) {
      throw new Error('Two-factor authentication not set up');
    }

    const secret = this.decryptSecret(settings.two_factor_secret);
    const isValid = await this.verifyTwoFactorCode(
      settings.two_factor_method,
      secret,
      code
    );

    if (!isValid) {
      return { success: false, message: 'Invalid verification code' };
    }

    await this.safetyRepo.updateSecuritySettings(userId, {
      two_factor_enabled: true,
    });

    logger.info(`2FA enabled for user ${userId} using ${settings.two_factor_method}`);

    return { success: true, message: 'Two-factor authentication enabled successfully' };
  }

  /**
   * Verify two-factor code during login
   */
  async verifyLoginTwoFactor(
    userId: string,
    code: string
  ): Promise<{ valid: boolean; isBackupCode?: boolean }> {
    const settings = await this.safetyRepo.getOrCreateSecuritySettings(userId);

    if (!settings.two_factor_enabled || !settings.two_factor_secret) {
      return { valid: true }; // 2FA not enabled
    }

    const secret = this.decryptSecret(settings.two_factor_secret);

    // Check regular code
    const isValid = await this.verifyTwoFactorCode(
      settings.two_factor_method!,
      secret,
      code
    );

    if (isValid) {
      return { valid: true };
    }

    // Check backup codes
    if (settings.backup_codes) {
      const backupCodes = this.decryptBackupCodes(settings.backup_codes);
      const codeIndex = backupCodes.indexOf(code);

      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await this.safetyRepo.updateSecuritySettings(userId, {
          backup_codes: this.encryptBackupCodes(backupCodes),
        });

        logger.info(`Backup code used for user ${userId}. ${backupCodes.length} codes remaining.`);
        return { valid: true, isBackupCode: true };
      }
    }

    return { valid: false };
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(
    userId: string,
    password: string
  ): Promise<{ success: boolean; message: string }> {
    // Verify password first
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return { success: false, message: 'Invalid password' };
    }

    await this.safetyRepo.updateSecuritySettings(userId, {
      two_factor_enabled: false,
      two_factor_method: undefined,
      two_factor_secret: undefined,
      backup_codes: undefined,
    });

    logger.info(`2FA disabled for user ${userId}`);

    return { success: true, message: 'Two-factor authentication disabled' };
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const settings = await this.safetyRepo.getOrCreateSecuritySettings(userId);

    if (!settings.two_factor_enabled) {
      throw new Error('Two-factor authentication is not enabled');
    }

    const backupCodes = this.generateBackupCodes();

    await this.safetyRepo.updateSecuritySettings(userId, {
      backup_codes: this.encryptBackupCodes(backupCodes),
    });

    return backupCodes;
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    deviceInfo: DeviceInfo
  ): Promise<ActiveSession> {
    const settings = await this.safetyRepo.getOrCreateSecuritySettings(userId);

    // Check if max sessions exceeded
    const existingSessions = await this.safetyRepo.getUserSessions(userId);
    if (existingSessions.length >= settings.max_sessions) {
      // Remove oldest session
      const oldest = existingSessions[existingSessions.length - 1];
      await this.safetyRepo.deleteSession(oldest.id);
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day session

    const session = await this.safetyRepo.createSession(userId, sessionToken, {
      deviceFingerprint: deviceInfo.fingerprint,
      deviceName: deviceInfo.name,
      deviceType: deviceInfo.type,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress: deviceInfo.ipAddress,
      geolocation: deviceInfo.geolocation,
      expiresAt,
    });

    // Check if this is a new device
    const isNewDevice = await this.isNewDevice(userId, deviceInfo.fingerprint);
    if (isNewDevice && settings.new_device_alerts_enabled) {
      await this.sendNewDeviceAlert(userId, deviceInfo);
    }

    return session;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<ActiveSession[]> {
    return this.safetyRepo.getUserSessions(userId);
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(
    userId: string,
    sessionId: string
  ): Promise<void> {
    const sessions = await this.safetyRepo.getUserSessions(userId);
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    await this.safetyRepo.deleteSession(sessionId);
    logger.info(`Session ${sessionId} revoked for user ${userId}`);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(
    userId: string,
    currentSessionId: string
  ): Promise<number> {
    const sessions = await this.safetyRepo.getUserSessions(userId);
    const sessionsToRevoke = sessions.filter(s => s.id !== currentSessionId);

    for (const session of sessionsToRevoke) {
      await this.safetyRepo.deleteSession(session.id);
    }

    logger.info(`${sessionsToRevoke.length} sessions revoked for user ${userId}`);
    return sessionsToRevoke.length;
  }

  // ============================================
  // Login Security
  // ============================================

  /**
   * Check if login should be allowed (pre-authentication check)
   */
  async performLoginSecurityCheck(
    email: string,
    deviceInfo: DeviceInfo
  ): Promise<LoginSecurityCheck> {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let requiresTwoFactor = false;
    let requiresDeviceVerification = false;

    const user = await this.userRepo.findByEmail(email);

    // Check for account lockout
    const recentFailedAttempts = await this.safetyRepo.getFailedLoginAttempts(
      email,
      new Date(Date.now() - this.LOCKOUT_DURATION_MINUTES * 60 * 1000)
    );

    if (recentFailedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      return {
        allowed: false,
        requiresTwoFactor: false,
        requiresDeviceVerification: false,
        riskLevel: 'critical',
        reasons: ['Account temporarily locked due to too many failed attempts'],
      };
    }

    if (!user) {
      // Don't reveal if user exists
      return {
        allowed: true,
        requiresTwoFactor: false,
        requiresDeviceVerification: false,
        riskLevel: 'low',
        reasons: [],
      };
    }

    // Check if 2FA is enabled
    const settings = await this.safetyRepo.getOrCreateSecuritySettings(user.id);
    if (settings.two_factor_enabled) {
      requiresTwoFactor = true;
    }

    // Check for new device
    const isNewDevice = await this.isNewDevice(user.id, deviceInfo.fingerprint);
    if (isNewDevice) {
      reasons.push('Login from new device');
      riskLevel = 'medium';
      requiresDeviceVerification = true;
    }

    // Check for suspicious IP
    const ipRisk = await this.assessIpRisk(deviceInfo.ipAddress);
    if (ipRisk.isSuspicious) {
      reasons.push(ipRisk.reason || 'Suspicious IP address');
      riskLevel = ipRisk.riskLevel > riskLevel ? ipRisk.riskLevel : riskLevel;
    }

    // Check for unusual location
    if (settings.allowed_login_locations && settings.allowed_login_locations.length > 0) {
      const locationAllowed = await this.isLocationAllowed(
        deviceInfo.geolocation,
        settings.allowed_login_locations
      );
      if (!locationAllowed) {
        reasons.push('Login from unusual location');
        riskLevel = 'high';
        requiresTwoFactor = true;
      }
    }

    // Check for velocity anomalies (many logins in short time)
    const recentLogins = await this.safetyRepo.getRecentLoginAttempts(user.id, 10);
    if (recentLogins.length >= 5) {
      const lastHour = recentLogins.filter(
        l => l.created_at > new Date(Date.now() - 3600000)
      );
      if (lastHour.length >= 5) {
        reasons.push('Unusual login frequency');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }
    }

    return {
      allowed: true,
      requiresTwoFactor,
      requiresDeviceVerification,
      riskLevel,
      reasons,
    };
  }

  /**
   * Record a login attempt
   */
  async recordLoginAttempt(
    userId: string | undefined,
    email: string,
    deviceInfo: DeviceInfo,
    wasSuccessful: boolean,
    failureReason?: string
  ): Promise<LoginAttempt> {
    const isSuspicious = await this.isLoginSuspicious(email, deviceInfo, wasSuccessful);

    const attempt = await this.safetyRepo.recordLoginAttempt({
      userId,
      email,
      ipAddress: deviceInfo.ipAddress || 'unknown',
      userAgent: deviceInfo.browser ? `${deviceInfo.browser} on ${deviceInfo.os}` : undefined,
      deviceFingerprint: deviceInfo.fingerprint,
      geolocation: deviceInfo.geolocation,
      wasSuccessful,
      failureReason,
      isSuspicious,
    });

    // Send alert for suspicious activity
    if (userId && isSuspicious) {
      const settings = await this.safetyRepo.getOrCreateSecuritySettings(userId);
      if (settings.suspicious_activity_alerts_enabled) {
        await this.sendSuspiciousActivityAlert(userId, attempt);
      }
    }

    return attempt;
  }

  // ============================================
  // Password Reset
  // ============================================

  /**
   * Create a password reset token
   */
  async createPasswordResetToken(
    email: string,
    ipAddress?: string
  ): Promise<string | null> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return null;
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Set expiration (1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.safetyRepo.createPasswordResetToken(
      user.id,
      tokenHash,
      expiresAt,
      ipAddress
    );

    return token;
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    message?: string;
  }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetToken = await this.safetyRepo.getPasswordResetToken(tokenHash);

    if (!resetToken) {
      return { valid: false, message: 'Invalid or expired token' };
    }

    if (resetToken.is_used) {
      return { valid: false, message: 'Token has already been used' };
    }

    if (new Date() > resetToken.expires_at) {
      return { valid: false, message: 'Token has expired' };
    }

    return { valid: true, userId: resetToken.user_id };
  }

  /**
   * Reset password using token
   */
  async resetPasswordWithToken(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const verification = await this.verifyPasswordResetToken(token);

    if (!verification.valid || !verification.userId) {
      return { success: false, message: verification.message || 'Invalid token' };
    }

    // Validate password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.message };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.userRepo.updatePassword(verification.userId, passwordHash);

    // Mark token as used
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetToken = await this.safetyRepo.getPasswordResetToken(tokenHash);
    if (resetToken) {
      await this.safetyRepo.markPasswordResetTokenUsed(resetToken.id);
    }

    // Revoke all existing sessions
    await this.safetyRepo.deleteAllUserSessions(verification.userId);

    logger.info(`Password reset completed for user ${verification.userId}`);

    return { success: true, message: 'Password reset successfully' };
  }

  // ============================================
  // Device Trust
  // ============================================

  /**
   * Add device to trusted devices
   */
  async addTrustedDevice(
    userId: string,
    deviceInfo: DeviceInfo,
    deviceName: string
  ): Promise<void> {
    const settings = await this.safetyRepo.getOrCreateSecuritySettings(userId);
    const trustedDevices = settings.trusted_devices || [];

    // Check if device already trusted
    if (trustedDevices.some(d => d.fingerprint === deviceInfo.fingerprint)) {
      return;
    }

    trustedDevices.push({
      fingerprint: deviceInfo.fingerprint,
      name: deviceName,
      addedAt: new Date(),
      lastUsed: new Date(),
    });

    await this.safetyRepo.updateSecuritySettings(userId, {
      trusted_devices: trustedDevices,
    });
  }

  /**
   * Remove trusted device
   */
  async removeTrustedDevice(
    userId: string,
    fingerprint: string
  ): Promise<void> {
    const settings = await this.safetyRepo.getOrCreateSecuritySettings(userId);
    const trustedDevices = (settings.trusted_devices || []).filter(
      d => d.fingerprint !== fingerprint
    );

    await this.safetyRepo.updateSecuritySettings(userId, {
      trusted_devices: trustedDevices,
    });
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(userId: string): Promise<UserSecuritySettings> {
    return this.safetyRepo.getOrCreateSecuritySettings(userId);
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(
    userId: string,
    settings: Partial<{
      login_alerts_enabled: boolean;
      new_device_alerts_enabled: boolean;
      suspicious_activity_alerts_enabled: boolean;
      max_sessions: number;
    }>
  ): Promise<UserSecuritySettings> {
    return this.safetyRepo.updateSecuritySettings(userId, settings);
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async setupAuthenticatorApp(email: string): Promise<TwoFactorSetupResult> {
    const secret = speakeasy.generateSecret({
      name: `Flamoral:${email}`,
      length: 32,
    });

    let qrCode: string | undefined;
    if (secret.otpauth_url) {
      qrCode = await QRCode.toDataURL(secret.otpauth_url);
    }

    return {
      secret: secret.base32,
      qrCode,
      backupCodes: this.generateBackupCodes(),
      method: 'authenticator',
    };
  }

  private async setupSms2FA(phone: string): Promise<TwoFactorSetupResult> {
    // For SMS, we use a different approach - generate code on demand
    const secret = crypto.randomBytes(32).toString('hex');

    return {
      secret,
      backupCodes: this.generateBackupCodes(),
      method: 'sms',
    };
  }

  private async setupEmail2FA(email: string): Promise<TwoFactorSetupResult> {
    const secret = crypto.randomBytes(32).toString('hex');

    return {
      secret,
      backupCodes: this.generateBackupCodes(),
      method: 'email',
    };
  }

  private async setupBiometric2FA(userId: string): Promise<TwoFactorSetupResult> {
    // Biometric is device-based, stored on device
    const secret = crypto.randomBytes(32).toString('hex');

    return {
      secret,
      backupCodes: this.generateBackupCodes(),
      method: 'biometric',
    };
  }

  private async verifyTwoFactorCode(
    method: TwoFactorMethod,
    secret: string,
    code: string
  ): Promise<boolean> {
    switch (method) {
      case 'authenticator':
        return speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token: code,
          window: 1, // Allow 1 step tolerance
        });

      case 'sms':
      case 'email':
        // For SMS/Email, the code is generated and stored separately
        // This would verify against a stored OTP
        return this.verifyOtpCode(secret, code);

      case 'biometric':
        // Biometric verification happens on device
        return true;

      default:
        return false;
    }
  }

  private verifyOtpCode(secret: string, code: string): boolean {
    // In production, this would verify against a stored OTP with expiration
    // Simplified implementation
    const expectedCode = crypto
      .createHmac('sha256', secret)
      .update(Math.floor(Date.now() / 300000).toString()) // 5-minute window
      .digest('hex')
      .substring(0, 6);

    return code === expectedCode;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private encryptSecret(secret: string): string {
    // In production, use proper encryption (e.g., AES-256-GCM)
    // Simplified for demo
    const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptSecret(encrypted: string): string {
    const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private encryptBackupCodes(codes: string[]): string {
    return this.encryptSecret(JSON.stringify(codes));
  }

  private decryptBackupCodes(encrypted: string): string[] {
    return JSON.parse(this.decryptSecret(encrypted));
  }

  private async isNewDevice(userId: string, fingerprint: string): Promise<boolean> {
    const settings = await this.safetyRepo.getOrCreateSecuritySettings(userId);
    const trustedDevices = settings.trusted_devices || [];

    return !trustedDevices.some(d => d.fingerprint === fingerprint);
  }

  private async sendNewDeviceAlert(userId: string, deviceInfo: DeviceInfo): Promise<void> {
    // In production, send email/push notification
    logger.info(`New device alert for user ${userId}: ${deviceInfo.name || 'Unknown device'}`);
  }

  private async sendSuspiciousActivityAlert(
    userId: string,
    attempt: LoginAttempt
  ): Promise<void> {
    // In production, send email/push notification
    logger.warn(`Suspicious activity alert for user ${userId}:`, {
      ip: attempt.ip_address,
      geolocation: attempt.geolocation,
    });
  }

  private async assessIpRisk(ipAddress?: string): Promise<{
    isSuspicious: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    reason?: string;
  }> {
    if (!ipAddress) {
      return { isSuspicious: false, riskLevel: 'low' };
    }

    // In production, would check against IP reputation databases
    // Simplified implementation
    const isVpn = false; // Would check against VPN/proxy databases
    const isTor = ipAddress.startsWith('10.'); // Simplified check

    if (isTor) {
      return { isSuspicious: true, riskLevel: 'high', reason: 'Tor exit node detected' };
    }

    if (isVpn) {
      return { isSuspicious: true, riskLevel: 'medium', reason: 'VPN detected' };
    }

    return { isSuspicious: false, riskLevel: 'low' };
  }

  private async isLocationAllowed(
    geolocation?: { lat?: number; lng?: number },
    allowedLocations?: { lat: number; lng: number; radius: number; name: string }[]
  ): Promise<boolean> {
    if (!geolocation || !geolocation.lat || !geolocation.lng || !allowedLocations) {
      return true; // Allow if no location data
    }

    for (const allowed of allowedLocations) {
      const distance = this.calculateDistance(
        geolocation.lat,
        geolocation.lng,
        allowed.lat,
        allowed.lng
      );

      if (distance <= allowed.radius) {
        return true;
      }
    }

    return false;
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private async isLoginSuspicious(
    email: string,
    deviceInfo: DeviceInfo,
    wasSuccessful: boolean
  ): Promise<boolean> {
    // Check for patterns indicating suspicious activity
    const ipRisk = await this.assessIpRisk(deviceInfo.ipAddress);

    if (ipRisk.isSuspicious) {
      return true;
    }

    // Check for rapid failed attempts from same IP
    if (!wasSuccessful) {
      // Would check recent failed attempts from this IP
      return false;
    }

    return false;
  }

  private validatePasswordStrength(password: string): {
    valid: boolean;
    message: string;
  } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }

    return { valid: true, message: 'Password meets requirements' };
  }
}
