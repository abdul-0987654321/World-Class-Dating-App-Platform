import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  email: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  jti?: string; // JWT ID for token rotation
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class JwtUtils {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiresIn: string | number;
  private refreshTokenExpiresIn: string | number;
  private algorithm: 'HS256';
  private issuer: string;
  private audience: string;

  constructor() {
    this.accessTokenSecret = config.jwt.accessSecret;
    this.refreshTokenSecret = config.jwt.refreshSecret;
    this.accessTokenExpiresIn = config.jwt.accessExpiresIn;
    this.refreshTokenExpiresIn = config.jwt.refreshExpiresIn;
    this.algorithm = config.jwt.algorithm;
    this.issuer = config.jwt.issuer;
    this.audience = config.jwt.audience;
  }

  /**
   * Generate an access token with security best practices
   */
  generateAccessToken(payload: JwtPayload): string {
    const signOptions: SignOptions = {
      expiresIn: this.accessTokenExpiresIn as jwt.SignOptions['expiresIn'],
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience,
    };

    return jwt.sign(payload, this.accessTokenSecret, signOptions);
  }

  /**
   * Generate a refresh token with unique identifier for rotation detection
   */
  generateRefreshToken(payload: JwtPayload): string {
    // Add a unique token ID for refresh token rotation detection
    const tokenPayload = {
      ...payload,
      jti: this.generateRandomToken(16), // JWT ID for token rotation
    };

    const signOptions: SignOptions = {
      expiresIn: this.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'],
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience,
    };

    return jwt.sign(tokenPayload, this.refreshTokenSecret, signOptions);
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(payload: JwtPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify an access token with algorithm validation
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const verifyOptions: VerifyOptions = {
        algorithms: [this.algorithm], // Prevent algorithm confusion attacks
        issuer: this.issuer,
        audience: this.audience,
      };

      return jwt.verify(token, this.accessTokenSecret, verifyOptions) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new Error('Access token not yet valid');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify a refresh token with algorithm validation
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      const verifyOptions: VerifyOptions = {
        algorithms: [this.algorithm], // Prevent algorithm confusion attacks
        issuer: this.issuer,
        audience: this.audience,
      };

      return jwt.verify(token, this.refreshTokenSecret, verifyOptions) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new Error('Refresh token not yet valid');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Generate a random token for email verification, password reset, etc.
   */
  generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Calculate token expiry date
   */
  calculateTokenExpiry(hours: number): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }

  /**
   * Decode a token without verification (for debugging)
   */
  decodeToken(token: string): any {
    return jwt.decode(token);
  }
}

export const jwtUtils = new JwtUtils();
export default jwtUtils;
