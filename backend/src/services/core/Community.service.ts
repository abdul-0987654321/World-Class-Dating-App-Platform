/**
 * Community Service
 * Interest-based communities where users connect over shared interests
 */

import { logger } from '../../utils/logger';

// Types
export interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  coverImage?: string;
  category: CommunityCategory;
  memberCount: number;
  isDefault: boolean;
  isPublic: boolean;
  isPremium: boolean;
  entryFee?: number; // in coins
  createdAt: Date;
  updatedAt: Date;
  rules?: string[];
  tags: string[];
}

export interface CommunityMember {
  communityId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  lastActiveAt: Date;
  isMuted: boolean;
  mutedUntil?: Date;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  type: PostType;
  content: string;
  mediaUrls?: string[];
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  isHidden: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  likeCount: number;
  createdAt: Date;
  parentCommentId?: string;
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  name: string;
  description: string;
  type: EventType;
  startTime: Date;
  endTime?: Date;
  maxParticipants?: number;
  currentParticipants: number;
  location?: string;
  isVirtual: boolean;
  virtualLink?: string;
  createdBy: string;
  createdAt: Date;
}

export interface EventRSVP {
  eventId: string;
  userId: string;
  status: 'going' | 'interested' | 'not_going';
  rsvpAt: Date;
}

export type CommunityCategory =
  | 'fitness'
  | 'travel'
  | 'gaming'
  | 'music'
  | 'food'
  | 'pets'
  | 'books'
  | 'tech'
  | 'outdoor'
  | 'creative'
  | 'sports'
  | 'lifestyle'
  | 'professional'
  | 'social'
  | 'other';

export type MemberRole = 'member' | 'moderator' | 'admin' | 'owner';
export type PostType = 'text' | 'photo' | 'poll' | 'event' | 'discussion';
export type EventType = 'meetup' | 'virtual' | 'activity' | 'speed_dating' | 'group_date';

// Default communities
const DEFAULT_COMMUNITIES: Omit<Community, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Fitness Singles',
    description: 'Connect with people who share your passion for fitness and healthy living',
    icon: '💪',
    category: 'fitness',
    memberCount: 0,
    isDefault: true,
    isPublic: true,
    isPremium: false,
    tags: ['gym', 'workout', 'health', 'fitness'],
    rules: [
      'Be respectful and supportive',
      'No spam or self-promotion',
      'Keep discussions fitness-related',
    ],
  },
  {
    name: 'Travel Lovers',
    description: 'Share your adventures and find travel companions',
    icon: '✈️',
    category: 'travel',
    memberCount: 0,
    isDefault: true,
    isPublic: true,
    isPremium: false,
    tags: ['travel', 'adventure', 'explore', 'wanderlust'],
    rules: [
      'Share genuine travel experiences',
      'Be helpful with travel tips',
      'No commercial travel promotions',
    ],
  },
  {
    name: 'Gaming Squad',
    description: 'Find your player 2 among fellow gamers',
    icon: '🎮',
    category: 'gaming',
    memberCount: 0,
    isDefault: true,
    isPublic: true,
    isPremium: false,
    tags: ['gaming', 'esports', 'video games', 'pc', 'console'],
    rules: [
      'All gaming platforms welcome',
      'No toxic behavior',
      'Respect different gaming preferences',
    ],
  },
  {
    name: 'Music Vibes',
    description: 'Connect over your favorite tunes and discover new music together',
    icon: '🎵',
    category: 'music',
    memberCount: 0,
    isDefault: true,
    isPublic: true,
    isPremium: false,
    tags: ['music', 'concerts', 'festivals', 'spotify'],
    rules: [
      'All genres welcome',
      'Share playlists and recommendations',
      'Be open to new music',
    ],
  },
  {
    name: 'Foodies Unite',
    description: 'For those who believe the way to the heart is through the stomach',
    icon: '🍕',
    category: 'food',
    memberCount: 0,
    isDefault: true,
    isPublic: true,
    isPremium: false,
    tags: ['food', 'cooking', 'restaurants', 'recipes'],
    rules: [
      'Share your culinary adventures',
      'Restaurant recommendations welcome',
      'No food shaming',
    ],
  },
  {
    name: 'Pet Parents',
    description: 'Connect with fellow pet lovers and share your fur babies',
    icon: '🐕',
    category: 'pets',
    memberCount: 0,
    isDefault: true,
    isPublic: true,
    isPremium: false,
    tags: ['pets', 'dogs', 'cats', 'animals'],
    rules: [
      'Pet photos highly encouraged',
      'Be kind about all pets',
      'No breeders or pet sales',
    ],
  },
  {
    name: 'Book Club',
    description: 'For bookworms looking for their reading buddy',
    icon: '📚',
    category: 'books',
    memberCount: 0,
    isDefault: true,
    isPublic: true,
    isPremium: false,
    tags: ['books', 'reading', 'literature', 'authors'],
    rules: [
      'All genres welcome',
      'Mark spoilers appropriately',
      'Respect different reading tastes',
    ],
  },
  {
    name: 'Tech Nerds',
    description: 'Connect with fellow tech enthusiasts and geeks',
    icon: '💻',
    category: 'tech',
    memberCount: 0,
    isDefault: true,
    isPublic: true,
    isPremium: false,
    tags: ['technology', 'programming', 'startups', 'gadgets'],
    rules: [
      'Help each other learn',
      'No gatekeeping',
      'All skill levels welcome',
    ],
  },
  {
    name: 'Outdoor Adventures',
    description: 'Find hiking partners and adventure buddies',
    icon: '🏔️',
    category: 'outdoor',
    memberCount: 0,
    isDefault: true,
    isPublic: true,
    isPremium: false,
    tags: ['hiking', 'camping', 'nature', 'outdoors'],
    rules: [
      'Leave no trace principles',
      'Safety first in all activities',
      'Share your outdoor spots',
    ],
  },
  {
    name: 'Creative Souls',
    description: 'Connect with artists, writers, and creative minds',
    icon: '🎨',
    category: 'creative',
    memberCount: 0,
    isDefault: true,
    isPublic: true,
    isPremium: false,
    tags: ['art', 'creativity', 'design', 'photography'],
    rules: [
      'Share your creations',
      'Give constructive feedback',
      'Support fellow creatives',
    ],
  },
];

class CommunityService {
  private communities: Map<string, Community> = new Map();
  private members: Map<string, CommunityMember[]> = new Map(); // communityId -> members
  private posts: Map<string, CommunityPost[]> = new Map(); // communityId -> posts
  private comments: Map<string, PostComment[]> = new Map(); // postId -> comments
  private events: Map<string, CommunityEvent[]> = new Map(); // communityId -> events
  private rsvps: Map<string, EventRSVP[]> = new Map(); // eventId -> rsvps
  private userMemberships: Map<string, string[]> = new Map(); // userId -> communityIds

  constructor() {
    this.initializeDefaultCommunities();
  }

  /**
   * Get all communities
   */
  async getAllCommunities(filters?: {
    category?: CommunityCategory;
    isPublic?: boolean;
    isPremium?: boolean;
    searchQuery?: string;
  }): Promise<Community[]> {
    let communities = Array.from(this.communities.values());

    if (filters?.category) {
      communities = communities.filter(c => c.category === filters.category);
    }
    if (filters?.isPublic !== undefined) {
      communities = communities.filter(c => c.isPublic === filters.isPublic);
    }
    if (filters?.isPremium !== undefined) {
      communities = communities.filter(c => c.isPremium === filters.isPremium);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      communities = communities.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return communities.sort((a, b) => b.memberCount - a.memberCount);
  }

  /**
   * Get community by ID
   */
  async getCommunity(communityId: string): Promise<Community | null> {
    return this.communities.get(communityId) || null;
  }

  /**
   * Join a community
   */
  async joinCommunity(
    userId: string,
    communityId: string
  ): Promise<{ success: boolean; error?: string }> {
    const community = this.communities.get(communityId);
    if (!community) {
      return { success: false, error: 'Community not found' };
    }

    // Check if already a member
    const members = this.members.get(communityId) || [];
    if (members.some(m => m.userId === userId)) {
      return { success: false, error: 'Already a member' };
    }

    // Add member
    const member: CommunityMember = {
      communityId,
      userId,
      role: 'member',
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isMuted: false,
    };

    members.push(member);
    this.members.set(communityId, members);

    // Update user memberships
    const userMemberships = this.userMemberships.get(userId) || [];
    userMemberships.push(communityId);
    this.userMemberships.set(userId, userMemberships);

    // Update member count
    community.memberCount++;
    this.communities.set(communityId, community);

    logger.info(`User ${userId} joined community ${community.name}`);

    return { success: true };
  }

  /**
   * Leave a community
   */
  async leaveCommunity(
    userId: string,
    communityId: string
  ): Promise<{ success: boolean; error?: string }> {
    const community = this.communities.get(communityId);
    if (!community) {
      return { success: false, error: 'Community not found' };
    }

    const members = this.members.get(communityId) || [];
    const memberIndex = members.findIndex(m => m.userId === userId);

    if (memberIndex === -1) {
      return { success: false, error: 'Not a member' };
    }

    // Remove member
    members.splice(memberIndex, 1);
    this.members.set(communityId, members);

    // Update user memberships
    const userMemberships = this.userMemberships.get(userId) || [];
    const membershipIndex = userMemberships.indexOf(communityId);
    if (membershipIndex !== -1) {
      userMemberships.splice(membershipIndex, 1);
      this.userMemberships.set(userId, userMemberships);
    }

    // Update member count
    community.memberCount = Math.max(0, community.memberCount - 1);
    this.communities.set(communityId, community);

    logger.info(`User ${userId} left community ${community.name}`);

    return { success: true };
  }

  /**
   * Get user's communities
   */
  async getUserCommunities(userId: string): Promise<Community[]> {
    const communityIds = this.userMemberships.get(userId) || [];
    return communityIds
      .map(id => this.communities.get(id))
      .filter((c): c is Community => c !== undefined);
  }

  /**
   * Get community members
   */
  async getCommunityMembers(
    communityId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ members: CommunityMember[]; total: number }> {
    const members = this.members.get(communityId) || [];
    return {
      members: members.slice(offset, offset + limit),
      total: members.length,
    };
  }

  /**
   * Create a post
   */
  async createPost(
    communityId: string,
    authorId: string,
    content: string,
    type: PostType = 'text',
    mediaUrls?: string[]
  ): Promise<{ success: boolean; post?: CommunityPost; error?: string }> {
    // Verify membership
    const members = this.members.get(communityId) || [];
    const member = members.find(m => m.userId === authorId);
    if (!member) {
      return { success: false, error: 'Must be a member to post' };
    }

    // Check if muted
    if (member.isMuted && member.mutedUntil && member.mutedUntil > new Date()) {
      return { success: false, error: 'You are muted in this community' };
    }

    const post: CommunityPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      communityId,
      authorId,
      type,
      content,
      mediaUrls,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPinned: false,
      isHidden: false,
    };

    const posts = this.posts.get(communityId) || [];
    posts.unshift(post);
    this.posts.set(communityId, posts);

    // Update member activity
    member.lastActiveAt = new Date();

    logger.info(`User ${authorId} created post in community ${communityId}`);

    return { success: true, post };
  }

  /**
   * Get community posts
   */
  async getCommunityPosts(
    communityId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ posts: CommunityPost[]; total: number }> {
    const posts = this.posts.get(communityId) || [];
    const visiblePosts = posts.filter(p => !p.isHidden);

    // Sort by pinned first, then by date
    const sortedPosts = visiblePosts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return {
      posts: sortedPosts.slice(offset, offset + limit),
      total: visiblePosts.length,
    };
  }

  /**
   * Like a post
   */
  async likePost(postId: string, userId: string): Promise<{ success: boolean; likeCount: number }> {
    for (const [communityId, posts] of this.posts.entries()) {
      const post = posts.find(p => p.id === postId);
      if (post) {
        post.likeCount++;
        return { success: true, likeCount: post.likeCount };
      }
    }
    return { success: false, likeCount: 0 };
  }

  /**
   * Add a comment
   */
  async addComment(
    postId: string,
    authorId: string,
    content: string,
    parentCommentId?: string
  ): Promise<{ success: boolean; comment?: PostComment; error?: string }> {
    const comment: PostComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      postId,
      authorId,
      content,
      likeCount: 0,
      createdAt: new Date(),
      parentCommentId,
    };

    const comments = this.comments.get(postId) || [];
    comments.push(comment);
    this.comments.set(postId, comments);

    // Update post comment count
    for (const [, posts] of this.posts.entries()) {
      const post = posts.find(p => p.id === postId);
      if (post) {
        post.commentCount++;
        break;
      }
    }

    return { success: true, comment };
  }

  /**
   * Get post comments
   */
  async getPostComments(
    postId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ comments: PostComment[]; total: number }> {
    const comments = this.comments.get(postId) || [];
    return {
      comments: comments.slice(offset, offset + limit),
      total: comments.length,
    };
  }

  /**
   * Create a community event
   */
  async createEvent(
    communityId: string,
    createdBy: string,
    eventData: {
      name: string;
      description: string;
      type: EventType;
      startTime: Date;
      endTime?: Date;
      maxParticipants?: number;
      location?: string;
      isVirtual: boolean;
      virtualLink?: string;
    }
  ): Promise<{ success: boolean; event?: CommunityEvent; error?: string }> {
    const community = this.communities.get(communityId);
    if (!community) {
      return { success: false, error: 'Community not found' };
    }

    // Verify user is member
    const members = this.members.get(communityId) || [];
    const member = members.find(m => m.userId === createdBy);
    if (!member) {
      return { success: false, error: 'Must be a member to create events' };
    }

    const event: CommunityEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      communityId,
      ...eventData,
      currentParticipants: 0,
      createdBy,
      createdAt: new Date(),
    };

    const events = this.events.get(communityId) || [];
    events.push(event);
    this.events.set(communityId, events);

    logger.info(`User ${createdBy} created event ${event.name} in community ${community.name}`);

    return { success: true, event };
  }

  /**
   * Get community events
   */
  async getCommunityEvents(
    communityId: string,
    includesPast: boolean = false
  ): Promise<CommunityEvent[]> {
    const events = this.events.get(communityId) || [];
    const now = new Date();

    let filteredEvents = events;
    if (!includesPast) {
      filteredEvents = events.filter(e => e.startTime > now);
    }

    return filteredEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * RSVP to an event
   */
  async rsvpToEvent(
    eventId: string,
    userId: string,
    status: 'going' | 'interested' | 'not_going'
  ): Promise<{ success: boolean; error?: string }> {
    // Find event
    let event: CommunityEvent | null = null;
    for (const [, events] of this.events.entries()) {
      const found = events.find(e => e.id === eventId);
      if (found) {
        event = found;
        break;
      }
    }

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Check capacity
    if (status === 'going' && event.maxParticipants) {
      if (event.currentParticipants >= event.maxParticipants) {
        return { success: false, error: 'Event is full' };
      }
    }

    const rsvps = this.rsvps.get(eventId) || [];
    const existingRsvp = rsvps.find(r => r.userId === userId);

    if (existingRsvp) {
      // Update existing RSVP
      if (existingRsvp.status === 'going' && status !== 'going') {
        event.currentParticipants--;
      } else if (existingRsvp.status !== 'going' && status === 'going') {
        event.currentParticipants++;
      }
      existingRsvp.status = status;
      existingRsvp.rsvpAt = new Date();
    } else {
      // Create new RSVP
      const rsvp: EventRSVP = {
        eventId,
        userId,
        status,
        rsvpAt: new Date(),
      };
      rsvps.push(rsvp);
      if (status === 'going') {
        event.currentParticipants++;
      }
    }

    this.rsvps.set(eventId, rsvps);

    return { success: true };
  }

  /**
   * Get event RSVPs
   */
  async getEventRSVPs(eventId: string): Promise<EventRSVP[]> {
    return this.rsvps.get(eventId) || [];
  }

  /**
   * Create a new community (admin/premium feature)
   */
  async createCommunity(
    creatorId: string,
    communityData: {
      name: string;
      description: string;
      icon: string;
      category: CommunityCategory;
      isPublic: boolean;
      isPremium: boolean;
      entryFee?: number;
      rules?: string[];
      tags: string[];
    }
  ): Promise<{ success: boolean; community?: Community; error?: string }> {
    // Check for duplicate name
    const existingName = Array.from(this.communities.values())
      .find(c => c.name.toLowerCase() === communityData.name.toLowerCase());
    if (existingName) {
      return { success: false, error: 'A community with this name already exists' };
    }

    const community: Community = {
      id: `community_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ...communityData,
      memberCount: 1, // Creator is first member
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.communities.set(community.id, community);

    // Add creator as owner
    const member: CommunityMember = {
      communityId: community.id,
      userId: creatorId,
      role: 'owner',
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isMuted: false,
    };

    this.members.set(community.id, [member]);

    // Update user memberships
    const userMemberships = this.userMemberships.get(creatorId) || [];
    userMemberships.push(community.id);
    this.userMemberships.set(creatorId, userMemberships);

    logger.info(`User ${creatorId} created community: ${community.name}`);

    return { success: true, community };
  }

  // Private methods

  private initializeDefaultCommunities(): void {
    for (const communityData of DEFAULT_COMMUNITIES) {
      const community: Community = {
        id: `community_default_${communityData.name.toLowerCase().replace(/\s+/g, '_')}`,
        ...communityData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.communities.set(community.id, community);
    }

    logger.info(`Initialized ${DEFAULT_COMMUNITIES.length} default communities`);
  }
}

export const communityService = new CommunityService();
