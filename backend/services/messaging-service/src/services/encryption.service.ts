import crypto from 'crypto';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);
const pbkdf2 = promisify(crypto.pbkdf2);

/**
 * End-to-End Message Encryption Service
 * Implements Signal Protocol-like encryption for messages
 */
export class EncryptionService {
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
    const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    return {
      publicKey,
      privateKey,
    };
  }

  /**
   * Generate a new signed pre-key
   */
  async generateSignedPreKey(): Promise<{
    keyId: number;
    publicKey: string;
    privateKey: string;
    signature: string;
    timestamp: Date;
  }> {
    const keyId = Math.floor(Math.random() * 16777215); // 24-bit random ID
    const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // In production, this should be signed with the identity key
    const signature = crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('base64');

    return {
      keyId,
      publicKey,
      privateKey,
      signature,
      timestamp: new Date(),
    };
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
  }

  /**
   * Perform Diffie-Hellman key exchange
   */
  async performDH(
    privateKey: string,
    publicKey: string
  ): Promise<Buffer> {
    const privateKeyObj = crypto.createPrivateKey(privateKey);
    const publicKeyObj = crypto.createPublicKey(publicKey);

    return crypto.diffieHellman({
      privateKey: privateKeyObj,
      publicKey: publicKeyObj,
    });
  }

  /**
   * Derive a root key from multiple DH outputs (X3DH)
   */
  async deriveRootKey(
    dhOutputs: Buffer[]
  ): Promise<Buffer> {
    const concatenated = Buffer.concat(dhOutputs);
    const salt = await randomBytes(this.SALT_LENGTH);

    return pbkdf2(
      concatenated,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Derive chain and message keys from root key
   */
  async deriveKeys(
    rootKey: Buffer,
    dhOutput: Buffer
  ): Promise<{
    newRootKey: Buffer;
    chainKey: Buffer;
  }> {
    const info = Buffer.from('WhisperText');
    const salt = rootKey;

    // HKDF
    const prk = crypto
      .createHmac('sha256', salt)
      .update(dhOutput)
      .digest();

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
  }

  /**
   * Derive message key from chain key
   */
  async deriveMessageKey(chainKey: Buffer): Promise<{
    messageKey: Buffer;
    newChainKey: Buffer;
  }> {
    const messageKey = crypto
      .createHmac('sha256', chainKey)
      .update(Buffer.from([0x01]))
      .digest();

    const newChainKey = crypto
      .createHmac('sha256', chainKey)
      .update(Buffer.from([0x02]))
      .digest();

    return { messageKey, newChainKey };
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
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      messageKey,
      Buffer.from(iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  /**
   * Encrypt message for storage (using conversation session key)
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
    return randomBytes(this.KEY_LENGTH);
  }

  /**
   * Rotate encryption key (create new key and re-encrypt)
   */
  async rotateKey(oldKey: Buffer): Promise<Buffer> {
    const newKey = await randomBytes(this.KEY_LENGTH);
    // In production, you would re-encrypt all messages here
    return newKey;
  }

  /**
   * Verify message authentication
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
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate message authentication signature
   */
  async signMessage(
    message: string,
    privateKey: string
  ): Promise<string> {
    const sign = crypto.createSign('SHA256');
    sign.update(message);
    sign.end();

    const privateKeyObj = crypto.createPrivateKey(privateKey);
    return sign.sign(privateKeyObj, 'base64');
  }

  /**
   * Secure key deletion (overwrite memory)
   */
  secureDeleteKey(key: Buffer): void {
    crypto.randomFillSync(key);
  }
}

export default new EncryptionService();
