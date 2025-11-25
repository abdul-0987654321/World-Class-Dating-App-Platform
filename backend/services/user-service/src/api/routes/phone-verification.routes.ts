import { Router } from 'express';
import phoneVerificationController from '../controllers/phone-verification.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();

/**
 * Phone Verification Routes
 * All routes require authentication
 */

/**
 * @route   POST /api/users/phone/send-code
 * @desc    Send verification code to phone number
 * @access  Private
 */
router.post(
  '/send-code',
  authenticateToken,
  [
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .isString()
      .withMessage('Phone number must be a string')
      .trim(),
  ],
  validateRequest,
  phoneVerificationController.sendVerificationCode.bind(phoneVerificationController)
);

/**
 * @route   POST /api/users/phone/verify-code
 * @desc    Verify the code entered by user
 * @access  Private
 */
router.post(
  '/verify-code',
  authenticateToken,
  [
    body('code')
      .notEmpty()
      .withMessage('Verification code is required')
      .isString()
      .withMessage('Code must be a string')
      .isLength({ min: 6, max: 6 })
      .withMessage('Code must be exactly 6 digits')
      .matches(/^\d+$/)
      .withMessage('Code must contain only digits'),
  ],
  validateRequest,
  phoneVerificationController.verifyCode.bind(phoneVerificationController)
);

/**
 * @route   POST /api/users/phone/resend-code
 * @desc    Resend verification code
 * @access  Private
 */
router.post(
  '/resend-code',
  authenticateToken,
  [
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .isString()
      .withMessage('Phone number must be a string')
      .trim(),
  ],
  validateRequest,
  phoneVerificationController.resendCode.bind(phoneVerificationController)
);

/**
 * @route   PUT /api/users/phone
 * @desc    Update user's phone number
 * @access  Private
 */
router.put(
  '/',
  authenticateToken,
  [
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .isString()
      .withMessage('Phone number must be a string')
      .trim(),
  ],
  validateRequest,
  phoneVerificationController.updatePhoneNumber.bind(phoneVerificationController)
);

/**
 * @route   GET /api/users/phone/status
 * @desc    Get phone verification status
 * @access  Private
 */
router.get(
  '/status',
  authenticateToken,
  phoneVerificationController.getVerificationStatus.bind(phoneVerificationController)
);

/**
 * @route   GET /api/users/phone/is-verified
 * @desc    Check if phone is verified
 * @access  Private
 */
router.get(
  '/is-verified',
  authenticateToken,
  phoneVerificationController.isPhoneVerified.bind(phoneVerificationController)
);

export default router;
