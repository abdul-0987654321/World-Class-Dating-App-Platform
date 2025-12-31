import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import type { StringValue } from 'ms';

export interface JwtPayload {
  id: string;
  userId: string;
  email: string;
  role?: 'user' | 'admin' | 'moderator';
  subscriptionTier?: string;
  subscriptionStatus?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JwtUtils {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiresIn: StringValue | number;
  private refreshTokenExpiresIn: StringValue | number;
  private algorithm: 'HS256';
  private issuer: string;
  private audience: string;

  constructor() {
    // Validate required environment variables
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error('JWT_ACCESS_SECRET is required. Set it in environment variables.');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is required. Set it in environment variables.');
    }

    // Validate secret strength (minimum 32 characters)
    if (process.env.JWT_ACCESS_SECRET.length < 32) {
      throw new Error('JWT_ACCESS_SECRET must be at least 32 characters long');
    }
    if (process.env.JWT_REFRESH_SECRET.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
    }

    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as StringValue; // Reduced from 24h to 15m
    this.refreshTokenExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue; // Reduced from 30d to 7d
    this.algorithm = 'HS256'; // Explicit algorithm specification
    this.issuer = process.env.JWT_ISSUER || 'flamoral-user-service';
    this.audience = process.env.JWT_AUDIENCE || 'flamoral-platform';
  }

  generateAccessToken(payload: JwtPayload): string {
    const signOptions: SignOptions = {
      expiresIn: this.accessTokenExpiresIn,
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience,
    };

    return jwt.sign(payload, this.accessTokenSecret, signOptions);
  }

  generateRefreshToken(payload: JwtPayload): string {
    // Add a unique token ID for refresh token rotation detection
    const tokenPayload = {
      ...payload,
      jti: this.generateRandomToken(16), // JWT ID for token rotation
    };

    const signOptions: SignOptions = {
      expiresIn: this.refreshTokenExpiresIn,
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience,
    };

    return jwt.sign(tokenPayload, this.refreshTokenSecret, signOptions);
  }

  generateTokenPair(payload: JwtPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

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

  decodeToken(token: string): any {
    return jwt.decode(token);
  }

  generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  calculateTokenExpiry(hours: number): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }
}

export default new JwtUtils();
