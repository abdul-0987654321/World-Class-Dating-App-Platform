/**
 * Speed Dating Service
 * Handles all speed dating event-related API calls
 */

import { apiClient } from './api.client';

// Types
export interface SpeedDatingEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  currentParticipants: number;
  roundDuration: number; // in minutes
  breakDuration: number; // in minutes
  totalRounds: number;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  entryFee: {
    coins?: number;
    gems?: number;
    free?: boolean;
  };
  isRegistered: boolean;
  requirements?: {
    minAge?: number;
    maxAge?: number;
    gender?: string;
    verified?: boolean;
    premium?: boolean;
  };
  host?: {
    id: string;
    name: string;
    photoUrl: string;
  };
  theme?: string;
  coverImage?: string;
}

export interface SpeedDatingRound {
  id: string;
  eventId: string;
  roundNumber: number;
  partner: {
    id: string;
    name: string;
    age: number;
    photoUrl: string;
    bio: string;
    interests: string[];
  };
  startTime: string;
  endTime: string;
  status: 'waiting' | 'active' | 'completed';
  icebreakers?: string[];
}

export interface SpeedDatingMatch {
  id: string;
  eventId: string;
  matchedUser: {
    id: string;
    name: string;
    age: number;
    photoUrl: string;
    bio: string;
  };
  mutual: boolean;
  createdAt: string;
  conversationId?: string;
}

export interface SpeedDatingInterest {
  roundId: string;
  partnerId: string;
  interested: boolean;
}

export interface SpeedDatingStats {
  totalEvents: number;
  totalRounds: number;
  totalMatches: number;
  mutualMatches: number;
  averageRating: number;
}

// Service
class SpeedDatingService {
  private baseUrl = '/api/speed-dating';

  // Events
  async getUpcomingEvents(): Promise<SpeedDatingEvent[]> {
    const response = await apiClient.get<{ data: { events: SpeedDatingEvent[] } }>(`${this.baseUrl}/events`);
    return response.data.events;
  }

  async getEvent(eventId: string): Promise<SpeedDatingEvent> {
    const response = await apiClient.get<{ data: SpeedDatingEvent }>(`${this.baseUrl}/events/${eventId}`);
    return response.data;
  }

  async getRegisteredEvents(): Promise<SpeedDatingEvent[]> {
    const response = await apiClient.get<{ data: { events: SpeedDatingEvent[] } }>(`${this.baseUrl}/my-events`);
    return response.data.events;
  }

  async registerForEvent(eventId: string): Promise<{ success: boolean; position: number }> {
    const response = await apiClient.post<{ data: { success: boolean; position: number } }>(
      `${this.baseUrl}/events/${eventId}/register`
    );
    return response.data;
  }

  async unregisterFromEvent(eventId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ data: { success: boolean } }>(
      `${this.baseUrl}/events/${eventId}/register`
    );
    return response.data;
  }

  // Live Event
  async checkIn(eventId: string): Promise<{ success: boolean; waitingRoom: boolean }> {
    const response = await apiClient.post<{ data: { success: boolean; waitingRoom: boolean } }>(
      `${this.baseUrl}/events/${eventId}/check-in`
    );
    return response.data;
  }

  async getCurrentRound(eventId: string): Promise<SpeedDatingRound | null> {
    const response = await apiClient.get<{ data: SpeedDatingRound | null }>(
      `${this.baseUrl}/events/${eventId}/current-round`
    );
    return response.data;
  }

  async getRoundHistory(eventId: string): Promise<SpeedDatingRound[]> {
    const response = await apiClient.get<{ data: { rounds: SpeedDatingRound[] } }>(
      `${this.baseUrl}/events/${eventId}/rounds`
    );
    return response.data.rounds;
  }

  async getIcebreakers(): Promise<string[]> {
    const response = await apiClient.get<{ data: { icebreakers: string[] } }>(`${this.baseUrl}/icebreakers`);
    return response.data.icebreakers;
  }

  // Matching
  async submitInterest(eventId: string, roundId: string, partnerId: string, interested: boolean): Promise<{ success: boolean; mutual?: boolean }> {
    const response = await apiClient.post<{ data: { success: boolean; mutual?: boolean } }>(
      `${this.baseUrl}/events/${eventId}/rounds/${roundId}/interest`,
      { partnerId, interested }
    );
    return response.data;
  }

  async getEventMatches(eventId: string): Promise<SpeedDatingMatch[]> {
    const response = await apiClient.get<{ data: { matches: SpeedDatingMatch[] } }>(
      `${this.baseUrl}/events/${eventId}/matches`
    );
    return response.data.matches;
  }

  async getAllMatches(): Promise<SpeedDatingMatch[]> {
    const response = await apiClient.get<{ data: { matches: SpeedDatingMatch[] } }>(`${this.baseUrl}/matches`);
    return response.data.matches;
  }

  // Stats
  async getStats(): Promise<SpeedDatingStats> {
    const response = await apiClient.get<{ data: SpeedDatingStats }>(`${this.baseUrl}/stats`);
    return response.data;
  }

  // Video Call (within speed dating)
  async getVideoToken(eventId: string, roundId: string): Promise<{ token: string; roomId: string }> {
    const response = await apiClient.get<{ data: { token: string; roomId: string } }>(
      `${this.baseUrl}/events/${eventId}/rounds/${roundId}/video-token`
    );
    return response.data;
  }

  // Rate partner after round
  async ratePartner(eventId: string, roundId: string, partnerId: string, rating: number, feedback?: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ data: { success: boolean } }>(
      `${this.baseUrl}/events/${eventId}/rounds/${roundId}/rate`,
      { partnerId, rating, feedback }
    );
    return response.data;
  }

  // Report inappropriate behavior
  async reportPartner(eventId: string, roundId: string, partnerId: string, reason: string, details?: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ data: { success: boolean } }>(
      `${this.baseUrl}/events/${eventId}/report`,
      { roundId, partnerId, reason, details }
    );
    return response.data;
  }
}

export const speedDatingService = new SpeedDatingService();
