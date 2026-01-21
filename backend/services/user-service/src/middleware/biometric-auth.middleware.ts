import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import db from '../infrastructure/database/connection';
import logger from '../utils/logger';

export interface BiometricChallenge {
  challenge: string;
  expiresAt: Date;
}

export interface BiometricAuthRequest extends Request {
  biometricAuth?: {
    userId: string;
    deviceId: string;
    verified: boolean;
  };
}

/**
 * Biometric Authentication Middleware
 * Handles Face ID, Touch ID, and fingerprint authentication for mobile devices
 */
export class BiometricAuthMiddleware {
  private readonly CHALLENGE_EXPIRY_MINUTES = 5;
  private readonly JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET or JWT_ACCESS_SECRET environment variable is required');
    }
    return secret;
  })();

  /**
   * Generate biometric challenge
   */
  async generateChallenge(userId: string, deviceId: string): Promise<BiometricChallenge> {
    try {
      // Generate random challenge
      const challenge = crypto.randomBytes(32).toString('base64');
      const expiresAt = new Date(Date.now() + this.CHALLENGE_EXPIRY_MINUTES * 60 * 1000);

      // Store challenge in database
      await db('biometric_challenges').insert({
        user_id: userId,
        device_id: deviceId,
        challenge,
        expires_at: expiresAt,
        created_at: new Date(),
      });

      logger.info(`Biometric challenge generated for user ${userId} on device ${deviceId}`);

      return {
        challenge,
        expiresAt,
      };
    } catch (error) {
      logger.error('Error generating biometric challenge:', error);
      throw new Error('Failed to generate biometric challenge');
    }
  }

  /**
   * Verify biometric authentication
   */
  async verifyBiometric(
    userId: string,
    deviceId: string,
    challenge: string,
    signature: string
  ): Promise<boolean> {
    try {
      // Get stored challenge
      const storedChallenge = await db('biometric_challenges')
        .where({
          user_id: userId,
          device_id: deviceId,
          challenge,
        })
        .andWhere('expires_at', '>', new Date())
        .whereNull('used_at')
        .first();

      if (!storedChallenge) {
        logger.warn(`Invalid or expired biometric challenge for user ${userId}`);
        return false;
      }

      // Get device public key
      const device = await db('user_devices')
        .where({
          user_id: userId,
          device_id: deviceId,
          is_active: true,
        })
        .first();

      if (!device || !device.biometric_public_key) {
        logger.warn(`Device not found or biometric not enrolled for user ${userId}`);
        return false;
      }

      // Verify signature using public key
      const isValid = this.verifySignature(challenge, signature, device.biometric_public_key);

      if (isValid) {
        // Mark challenge as used
        await db('biometric_challenges').where({ id: storedChallenge.id }).update({
          used_at: new Date(),
          verified: true,
        });

        // Update device last biometric auth
        await db('user_devices').where({ id: device.id }).update({
          last_biometric_auth: new Date(),
        });

        logger.info(`Biometric authentication successful for user ${userId}`);
      } else {
        logger.warn(`Biometric signature verification failed for user ${userId}`);
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying biometric authentication:', error);
      return false;
    }
  }

  /**
   * Verify signature using public key
   */
  private verifySignature(challenge: string, signature: string, publicKey: string): boolean {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(challenge);
      verify.end();

      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Enroll biometric authentication
   */
  async enrollBiometric(
    userId: string,
    deviceId: string,
    deviceName: string,
    biometricType: 'face_id' | 'touch_id' | 'fingerprint',
    publicKey: string
  ): Promise<void> {
    try {
      // Check if device already exists
      const existingDevice = await db('user_devices')
        .where({
          user_id: userId,
          device_id: deviceId,
        })
        .first();

      if (existingDevice) {
        // Update existing device
        await db('user_devices').where({ id: existingDevice.id }).update({
          biometric_type: biometricType,
          biometric_public_key: publicKey,
          biometric_enrolled_at: new Date(),
          is_active: true,
        });
      } else {
        // Insert new device
        await db('user_devices').insert({
          user_id: userId,
          device_id: deviceId,
          device_name: deviceName,
          biometric_type: biometricType,
          biometric_public_key: publicKey,
          biometric_enrolled_at: new Date(),
          is_active: true,
          created_at: new Date(),
        });
      }

      logger.info(`Biometric enrolled for user ${userId} on device ${deviceId} (${biometricType})`);
    } catch (error) {
      logger.error('Error enrolling biometric:', error);
      throw new Error('Failed to enroll biometric');
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(userId: string, deviceId: string): Promise<void> {
    try {
      await db('user_devices')
        .where({
          user_id: userId,
          device_id: deviceId,
        })
        .update({
          biometric_type: null,
          biometric_public_key: null,
          biometric_enrolled_at: null,
          is_active: false,
        });

      logger.info(`Biometric disabled for user ${userId} on device ${deviceId}`);
    } catch (error) {
      logger.error('Error disabling biometric:', error);
      throw new Error('Failed to disable biometric');
    }
  }

  /**
   * Get enrolled devices
   */
  async getEnrolledDevices(userId: string): Promise<any[]> {
    try {
      const devices = await db('user_devices')
        .where({
          user_id: userId,
          is_active: true,
        })
        .whereNotNull('biometric_public_key')
        .select('*');

      return devices.map((d) => ({
        deviceId: d.device_id,
        deviceName: d.device_name,
        biometricType: d.biometric_type,
        enrolledAt: d.biometric_enrolled_at,
        lastAuth: d.last_biometric_auth,
      }));
    } catch (error) {
      logger.error('Error getting enrolled devices:', error);
      throw new Error('Failed to get enrolled devices');
    }
  }

  /**
   * Middleware to require biometric authentication
   */
  requireBiometric() {
    return async (
      req: BiometricAuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void | Response> => {
      try {
        const authHeader = req.headers.authorization;
        const biometricToken = req.headers['x-biometric-token'] as string;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
          });
        }

        if (!biometricToken) {
          return res.status(401).json({
            success: false,
            message: 'Biometric authentication required',
            requiresBiometric: true,
          });
        }

        // Verify biometric token
        try {
          const decoded = jwt.verify(biometricToken, this.JWT_SECRET) as any;

          req.biometricAuth = {
            userId: decoded.userId,
            deviceId: decoded.deviceId,
            verified: true,
          };

          next();
        } catch (error) {
          return res.status(401).json({
            success: false,
            message: 'Invalid biometric token',
            requiresBiometric: true,
          });
        }
      } catch (error) {
        logger.error('Biometric middleware error:', error);

        return res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    };
  }

  /**
   * Generate biometric token after successful authentication
   */
  generateBiometricToken(userId: string, deviceId: string): string {
    return jwt.sign(
      {
        userId,
        deviceId,
        type: 'biometric',
      },
      this.JWT_SECRET,
      {
        expiresIn: '7d', // Token valid for 7 days
      }
    );
  }

  /**
   * Cleanup expired challenges
   */
  async cleanupExpiredChallenges(): Promise<void> {
    try {
      const result = await db('biometric_challenges').where('expires_at', '<', new Date()).delete();

      logger.info(`Cleaned up ${result} expired biometric challenges`);
    } catch (error) {
      logger.error('Error cleaning up expired challenges:', error);
    }
  }

  /**
   * Get biometric authentication history
   */
  async getBiometricHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const history = await db('biometric_challenges')
        .where({
          user_id: userId,
          verified: true,
        })
        .orderBy('used_at', 'desc')
        .limit(limit)
        .select('*');

      return history.map((h) => ({
        deviceId: h.device_id,
        authenticatedAt: h.used_at,
        createdAt: h.created_at,
      }));
    } catch (error) {
      logger.error('Error getting biometric history:', error);
      throw new Error('Failed to get biometric history');
    }
  }

  /**
   * Validate device trust
   */
  async isDeviceTrusted(userId: string, deviceId: string): Promise<boolean> {
    try {
      const device = await db('user_devices')
        .where({
          user_id: userId,
          device_id: deviceId,
          is_active: true,
        })
        .whereNotNull('biometric_public_key')
        .first();

      return !!device;
    } catch (error) {
      logger.error('Error checking device trust:', error);
      return false;
    }
  }

  /**
   * Revoke device access
   */
  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    try {
      await db('user_devices')
        .where({
          user_id: userId,
          device_id: deviceId,
        })
        .update({
          is_active: false,
          revoked_at: new Date(),
        });

      // Invalidate all challenges for this device
      await db('biometric_challenges')
        .where({
          user_id: userId,
          device_id: deviceId,
        })
        .whereNull('used_at')
        .update({
          used_at: new Date(),
          verified: false,
        });

      logger.info(`Device ${deviceId} revoked for user ${userId}`);
    } catch (error) {
      logger.error('Error revoking device:', error);
      throw new Error('Failed to revoke device');
    }
  }
}

export default new BiometricAuthMiddleware();
