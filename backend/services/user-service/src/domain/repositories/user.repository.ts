import db from '../../infrastructure/database/connection';
import { UserEntity, CreateUserDto, UpdateUserDto } from '../entities/User.entity';

export class UserRepository {
  private tableName = 'users';

  async create(userData: CreateUserDto & { password_hash: string }): Promise<UserEntity> {
    const [user] = await db(this.tableName)
      .insert({
        email: userData.email,
        password_hash: userData.password_hash,
        first_name: userData.first_name,
        last_name: userData.last_name,
        date_of_birth: userData.date_of_birth,
        gender: userData.gender,
        phone_number: userData.phone_number,
      })
      .returning('*');

    return user;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await db(this.tableName).where({ id }).first();
    return user || null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await db(this.tableName).where({ email }).first();
    return user || null;
  }

  async update(id: string, userData: UpdateUserDto): Promise<UserEntity | null> {
    const [user] = await db(this.tableName)
      .where({ id })
      .update({
        ...userData,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return user || null;
  }

  async updateLastLogin(id: string): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .update({
        last_login_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
  }

  async verifyEmail(id: string): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .update({
        is_email_verified: true,
        is_verified: true,
        updated_at: db.fn.now(),
      });
  }

  async updatePassword(id: string, password_hash: string): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .update({
        password_hash,
        updated_at: db.fn.now(),
      });
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName).where({ id }).delete();
  }

  async deactivate(id: string): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .update({
        is_active: false,
        updated_at: db.fn.now(),
      });
  }
}
