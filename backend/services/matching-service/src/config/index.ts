const isProduction = process.env.NODE_ENV === 'production';

function requireSecret(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) throw new Error(`${name} environment variable is required in production`);
  return devDefault;
}

export default {
  port: parseInt(process.env.PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: (() => {
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '5432', 10),
        name: url.pathname.slice(1),
        user: url.username,
        password: decodeURIComponent(url.password),
        ssl: process.env.DB_SSL !== 'false',
      };
    }
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      name: process.env.DB_NAME || 'matching_service_dev',
      user: process.env.DB_USER || 'postgres',
      password: requireSecret('DB_PASSWORD', 'postgres'),
    };
  })(),

  jwt: {
    secret: requireSecret('JWT_ACCESS_SECRET', 'dev-only-jwt-secret'),
  },

  redis: (() => {
    if (process.env.REDIS_URL) {
      const url = new URL(process.env.REDIS_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password ? decodeURIComponent(url.password) : '',
      };
    }
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
    };
  })(),

  services: {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
    analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3007',
  },

  matching: {
    minCompatibilityScore: parseInt(process.env.MIN_COMPATIBILITY_SCORE || '30', 10),
    defaultRecommendationLimit: parseInt(process.env.DEFAULT_RECOMMENDATION_LIMIT || '20', 10),
    maxDistanceKm: parseInt(process.env.MAX_DISTANCE_KM || '100', 10),
  },
};
