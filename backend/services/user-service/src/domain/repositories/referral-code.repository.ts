import {
  ReferralCode,
  ReferralCodeCreateInput,
  ReferralCodeUpdateInput,
} from '../entities/ReferralCode.entity';
import db from '../../infrastructure/database/connection';

export class ReferralCodeRepository {
  private tableName = 'referral_codes';

  async create(input: ReferralCodeCreateInput): Promise<ReferralCode> {
    const now = new Date();
    const codeData = {
      user_id: input.userId,
      code: input.code,
      max_uses: input.maxUses || 10,
      current_uses: 0,
      expires_at: input.expiresAt || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const [referralCode] = await db(this.tableName)
      .insert(codeData)
      .returning('*');

    return this.mapToEntity(referralCode);
  }

  async findById(id: string): Promise<ReferralCode | null> {
    const referralCode = await db(this.tableName)
      .where({ id })
      .first();

    return referralCode ? this.mapToEntity(referralCode) : null;
  }

  async findByCode(code: string): Promise<ReferralCode | null> {
    const referralCode = await db(this.tableName)
      .where({ code: code.toUpperCase() })
      .first();

    return referralCode ? this.mapToEntity(referralCode) : null;
  }

  async findByUserId(userId: string): Promise<ReferralCode[]> {
    const referralCodes = await db(this.tableName)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    return referralCodes.map(this.mapToEntity);
  }

  async findActiveByUserId(userId: string): Promise<ReferralCode | null> {
    const referralCode = await db(this.tableName)
      .where({ user_id: userId, is_active: true })
      .where(function() {
        this.whereNull('expires_at')
          .orWhere('expires_at', '>', new Date());
      })
      .whereRaw('current_uses < max_uses')
      .orderBy('created_at', 'desc')
      .first();

    return referralCode ? this.mapToEntity(referralCode) : null;
  }

  async update(id: string, input: ReferralCodeUpdateInput): Promise<ReferralCode> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.maxUses !== undefined) updateData.max_uses = input.maxUses;
    if (input.currentUses !== undefined) updateData.current_uses = input.currentUses;
    if (input.expiresAt !== undefined) updateData.expires_at = input.expiresAt;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const [referralCode] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return this.mapToEntity(referralCode);
  }

  async incrementUses(id: string): Promise<ReferralCode> {
    const [referralCode] = await db(this.tableName)
      .where({ id })
      .update({
        current_uses: db.raw('current_uses + 1'),
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(referralCode);
  }

  async deactivate(id: string): Promise<ReferralCode> {
    return this.update(id, { isActive: false });
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .del();
  }

  async codeExists(code: string): Promise<boolean> {
    const result = await db(this.tableName)
      .where({ code: code.toUpperCase() })
      .first();
    return !!result;
  }

  async countByUserId(userId: string): Promise<number> {
    const result = await db(this.tableName)
      .where({ user_id: userId })
      .count('id as count')
      .first();
    return Number(result?.count || 0);
  }

  async findExpiredCodes(): Promise<ReferralCode[]> {
    const referralCodes = await db(this.tableName)
      .where('is_active', true)
      .where('expires_at', '<', new Date());

    return referralCodes.map(this.mapToEntity);
  }

  async deactivateExpiredCodes(): Promise<number> {
    const result = await db(this.tableName)
      .where('is_active', true)
      .where('expires_at', '<', new Date())
      .update({
        is_active: false,
        updated_at: new Date(),
      });

    return result;
  }

  private mapToEntity(row: any): ReferralCode {
    return {
      id: row.id,
      code: row.code,
      userId: row.user_id,
      maxUses: row.max_uses,
      currentUses: row.current_uses,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new ReferralCodeRepository();
