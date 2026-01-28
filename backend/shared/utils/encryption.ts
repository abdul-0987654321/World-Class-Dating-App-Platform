import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export const encrypt = (text: string, secretKey: string): string => {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(secretKey, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return salt.toString('hex') + iv.toString('hex') + tag.toString('hex') + encrypted;
};

export const decrypt = (encryptedText: string, secretKey: string): string => {
  const salt = Buffer.from(encryptedText.slice(0, SALT_LENGTH * 2), 'hex');
  const iv = Buffer.from(
    encryptedText.slice(SALT_LENGTH * 2, SALT_LENGTH * 2 + IV_LENGTH * 2),
    'hex'
  );
  const tag = Buffer.from(
    encryptedText.slice(
      SALT_LENGTH * 2 + IV_LENGTH * 2,
      SALT_LENGTH * 2 + IV_LENGTH * 2 + TAG_LENGTH * 2
    ),
    'hex'
  );
  const encrypted = encryptedText.slice(SALT_LENGTH * 2 + IV_LENGTH * 2 + TAG_LENGTH * 2);

  const key = crypto.pbkdf2Sync(secretKey, salt, ITERATIONS, KEY_LENGTH, 'sha512');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = require('bcryptjs');
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hashedPassword);
};

export const generateRandomToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};
