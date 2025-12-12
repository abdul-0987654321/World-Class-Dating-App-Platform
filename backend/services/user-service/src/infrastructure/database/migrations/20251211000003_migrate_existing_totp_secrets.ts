import { Knex } from 'knex';
import crypto from 'crypto';
import logger from '../../../utils/logger';

/**
 * Migration script to encrypt existing unencrypted TOTP secrets
 * This migration is CRITICAL for security and should be run immediately after deploying the encryption changes
 *
 * IMPORTANT: Before running this migration:
 * 1. Set TOTP_ENCRYPTION_MASTER_KEY in environment variables
 * 2. Set TOTP_ENCRYPTION_KEY_SALT in environment variables
 * 3. Set TOTP_ENCRYPTION_KEY_VERSION=1 in environment variables
 * 4. Backup your database
 */

// Encryption configuration (must match encryption.ts)
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derive encryption key using PBKDF2
 */
const deriveEncryptionKey = (): Buffer => {
  const masterKey = process.env.TOTP_ENCRYPTION_MASTER_KEY;
  const keySalt = process.env.TOTP_ENCRYPTION_KEY_SALT;

  if (!masterKey || !keySalt) {
    throw new Error('TOTP_ENCRYPTION_MASTER_KEY and TOTP_ENCRYPTION_KEY_SALT must be set in environment');
  }

  if (masterKey.length < 32) {
    throw new Error('TOTP_ENCRYPTION_MASTER_KEY must be at least 32 characters long');
  }

  return crypto.pbkdf2Sync(
    masterKey,
    keySalt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
};

/**
 * Encrypt data using AES-256-GCM
 */
const encryptData = (plaintext: string, key: Buffer, keyVersion: number): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return `${keyVersion}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

/**
 * Check if data is already encrypted
 */
const isEncrypted = (data: string): boolean => {
  // Encrypted data format: version:iv:authTag:encryptedData
  // Each part is base64 encoded, so we check for the format
  const parts = data.split(':');
  if (parts.length !== 4) {
    return false;
  }

  // Check if first part is a valid version number
  const version = parseInt(parts[0]);
  if (isNaN(version) || version < 1) {
    return false;
  }

  // Check if other parts look like base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return parts.slice(1).every(part => base64Regex.test(part));
};

export async function up(knex: Knex): Promise<void> {
  logger.info('Starting migration: Encrypting existing TOTP secrets');

  try {
    // Get encryption key
    const encryptionKey = deriveEncryptionKey();
    const keyVersion = parseInt(process.env.TOTP_ENCRYPTION_KEY_VERSION || '1');

    logger.info('Encryption key derived successfully');

    // First, check if the old 'secret' column exists
    const hasOldColumn = await knex.schema.hasColumn('user_two_factor_auth', 'secret');
    const hasNewColumn = await knex.schema.hasColumn('user_two_factor_auth', 'secret_encrypted');

    if (!hasOldColumn && !hasNewColumn) {
      logger.warn('Neither secret nor secret_encrypted column exists. Skipping migration.');
      return;
    }

    // If we have the old column and not the new one, we need to add it
    if (hasOldColumn && !hasNewColumn) {
      logger.info('Adding secret_encrypted column');
      await knex.schema.alterTable('user_two_factor_auth', (table) => {
        table.text('secret_encrypted').nullable();
        table.integer('encryption_key_version').defaultTo(1);
      });
    }

    // Get all TOTP records
    let totpRecords: any[];

    if (hasOldColumn) {
      totpRecords = await knex('user_two_factor_auth')
        .where({ method: '2fa_totp' })
        .whereNotNull('secret')
        .select('id', 'user_id', 'secret', 'secret_encrypted');
    } else {
      // If only encrypted column exists, check for any that need re-encryption
      totpRecords = await knex('user_two_factor_auth')
        .where({ method: '2fa_totp' })
        .whereNotNull('secret_encrypted')
        .select('id', 'user_id', 'secret_encrypted');
    }

    logger.info(`Found ${totpRecords.length} TOTP records to process`);

    let encryptedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each record
    for (const record of totpRecords) {
      try {
        let secretToEncrypt: string | null = null;

        // Check if we have the old unencrypted secret column
        if (hasOldColumn && record.secret) {
          // Check if it's already encrypted
          if (isEncrypted(record.secret)) {
            logger.debug(`Record ${record.id} secret appears to be already encrypted`);

            // Copy to secret_encrypted if not already there
            if (!record.secret_encrypted) {
              await knex('user_two_factor_auth')
                .where({ id: record.id })
                .update({
                  secret_encrypted: record.secret,
                  encryption_key_version: keyVersion
                });
              logger.info(`Copied encrypted secret to secret_encrypted column for user ${record.user_id}`);
            }
            skippedCount++;
            continue;
          }

          secretToEncrypt = record.secret;
        } else if (record.secret_encrypted && !isEncrypted(record.secret_encrypted)) {
          // The secret_encrypted column exists but contains unencrypted data
          secretToEncrypt = record.secret_encrypted;
        } else if (record.secret_encrypted && isEncrypted(record.secret_encrypted)) {
          // Already properly encrypted
          skippedCount++;
          continue;
        }

        if (secretToEncrypt) {
          // Encrypt the secret
          const encryptedSecret = encryptData(secretToEncrypt, encryptionKey, keyVersion);

          // Update the record
          await knex('user_two_factor_auth')
            .where({ id: record.id })
            .update({
              secret_encrypted: encryptedSecret,
              encryption_key_version: keyVersion,
              updated_at: new Date()
            });

          encryptedCount++;
          logger.debug(`Encrypted TOTP secret for user ${record.user_id}`);
        } else {
          skippedCount++;
        }
      } catch (error) {
        errorCount++;
        logger.error(`Error encrypting TOTP secret for record ${record.id}:`, error);
        // Continue processing other records
      }
    }

    logger.info(`Migration completed: ${encryptedCount} encrypted, ${skippedCount} skipped, ${errorCount} errors`);

    // If we have the old column and successfully encrypted everything, we can drop it
    if (hasOldColumn && errorCount === 0) {
      logger.info('Dropping old secret column');
      await knex.schema.alterTable('user_two_factor_auth', (table) => {
        table.dropColumn('secret');
      });
      logger.info('Old secret column dropped');
    }

  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

export async function down(knex: Knex): Promise<void> {
  logger.warn('Rolling back TOTP encryption migration');
  logger.warn('WARNING: This will NOT decrypt existing secrets. Manual intervention required.');

  // Check if columns exist
  const hasEncryptedColumn = await knex.schema.hasColumn('user_two_factor_auth', 'secret_encrypted');
  const hasOldColumn = await knex.schema.hasColumn('user_two_factor_auth', 'secret');

  if (hasEncryptedColumn && !hasOldColumn) {
    // Add back the old column
    await knex.schema.alterTable('user_two_factor_auth', (table) => {
      table.text('secret').nullable();
    });

    logger.warn('Added back secret column, but it will be empty');
    logger.warn('You need to manually decrypt and restore TOTP secrets from backup');
  }

  // Remove encryption columns if they exist
  const hasKeyVersionColumn = await knex.schema.hasColumn('user_two_factor_auth', 'encryption_key_version');
  if (hasKeyVersionColumn) {
    await knex.schema.alterTable('user_two_factor_auth', (table) => {
      table.dropColumn('encryption_key_version');
    });
  }
}
