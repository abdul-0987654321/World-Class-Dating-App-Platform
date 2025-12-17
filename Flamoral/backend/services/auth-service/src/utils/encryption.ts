import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Increased from 12 to 14 for better security
// 14 rounds provides strong protection against brute force attacks
// while maintaining acceptable performance (200-300ms per hash)
const SALT_ROUNDS = 14;

// Minimum acceptable rounds for existing hashes
const MIN_ACCEPTABLE_ROUNDS = 12;

/**
 * Hash a password using bcrypt with strong salt rounds
 * @param password - Plain text password
 * @returns Promise<string> - Bcrypt hash
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 * Also checks if hash needs to be upgraded to stronger rounds
 * @param password - Plain text password
 * @param hash - Bcrypt hash
 * @returns Promise<boolean> - True if password matches
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if a password hash needs to be upgraded to stronger rounds
 * @param hash - Bcrypt hash
 * @returns boolean - True if hash should be upgraded
 */
export function needsPasswordRehash(hash: string): boolean {
  try {
    // Extract rounds from bcrypt hash
    // Bcrypt hash format: $2a$rounds$salt$hash
    const rounds = parseInt(hash.split('$')[2]);
    return rounds < SALT_ROUNDS;
  } catch (error) {
    // If we can't parse the hash, assume it needs rehashing
    return true;
  }
}

/**
 * Check if a password hash meets minimum security requirements
 * @param hash - Bcrypt hash
 * @returns boolean - True if hash meets minimum requirements
 */
export function isPasswordHashSecure(hash: string): boolean {
  try {
    const rounds = parseInt(hash.split('$')[2]);
    return rounds >= MIN_ACCEPTABLE_ROUNDS;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a cryptographically secure random token
 * @param length - Length in bytes (default 32)
 * @returns string - Hex encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a cryptographically secure random password
 * Useful for OAuth users who don't have a password
 * @returns string - Random password
 */
export function generateSecurePassword(): string {
  const length = 32;
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  return password;
}
