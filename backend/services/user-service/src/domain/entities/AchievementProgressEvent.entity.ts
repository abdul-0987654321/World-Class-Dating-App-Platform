/**
 * Achievement Progress Event Entity
 * Logs events that contribute to achievement progress
 */

export interface AchievementProgressEvent {
  id: string;
  userId: string;

  eventType: string;
  eventValue: number;
  metadata?: Record<string, any>;

  createdAt: Date;
}

export interface CreateAchievementProgressEventDTO {
  userId: string;
  eventType: string;
  eventValue?: number;
  metadata?: Record<string, any>;
}
