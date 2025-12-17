import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware to check validation results
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  next();
};

/**
 * Login validation
 */
export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
];

/**
 * Password reset request validation
 */
export const validatePasswordResetRequest = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  validate,
];

/**
 * Password reset validation
 */
export const validatePasswordReset = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
];

/**
 * Change password validation
 */
export const validateChangePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate,
];

/**
 * Create admin validation
 */
export const validateCreateAdmin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('role').isIn(['super_admin', 'admin', 'moderator', 'support', 'analyst']).withMessage('Valid role is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
];

/**
 * Update admin validation
 */
export const validateUpdateAdmin = [
  param('adminId').isUUID().withMessage('Valid admin ID is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('role').optional().isIn(['super_admin', 'admin', 'moderator', 'support', 'analyst']).withMessage('Valid role is required'),
  validate,
];

/**
 * User ID validation
 */
export const validateUserId = [
  param('userId').isUUID().withMessage('Valid user ID is required'),
  validate,
];

/**
 * Ban user validation
 */
export const validateBanUser = [
  param('userId').isUUID().withMessage('Valid user ID is required'),
  body('reason').trim().isLength({ min: 1 }).withMessage('Ban reason is required'),
  body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive number'),
  validate,
];

/**
 * Delete user validation
 */
export const validateDeleteUser = [
  param('userId').isUUID().withMessage('Valid user ID is required'),
  body('reason').trim().isLength({ min: 1 }).withMessage('Deletion reason is required'),
  validate,
];

/**
 * Pagination validation
 */
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate,
];

/**
 * A/B Test creation validation
 */
export const validateCreateABTest = [
  body('name').trim().isLength({ min: 1 }).withMessage('Test name is required'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('variants').isArray({ min: 2 }).withMessage('At least 2 variants are required'),
  body('variants.*.name').trim().isLength({ min: 1 }).withMessage('Variant name is required'),
  body('variants.*.description').trim().isLength({ min: 1 }).withMessage('Variant description is required'),
  body('variants.*.allocation').isFloat({ min: 0, max: 100 }).withMessage('Allocation must be between 0 and 100'),
  body('metrics.primaryMetric').trim().isLength({ min: 1 }).withMessage('Primary metric is required'),
  body('metrics.secondaryMetrics').isArray().withMessage('Secondary metrics must be an array'),
  validate,
];

/**
 * Support ticket creation validation
 */
export const validateCreateTicket = [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('subject').trim().isLength({ min: 1 }).withMessage('Subject is required'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('category').isIn(['technical', 'billing', 'account', 'abuse', 'other']).withMessage('Valid category is required'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required'),
  validate,
];

/**
 * Ticket message validation
 */
export const validateTicketMessage = [
  param('ticketId').isUUID().withMessage('Valid ticket ID is required'),
  body('content').trim().isLength({ min: 1 }).withMessage('Message content is required'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
  validate,
];

/**
 * Update ticket status validation
 */
export const validateUpdateTicketStatus = [
  param('ticketId').isUUID().withMessage('Valid ticket ID is required'),
  body('status').isIn(['open', 'in_progress', 'waiting_user', 'resolved', 'closed']).withMessage('Valid status is required'),
  validate,
];

/**
 * Update ticket priority validation
 */
export const validateUpdateTicketPriority = [
  param('ticketId').isUUID().withMessage('Valid ticket ID is required'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required'),
  validate,
];

/**
 * UUID parameter validation
 */
export const validateUUID = (paramName: string) => [
  param(paramName).isUUID().withMessage(`Valid ${paramName} is required`),
  validate,
];

/**
 * Date range validation
 */
export const validateDateRange = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  validate,
];
