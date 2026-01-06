import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Server-owned fields that cannot be modified by clients.
 * Used by the RejectServerOwnedFields decorator.
 */
const SERVER_OWNED_FIELD_NAMES = [
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'role',
  'isAdmin',
  'isModerator',
  'isOperator',
  'subscriptionTier',
  'credits',
  'isVerified',
  'tenantId',
  'ownerId',
  'status',
  'approved',
];

/**
 * Decorator that validates that a nested object does not contain
 * server-owned fields that clients are not allowed to modify.
 *
 * Usage:
 * ```typescript
 * class UpdateRequestDto {
 *   @RejectServerOwnedFields()
 *   data: Record<string, any>;
 * }
 * ```
 */
export function RejectServerOwnedFields(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'rejectServerOwnedFields',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'object' || value === null) return true;
          return !SERVER_OWNED_FIELD_NAMES.some((field) => field in value);
        },
        defaultMessage() {
          return 'Request contains server-owned fields that cannot be modified';
        },
      },
    });
  };
}

/**
 * Decorator that validates a password meets complexity requirements.
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 *
 * Usage:
 * ```typescript
 * class ChangePasswordDto {
 *   @IsStrongPassword()
 *   newPassword: string;
 * }
 * ```
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          if (value.length < 8) return false;
          if (!/[a-z]/.test(value)) return false;
          if (!/[A-Z]/.test(value)) return false;
          if (!/\d/.test(value)) return false;
          return true;
        },
        defaultMessage() {
          return 'Password must be at least 8 characters and contain uppercase, lowercase, and number';
        },
      },
    });
  };
}
