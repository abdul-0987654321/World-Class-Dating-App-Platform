import { Router } from 'express';
import { encryptionKeysController } from '../controllers/encryption-keys.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Encryption Keys Management Routes
 * All routes require authentication
 */

// Generate new key bundle (convenience endpoint)
router.post(
  '/generate',
  authenticate,
  encryptionKeysController.generateKeys.bind(encryptionKeysController)
);

// Upload user's pre-keys bundle
router.post(
  '/upload',
  authenticate,
  encryptionKeysController.uploadKeys.bind(encryptionKeysController)
);

// Get user's public keys for initiating encrypted conversation
router.get(
  '/:userId',
  authenticate,
  encryptionKeysController.getUserKeys.bind(encryptionKeysController)
);

// Claim one-time pre-keys for establishing session
router.post(
  '/claim',
  authenticate,
  encryptionKeysController.claimPreKeys.bind(encryptionKeysController)
);

// Session key management
router.post(
  '/session',
  authenticate,
  encryptionKeysController.createSessionKey.bind(encryptionKeysController)
);

router.get(
  '/session/:conversationId',
  authenticate,
  encryptionKeysController.getSessionKey.bind(encryptionKeysController)
);

router.put(
  '/session/:conversationId',
  authenticate,
  encryptionKeysController.updateSessionKey.bind(encryptionKeysController)
);

router.delete(
  '/session/:conversationId',
  authenticate,
  encryptionKeysController.deleteSessionKey.bind(encryptionKeysController)
);

export default router;
