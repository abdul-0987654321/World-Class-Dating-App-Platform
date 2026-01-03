/**
 * Call History Service
 * Fetches and manages call history from the backend
 */

import { CallHistoryItem } from '../components/VideoCall/CallHistory';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export interface CallHistoryResponse {
  calls: CallHistoryItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CallHistoryFilters {
  page?: number;
  limit?: number;
  callType?: 'video' | 'audio' | 'all';
  status?: 'completed' | 'missed' | 'rejected' | 'failed' | 'all';
  startDate?: Date;
  endDate?: Date;
}

class CallHistoryService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/messaging/calls`;
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Fetch call history with optional filters
   */
  async getCallHistory(filters: CallHistoryFilters = {}): Promise<CallHistoryResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.callType && filters.callType !== 'all') params.append('callType', filters.callType);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters.endDate) params.append('endDate', filters.endDate.toISOString());

    try {
      const response = await fetch(`${this.baseUrl}/history?${params.toString()}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch call history: ${response.status}`);
      }

      const data = await response.json();

      // Transform dates from strings to Date objects
      const calls = data.calls.map((call: any) => ({
        ...call,
        timestamp: new Date(call.timestamp),
      }));

      return {
        calls,
        total: data.total,
        page: data.page,
        limit: data.limit,
        hasMore: data.hasMore,
      };
    } catch (error) {
      console.error('Error fetching call history:', error);
      throw error;
    }
  }

  /**
   * Get a single call by ID
   */
  async getCall(callId: string): Promise<CallHistoryItem | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${callId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch call: ${response.status}`);
      }

      const data = await response.json();
      return {
        ...data,
        timestamp: new Date(data.timestamp),
      };
    } catch (error) {
      console.error('Error fetching call:', error);
      throw error;
    }
  }

  /**
   * Delete a call from history
   */
  async deleteCall(callId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${callId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete call: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting call:', error);
      throw error;
    }
  }

  /**
   * Delete multiple calls from history
   */
  async deleteCalls(callIds: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/batch-delete`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ callIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete calls: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting calls:', error);
      throw error;
    }
  }

  /**
   * Clear all call history
   */
  async clearHistory(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/clear`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to clear call history: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error clearing call history:', error);
      throw error;
    }
  }

  /**
   * Get call statistics
   */
  async getCallStats(): Promise<{
    totalCalls: number;
    totalDuration: number;
    missedCalls: number;
    videoCallsCount: number;
    audioCallsCount: number;
    averageDuration: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch call stats: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching call stats:', error);
      throw error;
    }
  }

  /**
   * Mark missed calls as seen
   */
  async markMissedCallsSeen(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/mark-seen`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark calls as seen: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error marking calls as seen:', error);
      throw error;
    }
  }

  /**
   * Get count of unseen missed calls
   */
  async getUnseenMissedCallsCount(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/unseen-count`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch unseen count: ${response.status}`);
      }

      const data = await response.json();
      return data.count;
    } catch (error) {
      console.error('Error fetching unseen count:', error);
      return 0;
    }
  }

  /**
   * Record a new call (typically called by the call system)
   */
  async recordCall(call: Omit<CallHistoryItem, 'callId'>): Promise<CallHistoryItem> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...call,
          timestamp: call.timestamp.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to record call: ${response.status}`);
      }

      const data = await response.json();
      return {
        ...data,
        timestamp: new Date(data.timestamp),
      };
    } catch (error) {
      console.error('Error recording call:', error);
      throw error;
    }
  }

  /**
   * Update call status (e.g., when call ends)
   */
  async updateCallStatus(
    callId: string,
    status: CallHistoryItem['status'],
    duration?: number
  ): Promise<CallHistoryItem> {
    try {
      const response = await fetch(`${this.baseUrl}/${callId}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status, duration }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update call status: ${response.status}`);
      }

      const data = await response.json();
      return {
        ...data,
        timestamp: new Date(data.timestamp),
      };
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const callHistoryService = new CallHistoryService();

export default CallHistoryService;
