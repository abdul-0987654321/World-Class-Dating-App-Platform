import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class JwtUtils {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor() {
    this.accessTokenSecret = config.jwt.accessSecret;
    this.refreshTokenSecret = config.jwt.refreshSecret;
    this.accessTokenExpiresIn = config.jwt.accessExpiresIn;
    this.refreshTokenExpiresIn = config.jwt.refreshExpiresIn;
  }

  /**
   * Generate an access token
   */
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    } as SignOptions);
  }

  /**
   * Generate a refresh token
   */
  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    } as SignOptions);
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
   * Verify an access token
   */
  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.accessTokenSecret) as JwtPayload;
  }

  /**
   * Verify a refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, this.refreshTokenSecret) as JwtPayload;
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
