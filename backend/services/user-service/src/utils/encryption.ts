import crypto from 'crypto';

import bcrypt from 'bcrypt';

import logger from './logger';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// AES-256-GCM encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits for PBKDF2
const PBKDF2_ITERATIONS = 100000; // OWASP recommended minimum

// Encryption key management
let encryptionKey: Buffer | null = null;
let keyVersion: number = 1;

/**
 * Initialize encryption key from environment variable
 * Uses PBKDF2 key derivation for enhanced security
 */
export const initializeEncryptionKey = (): void => {
  const masterKey = process.env.TOTP_ENCRYPTION_MASTER_KEY;
  const keySalt = process.env.TOTP_ENCRYPTION_KEY_SALT;
  const version = parseInt(process.env.TOTP_ENCRYPTION_KEY_VERSION || '1');

  if (!masterKey) {
    throw new Error('TOTP_ENCRYPTION_MASTER_KEY environment variable is required');
  }

  if (!keySalt) {
    throw new Error('TOTP_ENCRYPTION_KEY_SALT environment variable is required');
  }

  // Validate master key length (should be at least 32 characters)
  if (masterKey.length < 32) {
    throw new Error('TOTP_ENCRYPTION_MASTER_KEY must be at least 32 characters long');
  }

  // Derive encryption key using PBKDF2
  encryptionKey = crypto.pbkdf2Sync(masterKey, keySalt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');

  keyVersion = version;

  logger.info(`Encryption key initialized successfully (version: ${keyVersion})`);
};

/**
 * Get current encryption key
 * Throws error if key is not initialized
 */
const getEncryptionKey = (): Buffer => {
  if (!encryptionKey) {
    throw new Error('Encryption key not initialized. Call initializeEncryptionKey() first.');
  }
  return encryptionKey;
};

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns base64-encoded string containing: version:iv:authTag:encryptedData
 */
export const encryptData = (plaintext: string): string => {
  try {
    const key = getEncryptionKey();

    // Generate random IV (must be unique for each encryption)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine version, IV, auth tag, and encrypted data
    // Format: version:iv:authTag:encryptedData (all base64 encoded)
    const result = `${keyVersion}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;

    return result;
  } catch (error) {
    logger.error('Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data encrypted with encryptData
 * Accepts base64-encoded string: version:iv:authTag:encryptedData
 */
export const decryptData = (encryptedString: string): string => {
  try {
    const key = getEncryptionKey();

    // Split the encrypted string
    const parts = encryptedString.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [version, ivBase64, authTagBase64, encryptedBase64] = parts;

    // Parse components
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    // Validate key version
    if (parseInt(version) !== keyVersion) {
      logger.warn(`Decrypting data with old key version: ${version} (current: ${keyVersion})`);
      // In production, this should handle key rotation
      // For now, we'll attempt decryption with current key
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    logger.error('Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Encrypt TOTP secret
 */
export const encryptTOTPSecret = (secret: string): string => {
  return encryptData(secret);
};

/**
 * Decrypt TOTP secret
 */
export const decryptTOTPSecret = (encryptedSecret: string): string => {
  return decryptData(encryptedSecret);
};

/**
 * Generate cryptographically secure TOTP secret
 * Uses 32 bytes (256 bits) of entropy for maximum security
 */
export const generateSecureTOTPSecret = (): string => {
  // Generate 32 bytes of cryptographically secure random data
  const randomBytes = crypto.randomBytes(32);

  // Convert to base32 (required for TOTP)
  return base32Encode(randomBytes);
};

/**
 * Base32 encode (RFC 4648)
 */
const base32Encode = (buffer: Buffer): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let result = '';

  // Convert buffer to binary string
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, '0');
  }

  // Convert 5-bit chunks to base32
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    const index = parseInt(chunk, 2);
    result += alphabet[index];
  }

  return result;
};

/**
 * Hash backup code with bcrypt
 */
export const hashBackupCode = async (code: string): Promise<string> => {
  return await bcrypt.hash(code, SALT_ROUNDS);
};

/**
 * Verify backup code against bcrypt hash
 */
export const verifyBackupCode = async (code: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(code, hash);
};

/**
 * Generate cryptographically secure backup code
 * Uses 8 bytes (64 bits) of entropy
 */
export const generateSecureBackupCode = (): string => {
  const randomBytes = crypto.randomBytes(8);
  const hex = randomBytes.toString('hex').toUpperCase();

  // Format as XXXX-XXXX-XXXX-XXXX
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
};

/**
 * Get current encryption key version
 */
export const getKeyVersion = (): number => {
  return keyVersion;
};

/**
 * Password hashing (existing functionality)
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};
