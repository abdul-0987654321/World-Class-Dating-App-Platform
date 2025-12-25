// ============================================================================
// FLAMORAL B2C AUTHORIZATION MIDDLEWARE
// Server-side Token Validation & Group-based Access Control
// Microsoft Entra ID B2C Integration
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, SigningKeyCallback, JwtPayload, VerifyErrors } from 'jsonwebtoken';
import jwksRsa, { JwksClient, SigningKey } from 'jwks-rsa';
import createLogger from '../utils/logger';

const logger = createLogger('b2c-authorization');

// ============================================================================
// CONFIGURATION
// ============================================================================

interface B2CConfig {
  tenantName: string;
  policyName: string;
  clientId: string;
  groups: {
    free: string;
    premium: string;
    verified: string;
    moderator: string;
    admin: string;
    banned: string;
  };
}

const config: B2CConfig = {
  tenantName: process.env.B2C_TENANT_NAME || '',
  policyName: process.env.B2C_POLICY_NAME || 'B2C_1_SignUpSignIn',
  clientId: process.env.B2C_CLIENT_ID || '',
  groups: {
    free: process.env.GROUP_ID_FREE || '',
    premium: process.env.GROUP_ID_PREMIUM || '',
    verified: process.env.GROUP_ID_VERIFIED || '',
    moderator: process.env.GROUP_ID_MODERATOR || '',
    admin: process.env.GROUP_ID_ADMIN || '',
    banned: process.env.GROUP_ID_BANNED || ''
  }
};

// JWKS client for token signature verification
let jwksClient: JwksClient | null = null;

function getJwksClient(): JwksClient {
  if (jwksClient) return jwksClient;

  if (!config.tenantName) {
    throw new Error('B2C_TENANT_NAME not configured');
  }

  jwksClient = jwksRsa({
    jwksUri: `https://${config.tenantName}.b2clogin.com/${config.tenantName}.onmicrosoft.com/${config.policyName}/discovery/v2.0/keys`,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10
  });

  return jwksClient;
}

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionTier = 'free' | 'premium';

export interface FlamoralUser {
  id: string;  // Required by base Express.Request.user type
  userId: string;  // Alias for id (for B2C compatibility)
  email: string;
  displayName?: string;
  role?: string;  // Optional role field for compatibility
  groups: string[];
  subscriptionTier: SubscriptionTier;
  isVerified: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  rawClaims: JwtPayload;
}

export interface AuthRequest extends Request {
  user?: FlamoralUser;
  correlationId?: string;
}

// ============================================================================
// TOKEN VALIDATION
// ============================================================================

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
  const client = getJwksClient();

  client.getSigningKey(header.kid, (err: Error | null, key?: SigningKey) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

async function validateToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    const issuer = `https://${config.tenantName}.b2clogin.com/${config.tenantName}.onmicrosoft.com/${config.policyName}/v2.0/`;

    jwt.verify(
      token,
      getSigningKey,
      {
        audience: config.clientId,
        issuer,
        algorithms: ['RS256']
      },
      (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as JwtPayload);
        }
      }
    );
  });
}

// ============================================================================
// USER EXTRACTION FROM TOKEN
// ============================================================================

function extractUserFromToken(payload: JwtPayload): FlamoralUser {
  // Groups come from the 'groups' claim (configured in B2C)
  const groups: string[] = payload.groups || [];

  // Determine subscription tier based on group membership
  const isPremium = groups.includes(config.groups.premium);
  const subscriptionTier: SubscriptionTier = isPremium ? 'premium' : 'free';

  // Extract user ID (B2C uses 'sub' or 'oid' claims)
  const userId = payload.sub || payload.oid || '';

  // Determine role based on group membership
  const isAdmin = groups.includes(config.groups.admin);
  const isModerator = groups.includes(config.groups.moderator);
  const role = isAdmin ? 'admin' : isModerator ? 'moderator' : 'user';

  return {
    id: userId,  // Required by Express.Request.user base type
    userId,  // Alias for B2C compatibility
    email: payload.emails?.[0] || payload.email || '',
    displayName: payload.name || payload.given_name || '',
    role,
    groups,
    subscriptionTier,
    isVerified: groups.includes(config.groups.verified),
    isModerator,
    isAdmin,
    isBanned: groups.includes(config.groups.banned),
    rawClaims: payload
  };
}

// ============================================================================
// MIDDLEWARE: AUTHENTICATE (B2C Token Validation)
// ============================================================================

export async function authenticateB2C(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  // Generate correlation ID for request tracing
  const correlationId = (req.headers['x-correlation-id'] as string) ||
    `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Missing or invalid authorization header',
        correlationId
      });
    }

    const token = authHeader.substring(7);

    // Validate token against B2C
    const payload = await validateToken(token);
    const user = extractUserFromToken(payload);

    // CRITICAL: Check if user is banned
    if (user.isBanned) {
      logger.warn(`Banned user attempted access: ${user.userId}`, { correlationId });
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Account has been suspended. Contact support for assistance.',
        code: 'ACCOUNT_BANNED',
        correlationId
      });
    }

    req.user = user;
    return next();

  } catch (error: any) {
    logger.error('B2C Authentication failed', { error: error.message, correlationId });

    // Specific error handling
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED',
        correlationId
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
        correlationId
      });
    }

    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Authentication failed',
      correlationId
    });
  }
}

// ============================================================================
// MIDDLEWARE: REQUIRE SUBSCRIPTION TIER
// ============================================================================

export function requireTier(tier: SubscriptionTier) {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required',
        correlationId: req.correlationId
      });
    }

    if (tier === 'premium' && req.user.subscriptionTier !== 'premium') {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED',
        upgradeUrl: '/subscription/upgrade',
        correlationId: req.correlationId
      });
    }

    return next();
  };
}

// Convenience middleware for premium tier
export const requirePremium = requireTier('premium');

// ============================================================================
// MIDDLEWARE: REQUIRE VERIFICATION
// ============================================================================

export function requireVerified(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Authentication required',
      correlationId: req.correlationId
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      error: 'forbidden',
      message: 'Identity verification required',
      code: 'VERIFICATION_REQUIRED',
      verifyUrl: '/profile/verify',
      correlationId: req.correlationId
    });
  }

  return next();
}

// ============================================================================
// MIDDLEWARE: REQUIRE MODERATOR (Internal Staff Only)
// ============================================================================

export function requireModerator(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Authentication required',
      correlationId: req.correlationId
    });
  }

  // Admins have all moderator permissions
  if (!req.user.isModerator && !req.user.isAdmin) {
    logger.warn(`Non-moderator access attempt: ${req.user.userId}`, {
      correlationId: req.correlationId,
      path: req.path
    });

    return res.status(403).json({
      success: false,
      error: 'forbidden',
      message: 'Moderator access required',
      code: 'MODERATOR_REQUIRED',
      correlationId: req.correlationId
    });
  }

  return next();
}

// ============================================================================
// MIDDLEWARE: REQUIRE ADMIN (Internal Staff Only)
// ============================================================================

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Authentication required',
      correlationId: req.correlationId
    });
  }

  if (!req.user.isAdmin) {
    logger.warn(`Non-admin access attempt: ${req.user.userId}`, {
      correlationId: req.correlationId,
      path: req.path
    });

    return res.status(403).json({
      success: false,
      error: 'forbidden',
      message: 'Administrator access required',
      code: 'ADMIN_REQUIRED',
      correlationId: req.correlationId
    });
  }

  return next();
}

// ============================================================================
// MIDDLEWARE: REQUIRE SPECIFIC GROUP
// ============================================================================

export function requireGroup(groupId: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required',
        correlationId: req.correlationId
      });
    }

    if (!req.user.groups.includes(groupId)) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Insufficient permissions',
        code: 'GROUP_REQUIRED',
        correlationId: req.correlationId
      });
    }

    return next();
  };
}

// ============================================================================
// UTILITY: CHECK FEATURE ACCESS
// ============================================================================

type FeatureCheck = (user: FlamoralUser) => boolean;

const featureMatrix: Record<string, FeatureCheck> = {
  // Free features (all authenticated users)
  'basic_matching': () => true,
  'send_message': () => true,
  'view_profile': () => true,
  'limited_likes': () => true,
  'report_user': () => true,

  // Premium features
  'unlimited_likes': (u) => u.subscriptionTier === 'premium',
  'see_who_liked': (u) => u.subscriptionTier === 'premium',
  'read_receipts': (u) => u.subscriptionTier === 'premium',
  'priority_matching': (u) => u.subscriptionTier === 'premium',
  'boost_profile': (u) => u.subscriptionTier === 'premium',
  'rewind_swipe': (u) => u.subscriptionTier === 'premium',
  'advanced_filters': (u) => u.subscriptionTier === 'premium',
  'no_ads': (u) => u.subscriptionTier === 'premium',

  // Verified features
  'verified_badge': (u) => u.isVerified,
  'verified_only_mode': (u) => u.isVerified,
  'higher_trust_score': (u) => u.isVerified,

  // Moderator features (internal staff)
  'review_reports': (u) => u.isModerator || u.isAdmin,
  'issue_warnings': (u) => u.isModerator || u.isAdmin,
  'temp_suspend': (u) => u.isModerator || u.isAdmin,
  'view_user_history': (u) => u.isModerator || u.isAdmin,

  // Admin features (internal staff)
  'perm_ban': (u) => u.isAdmin,
  'manage_users': (u) => u.isAdmin,
  'view_analytics': (u) => u.isAdmin,
  'system_config': (u) => u.isAdmin,
  'manage_moderators': (u) => u.isAdmin
};

export function canAccessFeature(user: FlamoralUser, feature: string): boolean {
  const check = featureMatrix[feature];
  if (!check) {
    logger.warn(`Unknown feature requested: ${feature}`);
    return false;
  }
  return check(user);
}

export function requireFeature(feature: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required',
        correlationId: req.correlationId
      });
    }

    if (!canAccessFeature(req.user, feature)) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: `Feature '${feature}' not available`,
        code: 'FEATURE_NOT_AVAILABLE',
        correlationId: req.correlationId
      });
    }

    return next();
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  config as b2cConfig,
  validateToken,
  extractUserFromToken
};
