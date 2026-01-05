import crypto from 'crypto';
import { promisify } from 'util';

import { createLogger } from '../../utils/logger';

const randomBytes = promisify(crypto.randomBytes);
const pbkdf2 = promisify(crypto.pbkdf2);
const logger = createLogger('domain-encryption-service');

/**
 * Domain-level encryption service for message handling
 * Implements Signal Protocol-like E2E encryption for the messaging domain
 */
export class DomainEncryptionService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 12;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly SALT_LENGTH = 32;
  private readonly KEY_LENGTH = 32;
  private readonly ITERATIONS = 100000;

  /**
   * Generate a new identity key pair (long-term)
   */
  async generateIdentityKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      return { publicKey, privateKey };
    } catch (error: any) {
      logger.error('Failed to generate identity key pair:', error);
      throw new Error('Failed to generate identity key pair');
    }
  }

  /**
   * Generate a new signed pre-key
   */
  async generateSignedPreKey(identityPrivateKey?: string): Promise<{
    keyId: number;
    publicKey: string;
    privateKey: string;
    signature: string;
    timestamp: Date;
  }> {
    try {
      const keyId = Math.floor(Math.random() * 16777215); // 24-bit random ID
      const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      // Sign with identity key if provided, otherwise use hash
      let signature: string;
      if (identityPrivateKey) {
        const sign = crypto.createSign('SHA256');
        sign.update(publicKey);
        sign.end();
        const privateKeyObj = crypto.createPrivateKey(identityPrivateKey);
        signature = sign.sign(privateKeyObj, 'base64');
      } else {
        signature = crypto.createHash('sha256').update(publicKey).digest('base64');
      }

      return {
        keyId,
        publicKey,
        privateKey,
        signature,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to generate signed pre-key:', error);
      throw new Error('Failed to generate signed pre-key');
    }
  }

  /**
   * Generate one-time pre-keys
   */
  async generateOneTimePreKeys(count: number = 100): Promise<
    Array<{
      keyId: number;
      publicKey: string;
      privateKey: string;
    }>
  > {
    try {
      const keys = [];

      for (let i = 0; i < count; i++) {
        const keyId = Math.floor(Math.random() * 16777215);
        const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });

        keys.push({ keyId, publicKey, privateKey });
      }

      return keys;
    } catch (error: any) {
      logger.error('Failed to generate one-time pre-keys:', error);
      throw new Error('Failed to generate one-time pre-keys');
    }
  }

  /**
   * Perform Diffie-Hellman key exchange
   */
  async performDH(privateKey: string, publicKey: string): Promise<Buffer> {
    try {
      const privateKeyObj = crypto.createPrivateKey(privateKey);
      const publicKeyObj = crypto.createPublicKey(publicKey);

      return crypto.diffieHellman({
        privateKey: privateKeyObj,
        publicKey: publicKeyObj,
      });
    } catch (error: any) {
      logger.error('Failed to perform DH:', error);
      throw new Error('Failed to perform Diffie-Hellman key exchange');
    }
  }

  /**
   * Derive a root key from multiple DH outputs (X3DH)
   */
  async deriveRootKey(dhOutputs: Buffer[]): Promise<Buffer> {
    try {
      const concatenated = Buffer.concat(dhOutputs);
      const salt = await randomBytes(this.SALT_LENGTH);

      return pbkdf2(concatenated, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');
    } catch (error: any) {
      logger.error('Failed to derive root key:', error);
      throw new Error('Failed to derive root key');
    }
  }

  /**
   * Derive chain and message keys from root key (Double Ratchet)
   */
  async deriveKeys(
    rootKey: Buffer,
    dhOutput: Buffer
  ): Promise<{
    newRootKey: Buffer;
    chainKey: Buffer;
  }> {
    try {
      const info = Buffer.from('WhisperText');
      const salt = rootKey;

      // HKDF
      const prk = crypto.createHmac('sha256', salt).update(dhOutput).digest();

      const okm1 = crypto
        .createHmac('sha256', prk)
        .update(Buffer.concat([info, Buffer.from([0x01])]))
        .digest();

      const okm2 = crypto
        .createHmac('sha256', prk)
        .update(Buffer.concat([okm1, info, Buffer.from([0x02])]))
        .digest();

      return {
        newRootKey: okm1,
        chainKey: okm2,
      };
    } catch (error: any) {
      logger.error('Failed to derive keys:', error);
      throw new Error('Failed to derive keys');
    }
  }

  /**
   * Derive message key from chain key
   */
  async deriveMessageKey(chainKey: Buffer): Promise<{
    messageKey: Buffer;
    newChainKey: Buffer;
  }> {
    try {
      const messageKey = crypto
        .createHmac('sha256', chainKey)
        .update(Buffer.from([0x01]))
        .digest();

      const newChainKey = crypto
        .createHmac('sha256', chainKey)
        .update(Buffer.from([0x02]))
        .digest();

      return { messageKey, newChainKey };
    } catch (error: any) {
      logger.error('Failed to derive message key:', error);
      throw new Error('Failed to derive message key');
    }
  }

  /**
   * Encrypt a message with derived message key
   */
  async encryptMessage(
    plaintext: string,
    messageKey: Buffer
  ): Promise<{
    ciphertext: string;
    iv: string;
    authTag: string;
  }> {
    try {
      const iv = await randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, messageKey, iv);

      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      const authTag = cipher.getAuthTag();

      return {
        ciphertext,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
      };
    } catch (error: any) {
      logger.error('Failed to encrypt message:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message with message key
   */
  async decryptMessage(
    ciphertext: string,
    messageKey: Buffer,
    iv: string,
    authTag: string
  ): Promise<string> {
    try {
      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        messageKey,
        Buffer.from(iv, 'base64')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'base64'));

      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error: any) {
      logger.error('Failed to decrypt message:', error);
      throw new Error('Failed to decrypt message. Message may be corrupted or tampered with.');
    }
  }

  /**
   * Encrypt message for storage (using session key)
   */
  async encryptForStorage(
    plaintext: string,
    sessionKey: Buffer
  ): Promise<{
    ciphertext: string;
    iv: string;
    authTag: string;
  }> {
    return this.encryptMessage(plaintext, sessionKey);
  }

  /**
   * Decrypt message from storage
   */
  async decryptFromStorage(
    ciphertext: string,
    sessionKey: Buffer,
    iv: string,
    authTag: string
  ): Promise<string> {
    return this.decryptMessage(ciphertext, sessionKey, iv, authTag);
  }

  /**
   * Generate session key for conversation
   */
  async generateSessionKey(): Promise<Buffer> {
    try {
      return randomBytes(this.KEY_LENGTH);
    } catch (error: any) {
      logger.error('Failed to generate session key:', error);
      throw new Error('Failed to generate session key');
    }
  }

  /**
   * Verify message authentication using public key
   */
  async verifyMessageAuthentication(
    message: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(message);
      verify.end();

      const publicKeyObj = crypto.createPublicKey(publicKey);
      return verify.verify(publicKeyObj, signature, 'base64');
    } catch (error: any) {
      logger.error('Failed to verify message authentication:', error);
      return false;
    }
  }

  /**
   * Generate message authentication signature
   */
  async signMessage(message: string, privateKey: string): Promise<string> {
    try {
      const sign = crypto.createSign('SHA256');
      sign.update(message);
      sign.end();

      const privateKeyObj = crypto.createPrivateKey(privateKey);
      return sign.sign(privateKeyObj, 'base64');
    } catch (error: any) {
      logger.error('Failed to sign message:', error);
      throw new Error('Failed to sign message');
    }
  }

  /**
   * Securely delete key from memory
   */
  secureDeleteKey(key: Buffer): void {
    try {
      crypto.randomFillSync(key);
    } catch (error: any) {
      logger.error('Failed to securely delete key:', error);
    }
  }

  /**
   * Validate encryption metadata
   */
  validateEncryptionMetadata(metadata: { iv: string; authTag: string }): boolean {
    try {
      // Validate IV length
      const iv = Buffer.from(metadata.iv, 'base64');
      if (iv.length !== this.IV_LENGTH) {
        return false;
      }

      // Validate auth tag length
      const authTag = Buffer.from(metadata.authTag, 'base64');
      if (authTag.length !== this.AUTH_TAG_LENGTH) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

export const domainEncryptionService = new DomainEncryptionService();
export default domainEncryptionService;
