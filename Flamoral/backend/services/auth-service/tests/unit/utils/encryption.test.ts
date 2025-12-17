/// <reference types="jest" />
import { hashPassword, comparePassword } from '../../../src/utils/encryption';

describe('Encryption Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different passwords', async () => {
      const hash1 = await hashPassword('Password1!');
      const hash2 = await hashPassword('Password2!');

      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should throw error for short password', async () => {
      await expect(hashPassword('short')).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters in password', async () => {
      const password = 'パスワード123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const isMatch = await comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const isMatch = await comparePassword('WrongPassword123!', hash);
      expect(isMatch).toBe(false);
    });

    it('should return false for similar but different passwords', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      // Test case sensitivity
      expect(await comparePassword('testpassword123!', hash)).toBe(false);
      expect(await comparePassword('TESTPASSWORD123!', hash)).toBe(false);

      // Test extra character
      expect(await comparePassword('TestPassword123!!', hash)).toBe(false);

      // Test missing character
      expect(await comparePassword('TestPassword123', hash)).toBe(false);
    });

    it('should handle empty password comparison by throwing', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should handle special characters correctly', async () => {
      const password = '!@#$%^&*()_+-=';
      const hash = await hashPassword(password);

      expect(await comparePassword(password, hash)).toBe(true);
      expect(await comparePassword('!@#$%^&*()_+-', hash)).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('should produce bcrypt hashes', async () => {
      const hash = await hashPassword('TestPassword123!');

      // bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('should use a reasonable work factor', async () => {
      const hash = await hashPassword('TestPassword123!');

      // Extract the cost factor from the hash
      // bcrypt format: $2a$12$...
      const costFactor = parseInt(hash.split('$')[2], 10);

      // Cost factor should be between 10 and 14 for security/performance balance
      expect(costFactor).toBeGreaterThanOrEqual(10);
      expect(costFactor).toBeLessThanOrEqual(14);
    });
  });
});
