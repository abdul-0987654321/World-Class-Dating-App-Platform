"use strict";
/**
 * Environment Variable Validator
 *
 * Provides centralized validation of environment variables at service startup.
 * Ensures required variables are present and valid before the application runs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonValidations = exports.EnvironmentValidator = void 0;
exports.createValidator = createValidator;
/**
 * Environment Variable Validator Class
 */
class EnvironmentValidator {
    constructor(serviceName, config) {
        this.errors = [];
        this.warnings = [];
        this.serviceName = serviceName;
        this.config = config;
        this.isProduction = process.env.NODE_ENV === 'production';
    }
    /**
     * Validate all configured environment variables
     */
    validate() {
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
     * Validate and throw on errors
     */
    validateOrThrow() {
        const result = this.validate();
        if (result.warnings.length > 0) {
            console.warn(`\n[${this.serviceName}] Environment Warnings:`);
            result.warnings.forEach(w => console.warn(`  - ${w}`));
        }
        if (!result.valid) {
            const errorMessage = `\n[${this.serviceName}] Environment Validation Failed:\n` +
                result.errors.map(e => `  - ${e}`).join('\n') +
                '\n\nPlease set the required environment variables and restart the service.';
            throw new Error(errorMessage);
        }
        console.log(`[${this.serviceName}] Environment validation passed`);
    }
    /**
     * Validate a single environment variable
     */
    validateVariable(varConfig) {
        const value = process.env[varConfig.name];
        const isRequired = varConfig.required;
        // Check if required variable is missing
        if (!value) {
            if (isRequired && varConfig.defaultValue === undefined) {
                this.errors.push(`${varConfig.name} is required. ${varConfig.description}`);
            }
            else if (varConfig.required && !this.isProduction) {
                this.warnings.push(`${varConfig.name} is not set (using default). ${varConfig.description}`);
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
            this.errors.push(`${varConfig.name} must be at least ${varConfig.minLength} characters (got ${value.length})`);
        }
        // Enum validation
        if (varConfig.enum && !varConfig.enum.includes(value)) {
            this.errors.push(`${varConfig.name} must be one of: ${varConfig.enum.join(', ')} (got "${value}")`);
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
            }
            else {
                if (varConfig.minValue !== undefined && numValue < varConfig.minValue) {
                    this.errors.push(`${varConfig.name} must be at least ${varConfig.minValue} (got ${numValue})`);
                }
                if (varConfig.maxValue !== undefined && numValue > varConfig.maxValue) {
                    this.errors.push(`${varConfig.name} must be at most ${varConfig.maxValue} (got ${numValue})`);
                }
            }
        }
    }
    /**
     * Get summary of configured variables
     */
    getSummary() {
        const lines = [`\n[${this.serviceName}] Environment Configuration:`];
        for (const varConfig of this.config) {
            const value = process.env[varConfig.name];
            const status = value ? 'SET' : 'NOT SET';
            const displayValue = varConfig.sensitive && value ? '****' : (value || varConfig.defaultValue || 'N/A');
            const required = varConfig.required ? 'required' : 'optional';
            lines.push(`  ${varConfig.name}: ${status} [${required}] = ${displayValue}`);
        }
        return lines.join('\n');
    }
}
exports.EnvironmentValidator = EnvironmentValidator;
/**
 * Create a validator for a service
 */
function createValidator(serviceName, config) {
    return new EnvironmentValidator(serviceName, config);
}
/**
 * Common validation configurations that can be reused across services
 */
exports.commonValidations = {
    nodeEnv: {
        name: 'NODE_ENV',
        required: false,
        description: 'Application environment',
        enum: ['development', 'staging', 'production', 'test'],
        defaultValue: 'development',
    },
    port: (defaultPort) => ({
        name: 'PORT',
        required: false,
        description: 'Service port number',
        minValue: 1024,
        maxValue: 65535,
        defaultValue: defaultPort,
    }),
    jwtAccessSecret: {
        name: 'JWT_ACCESS_SECRET',
        required: true,
        description: 'JWT access token signing secret (minimum 32 characters for security)',
        minLength: 32,
        sensitive: true,
    },
    jwtRefreshSecret: {
        name: 'JWT_REFRESH_SECRET',
        required: true,
        description: 'JWT refresh token signing secret (minimum 32 characters for security)',
        minLength: 32,
        sensitive: true,
    },
    dbHost: {
        name: 'DB_HOST',
        required: true,
        description: 'PostgreSQL database host',
    },
    dbPort: {
        name: 'DB_PORT',
        required: false,
        description: 'PostgreSQL database port',
        minValue: 1024,
        maxValue: 65535,
        defaultValue: 5432,
    },
    dbPassword: {
        name: 'DB_PASSWORD',
        required: true,
        description: 'PostgreSQL database password',
        sensitive: true,
    },
    redisHost: {
        name: 'REDIS_HOST',
        required: false,
        description: 'Redis server host',
        defaultValue: 'localhost',
    },
    redisPort: {
        name: 'REDIS_PORT',
        required: false,
        description: 'Redis server port',
        minValue: 1024,
        maxValue: 65535,
        defaultValue: 6379,
    },
    azureStorageAccount: {
        name: 'AZURE_STORAGE_ACCOUNT_NAME',
        required: true,
        description: 'Azure Storage account name for media uploads',
    },
    azureStorageKey: {
        name: 'AZURE_STORAGE_ACCOUNT_KEY',
        required: true,
        description: 'Azure Storage account key',
        sensitive: true,
    },
    cosmosEndpoint: {
        name: 'COSMOS_ENDPOINT',
        required: true,
        description: 'Azure Cosmos DB endpoint URL',
        validate: (value) => value.startsWith('https://'),
    },
    cosmosKey: {
        name: 'COSMOS_KEY',
        required: true,
        description: 'Azure Cosmos DB access key',
        sensitive: true,
    },
};
exports.default = { createValidator, commonValidations: exports.commonValidations, EnvironmentValidator };
//# sourceMappingURL=env-validator.js.map