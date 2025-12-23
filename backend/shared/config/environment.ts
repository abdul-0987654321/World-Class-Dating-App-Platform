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
  azure: AzureConfig;
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

export interface AzureConfig {
  storageAccountName: string;
  storageAccountKey: string;
  blobContainerName: string;
  cosmosDbEndpoint: string;
  cosmosDbKey: string;
  cognitiveServicesKey: string;
  cognitiveServicesEndpoint: string;
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
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'flamoral',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      tls: process.env.REDIS_TLS === 'true',
    },
    jwt: {
      accessTokenSecret: requireEnvVar('JWT_ACCESS_SECRET', process.env.NODE_ENV !== 'production' ? 'dev-only-jwt-access-secret' : undefined),
      refreshTokenSecret: requireEnvVar('JWT_REFRESH_SECRET', process.env.NODE_ENV !== 'production' ? 'dev-only-jwt-refresh-secret' : undefined),
      accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '24h',
      refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    azure: {
      storageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
      storageAccountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
      blobContainerName: process.env.AZURE_BLOB_CONTAINER_NAME || 'media',
      cosmosDbEndpoint: process.env.AZURE_COSMOS_ENDPOINT || '',
      cosmosDbKey: process.env.AZURE_COSMOS_KEY || '',
      cognitiveServicesKey: process.env.AZURE_COGNITIVE_KEY || '',
      cognitiveServicesEndpoint: process.env.AZURE_COGNITIVE_ENDPOINT || '',
    },
    email: {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.FROM_EMAIL || 'noreply@flamoral.com',
      fromName: process.env.FROM_NAME || 'Flamoral',
    },
  };
};
