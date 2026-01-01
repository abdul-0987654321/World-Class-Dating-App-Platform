/**
 * Community Entity
 * Interest-based groups for user engagement
 */

export interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  coverImage?: string;
  memberCount: number;
  postCount: number;
  category: CommunityCategory;
  color: string;
  rules?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityWithMembership extends Community {
  isJoined: boolean;
  memberRole?: CommunityRole;
}

export type CommunityCategory =
  | 'Lifestyle'
  | 'Food'
  | 'Health'
  | 'Culture'
  | 'Pets'
  | 'Entertainment'
  | 'Music'
  | 'Adventure'
  | 'Technology'
  | 'Art'
  | 'Sports'
  | 'Gaming'
  | 'Travel'
  | 'Other';

export const COMMUNITY_CATEGORIES: CommunityCategory[] = [
  'Lifestyle',
  'Food',
  'Health',
  'Culture',
  'Pets',
  'Entertainment',
  'Music',
  'Adventure',
  'Technology',
  'Art',
  'Sports',
  'Gaming',
  'Travel',
  'Other',
];

export type CommunityRole = 'member' | 'moderator' | 'admin';

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  role: CommunityRole;
  joinedAt: Date;
  // Populated from users table
  name?: string;
  photoUrl?: string;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  content: string;
  images?: string[];
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Populated fields
  author?: {
    id: string;
    name: string;
    photoUrl: string;
  };
  isLiked?: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string;
  content: string;
  likeCount: number;
  createdAt: Date;
  // Populated fields
  author?: {
    id: string;
    name: string;
    photoUrl: string;
  };
  isLiked?: boolean;
  replies?: CommunityComment[];
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  location: string;
  isVirtual: boolean;
  meetingLink?: string;
  attendeeCount: number;
  maxAttendees: number;
  hostId: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
  // Populated fields
  host?: {
    id: string;
    name: string;
    photoUrl: string;
  };
  isAttending?: boolean;
}

export interface CommunityEventAttendee {
  id: string;
  eventId: string;
  userId: string;
  registeredAt: Date;
}

export interface CommunityPostLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface CommunityCommentLike {
  id: string;
  commentId: string;
  userId: string;
  createdAt: Date;
}

// Create inputs
export interface CommunityCreateInput {
  name: string;
  description: string;
  icon: string;
  coverImage?: string;
  category: CommunityCategory;
  color?: string;
  rules?: string[];
  createdBy: string;
}

export interface PostCreateInput {
  communityId: string;
  authorId: string;
  content: string;
  images?: string[];
}

export interface CommentCreateInput {
  postId: string;
  authorId: string;
  parentId?: string;
  content: string;
}

export interface EventCreateInput {
  communityId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  location: string;
  isVirtual: boolean;
  meetingLink?: string;
  maxAttendees: number;
  hostId: string;
  coverImage?: string;
}
