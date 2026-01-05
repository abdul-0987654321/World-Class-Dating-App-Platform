import { Pool } from 'pg';

import logger from '../../utils/logger';
import { UserMode } from '../entities/Profile.entity';
import {
  UserModeEntity,
  UpdateUserModeDto,
  UserModeResponse,
  UserModesListResponse,
} from '../entities/UserMode.entity';

export class ModeService {
  private db: Pool;

  constructor(db?: Pool) {
    // Use provided db or create a default connection
    // This will need to be properly initialized with the actual DB connection
    this.db = db || new Pool();
  }

  /**
   * Get all modes for a user
   */
  async getUserModes(userId: string): Promise<UserModesListResponse> {
    try {
      // Get user's current mode
      const userResult = await this.db.query('SELECT current_mode FROM users WHERE id = $1', [
        userId,
      ]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentMode = userResult.rows[0].current_mode as UserMode;

      // Get all mode configurations
      const modesResult = await this.db.query(
        'SELECT * FROM user_modes WHERE user_id = $1 ORDER BY mode',
        [userId]
      );

      const modes = modesResult.rows as UserModeEntity[];

      // Organize modes by type
      const dateMode = modes.find((m) => m.mode === 'date');
      const friendsMode = modes.find((m) => m.mode === 'friends');
      const networkMode = modes.find((m) => m.mode === 'network');

      return {
        date: this.mapToResponse(dateMode),
        friends: this.mapToResponse(friendsMode),
        network: this.mapToResponse(networkMode),
        current_mode: currentMode,
      };
    } catch (error: any) {
      logger.error('Get user modes error:', error);
      throw error;
    }
  }

  /**
   * Get a specific mode for a user
   */
  async getUserMode(userId: string, mode: UserMode): Promise<UserModeResponse> {
    try {
      const result = await this.db.query(
        'SELECT * FROM user_modes WHERE user_id = $1 AND mode = $2',
        [userId, mode]
      );

      if (result.rows.length === 0) {
        throw new Error(`Mode ${mode} not found for user`);
      }

      return this.mapToResponse(result.rows[0] as UserModeEntity);
    } catch (error: any) {
      logger.error('Get user mode error:', error);
      throw error;
    }
  }

  /**
   * Update a specific mode for a user
   */
  async updateUserMode(
    userId: string,
    mode: UserMode,
    updateData: UpdateUserModeDto
  ): Promise<UserModeResponse> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        values.push(updateData.enabled);
      }

      if (updateData.preferences !== undefined) {
        updates.push(`preferences = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.preferences));
      }

      if (updates.length === 0) {
        throw new Error('No update data provided');
      }

      values.push(userId, mode);

      const query = `
        UPDATE user_modes
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${paramIndex++} AND mode = $${paramIndex++}
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Mode ${mode} not found for user`);
      }

      return this.mapToResponse(result.rows[0] as UserModeEntity);
    } catch (error: any) {
      logger.error('Update user mode error:', error);
      throw error;
    }
  }

  /**
   * Switch user's current mode
   */
  async switchMode(
    userId: string,
    mode: UserMode
  ): Promise<{ success: boolean; current_mode: UserMode }> {
    try {
      // Check if the mode is enabled for the user
      const modeResult = await this.db.query(
        'SELECT enabled FROM user_modes WHERE user_id = $1 AND mode = $2',
        [userId, mode]
      );

      if (modeResult.rows.length === 0) {
        throw new Error(`Mode ${mode} not found for user`);
      }

      if (!modeResult.rows[0].enabled) {
        throw new Error(`Mode ${mode} is not enabled. Please enable it first.`);
      }

      // Update user's current mode
      await this.db.query('UPDATE users SET current_mode = $1 WHERE id = $2', [mode, userId]);

      logger.info('User switched mode', { userId, mode });

      return {
        success: true,
        current_mode: mode,
      };
    } catch (error: any) {
      logger.error('Switch mode error:', error);
      throw error;
    }
  }

  /**
   * Enable a mode for a user
   */
  async enableMode(userId: string, mode: UserMode): Promise<UserModeResponse> {
    try {
      return await this.updateUserMode(userId, mode, { enabled: true });
    } catch (error: any) {
      logger.error('Enable mode error:', error);
      throw error;
    }
  }

  /**
   * Disable a mode for a user
   */
  async disableMode(userId: string, mode: UserMode): Promise<UserModeResponse> {
    try {
      // Cannot disable date mode (primary mode)
      if (mode === 'date') {
        throw new Error('Cannot disable date mode - it is the primary mode');
      }

      // If this is the current mode, switch to date mode first
      const userResult = await this.db.query('SELECT current_mode FROM users WHERE id = $1', [
        userId,
      ]);

      if (userResult.rows[0].current_mode === mode) {
        await this.switchMode(userId, 'date');
      }

      return await this.updateUserMode(userId, mode, { enabled: false });
    } catch (error: any) {
      logger.error('Disable mode error:', error);
      throw error;
    }
  }

  /**
   * Update mode preferences
   */
  async updateModePreferences(
    userId: string,
    mode: UserMode,
    preferences: Record<string, any>
  ): Promise<UserModeResponse> {
    try {
      return await this.updateUserMode(userId, mode, { preferences });
    } catch (error: any) {
      logger.error('Update mode preferences error:', error);
      throw error;
    }
  }

  /**
   * Map entity to response
   */
  private mapToResponse(entity: UserModeEntity): UserModeResponse {
    return {
      id: entity.id,
      user_id: entity.user_id,
      mode: entity.mode,
      enabled: entity.enabled,
      preferences: entity.preferences,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }
}
