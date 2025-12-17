/**
 * Comprehensive Security Configuration
 * Defines secure defaults for all services
 */

export interface SecurityConfig {
  // Authentication Settings
  auth: {
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    maxLoginAttempts: number;
    lockoutDuration: number; // seconds
    sessionTimeout: number; // seconds
    requireEmailVerification: boolean;
    require2FA: boolean;
    allowedLoginMethods: string[];
  };

  // Password Policy
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number; // number of previous passwords to check
    expiryDays: number; // force password change after N days
    checkBreaches: boolean; // check against HaveIBeenPwned
  };

  // Rate Limiting
  rateLimit: {
    enabled: boolean;
    windowMs: number; // time window in ms
    maxRequests: number; // max requests per window
    skipSuccessfulRequests: boolean;
    trustProxy: boolean;
    standardHeaders: boolean;
  };

  // CORS Settings
  cors: {
    enabled: boolean;
    origin: string[] | string;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
  };

  // Helmet Security Headers
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: {
      enabled: boolean;
      directives?: Record<string, string[]>;
    };
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    xssFilter: boolean;
    noSniff: boolean;
    frameguard: {
      enabled: boolean;
      action: 'deny' | 'sameorigin';
    };
  };

  // File Upload Settings
  fileUpload: {
    maxFileSize: number; // bytes
    maxFiles: number;
    allowedImageTypes: string[];
    allowedVideoTypes: string[];
    virusScanEnabled: boolean;
    magicNumberCheck: boolean;
  };

  // Session Management
  session: {
    maxConcurrentSessions: number;
    absoluteTimeout: number; // seconds
    idleTimeout: number; // seconds
    rotateTokens: boolean;
    detectTokenReuse: boolean;
  };

  // API Security
  api: {
    versioning: boolean;
    currentVersion: string;
    deprecationWarnings: boolean;
    requireApiKey: boolean;
    validateContentType: boolean;
    maxBodySize: string;
  };

  // Monitoring & Logging
  monitoring: {
    logSecurityEvents: boolean;
    alertOnSuspiciousActivity: boolean;
    trackFailedLogins: boolean;
    trackAnomalies: boolean;
    metricsEnabled: boolean;
  };

  // IP & Geolocation
  ipSecurity: {
    blockSuspiciousIPs: boolean;
    allowlist: string[];
    blocklist: string[];
    detectVPN: boolean;
    detectTor: boolean;
    geoBlockCountries: string[];
  };
}

/**
 * Default security configuration for production
 */
export const securityConfig: SecurityConfig = {
  auth: {
    accessTokenExpiry: '15m', // Short-lived access tokens
    refreshTokenExpiry: '7d', // Refresh tokens rotate regularly
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60, // 15 minutes
    sessionTimeout: 24 * 60 * 60, // 24 hours
    requireEmailVerification: true, // CRITICAL: Always required in production
    require2FA: false, // Optional for regular users, mandatory for admin accounts
    allowedLoginMethods: ['email', 'phone'],
  },

  password: {
    minLength: 12, // Increased from typical 8
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 5, // Remember last 5 passwords
    expiryDays: 90, // Force password change every 90 days
    checkBreaches: true, // Always check against HaveIBeenPwned
  },

  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    skipSuccessfulRequests: false,
    trustProxy: true,
    standardHeaders: true,
  },

  cors: {
    enabled: true,
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://flamoral.com',
      'https://app.flamoral.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Version',
      'X-Device-ID',
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  },

  helmet: {
    enabled: true,
    contentSecurityPolicy: {
      enabled: true,
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.flamoral.com'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    xssFilter: true,
    noSniff: true,
    frameguard: {
      enabled: true,
      action: 'deny',
    },
  },

  fileUpload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB for images
    maxFiles: 9, // Max 9 profile photos
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedVideoTypes: ['video/mp4'],
    virusScanEnabled: true,
    magicNumberCheck: true,
  },

  session: {
    maxConcurrentSessions: 5, // Allow 5 devices
    absoluteTimeout: 7 * 24 * 60 * 60, // 7 days max
    idleTimeout: 24 * 60 * 60, // 24 hours idle
    rotateTokens: true,
    detectTokenReuse: true,
  },

  api: {
    versioning: true,
    currentVersion: 'v1',
    deprecationWarnings: true,
    requireApiKey: false, // Not required for web app, required for mobile
    validateContentType: true,
    maxBodySize: '1mb',
  },

  monitoring: {
    logSecurityEvents: true,
    alertOnSuspiciousActivity: true,
    trackFailedLogins: true,
    trackAnomalies: true,
    metricsEnabled: true,
  },

  ipSecurity: {
    blockSuspiciousIPs: true,
    allowlist: [], // Whitelist specific IPs if needed
    blocklist: [], // Blacklist known malicious IPs
    detectVPN: false, // Don't block VPNs for dating app
    detectTor: true, // Block Tor for security
    geoBlockCountries: [], // No geo-blocking by default
  },
};

/**
 * Development-specific overrides
 */
export const developmentSecurityConfig: Partial<SecurityConfig> = {
  auth: {
    ...securityConfig.auth,
    requireEmailVerification: false, // Easier for dev testing
  },
  cors: {
    ...securityConfig.cors,
    origin: '*', // Allow all origins in dev
  },
  rateLimit: {
    ...securityConfig.rateLimit,
    maxRequests: 1000, // Higher limit for dev
  },
  helmet: {
    ...securityConfig.helmet,
    contentSecurityPolicy: {
      enabled: false, // Disable CSP in dev for easier debugging
    },
  },
};

/**
 * Get security config based on environment
 */
export const getSecurityConfig = (): SecurityConfig => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'development') {
    return {
      ...securityConfig,
      ...developmentSecurityConfig,
    } as SecurityConfig;
  }

  return securityConfig;
};

export default getSecurityConfig();
