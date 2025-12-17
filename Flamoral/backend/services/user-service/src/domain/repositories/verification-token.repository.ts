import db from '../../infrastructure/database/connection';

export interface VerificationToken {
  id: string;
  user_id: string;
  token: string;
  type: 'email_verification' | 'password_reset' | 'phone_verification';
  expires_at: Date;
  is_used: boolean;
  created_at: Date;
}

export class VerificationTokenRepository {
  private tableName = 'verification_tokens';

  async create(
    userId: string,
    token: string,
    type: 'email_verification' | 'password_reset' | 'phone_verification',
    expiresAt: Date
  ): Promise<VerificationToken> {
    const [verificationToken] = await db(this.tableName)
      .insert({
        user_id: userId,
        token,
        type,
        expires_at: expiresAt,
      })
      .returning('*');

    return verificationToken;
  }

  async findByToken(token: string, type: string): Promise<VerificationToken | null> {
    const verificationToken = await db(this.tableName)
      .where({ token, type, is_used: false })
      .andWhere('expires_at', '>', db.fn.now())
      .first();

    return verificationToken || null;
  }

  async markAsUsed(id: string): Promise<void> {
    await db(this.tableName).where({ id }).update({ is_used: true });
  }

  async deleteExpired(): Promise<void> {
    await db(this.tableName).where('expires_at', '<', db.fn.now()).delete();
  }

  async deleteByUserId(userId: string, type: string): Promise<void> {
    await db(this.tableName).where({ user_id: userId, type }).delete();
  }
}
