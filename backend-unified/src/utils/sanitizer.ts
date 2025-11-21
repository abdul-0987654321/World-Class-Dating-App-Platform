/**
 * Input Sanitization Utility
 * Comprehensive input cleaning and validation
 */

import { logger } from './logger';

export class Sanitizer {
  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/\0/g, ''); // Remove null bytes
  }

  /**
   * Sanitize email
   */
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') {
      return '';
    }

    const sanitized = email.toLowerCase().trim();
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    return emailRegex.test(sanitized) ? sanitized : '';
  }

  /**
   * Sanitize phone number
   */
  static sanitizePhone(phone: string): string {
    if (typeof phone !== 'string') {
      return '';
    }

    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '');
  }

  /**
   * Sanitize URL
   */
  static sanitizeURL(url: string): string {
    if (typeof url !== 'string') {
      return '';
    }

    try {
      const parsed = new URL(url);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        logger.warn('Invalid URL protocol', { url, protocol: parsed.protocol });
        return '';
      }

      return parsed.toString();
    } catch {
      logger.warn('Invalid URL', { url });
      return '';
    }
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    if (typeof filename !== 'string') {
      return '';
    }

    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '') // Only allow alphanumeric, dots, underscores, hyphens
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/^\.+/, '') // Remove leading dots
      .slice(0, 255); // Limit length
  }

  /**
   * Sanitize HTML (strip all tags)
   */
  static stripHTML(html: string): string {
    if (typeof html !== 'string') {
      return '';
    }

    return html
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace nbsp
      .replace(/&amp;/g, '&') // Replace amp
      .replace(/&lt;/g, '<') // Replace lt
      .replace(/&gt;/g, '>') // Replace gt
      .replace(/&quot;/g, '"') // Replace quot
      .replace(/&#039;/g, "'") // Replace apos
      .trim();
  }

  /**
   * Sanitize SQL input (prevent SQL injection)
   */
  static sanitizeSQL(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multi-line comment start
      .replace(/\*\//g, ''); // Remove multi-line comment end
  }

  /**
   * Sanitize MongoDB query (prevent NoSQL injection)
   */
  static sanitizeMongoQuery(query: any): any {
    if (typeof query !== 'object' || query === null) {
      return {};
    }

    const sanitized: any = {};

    for (const key in query) {
      // Remove keys starting with $
      if (key.startsWith('$')) {
        logger.warn('NoSQL injection attempt', { key });
        continue;
      }

      if (typeof query[key] === 'object' && query[key] !== null) {
        sanitized[key] = this.sanitizeMongoQuery(query[key]);
      } else {
        sanitized[key] = query[key];
      }
    }

    return sanitized;
  }

  /**
   * Sanitize user input object
   */
  static sanitizeObject(obj: any, allowedKeys: string[]): any {
    if (typeof obj !== 'object' || obj === null) {
      return {};
    }

    const sanitized: any = {};

    for (const key of allowedKeys) {
      if (key in obj) {
        const value = obj[key];

        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeString(value);
        } else if (typeof value === 'number') {
          sanitized[key] = Number.isFinite(value) ? value : 0;
        } else if (typeof value === 'boolean') {
          sanitized[key] = Boolean(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.filter(item => typeof item === 'string' || typeof item === 'number');
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize password
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'letmein', 'admin', 'welcome'];
    if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
      errors.push('Password is too common');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize pagination parameters
   */
  static sanitizePagination(page?: any, limit?: any): { page: number; limit: number } {
    const sanitizedPage = parseInt(String(page), 10);
    const sanitizedLimit = parseInt(String(limit), 10);

    return {
      page: Number.isFinite(sanitizedPage) && sanitizedPage > 0 ? sanitizedPage : 1,
      limit: Number.isFinite(sanitizedLimit) && sanitizedLimit > 0 && sanitizedLimit <= 100
        ? sanitizedLimit
        : 20,
    };
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query: string): string {
    if (typeof query !== 'string') {
      return '';
    }

    return query
      .trim()
      .replace(/[<>]/g, '')
      .replace(/[%_]/g, '') // Remove SQL wildcards
      .slice(0, 100); // Limit length
  }

  /**
   * Sanitize date input
   */
  static sanitizeDate(date: any): Date | null {
    if (!date) {
      return null;
    }

    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) {
      return null;
    }

    // Check for reasonable date range (1900 - 2100)
    const year = parsed.getFullYear();
    if (year < 1900 || year > 2100) {
      return null;
    }

    return parsed;
  }

  /**
   * Sanitize boolean
   */
  static sanitizeBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return false;
  }

  /**
   * Remove sensitive data from logs
   */
  static sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
