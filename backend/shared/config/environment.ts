/**
 * Require environment variable - throws if missing in production
 */
function requireEnvVar(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value) return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Required environment variable ${name} is not set`);
  }

  if (fallback !== undefined) return fallback;
  throw new Error(`Required environment variable ${name} is not set`);
}

export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  apiVersion: string;
  corsOrigins: string[];
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  aws: AwsConfig;
  email: EmailConfig;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolMin: number;
  poolMax: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  tls: boolean;
}

export interface JwtConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface AwsConfig {
  region: string;
  s3Bucket: string;
  s3MediaBucket: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  secretsManagerSecretId: string;
  rekognitionEnabled: boolean;
}

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiVersion: process.env.API_VERSION || 'v1',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') ||
      (process.env.NODE_ENV === 'production'
        ? ['https://flamoral.com', 'https://www.flamoral.com', 'https://app.flamoral.com']
        : ['http://localhost:3000', 'http://localhost:5173']),
    database: {
      host: process.env.DB_HOST || (process.env.NODE_ENV === 'production' ? requireEnvVar('DB_HOST') : 'localhost'),
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'flamoral',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
    redis: {
      host: process.env.REDIS_HOST || (process.env.NODE_ENV === 'production' ? requireEnvVar('REDIS_HOST') : 'localhost'),
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      tls: process.env.REDIS_TLS === 'true',
    },
    jwt: {
      accessTokenSecret: requireEnvVar(
        'JWT_ACCESS_SECRET',
        process.env.NODE_ENV !== 'production' ? 'dev-only-jwt-access-secret' : undefined
      ),
      refreshTokenSecret: requireEnvVar(
        'JWT_REFRESH_SECRET',
        process.env.NODE_ENV !== 'production' ? 'dev-only-jwt-refresh-secret' : undefined
      ),
      accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '24h',
      refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      s3Bucket: process.env.AWS_S3_BUCKET || 'flamoral-media',
      s3MediaBucket: process.env.AWS_S3_MEDIA_BUCKET || 'flamoral-media',
      cognitoUserPoolId: process.env.AWS_COGNITO_USER_POOL_ID || '',
      cognitoClientId: process.env.AWS_COGNITO_CLIENT_ID || '',
      secretsManagerSecretId: process.env.AWS_SECRETS_MANAGER_SECRET_ID || 'flamoral-secrets',
      rekognitionEnabled: process.env.AWS_REKOGNITION_ENABLED === 'true',
    },
    email: {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.FROM_EMAIL || 'noreply@flamoral.com',
      fromName: process.env.FROM_NAME || 'Flamoral',
    },
  };
};
