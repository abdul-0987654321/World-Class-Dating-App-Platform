import db from '../../infrastructure/database/connection';
import { SocialAccountEntity, CreateSocialAccountDto, UpdateSocialAccountDto } from '../entities/SocialAccount.entity';

export class SocialAccountRepository {
  private tableName = 'social_accounts';

  async create(accountData: CreateSocialAccountDto): Promise<SocialAccountEntity> {
    const [account] = await db(this.tableName)
      .insert({
        user_id: accountData.user_id,
        provider: accountData.provider,
        provider_user_id: accountData.provider_user_id,
        provider_email: accountData.provider_email,
        provider_name: accountData.provider_name,
        provider_picture: accountData.provider_picture,
        access_token: accountData.access_token,
        refresh_token: accountData.refresh_token,
        token_expires_at: accountData.token_expires_at,
        profile_data: accountData.profile_data ? JSON.stringify(accountData.profile_data) : null,
        is_primary: accountData.is_primary || false,
      })
      .returning('*');

    return account;
  }

  async findById(id: string): Promise<SocialAccountEntity | null> {
    const account = await db(this.tableName).where({ id }).first();
    return account || null;
  }

  async findByUserId(userId: string): Promise<SocialAccountEntity[]> {
    const accounts = await db(this.tableName).where({ user_id: userId });
    return accounts;
  }

  async findByProvider(provider: string, providerUserId: string): Promise<SocialAccountEntity | null> {
    const account = await db(this.tableName)
      .where({ provider, provider_user_id: providerUserId })
      .first();
    return account || null;
  }

  async findByUserAndProvider(userId: string, provider: string): Promise<SocialAccountEntity | null> {
    const account = await db(this.tableName)
      .where({ user_id: userId, provider })
      .first();
    return account || null;
  }

  async update(id: string, accountData: UpdateSocialAccountDto): Promise<SocialAccountEntity | null> {
    const updateData: any = {
      ...accountData,
      updated_at: db.fn.now(),
    };

    if (accountData.profile_data) {
      updateData.profile_data = JSON.stringify(accountData.profile_data);
    }

    const [account] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return account || null;
  }

  async updateTokens(
    id: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date
  ): Promise<void> {
    const updateData: any = {
      access_token: accessToken,
      updated_at: db.fn.now(),
    };

    if (refreshToken) {
      updateData.refresh_token = refreshToken;
    }

    if (expiresAt) {
      updateData.token_expires_at = expiresAt;
    }

    await db(this.tableName).where({ id }).update(updateData);
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName).where({ id }).delete();
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db(this.tableName).where({ user_id: userId }).delete();
  }

  async setPrimary(id: string, userId: string): Promise<void> {
    // Start a transaction
    await db.transaction(async (trx) => {
      // Set all accounts for this user to non-primary
      await trx(this.tableName)
        .where({ user_id: userId })
        .update({ is_primary: false });

      // Set the specified account as primary
      await trx(this.tableName)
        .where({ id })
        .update({ is_primary: true });
    });
  }
}
