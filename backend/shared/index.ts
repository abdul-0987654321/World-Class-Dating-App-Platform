// Import reflect-metadata first for decorator support
import 'reflect-metadata';

// Types
export * from './types/user.types';
export * from './types/match.types';
export * from './types/message.types';

// Utils - Enhanced Logger with Observability
export {
  default as createLogger,
  createLogger as createObservableLogger,
  ErrorCategory,
  categorizeError,
  setLogContext,
  getLogContext,
  clearLogContext,
  sanitize,
} from './utils/logger';
export type {
  ObservableLogger,
  LogContext,
  StructuredLogEntry,
} from './utils/logger';

export * from './utils/validation';
export * from './utils/encryption';
export * from './utils/env-validator';

// Constants
export * from './constants/app.constants';

// Config
export * from './config/environment';

// Services
export * from './src/services/service-client';

// Errors - Single source of truth for error handling
export * from './errors';

// Middleware - Enhanced middleware components
export * from './middleware';

// DTOs and validation (re-exported from src/dto for convenience)
export {
  PaginationDto,
  IdParamDto,
  SERVER_OWNED_FIELDS,
  UpdateProfileDto,
  RegisterDto,
  LoginDto,
  globalValidationPipe,
  RejectServerOwnedFields,
  IsStrongPassword,
} from './src/dto';
export type { ServerOwnedField } from './src/dto';
