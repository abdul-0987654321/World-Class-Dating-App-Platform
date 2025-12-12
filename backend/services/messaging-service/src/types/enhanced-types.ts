/**
 * Enhanced Type definitions for Messaging Service Features
 */

import { Message, MessageType } from './index';

// Message Reactions
export interface MessageReaction {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface ReactionSummary {
  messageId: string;
  reactions: {
    emoji: string;
    count: number;
    users: string[];
  }[];
  totalReactions: number;
  userReaction?: string;
}

// Pinned Messages
export interface PinnedMessage {
  messageId: string;
  conversationId: string;
  pinnedBy: string;
  pinnedAt: Date;
  message?: Message;
}

// Message Search
export interface MessageSearchQuery {
  conversationId?: string;
  userId: string;
  query: string;
  type?: MessageType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface MessageSearchResult {
  message: Message;
  conversationId: string;
  matchScore: number;
  highlightedContent?: string;
}

// Chat Export
export interface ChatExportRequest {
  conversationId: string;
  userId: string;
  format: 'json' | 'txt' | 'pdf';
  startDate?: Date;
  endDate?: Date;
  includeMedia?: boolean;
}

export interface ChatExportResult {
  exportId: string;
  url: string;
  expiresAt: Date;
  format: string;
  fileSize: number;
}

// Icebreakers
export interface Icebreaker {
  id: string;
  category: string;
  text: string;
  popularity: number;
  tags: string[];
}

export interface IcebreakerSuggestion {
  icebreakers: Icebreaker[];
  personalized: boolean;
  basedOn?: string[]; // User interests/profile data used for personalization
}

// Voice Message
export interface VoiceMessageMetadata {
  duration: number;
  waveform: number[];
  url: string;
  fileSize: number;
  mimeType: string;
}

// Photo/Media Metadata
export interface PhotoMetadata {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}

// GIF Metadata
export interface GifMetadata {
  gifUrl: string;
  gifPreviewUrl: string;
  tenorId?: string;
  giphyId?: string;
  width: number;
  height: number;
}
