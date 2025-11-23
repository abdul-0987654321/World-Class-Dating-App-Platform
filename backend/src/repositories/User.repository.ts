import { Knex } from 'knex';
import { UserModel, UserCreateInput, UserUpdateInput, UserSettings, UserLocation } from '../models/User.model';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  async create(input: UserCreateInput, passwordHash: string): Promise<UserModel> {
    const userId = uuidv4();

    const [user] = await this.db('users')
      .insert({
        id: userId,
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: input.firstName,
        last_name: input.lastName,
        date_of_birth: new Date(input.dateOfBirth),
        gender: input.gender,
        phone: input.phone,
        role: 'user',
        subscription_tier: 'free',
        coin_balance: 0,
        is_active: true,
        is_banned: false,
        is_verified: false,
        email_verified: false,
        phone_verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Create default settings
    await this.createDefaultSettings(userId);

    return user;
  }

  async findById(id: string): Promise<UserModel | null> {
    const user = await this.db('users')
      .where({ id, deleted_at: null })
      .first();

    return user || null;
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    const user = await this.db('users')
      .where({ email: email.toLowerCase(), deleted_at: null })
      .first();

    return user || null;
  }

  async findByPhone(phone: string): Promise<UserModel | null> {
    const user = await this.db('users')
      .where({ phone, deleted_at: null })
      .first();

    return user || null;
  }

  async update(id: string, input: UserUpdateInput): Promise<UserModel> {
    const [user] = await this.db('users')
      .where({ id })
      .update({
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        updated_at: new Date(),
      })
      .returning('*');

    return user;
  }

  async updateLastActive(id: string): Promise<void> {
    await this.db('users')
      .where({ id })
      .update({
        last_active_at: new Date(),
      });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db('users')
      .where({ id })
      .update({
        last_login_at: new Date(),
        last_active_at: new Date(),
      });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.db('users')
      .where({ id })
      .update({
        email_verified: true,
        updated_at: new Date(),
      });
  }

  async verifyPhone(id: string): Promise<void> {
    await this.db('users')
      .where({ id })
      .update({
        phone_verified: true,
        updated_at: new Date(),
      });
  }

  async verifyPhoto(id: string): Promise<void> {
    await this.db('users')
      .where({ id })
      .update({
        is_verified: true,
        updated_at: new Date(),
      });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.db('users')
      .where({ id })
      .update({
        password_hash: passwordHash,
        updated_at: new Date(),
      });
  }

  async updateSubscription(id: string, tier: string, expiresAt?: Date): Promise<void> {
    await this.db('users')
      .where({ id })
      .update({
        subscription_tier: tier,
        subscription_expires_at: expiresAt,
        updated_at: new Date(),
      });
  }

  async updateCoinBalance(id: string, amount: number): Promise<number> {
    const [user] = await this.db('users')
      .where({ id })
      .increment('coin_balance', amount)
      .returning('coin_balance');

    return user.coin_balance;
  }

  async ban(id: string): Promise<void> {
    await this.db('users')
      .where({ id })
      .update({
        is_banned: true,
        is_active: false,
        updated_at: new Date(),
      });
  }

  async unban(id: string): Promise<void> {
    await this.db('users')
      .where({ id })
      .update({
        is_banned: false,
        is_active: true,
        updated_at: new Date(),
      });
  }

  async softDelete(id: string): Promise<void> {
    await this.db('users')
      .where({ id })
      .update({
        is_active: false,
        deleted_at: new Date(),
      });
  }

  async getSettings(userId: string): Promise<UserSettings | null> {
    const settings = await this.db('user_settings')
      .where({ user_id: userId })
      .first();

    return settings || null;
  }

  async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    const [updated] = await this.db('user_settings')
      .where({ user_id: userId })
      .update({
        ...settings,
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  private async createDefaultSettings(userId: string): Promise<void> {
    await this.db('user_settings').insert({
      user_id: userId,
      // Notifications - all enabled by default
      notifications_push: true,
      notifications_email: true,
      notifications_sms: false,
      notify_new_matches: true,
      notify_messages: true,
      notify_likes: true,
      notify_super_likes: true,
      // Privacy
      privacy_show_online: true,
      privacy_show_distance: true,
      privacy_show_age: true,
      privacy_incognito_mode: false,
      // Discovery - default ranges
      discovery_age_min: 18,
      discovery_age_max: 50,
      discovery_distance_max: 50, // km
      discovery_show_me: ['all'],
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  async updateLocation(userId: string, lat: number, lng: number, city?: string, state?: string, country?: string): Promise<void> {
    const existing = await this.db('user_locations')
      .where({ user_id: userId })
      .first();

    if (existing) {
      await this.db('user_locations')
        .where({ user_id: userId })
        .update({
          latitude: lat,
          longitude: lng,
          city,
          state,
          country,
          updated_at: new Date(),
        });
    } else {
      await this.db('user_locations').insert({
        user_id: userId,
        latitude: lat,
        longitude: lng,
        city,
        state,
        country,
        updated_at: new Date(),
      });
    }
  }

  async getLocation(userId: string): Promise<UserLocation | null> {
    const location = await this.db('user_locations')
      .where({ user_id: userId })
      .first();

    return location || null;
  }

  async search(filters: {
    query?: string;
    gender?: string;
    ageMin?: number;
    ageMax?: number;
    subscription?: string;
    isVerified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ users: UserModel[]; total: number }> {
    let query = this.db('users')
      .where({ deleted_at: null, is_banned: false });

    if (filters.query) {
      query = query.where((builder) => {
        builder
          .where('email', 'ilike', `%${filters.query}%`)
          .orWhere('first_name', 'ilike', `%${filters.query}%`)
          .orWhere('last_name', 'ilike', `%${filters.query}%`);
      });
    }

    if (filters.gender) {
      query = query.where({ gender: filters.gender });
    }

    if (filters.ageMin || filters.ageMax) {
      const today = new Date();
      if (filters.ageMax) {
        const minDob = new Date(today.getFullYear() - filters.ageMax, today.getMonth(), today.getDate());
        query = query.where('date_of_birth', '>=', minDob);
      }
      if (filters.ageMin) {
        const maxDob = new Date(today.getFullYear() - filters.ageMin, today.getMonth(), today.getDate());
        query = query.where('date_of_birth', '<=', maxDob);
      }
    }

    if (filters.subscription) {
      query = query.where({ subscription_tier: filters.subscription });
    }

    if (filters.isVerified !== undefined) {
      query = query.where({ is_verified: filters.isVerified });
    }

    const countQuery = query.clone().count('* as total');
    const [{ total }] = await countQuery;

    const users = await query
      .limit(filters.limit || 20)
      .offset(filters.offset || 0)
      .orderBy('created_at', 'desc');

    return {
      users,
      total: Number(total),
    };
  }
}
