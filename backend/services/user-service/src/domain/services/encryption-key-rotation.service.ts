import crypto from 'crypto';
import db from '../../infrastructure/database/connection';
import logger from '../../utils/logger';

/**
 * Encryption Key Rotation Service
 * Provides functionality to rotate encryption keys for TOTP secrets
 *
 * Key rotation process:
 * 1. Generate new encryption key (via new environment variables)
 * 2. Start rotation process
 * 3. Decrypt all TOTP secrets with old key
 * 4. Re-encrypt with new key
 * 5. Update key version
 * 6. Mark rotation as complete
 *
 * IMPORTANT:
 * - Backup database before rotation
 * - Keep old encryption keys until rotation is complete
 * - Test in staging environment first
 */

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

interface EncryptionKey {
  key: Buffer;
  version: number;
}

export class EncryptionKeyRotationService {
  /**
   * Derive encryption key from environment variables
   */
  private deriveKey(masterKey: string, salt: string): Buffer {
    if (!masterKey || !salt) {
      throw new Error('Master key and salt are required');
    }

    if (masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters');
    }

    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha512'
    );
  }

  /**
   * Get old encryption key configuration
   */
  private getOldKey(): EncryptionKey {
    const masterKey = process.env.TOTP_ENCRYPTION_MASTER_KEY_OLD;
    const salt = process.env.TOTP_ENCRYPTION_KEY_SALT_OLD;
    const version = parseInt(process.env.TOTP_ENCRYPTION_KEY_VERSION_OLD || '1');

    if (!masterKey || !salt) {
      throw new Error('Old encryption key environment variables not set (TOTP_ENCRYPTION_MASTER_KEY_OLD, TOTP_ENCRYPTION_KEY_SALT_OLD)');
    }

    return {
      key: this.deriveKey(masterKey, salt),
      version
    };
  }

  /**
   * Get new encryption key configuration
   */
  private getNewKey(): EncryptionKey {
    const masterKey = process.env.TOTP_ENCRYPTION_MASTER_KEY;
    const salt = process.env.TOTP_ENCRYPTION_KEY_SALT;
    const version = parseInt(process.env.TOTP_ENCRYPTION_KEY_VERSION || '1');

    if (!masterKey || !salt) {
      throw new Error('New encryption key environment variables not set');
    }

    return {
      key: this.deriveKey(masterKey, salt),
      version
    };
  }

  /**
   * Decrypt data with specific key
   */
  private decryptWithKey(encryptedString: string, key: Buffer): string {
    const parts = encryptedString.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [, ivBase64, authTagBase64, encryptedBase64] = parts;

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Encrypt data with specific key
   */
  private encryptWithKey(plaintext: string, key: Buffer, keyVersion: number): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return `${keyVersion}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * Start key rotation process
   */
  async startKeyRotation(): Promise<string> {
    const trx = await db.transaction();

    try {
      logger.info('Starting encryption key rotation');

      const oldKey = this.getOldKey();
      const newKey = this.getNewKey();

      // Validate that new version is greater than old version
      if (newKey.version <= oldKey.version) {
        throw new Error(`New key version (${newKey.version}) must be greater than old version (${oldKey.version})`);
      }

      // Create rotation record
      const [rotationRecord] = await trx('encryption_key_rotations').insert({
        old_key_version: oldKey.version,
        new_key_version: newKey.version,
        status: 'in_progress',
        records_migrated: 0,
        started_at: new Date()
      }).returning('*');

      logger.info(`Created key rotation record: ${rotationRecord.id}`);

      // Get all TOTP records with the old key version
      const totpRecords = await trx('user_two_factor_auth')
        .where({
          method: '2fa_totp',
          encryption_key_version: oldKey.version
        })
        .whereNotNull('secret_encrypted');

      logger.info(`Found ${totpRecords.length} TOTP records to rotate`);

      let successCount = 0;
      let errorCount = 0;

      // Process each record
      for (const record of totpRecords) {
        try {
          // Decrypt with old key
          const decryptedSecret = this.decryptWithKey(record.secret_encrypted, oldKey.key);

          // Encrypt with new key
          const reencryptedSecret = this.encryptWithKey(decryptedSecret, newKey.key, newKey.version);

          // Update record
          await trx('user_two_factor_auth')
            .where({ id: record.id })
            .update({
              secret_encrypted: reencryptedSecret,
              encryption_key_version: newKey.version,
              updated_at: new Date()
            });

          successCount++;

          if (successCount % 100 === 0) {
            logger.info(`Rotated ${successCount} of ${totpRecords.length} records`);
          }
        } catch (error) {
          errorCount++;
          logger.error(`Error rotating key for record ${record.id}:`, error);
          // Continue processing other records
        }
      }

      // Update rotation record
      await trx('encryption_key_rotations')
        .where({ id: rotationRecord.id })
        .update({
          records_migrated: successCount,
          status: errorCount === 0 ? 'completed' : 'failed',
          error_message: errorCount > 0 ? `Failed to rotate ${errorCount} records` : null,
          completed_at: new Date()
        });

      await trx.commit();

      logger.info(`Key rotation completed: ${successCount} succeeded, ${errorCount} failed`);

      if (errorCount > 0) {
        throw new Error(`Key rotation completed with ${errorCount} errors`);
      }

      return rotationRecord.id;
    } catch (error) {
      await trx.rollback();
      logger.error('Key rotation failed:', error);
      throw error;
    }
  }

  /**
   * Get rotation status
   */
  async getRotationStatus(rotationId: string): Promise<any> {
    const rotation = await db('encryption_key_rotations')
      .where({ id: rotationId })
      .first();

    if (!rotation) {
      throw new Error('Rotation record not found');
    }

    return {
      id: rotation.id,
      oldKeyVersion: rotation.old_key_version,
      newKeyVersion: rotation.new_key_version,
      recordsMigrated: rotation.records_migrated,
      status: rotation.status,
      errorMessage: rotation.error_message,
      startedAt: rotation.started_at,
      completedAt: rotation.completed_at
    };
  }

  /**
   * Get all rotation history
   */
  async getRotationHistory(): Promise<any[]> {
    const rotations = await db('encryption_key_rotations')
      .orderBy('started_at', 'desc')
      .limit(50);

    return rotations.map(rotation => ({
      id: rotation.id,
      oldKeyVersion: rotation.old_key_version,
      newKeyVersion: rotation.new_key_version,
      recordsMigrated: rotation.records_migrated,
      status: rotation.status,
      errorMessage: rotation.error_message,
      startedAt: rotation.started_at,
      completedAt: rotation.completed_at
    }));
  }

  /**
   * Verify all TOTP secrets can be decrypted with current key
   */
  async verifyEncryption(): Promise<{ total: number; valid: number; invalid: number; errors: any[] }> {
    logger.info('Verifying TOTP secret encryption');

    const currentKey = this.getNewKey();
    const totpRecords = await db('user_two_factor_auth')
      .where({ method: '2fa_totp' })
      .whereNotNull('secret_encrypted');

    let validCount = 0;
    let invalidCount = 0;
    const errors: any[] = [];

    for (const record of totpRecords) {
      try {
        this.decryptWithKey(record.secret_encrypted, currentKey.key);
        validCount++;
      } catch (error) {
        invalidCount++;
        errors.push({
          recordId: record.id,
          userId: record.user_id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info(`Verification complete: ${validCount} valid, ${invalidCount} invalid`);

    return {
      total: totpRecords.length,
      valid: validCount,
      invalid: invalidCount,
      errors
    };
  }
}

export default new EncryptionKeyRotationService();
