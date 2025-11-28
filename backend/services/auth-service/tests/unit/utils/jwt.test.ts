import jwt from 'jsonwebtoken';

// Set up environment before importing the module
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';
process.env.JWT_ACCESS_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Now import the module
import jwtUtils, { JwtPayload, TokenPair } from '../../../src/utils/jwt';

describe('JWT Utils', () => {
  const mockPayload: JwtPayload = {
    userId: 'user-123-uuid',
    email: 'test@example.com',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = jwtUtils.generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should contain the correct payload', () => {
      const token = jwtUtils.generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should have an expiration time', () => {
      const token = jwtUtils.generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = jwtUtils.generateAccessToken(mockPayload);
      const token2 = jwtUtils.generateAccessToken({
        userId: 'different-user',
        email: 'different@example.com',
      });

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = jwtUtils.generateRefreshToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should have a longer expiration than access token', () => {
      const accessToken = jwtUtils.generateAccessToken(mockPayload);
      const refreshToken = jwtUtils.generateRefreshToken(mockPayload);

      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens: TokenPair = jwtUtils.generateTokenPair(mockPayload);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should contain the same payload in both tokens', () => {
      const tokens = jwtUtils.generateTokenPair(mockPayload);

      const accessDecoded = jwt.decode(tokens.accessToken) as any;
      const refreshDecoded = jwt.decode(tokens.refreshToken) as any;

      expect(accessDecoded.userId).toBe(refreshDecoded.userId);
      expect(accessDecoded.email).toBe(refreshDecoded.email);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = jwtUtils.generateAccessToken(mockPayload);
      const decoded = jwtUtils.verifyAccessToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should throw an error for invalid token', () => {
      expect(() => {
        jwtUtils.verifyAccessToken('invalid.token.here');
      }).toThrow();
    });

    it('should throw an error for expired token', () => {
      // Create an expired token manually
      const expiredToken = jwt.sign(mockPayload, process.env.JWT_ACCESS_SECRET!, {
        expiresIn: '-1s',
      });

      expect(() => {
        jwtUtils.verifyAccessToken(expiredToken);
      }).toThrow();
    });

    it('should throw an error for token signed with wrong secret', () => {
      const wrongSecretToken = jwt.sign(mockPayload, 'wrong-secret', {
        expiresIn: '1h',
      });

      expect(() => {
        jwtUtils.verifyAccessToken(wrongSecretToken);
      }).toThrow();
    });

    it('should throw an error for refresh token used as access token', () => {
      const refreshToken = jwtUtils.generateRefreshToken(mockPayload);

      expect(() => {
        jwtUtils.verifyAccessToken(refreshToken);
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = jwtUtils.generateRefreshToken(mockPayload);
      const decoded = jwtUtils.verifyRefreshToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should throw an error for invalid token', () => {
      expect(() => {
        jwtUtils.verifyRefreshToken('invalid.token.here');
      }).toThrow();
    });

    it('should throw an error for access token used as refresh token', () => {
      const accessToken = jwtUtils.generateAccessToken(mockPayload);

      expect(() => {
        jwtUtils.verifyRefreshToken(accessToken);
      }).toThrow();
    });
  });

  describe('generateRandomToken', () => {
    it('should generate a random hex string', () => {
      const token = jwtUtils.generateRandomToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate tokens of correct length', () => {
      const token32 = jwtUtils.generateRandomToken(32);
      const token64 = jwtUtils.generateRandomToken(64);

      // Each byte becomes 2 hex characters
      expect(token32.length).toBe(64);
      expect(token64.length).toBe(128);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(jwtUtils.generateRandomToken());
      }

      expect(tokens.size).toBe(100);
    });

    it('should use default length of 32 bytes', () => {
      const token = jwtUtils.generateRandomToken();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe('calculateTokenExpiry', () => {
    it('should calculate future expiry date', () => {
      const now = new Date();
      const expiry = jwtUtils.calculateTokenExpiry(24);

      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should calculate correct expiry for different hours', () => {
      const now = new Date();
      const expiry1Hour = jwtUtils.calculateTokenExpiry(1);
      const expiry24Hours = jwtUtils.calculateTokenExpiry(24);

      const diff1Hour = expiry1Hour.getTime() - now.getTime();
      const diff24Hours = expiry24Hours.getTime() - now.getTime();

      // Allow 1 second tolerance
      expect(diff1Hour).toBeGreaterThanOrEqual(3600000 - 1000);
      expect(diff1Hour).toBeLessThanOrEqual(3600000 + 1000);

      expect(diff24Hours).toBeGreaterThanOrEqual(86400000 - 1000);
      expect(diff24Hours).toBeLessThanOrEqual(86400000 + 1000);
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', () => {
      const token = jwtUtils.generateAccessToken(mockPayload);
      const decoded = jwtUtils.decodeToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should decode an expired token', () => {
      const expiredToken = jwt.sign(mockPayload, process.env.JWT_ACCESS_SECRET!, {
        expiresIn: '-1s',
      });

      const decoded = jwtUtils.decodeToken(expiredToken);
      expect(decoded.userId).toBe(mockPayload.userId);
    });

    it('should return null for invalid token format', () => {
      const decoded = jwtUtils.decodeToken('not-a-valid-token');
      expect(decoded).toBeNull();
    });
  });
});
