// Export all shared utilities and services
export { default as createLogger } from './utils/logger';
export type { Logger } from './utils/logger';
export { ServiceClient, ServiceRegistry, createServiceClients } from './services/service-client';
export type { ServiceClientConfig, ServiceResponse } from './services/service-client';

// Export DTOs and validation
export {
  // Common DTOs
  PaginationDto,
  IdParamDto,
  SERVER_OWNED_FIELDS,
  // User DTOs
  UpdateProfileDto,
  // Auth DTOs
  RegisterDto,
  LoginDto,
  // Validation
  globalValidationPipe,
  // Custom decorators
  RejectServerOwnedFields,
  IsStrongPassword,
} from './dto';
export type { ServerOwnedField } from './dto';
