/**
 * Environment Variable Validator
 *
 * Provides centralized validation of environment variables at service startup.
 * Ensures required variables are present and valid before the application runs.
 */

export interface EnvVarConfig {
  /** Environment variable name */
  name: string;
  /** Whether this variable is required (always required in production) */
  required: boolean;
  /** Description of the variable for error messages */
  description: string;
  /** Default value if not required and not set */
  defaultValue?: string | number | boolean;
  /** Custom validation function */
  validate?: (value: string) => boolean;
  /** Minimum string length */
  minLength?: number;
  /** Minimum numeric value */
  minValue?: number;
  /** Maximum numeric value */
  maxValue?: number;
  /** Allowed enum values */
  enum?: string[];
  /** Whether to mask value in logs (for secrets) */
  sensitive?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Environment Variable Validator Class
 */
export class EnvironmentValidator {
  private config: EnvVarConfig[];
  private serviceName: string;
  private errors: string[] = [];
  private warnings: string[] = [];
  private isProduction: boolean;
  private gracefulMode: boolean;

  constructor(serviceName: string, config: EnvVarConfig[], options?: { graceful?: boolean }) {
    this.serviceName = serviceName;
    this.config = config;
    this.isProduction = process.env.NODE_ENV === 'production';
    // Graceful mode: warn instead of throw on missing env vars (for non-critical services)
    this.gracefulMode = options?.graceful || process.env.ALLOW_DEGRADED_MODE === 'true';
  }

  /**
   * Validate all configured environment variables
   */
  validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];

    for (const varConfig of this.config) {
      this.validateVariable(varConfig);
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Validate and throw on errors (unless graceful mode is enabled)
   */
  validateOrThrow(): void {
    const result = this.validate();

    if (result.warnings.length > 0) {
      console.warn(`\n[${this.serviceName}] Environment Warnings:`);
      result.warnings.forEach((w) => console.warn(`  - ${w}`));
    }

    if (!result.valid) {
      const errorMessage =
        `\n[${this.serviceName}] Environment Validation Failed:\n` +
        result.errors.map((e) => `  - ${e}`).join('\n') +
        '\n\nPlease set the required environment variables and restart the service.';

      if (this.gracefulMode) {
        // In graceful mode, log errors as warnings and continue with degraded functionality
        console.warn(errorMessage);
        console.warn(
          `\n[${this.serviceName}] Starting in DEGRADED MODE - some features may not work`
        );
        return;
      }

      throw new Error(errorMessage);
    }

    console.log(`[${this.serviceName}] Environment validation passed`);
  }

  /**
   * Validate a single environment variable
   */
  private validateVariable(varConfig: EnvVarConfig): void {
    const value = process.env[varConfig.name];
    const isRequired = varConfig.required || this.isProduction;

    // Check if required variable is missing
    if (!value) {
      if (isRequired && varConfig.defaultValue === undefined) {
        this.errors.push(`${varConfig.name} is required. ${varConfig.description}`);
      } else if (varConfig.required && !this.isProduction) {
        this.warnings.push(
          `${varConfig.name} is not set (using default). ${varConfig.description}`
        );
      }
      return;
    }

    // Check for weak/insecure default values in production
    if (this.isProduction) {
      const weakDefaults = [
        'dev-secret-key',
        'your-secret-key',
        'your-refresh-secret-key',
        'dev-service-token-change-in-production',
        'internal-service-key',
        'test',
        'development',
      ];
      if (weakDefaults.includes(value.toLowerCase())) {
        this.errors.push(`${varConfig.name} contains an insecure default value in production`);
      }
    }

    // Minimum length validation
    if (varConfig.minLength && value.length < varConfig.minLength) {
      this.errors.push(
        `${varConfig.name} must be at least ${varConfig.minLength} characters (got ${value.length})`
      );
    }

    // Enum validation
    if (varConfig.enum && !varConfig.enum.includes(value)) {
      this.errors.push(
        `${varConfig.name} must be one of: ${varConfig.enum.join(', ')} (got "${value}")`
      );
    }

    // Custom validation
    if (varConfig.validate && !varConfig.validate(value)) {
      this.errors.push(`${varConfig.name} failed validation. ${varConfig.description}`);
    }

    // Numeric validations
    if (varConfig.minValue !== undefined || varConfig.maxValue !== undefined) {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        this.errors.push(`${varConfig.name} must be a valid number`);
      } else {
        if (varConfig.minValue !== undefined && numValue < varConfig.minValue) {
          this.errors.push(
            `${varConfig.name} must be at least ${varConfig.minValue} (got ${numValue})`
          );
        }
        if (varConfig.maxValue !== undefined && numValue > varConfig.maxValue) {
          this.errors.push(
            `${varConfig.name} must be at most ${varConfig.maxValue} (got ${numValue})`
          );
        }
      }
    }
  }

  /**
   * Get summary of configured variables
   */
  getSummary(): string {
    const lines = [`\n[${this.serviceName}] Environment Configuration:`];

    for (const varConfig of this.config) {
      const value = process.env[varConfig.name];
      const status = value ? 'SET' : 'NOT SET';
      const displayValue =
        varConfig.sensitive && value ? '****' : value || varConfig.defaultValue || 'N/A';
      const required = varConfig.required ? 'required' : 'optional';

      lines.push(`  ${varConfig.name}: ${status} [${required}] = ${displayValue}`);
    }

    return lines.join('\n');
  }
}

/**
 * Create a validator for a service
 */
export function createValidator(serviceName: string, config: EnvVarConfig[]): EnvironmentValidator {
  return new EnvironmentValidator(serviceName, config);
}

/**
 * Common validation configurations that can be reused across services
 */
export const commonValidations = {
  nodeEnv: {
    name: 'NODE_ENV',
    required: false,
    description: 'Application environment',
    enum: ['development', 'staging', 'production', 'test'],
    defaultValue: 'development',
  } as EnvVarConfig,

  port: (defaultPort: number) =>
    ({
      name: 'PORT',
      required: false,
      description: 'Service port number',
      minValue: 1024,
      maxValue: 65535,
      defaultValue: defaultPort,
    }) as EnvVarConfig,

  jwtAccessSecret: {
    name: 'JWT_ACCESS_SECRET',
    required: true,
    description: 'JWT access token signing secret (minimum 32 characters for security)',
    minLength: 32,
    sensitive: true,
  } as EnvVarConfig,

  jwtRefreshSecret: {
    name: 'JWT_REFRESH_SECRET',
    required: true,
    description: 'JWT refresh token signing secret (minimum 32 characters for security)',
    minLength: 32,
    sensitive: true,
  } as EnvVarConfig,

  dbHost: {
    name: 'DB_HOST',
    required: true,
    description: 'PostgreSQL database host',
  } as EnvVarConfig,

  dbPort: {
    name: 'DB_PORT',
    required: false,
    description: 'PostgreSQL database port',
    minValue: 1024,
    maxValue: 65535,
    defaultValue: 5432,
  } as EnvVarConfig,

  dbPassword: {
    name: 'DB_PASSWORD',
    required: true,
    description: 'PostgreSQL database password',
    sensitive: true,
  } as EnvVarConfig,

  redisHost: {
    name: 'REDIS_HOST',
    required: false,
    description: 'Redis server host',
    defaultValue: 'localhost',
  } as EnvVarConfig,

  redisPort: {
    name: 'REDIS_PORT',
    required: false,
    description: 'Redis server port',
    minValue: 1024,
    maxValue: 65535,
    defaultValue: 6379,
  } as EnvVarConfig,

  azureStorageAccount: {
    name: 'AZURE_STORAGE_ACCOUNT_NAME',
    required: true,
    description: 'Azure Storage account name for media uploads',
  } as EnvVarConfig,

  azureStorageKey: {
    name: 'AZURE_STORAGE_ACCOUNT_KEY',
    required: true,
    description: 'Azure Storage account key',
    sensitive: true,
  } as EnvVarConfig,

  cosmosEndpoint: {
    name: 'COSMOS_ENDPOINT',
    required: true,
    description: 'Azure Cosmos DB endpoint URL',
    validate: (value: string) => value.startsWith('https://'),
  } as EnvVarConfig,

  cosmosKey: {
    name: 'COSMOS_KEY',
    required: true,
    description: 'Azure Cosmos DB access key',
    sensitive: true,
  } as EnvVarConfig,
};

export default { createValidator, commonValidations, EnvironmentValidator };
