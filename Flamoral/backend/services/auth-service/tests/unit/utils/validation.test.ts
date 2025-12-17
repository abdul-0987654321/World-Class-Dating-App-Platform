/// <reference types="jest" />
import {
  isValidEmail,
  isValidPassword,
  isValidAge,
  isValidPhoneNumber,
} from '../../../src/utils/validation';

describe('Validation Utils', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
      expect(isValidEmail('firstname.lastname@company.com')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user name@domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should return true for valid passwords', () => {
      expect(isValidPassword('Password1!')).toBe(true);
      expect(isValidPassword('Str0ng@Pass')).toBe(true);
      expect(isValidPassword('MyP@ssw0rd')).toBe(true);
      expect(isValidPassword('Complex!Pass123')).toBe(true);
    });

    it('should return false for passwords without uppercase', () => {
      expect(isValidPassword('password1!')).toBe(false);
    });

    it('should return false for passwords without lowercase', () => {
      expect(isValidPassword('PASSWORD1!')).toBe(false);
    });

    it('should return false for passwords without numbers', () => {
      expect(isValidPassword('Password!')).toBe(false);
    });

    it('should return false for passwords without special characters', () => {
      expect(isValidPassword('Password1')).toBe(false);
    });

    it('should return false for passwords shorter than 8 characters', () => {
      expect(isValidPassword('Pass1!')).toBe(false);
      expect(isValidPassword('Ab1!')).toBe(false);
    });

    it('should return false for empty password', () => {
      expect(isValidPassword('')).toBe(false);
    });
  });

  describe('isValidAge', () => {
    it('should return true for users 18 years or older', () => {
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      expect(isValidAge(eighteenYearsAgo)).toBe(true);

      const thirtyYearsAgo = new Date();
      thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
      expect(isValidAge(thirtyYearsAgo)).toBe(true);

      const fiftyYearsAgo = new Date();
      fiftyYearsAgo.setFullYear(fiftyYearsAgo.getFullYear() - 50);
      expect(isValidAge(fiftyYearsAgo)).toBe(true);
    });

    it('should return false for users under 18', () => {
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      expect(isValidAge(tenYearsAgo)).toBe(false);

      const seventeenYearsAgo = new Date();
      seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17);
      expect(isValidAge(seventeenYearsAgo)).toBe(false);
    });

    it('should handle string date input', () => {
      const validDate = '1990-01-01';
      expect(isValidAge(validDate)).toBe(true);

      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() - 10);
      expect(isValidAge(recentDate.toISOString())).toBe(false);
    });

    it('should handle edge case of exactly 18 years old', () => {
      const exactlyEighteen = new Date();
      exactlyEighteen.setFullYear(exactlyEighteen.getFullYear() - 18);
      expect(isValidAge(exactlyEighteen)).toBe(true);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should return true for valid phone numbers', () => {
      expect(isValidPhoneNumber('+1234567890')).toBe(true);
      expect(isValidPhoneNumber('1234567890')).toBe(true);
      expect(isValidPhoneNumber('+14155552671')).toBe(true);
      expect(isValidPhoneNumber('14155552671')).toBe(true);
    });

    it('should handle phone numbers with spaces and dashes', () => {
      expect(isValidPhoneNumber('+1 415 555 2671')).toBe(true);
      expect(isValidPhoneNumber('1-415-555-2671')).toBe(true);
      expect(isValidPhoneNumber('+1-415-555-2671')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('abcdefghij')).toBe(false);
      expect(isValidPhoneNumber('+0123456789')).toBe(false); // Can't start with 0
    });

    it('should return false for phone numbers that are too short', () => {
      expect(isValidPhoneNumber('12345')).toBe(false);
    });
  });
});
