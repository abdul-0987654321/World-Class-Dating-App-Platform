/**
 * Mode Service
 * Handles API calls for user mode management
 */

import axios from 'axios';
import { API_BASE_URL } from './config';

export type UserMode = 'date' | 'friends' | 'network';

export interface ModeConfig {
  id: string;
  user_id: string;
  mode: UserMode;
  enabled: boolean;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ModesState {
  date: ModeConfig;
  friends: ModeConfig;
  network: ModeConfig;
  current_mode: UserMode;
}

class ModeService {
  private getAuthHeaders() {
    // This should get the auth token from your app's auth state/storage
    const token = ''; // Replace with actual token retrieval
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Get all modes for the current user
   */
  async getUserModes(): Promise<ModesState> {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/me/modes`, this.getAuthHeaders());

      return response.data.data;
    } catch (error: any) {
      console.error('Get user modes error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get user modes');
    }
  }

  /**
   * Get a specific mode
   */
  async getUserMode(mode: UserMode): Promise<ModeConfig> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/users/me/modes/${mode}`,
        this.getAuthHeaders()
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Get user mode error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get user mode');
    }
  }

  /**
   * Switch to a different mode
   */
  async switchMode(mode: UserMode): Promise<{ success: boolean; current_mode: UserMode }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/users/me/modes/switch`,
        { mode },
        this.getAuthHeaders()
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Switch mode error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to switch mode');
    }
  }

  /**
   * Enable a mode
   */
  async enableMode(mode: UserMode): Promise<ModeConfig> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/users/me/modes/${mode}/enable`,
        {},
        this.getAuthHeaders()
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Enable mode error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to enable mode');
    }
  }

  /**
   * Disable a mode
   */
  async disableMode(mode: UserMode): Promise<ModeConfig> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/users/me/modes/${mode}/disable`,
        {},
        this.getAuthHeaders()
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Disable mode error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to disable mode');
    }
  }

  /**
   * Update mode preferences
   */
  async updateModePreferences(
    mode: UserMode,
    preferences: Record<string, any>
  ): Promise<ModeConfig> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/users/me/modes/${mode}/preferences`,
        preferences,
        this.getAuthHeaders()
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Update mode preferences error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update mode preferences');
    }
  }

  /**
   * Update mode (enabled status and/or preferences)
   */
  async updateUserMode(
    mode: UserMode,
    data: { enabled?: boolean; preferences?: Record<string, any> }
  ): Promise<ModeConfig> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/users/me/modes/${mode}`,
        data,
        this.getAuthHeaders()
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Update user mode error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update user mode');
    }
  }

  /**
   * Get discovery feed for current mode
   */
  async getDiscoveryFeed(mode?: UserMode, filters?: Record<string, any>): Promise<any[]> {
    try {
      const params: any = {};
      if (mode) params.mode = mode;
      if (filters) params.filters = JSON.stringify(filters);

      const response = await axios.get(`${API_BASE_URL}/discovery`, {
        ...this.getAuthHeaders(),
        params,
      });

      return response.data.data;
    } catch (error: any) {
      console.error('Get discovery feed error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get discovery feed');
    }
  }

  /**
   * Get matches for specific mode
   */
  async getMatchesByMode(mode?: UserMode): Promise<any[]> {
    try {
      const params: any = {};
      if (mode) params.mode = mode;

      const response = await axios.get(`${API_BASE_URL}/matches`, {
        ...this.getAuthHeaders(),
        params,
      });

      return response.data.data;
    } catch (error: any) {
      console.error('Get matches by mode error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get matches');
    }
  }

  /**
   * Swipe on a user in a specific mode
   */
  async swipe(
    targetUserId: string,
    action: 'like' | 'pass' | 'super_like',
    mode?: UserMode
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/swipes`,
        {
          targetUserId,
          action,
          mode,
        },
        this.getAuthHeaders()
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Swipe error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to swipe');
    }
  }
}

export const modeService = new ModeService();
export default modeService;
