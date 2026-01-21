/**
 * Encryption Services Export
 * Central export point for all encryption-related services
 */

export { EncryptionService } from './EncryptionService';
export { SecureKeyStorage } from './SecureKeyStorage';

export type { KeyPair, SignedPreKey, OneTimePreKey, EncryptedMessage } from './EncryptionService';

import EncryptionService from './EncryptionService';
import SecureKeyStorage from './SecureKeyStorage';

export default {
  EncryptionService,
  SecureKeyStorage,
};
