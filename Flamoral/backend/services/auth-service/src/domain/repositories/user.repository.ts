import { v4 as uuidv4 } from 'uuid';
import pool from '../../infrastructure/database/pool';
import logger from '../../utils/logger';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  gender: string;
  phone_number?: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDto {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  gender: string;
  phone_number?: string;
}

export class UserRepository {
  /**
   * Create a new user
   */
  async create(userData: CreateUserDto): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO users (
        id, email, password_hash, first_name, last_name,
        date_of_birth, gender, phone_number, is_email_verified,
        is_phone_verified, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      id,
      userData.email.toLowerCase(),
      userData.password_hash,
      userData.first_name,
      userData.last_name,
      userData.date_of_birth,
      userData.gender,
      userData.phone_number || null,
      false, // is_email_verified
      false, // is_phone_verified
      true,  // is_active
      now,
      now,
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`User created: ${id}`);
      return this.mapUser(result.rows[0]);
    } catch (error: any) {
      logger.error('Failed to create user', error);
      if (error.code === '23505') {
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  /**
   * Map database row to User interface
   */
  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      first_name: row.first_name,
      last_name: row.last_name,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      phone_number: row.phone_number,
      is_email_verified: row.is_email_verified,
      is_phone_verified: row.is_phone_verified,
      is_active: row.is_active,
      last_login_at: row.last_login_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] ? this.mapUser(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to find user by id: ${id}`, error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';

    try {
      const result = await pool.query(query, [email.toLowerCase()]);
      return result.rows[0] ? this.mapUser(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to find user by email: ${email}`, error);
      throw error;
    }
  }

  /**
   * Update user's password
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = $2
      WHERE id = $3
    `;

    try {
      await pool.query(query, [passwordHash, new Date(), userId]);
      logger.info(`Password updated for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to update password for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Mark email as verified
   */
  async verifyEmail(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET is_email_verified = true, updated_at = $1
      WHERE id = $2
    `;

    try {
      await pool.query(query, [new Date(), userId]);
      logger.info(`Email verified for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to verify email for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Mark phone as verified
   */
  async verifyPhone(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET is_phone_verified = true, updated_at = $1
      WHERE id = $2
    `;

    try {
      await pool.query(query, [new Date(), userId]);
      logger.info(`Phone verified for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to verify phone for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_login_at = $1, updated_at = $1
      WHERE id = $2
    `;

    try {
      await pool.query(query, [new Date(), userId]);
    } catch (error) {
      logger.error(`Failed to update last login for user: ${userId}`, error);
      // Don't throw - not critical
    }
  }

  /**
   * Deactivate user account
   */
  async deactivate(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET is_active = false, updated_at = $1
      WHERE id = $2
    `;

    try {
      await pool.query(query, [new Date(), userId]);
      logger.info(`User deactivated: ${userId}`);
    } catch (error) {
      logger.error(`Failed to deactivate user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Reactivate user account
   */
  async reactivate(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET is_active = true, updated_at = $1
      WHERE id = $2
    `;

    try {
      await pool.query(query, [new Date(), userId]);
      logger.info(`User reactivated: ${userId}`);
    } catch (error) {
      logger.error(`Failed to reactivate user: ${userId}`, error);
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
export default userRepository;
