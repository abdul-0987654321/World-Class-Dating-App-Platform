/**
 * Stories Service
 * Handles stories creation, viewing, reactions, highlights, and analytics
 * Similar to Instagram Stories but optimized for dating app context
 */

import { logger } from '../../utils/logger';
import { notificationService } from './Notification.service';

// Types
export interface Story {
  id: string;
  userId: string;
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  location?: string;
  locationCoordinates?: { lat: number; lng: number };
  mentions: string[];
  hashtags: string[];
  musicTrackId?: string;
  musicTrackName?: string;
  stickers: StorySticker[];
  textOverlays: TextOverlay[];
  filters: StoryFilters;
  durationSeconds: number;
  isActive: boolean;
  isArchived: boolean;
  visibility: 'public' | 'matches_only' | 'close_friends';
  viewCount: number;
  reactionCount: number;
  replyCount: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StorySticker {
  id: string;
  type: 'emoji' | 'gif' | 'poll' | 'question' | 'location' | 'mention' | 'hashtag' | 'music';
  content: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  metadata?: Record<string, any>;
}

export interface TextOverlay {
  id: string;
  text: string;
  position: { x: number; y: number };
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  alignment: 'left' | 'center' | 'right';
  rotation: number;
  animation?: 'none' | 'fade' | 'slide' | 'typewriter';
}

export interface StoryFilters {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  filterName?: string;
  overlayColor?: string;
  overlayOpacity?: number;
}

export interface StoryView {
  id: string;
  storyId: string;
  viewerId: string;
  viewDurationSeconds: number;
  viewedCompletely: boolean;
  viewedAt: Date;
}

export interface StoryReaction {
  id: string;
  storyId: string;
  userId: string;
  reactionType: StoryReactionType;
  createdAt: Date;
}

export type StoryReactionType = 'fire' | 'heart' | 'laugh' | 'wow' | 'sad' | 'clap' | 'eyes' | 'hundred';

export interface StoryReply {
  id: string;
  storyId: string;
  senderId: string;
  recipientId: string;
  message: string;
  mediaUrl?: string;
  mediaType: 'text' | 'photo' | 'video' | 'voice';
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface Highlight {
  id: string;
  userId: string;
  title: string;
  coverImageUrl?: string;
  emoji?: string;
  storyCount: number;
  viewCount: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HighlightStory {
  highlightId: string;
  storyId: string;
  displayOrder: number;
  addedAt: Date;
}

export interface StoryTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  previewUrl: string;
  templateConfig: {
    background: string;
    font: string;
    textColor: string;
    overlay?: string;
    border?: string;
  };
  isPremium: boolean;
  coinCost: number;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
}

export interface StoryAnalytics {
  storyId: string;
  impressions: number;
  uniqueViewers: number;
  forwardTaps: number;
  backwardTaps: number;
  exits: number;
  profileVisits: number;
  replies: number;
  avgViewDuration: number;
  completionRate: number;
  viewerDemographics: {
    ageGroups: Record<string, number>;
    locations: Record<string, number>;
  };
  hourlyViews: Record<string, number>;
}

export interface CreateStoryInput {
  userId: string;
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  location?: string;
  locationCoordinates?: { lat: number; lng: number };
  mentions?: string[];
  hashtags?: string[];
  musicTrackId?: string;
  musicTrackName?: string;
  stickers?: StorySticker[];
  textOverlays?: TextOverlay[];
  filters?: StoryFilters;
  durationSeconds?: number;
  visibility?: 'public' | 'matches_only' | 'close_friends';
}

export interface CreateHighlightInput {
  userId: string;
  title: string;
  coverImageUrl?: string;
  emoji?: string;
  storyIds?: string[];
}

export interface StoryFeedItem extends Story {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
  };
  hasViewed: boolean;
  myReaction?: StoryReactionType;
}

export interface UserStoryRing {
  userId: string;
  displayName: string;
  avatarUrl: string;
  isVerified: boolean;
  hasUnviewedStories: boolean;
  storyCount: number;
  latestStoryAt: Date;
  isCloseFriend: boolean;
  isMatch: boolean;
}

// Story duration: 24 hours in milliseconds
const STORY_DURATION_MS = 24 * 60 * 60 * 1000;

// Maximum stories per user per day
const MAX_STORIES_PER_DAY = 30;

// Free spin limit per day
const FREE_TEMPLATE_LIMIT = 10;

class StoriesService {
  // In-memory storage (replace with database in production)
  private stories: Map<string, Story> = new Map();
  private storyViews: Map<string, StoryView[]> = new Map();
  private storyReactions: Map<string, StoryReaction[]> = new Map();
  private storyReplies: Map<string, StoryReply[]> = new Map();
  private highlights: Map<string, Highlight> = new Map();
  private highlightStories: Map<string, HighlightStory[]> = new Map();
  private closeFriends: Map<string, Set<string>> = new Map(); // userId -> Set of friend IDs
  private storyAnalytics: Map<string, StoryAnalytics> = new Map();
  private templates: Map<string, StoryTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    // Start cleanup job for expired stories
    this.startExpirationCleanup();
  }

  // ============================================================
  // STORY CRUD OPERATIONS
  // ============================================================

  /**
   * Create a new story
   */
  async createStory(input: CreateStoryInput): Promise<Story> {
    try {
      // Check daily story limit
      const userStoriestoday = await this.getUserStoriesToday(input.userId);
      if (userStoriestoday >= MAX_STORIES_PER_DAY) {
        throw new Error('Daily story limit reached');
      }

      const storyId = this.generateId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + STORY_DURATION_MS);

      const story: Story = {
        id: storyId,
        userId: input.userId,
        mediaType: input.mediaType,
        mediaUrl: input.mediaUrl,
        thumbnailUrl: input.thumbnailUrl,
        caption: input.caption,
        location: input.location,
        locationCoordinates: input.locationCoordinates,
        mentions: input.mentions || [],
        hashtags: input.hashtags || [],
        musicTrackId: input.musicTrackId,
        musicTrackName: input.musicTrackName,
        stickers: input.stickers || [],
        textOverlays: input.textOverlays || [],
        filters: input.filters || {},
        durationSeconds: input.durationSeconds || (input.mediaType === 'video' ? 15 : 5),
        isActive: true,
        isArchived: false,
        visibility: input.visibility || 'public',
        viewCount: 0,
        reactionCount: 0,
        replyCount: 0,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      this.stories.set(storyId, story);

      // Initialize analytics
      this.initializeStoryAnalytics(storyId);

      // Notify mentioned users
      if (input.mentions && input.mentions.length > 0) {
        await this.notifyMentionedUsers(story, input.mentions);
      }

      // Notify close friends if visibility is close_friends
      if (input.visibility === 'close_friends') {
        await this.notifyCloseFriends(story);
      }

      logger.info('Story created', { storyId, userId: input.userId });
      return story;
    } catch (error) {
      logger.error('Failed to create story', { error, userId: input.userId });
      throw error;
    }
  }

  /**
   * Get a story by ID
   */
  async getStory(storyId: string, viewerId?: string): Promise<Story | null> {
    const story = this.stories.get(storyId);
    if (!story || !story.isActive || new Date() > story.expiresAt) {
      return null;
    }

    // Check visibility permissions
    if (viewerId && viewerId !== story.userId) {
      const canView = await this.canViewStory(story, viewerId);
      if (!canView) {
        return null;
      }
    }

    return story;
  }

  /**
   * Get all active stories for a user
   */
  async getUserStories(userId: string, viewerId?: string): Promise<Story[]> {
    const userStories: Story[] = [];
    const now = new Date();

    for (const story of this.stories.values()) {
      if (
        story.userId === userId &&
        story.isActive &&
        !story.isArchived &&
        story.expiresAt > now
      ) {
        // Check visibility if viewer is different from owner
        if (viewerId && viewerId !== userId) {
          const canView = await this.canViewStory(story, viewerId);
          if (!canView) continue;
        }
        userStories.push(story);
      }
    }

    // Sort by creation time (newest first)
    return userStories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Delete a story
   */
  async deleteStory(storyId: string, userId: string): Promise<boolean> {
    const story = this.stories.get(storyId);
    if (!story || story.userId !== userId) {
      return false;
    }

    story.isActive = false;
    story.updatedAt = new Date();
    this.stories.set(storyId, story);

    logger.info('Story deleted', { storyId, userId });
    return true;
  }

  /**
   * Archive a story (save before expiration for highlights)
   */
  async archiveStory(storyId: string, userId: string): Promise<boolean> {
    const story = this.stories.get(storyId);
    if (!story || story.userId !== userId) {
      return false;
    }

    story.isArchived = true;
    story.updatedAt = new Date();
    this.stories.set(storyId, story);

    logger.info('Story archived', { storyId, userId });
    return true;
  }

  // ============================================================
  // STORY FEED
  // ============================================================

  /**
   * Get story feed for a user (stories from matches and close friends)
   */
  async getStoryFeed(userId: string, matchIds: string[]): Promise<UserStoryRing[]> {
    const storyRings: Map<string, UserStoryRing> = new Map();
    const viewedStories = await this.getViewedStoryIds(userId);
    const closeFriendIds = this.closeFriends.get(userId) || new Set();
    const now = new Date();

    for (const story of this.stories.values()) {
      if (!story.isActive || story.isArchived || story.expiresAt <= now) {
        continue;
      }

      // Only show stories from matches or close friends
      const isMatch = matchIds.includes(story.userId);
      const isCloseFriend = closeFriendIds.has(story.userId);
      const isSelf = story.userId === userId;

      if (!isMatch && !isCloseFriend && !isSelf) {
        continue;
      }

      // Check visibility
      const canView = await this.canViewStory(story, userId);
      if (!canView) continue;

      // Build or update story ring
      if (!storyRings.has(story.userId)) {
        storyRings.set(story.userId, {
          userId: story.userId,
          displayName: '', // Would be populated from user service
          avatarUrl: '',
          isVerified: false,
          hasUnviewedStories: !viewedStories.has(story.id),
          storyCount: 1,
          latestStoryAt: story.createdAt,
          isCloseFriend,
          isMatch,
        });
      } else {
        const ring = storyRings.get(story.userId)!;
        ring.storyCount++;
        if (!viewedStories.has(story.id)) {
          ring.hasUnviewedStories = true;
        }
        if (story.createdAt > ring.latestStoryAt) {
          ring.latestStoryAt = story.createdAt;
        }
      }
    }

    // Sort: unviewed first, then by latest story time
    const rings = Array.from(storyRings.values());
    rings.sort((a, b) => {
      if (a.hasUnviewedStories !== b.hasUnviewedStories) {
        return a.hasUnviewedStories ? -1 : 1;
      }
      return b.latestStoryAt.getTime() - a.latestStoryAt.getTime();
    });

    return rings;
  }

  /**
   * Get stories from a specific user (for story viewer)
   */
  async getUserStoriesForViewer(
    targetUserId: string,
    viewerId: string
  ): Promise<StoryFeedItem[]> {
    const stories = await this.getUserStories(targetUserId, viewerId);
    const viewedStories = await this.getViewedStoryIds(viewerId);

    return stories.map((story) => ({
      ...story,
      user: {
        id: story.userId,
        displayName: '', // Would be populated from user service
        avatarUrl: '',
        isVerified: false,
      },
      hasViewed: viewedStories.has(story.id),
      myReaction: this.getUserReactionForStory(story.id, viewerId),
    }));
  }

  // ============================================================
  // STORY VIEWS
  // ============================================================

  /**
   * Record a story view
   */
  async viewStory(
    storyId: string,
    viewerId: string,
    viewDurationSeconds: number = 0,
    viewedCompletely: boolean = false
  ): Promise<boolean> {
    const story = this.stories.get(storyId);
    if (!story || !story.isActive || viewerId === story.userId) {
      return false;
    }

    const viewId = this.generateId();
    const existingViews = this.storyViews.get(storyId) || [];

    // Check if already viewed
    const existingView = existingViews.find((v) => v.viewerId === viewerId);
    if (existingView) {
      // Update view duration if they watched longer
      if (viewDurationSeconds > existingView.viewDurationSeconds) {
        existingView.viewDurationSeconds = viewDurationSeconds;
        existingView.viewedCompletely = viewedCompletely;
      }
      return true;
    }

    const view: StoryView = {
      id: viewId,
      storyId,
      viewerId,
      viewDurationSeconds,
      viewedCompletely,
      viewedAt: new Date(),
    };

    existingViews.push(view);
    this.storyViews.set(storyId, existingViews);

    // Update story view count
    story.viewCount++;
    this.stories.set(storyId, story);

    // Update analytics
    this.updateStoryAnalytics(storyId, 'view', { viewDurationSeconds, viewedCompletely });

    return true;
  }

  /**
   * Get viewers of a story
   */
  async getStoryViewers(storyId: string, userId: string): Promise<StoryView[]> {
    const story = this.stories.get(storyId);
    if (!story || story.userId !== userId) {
      return [];
    }

    return this.storyViews.get(storyId) || [];
  }

  // ============================================================
  // STORY REACTIONS
  // ============================================================

  /**
   * React to a story
   */
  async reactToStory(
    storyId: string,
    userId: string,
    reactionType: StoryReactionType
  ): Promise<StoryReaction | null> {
    const story = this.stories.get(storyId);
    if (!story || !story.isActive || userId === story.userId) {
      return null;
    }

    const reactions = this.storyReactions.get(storyId) || [];

    // Remove existing reaction if any
    const existingIndex = reactions.findIndex((r) => r.userId === userId);
    if (existingIndex !== -1) {
      reactions.splice(existingIndex, 1);
      story.reactionCount--;
    }

    const reaction: StoryReaction = {
      id: this.generateId(),
      storyId,
      userId,
      reactionType,
      createdAt: new Date(),
    };

    reactions.push(reaction);
    this.storyReactions.set(storyId, reactions);

    // Update story reaction count
    story.reactionCount++;
    this.stories.set(storyId, story);

    // Notify story owner
    await notificationService.sendNotification({
      userId: story.userId,
      type: 'story_reaction',
      title: 'Story Reaction',
      body: `Someone reacted to your story with ${reactionType}`,
      data: { storyId, reactionType },
    });

    logger.info('Story reaction added', { storyId, userId, reactionType });
    return reaction;
  }

  /**
   * Remove reaction from a story
   */
  async removeReaction(storyId: string, userId: string): Promise<boolean> {
    const story = this.stories.get(storyId);
    if (!story) return false;

    const reactions = this.storyReactions.get(storyId) || [];
    const index = reactions.findIndex((r) => r.userId === userId);

    if (index === -1) return false;

    reactions.splice(index, 1);
    this.storyReactions.set(storyId, reactions);

    story.reactionCount--;
    this.stories.set(storyId, story);

    return true;
  }

  /**
   * Get reactions for a story
   */
  async getStoryReactions(storyId: string): Promise<StoryReaction[]> {
    return this.storyReactions.get(storyId) || [];
  }

  // ============================================================
  // STORY REPLIES
  // ============================================================

  /**
   * Reply to a story
   */
  async replyToStory(
    storyId: string,
    senderId: string,
    message: string,
    mediaUrl?: string,
    mediaType: 'text' | 'photo' | 'video' | 'voice' = 'text'
  ): Promise<StoryReply | null> {
    const story = this.stories.get(storyId);
    if (!story || !story.isActive || senderId === story.userId) {
      return null;
    }

    const reply: StoryReply = {
      id: this.generateId(),
      storyId,
      senderId,
      recipientId: story.userId,
      message,
      mediaUrl,
      mediaType,
      isRead: false,
      createdAt: new Date(),
    };

    const replies = this.storyReplies.get(storyId) || [];
    replies.push(reply);
    this.storyReplies.set(storyId, replies);

    // Update story reply count
    story.replyCount++;
    this.stories.set(storyId, story);

    // Update analytics
    this.updateStoryAnalytics(storyId, 'reply', {});

    // Notify story owner
    await notificationService.sendNotification({
      userId: story.userId,
      type: 'story_reply',
      title: 'Story Reply',
      body: 'Someone replied to your story',
      data: { storyId, replyId: reply.id },
    });

    logger.info('Story reply sent', { storyId, senderId });
    return reply;
  }

  /**
   * Get replies for a story
   */
  async getStoryReplies(storyId: string, userId: string): Promise<StoryReply[]> {
    const story = this.stories.get(storyId);
    if (!story || story.userId !== userId) {
      return [];
    }

    return this.storyReplies.get(storyId) || [];
  }

  /**
   * Mark reply as read
   */
  async markReplyAsRead(replyId: string, userId: string): Promise<boolean> {
    for (const replies of this.storyReplies.values()) {
      const reply = replies.find((r) => r.id === replyId);
      if (reply && reply.recipientId === userId) {
        reply.isRead = true;
        reply.readAt = new Date();
        return true;
      }
    }
    return false;
  }

  // ============================================================
  // HIGHLIGHTS
  // ============================================================

  /**
   * Create a highlight
   */
  async createHighlight(input: CreateHighlightInput): Promise<Highlight> {
    const highlightId = this.generateId();
    const now = new Date();

    const highlight: Highlight = {
      id: highlightId,
      userId: input.userId,
      title: input.title,
      coverImageUrl: input.coverImageUrl,
      emoji: input.emoji,
      storyCount: 0,
      viewCount: 0,
      displayOrder: await this.getNextHighlightOrder(input.userId),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.highlights.set(highlightId, highlight);

    // Add stories if provided
    if (input.storyIds && input.storyIds.length > 0) {
      for (const storyId of input.storyIds) {
        await this.addStoryToHighlight(highlightId, storyId, input.userId);
      }
    }

    logger.info('Highlight created', { highlightId, userId: input.userId });
    return highlight;
  }

  /**
   * Get user's highlights
   */
  async getUserHighlights(userId: string): Promise<Highlight[]> {
    const userHighlights: Highlight[] = [];

    for (const highlight of this.highlights.values()) {
      if (highlight.userId === userId && highlight.isActive) {
        userHighlights.push(highlight);
      }
    }

    return userHighlights.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Get highlight by ID
   */
  async getHighlight(highlightId: string): Promise<Highlight | null> {
    return this.highlights.get(highlightId) || null;
  }

  /**
   * Update highlight
   */
  async updateHighlight(
    highlightId: string,
    userId: string,
    updates: Partial<Pick<Highlight, 'title' | 'coverImageUrl' | 'emoji'>>
  ): Promise<Highlight | null> {
    const highlight = this.highlights.get(highlightId);
    if (!highlight || highlight.userId !== userId) {
      return null;
    }

    Object.assign(highlight, updates, { updatedAt: new Date() });
    this.highlights.set(highlightId, highlight);

    return highlight;
  }

  /**
   * Delete highlight
   */
  async deleteHighlight(highlightId: string, userId: string): Promise<boolean> {
    const highlight = this.highlights.get(highlightId);
    if (!highlight || highlight.userId !== userId) {
      return false;
    }

    highlight.isActive = false;
    highlight.updatedAt = new Date();
    this.highlights.set(highlightId, highlight);

    // Remove highlight stories
    this.highlightStories.delete(highlightId);

    logger.info('Highlight deleted', { highlightId, userId });
    return true;
  }

  /**
   * Add story to highlight
   */
  async addStoryToHighlight(
    highlightId: string,
    storyId: string,
    userId: string
  ): Promise<boolean> {
    const highlight = this.highlights.get(highlightId);
    const story = this.stories.get(storyId);

    if (!highlight || !story) return false;
    if (highlight.userId !== userId || story.userId !== userId) return false;

    // Archive the story
    story.isArchived = true;
    this.stories.set(storyId, story);

    const highlightStoryList = this.highlightStories.get(highlightId) || [];

    // Check if already in highlight
    if (highlightStoryList.some((hs) => hs.storyId === storyId)) {
      return false;
    }

    const highlightStory: HighlightStory = {
      highlightId,
      storyId,
      displayOrder: highlightStoryList.length,
      addedAt: new Date(),
    };

    highlightStoryList.push(highlightStory);
    this.highlightStories.set(highlightId, highlightStoryList);

    // Update highlight story count
    highlight.storyCount++;
    this.highlights.set(highlightId, highlight);

    return true;
  }

  /**
   * Remove story from highlight
   */
  async removeStoryFromHighlight(
    highlightId: string,
    storyId: string,
    userId: string
  ): Promise<boolean> {
    const highlight = this.highlights.get(highlightId);
    if (!highlight || highlight.userId !== userId) return false;

    const highlightStoryList = this.highlightStories.get(highlightId) || [];
    const index = highlightStoryList.findIndex((hs) => hs.storyId === storyId);

    if (index === -1) return false;

    highlightStoryList.splice(index, 1);
    this.highlightStories.set(highlightId, highlightStoryList);

    // Update highlight story count
    highlight.storyCount--;
    this.highlights.set(highlightId, highlight);

    return true;
  }

  /**
   * Get stories in a highlight
   */
  async getHighlightStories(highlightId: string): Promise<Story[]> {
    const highlightStoryList = this.highlightStories.get(highlightId) || [];
    const stories: Story[] = [];

    for (const hs of highlightStoryList.sort((a, b) => a.displayOrder - b.displayOrder)) {
      const story = this.stories.get(hs.storyId);
      if (story) {
        stories.push(story);
      }
    }

    return stories;
  }

  // ============================================================
  // CLOSE FRIENDS
  // ============================================================

  /**
   * Add user to close friends list
   */
  async addCloseFriend(userId: string, friendId: string): Promise<boolean> {
    let friends = this.closeFriends.get(userId);
    if (!friends) {
      friends = new Set();
      this.closeFriends.set(userId, friends);
    }

    friends.add(friendId);
    return true;
  }

  /**
   * Remove user from close friends list
   */
  async removeCloseFriend(userId: string, friendId: string): Promise<boolean> {
    const friends = this.closeFriends.get(userId);
    if (!friends) return false;

    return friends.delete(friendId);
  }

  /**
   * Get close friends list
   */
  async getCloseFriends(userId: string): Promise<string[]> {
    const friends = this.closeFriends.get(userId);
    return friends ? Array.from(friends) : [];
  }

  /**
   * Check if user is close friend
   */
  async isCloseFriend(userId: string, friendId: string): Promise<boolean> {
    const friends = this.closeFriends.get(userId);
    return friends ? friends.has(friendId) : false;
  }

  // ============================================================
  // TEMPLATES
  // ============================================================

  /**
   * Get available story templates
   */
  async getTemplates(category?: string): Promise<StoryTemplate[]> {
    const templates: StoryTemplate[] = [];

    for (const template of this.templates.values()) {
      if (template.isActive) {
        if (!category || template.category === category) {
          templates.push(template);
        }
      }
    }

    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Use a template (record usage)
   */
  async useTemplate(templateId: string, userId: string, isPremiumUser: boolean): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template || !template.isActive) {
      return false;
    }

    // Check if premium template and user is premium
    if (template.isPremium && !isPremiumUser) {
      throw new Error('Premium template requires premium subscription');
    }

    // Check coin cost
    if (template.coinCost > 0) {
      // Would integrate with gamification service to deduct coins
      // await gamificationService.deductCoins(userId, template.coinCost);
    }

    template.usageCount++;
    this.templates.set(templateId, template);

    return true;
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  /**
   * Get story analytics
   */
  async getStoryAnalytics(storyId: string, userId: string): Promise<StoryAnalytics | null> {
    const story = this.stories.get(storyId);
    if (!story || story.userId !== userId) {
      return null;
    }

    return this.storyAnalytics.get(storyId) || null;
  }

  /**
   * Get user's story analytics summary
   */
  async getUserStoryAnalyticsSummary(userId: string): Promise<{
    totalStories: number;
    totalViews: number;
    totalReactions: number;
    totalReplies: number;
    avgCompletionRate: number;
    topPerformingStory: Story | null;
  }> {
    let totalStories = 0;
    let totalViews = 0;
    let totalReactions = 0;
    let totalReplies = 0;
    let totalCompletionRate = 0;
    let topPerformingStory: Story | null = null;
    let topViews = 0;

    for (const story of this.stories.values()) {
      if (story.userId === userId) {
        totalStories++;
        totalViews += story.viewCount;
        totalReactions += story.reactionCount;
        totalReplies += story.replyCount;

        const analytics = this.storyAnalytics.get(story.id);
        if (analytics) {
          totalCompletionRate += analytics.completionRate;
        }

        if (story.viewCount > topViews) {
          topViews = story.viewCount;
          topPerformingStory = story;
        }
      }
    }

    return {
      totalStories,
      totalViews,
      totalReactions,
      totalReplies,
      avgCompletionRate: totalStories > 0 ? totalCompletionRate / totalStories : 0,
      topPerformingStory,
    };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getUserStoriesToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let count = 0;
    for (const story of this.stories.values()) {
      if (story.userId === userId && story.createdAt >= today) {
        count++;
      }
    }
    return count;
  }

  private async canViewStory(story: Story, viewerId: string): Promise<boolean> {
    if (story.userId === viewerId) return true;

    switch (story.visibility) {
      case 'public':
        return true;
      case 'matches_only':
        // Would check with matching service
        return true;
      case 'close_friends':
        return await this.isCloseFriend(story.userId, viewerId);
      default:
        return false;
    }
  }

  private async getViewedStoryIds(userId: string): Promise<Set<string>> {
    const viewedIds = new Set<string>();

    for (const [storyId, views] of this.storyViews.entries()) {
      if (views.some((v) => v.viewerId === userId)) {
        viewedIds.add(storyId);
      }
    }

    return viewedIds;
  }

  private getUserReactionForStory(storyId: string, userId: string): StoryReactionType | undefined {
    const reactions = this.storyReactions.get(storyId) || [];
    const reaction = reactions.find((r) => r.userId === userId);
    return reaction?.reactionType;
  }

  private async getNextHighlightOrder(userId: string): Promise<number> {
    const userHighlights = await this.getUserHighlights(userId);
    return userHighlights.length;
  }

  private initializeStoryAnalytics(storyId: string): void {
    this.storyAnalytics.set(storyId, {
      storyId,
      impressions: 0,
      uniqueViewers: 0,
      forwardTaps: 0,
      backwardTaps: 0,
      exits: 0,
      profileVisits: 0,
      replies: 0,
      avgViewDuration: 0,
      completionRate: 0,
      viewerDemographics: { ageGroups: {}, locations: {} },
      hourlyViews: {},
    });
  }

  private updateStoryAnalytics(
    storyId: string,
    action: 'view' | 'reply' | 'forward' | 'backward' | 'exit' | 'profile_visit',
    data: Record<string, any>
  ): void {
    const analytics = this.storyAnalytics.get(storyId);
    if (!analytics) return;

    switch (action) {
      case 'view':
        analytics.impressions++;
        analytics.uniqueViewers++;
        if (data.viewedCompletely) {
          analytics.completionRate =
            ((analytics.completionRate * (analytics.uniqueViewers - 1)) + 100) /
            analytics.uniqueViewers;
        } else {
          analytics.completionRate =
            (analytics.completionRate * (analytics.uniqueViewers - 1)) / analytics.uniqueViewers;
        }
        // Update average view duration
        analytics.avgViewDuration =
          ((analytics.avgViewDuration * (analytics.uniqueViewers - 1)) +
            (data.viewDurationSeconds || 0)) /
          analytics.uniqueViewers;
        break;
      case 'reply':
        analytics.replies++;
        break;
      case 'forward':
        analytics.forwardTaps++;
        break;
      case 'backward':
        analytics.backwardTaps++;
        break;
      case 'exit':
        analytics.exits++;
        break;
      case 'profile_visit':
        analytics.profileVisits++;
        break;
    }

    this.storyAnalytics.set(storyId, analytics);
  }

  private async notifyMentionedUsers(story: Story, mentions: string[]): Promise<void> {
    for (const userId of mentions) {
      await notificationService.sendNotification({
        userId,
        type: 'story_mention',
        title: 'Story Mention',
        body: 'You were mentioned in a story',
        data: { storyId: story.id },
      });
    }
  }

  private async notifyCloseFriends(story: Story): Promise<void> {
    const friends = this.closeFriends.get(story.userId) || new Set();
    for (const friendId of friends) {
      await notificationService.sendNotification({
        userId: friendId,
        type: 'close_friend_story',
        title: 'Close Friend Story',
        body: 'A close friend posted a story',
        data: { storyId: story.id },
      });
    }
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: StoryTemplate[] = [
      {
        id: 'tpl-date-night',
        name: 'Date Night',
        description: 'Perfect for sharing your date night moments',
        category: 'dating',
        previewUrl: '/templates/date-night.png',
        templateConfig: {
          background: 'gradient-rose',
          font: 'Playfair Display',
          textColor: '#FFFFFF',
          overlay: 'hearts',
        },
        isPremium: false,
        coinCost: 0,
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'tpl-adventure',
        name: 'Adventure Seeker',
        description: 'For your travel and adventure stories',
        category: 'travel',
        previewUrl: '/templates/adventure.png',
        templateConfig: {
          background: 'gradient-ocean',
          font: 'Montserrat',
          textColor: '#FFFFFF',
          overlay: 'compass',
        },
        isPremium: false,
        coinCost: 0,
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'tpl-fitness',
        name: 'Fitness Goals',
        description: 'Show off your workout progress',
        category: 'fitness',
        previewUrl: '/templates/fitness.png',
        templateConfig: {
          background: 'gradient-energy',
          font: 'Oswald',
          textColor: '#FFFFFF',
          overlay: 'fire',
        },
        isPremium: false,
        coinCost: 0,
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'tpl-premium-glow',
        name: 'Premium Glow',
        description: 'Elegant golden aesthetic',
        category: 'premium',
        previewUrl: '/templates/glow.png',
        templateConfig: {
          background: 'gradient-gold',
          font: 'Cormorant Garamond',
          textColor: '#1A1A1A',
          overlay: 'sparkles',
          border: 'gold',
        },
        isPremium: true,
        coinCost: 50,
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
      },
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
    }
  }

  private startExpirationCleanup(): void {
    // Run every hour to clean up expired stories
    setInterval(() => {
      const now = new Date();
      for (const [storyId, story] of this.stories.entries()) {
        if (story.isActive && !story.isArchived && story.expiresAt <= now) {
          story.isActive = false;
          this.stories.set(storyId, story);
          logger.info('Story expired', { storyId });
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }
}

// Export singleton instance
export const storiesService = new StoriesService();
