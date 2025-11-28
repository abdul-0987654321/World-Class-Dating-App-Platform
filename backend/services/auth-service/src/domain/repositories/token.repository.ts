import { v4 as uuidv4 } from 'uuid';
import pool from '../../infrastructure/database/pool';
import logger from '../../utils/logger';

export interface VerificationToken {
  id: string;
  user_id: string;
  token: string;
  type: 'email_verification' | 'password_reset' | 'phone_verification';
  expires_at: Date;
  is_used: boolean;
  created_at: Date;
}

export class TokenRepository {
  /**
   * Create a new verification token
   */
  async create(
    userId: string,
    token: string,
    tokenType: VerificationToken['type'],
    expiresAt: Date
  ): Promise<VerificationToken> {
    const id = uuidv4();

    const query = `
      INSERT INTO verification_tokens (id, user_id, token, type, expires_at, is_used, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [id, userId, token, tokenType, expiresAt, false, new Date()];

    try {
      const result = await pool.query(query, values);
      logger.info(`Verification token created for user: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create verification token', error);
      throw error;
    }
  }

  /**
   * Find a valid token by token string and type
   */
  async findByToken(
    token: string,
    tokenType: VerificationToken['type']
  ): Promise<VerificationToken | null> {
    const query = `
      SELECT * FROM verification_tokens
      WHERE token = $1 AND type = $2 AND is_used = false AND expires_at > NOW()
    `;

    try {
      const result = await pool.query(query, [token, tokenType]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find verification token', error);
      throw error;
    }
  }

  /**
   * Mark token as used
   */
  async markAsUsed(tokenId: string): Promise<void> {
    const query = `
      UPDATE verification_tokens
      SET is_used = true
      WHERE id = $1
    `;

    try {
      await pool.query(query, [tokenId]);
      logger.info(`Token marked as used: ${tokenId}`);
    } catch (error) {
      logger.error('Failed to mark token as used', error);
      throw error;
    }
  }

  /**
   * Delete all tokens for a user by type
   */
  async deleteByUserId(
    userId: string,
    tokenType: VerificationToken['type']
  ): Promise<void> {
    const query = `
      DELETE FROM verification_tokens
      WHERE user_id = $1 AND type = $2
    `;

    try {
      await pool.query(query, [userId, tokenType]);
      logger.debug(`Deleted ${tokenType} tokens for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to delete tokens', error);
      throw error;
    }
  }

  /**
   * Delete expired tokens (cleanup job)
   */
  async deleteExpired(): Promise<number> {
    const query = `
      DELETE FROM verification_tokens
      WHERE expires_at < NOW()
      RETURNING id
    `;

    try {
      const result = await pool.query(query);
      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        logger.info(`Deleted ${deletedCount} expired tokens`);
      }
      return deletedCount;
    } catch (error) {
      logger.error('Failed to delete expired tokens', error);
      throw error;
    }
  }
}

export const tokenRepository = new TokenRepository();
export default tokenRepository;
