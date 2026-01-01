import { db } from '../../infrastructure/database';
import {
  Community,
  CommunityWithMembership,
  CommunityMember,
  CommunityPost,
  CommunityComment,
  CommunityEvent,
  CommunityCategory,
  CommunityCreateInput,
  PostCreateInput,
  CommentCreateInput,
  EventCreateInput,
  COMMUNITY_CATEGORIES,
} from '../entities/Community.entity';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';

export class CommunityRepository {
  // ==================== COMMUNITIES ====================

  async getAll(userId?: string, category?: CommunityCategory): Promise<CommunityWithMembership[]> {
    let query = db('communities')
      .select('communities.*')
      .where('communities.is_active', true)
      .orderBy('communities.member_count', 'desc');

    if (category) {
      query = query.where('communities.category', category);
    }

    const communities = await query;

    // Get user's memberships if userId provided
    let membershipMap: Record<string, string> = {};
    if (userId) {
      const memberships = await db('community_members')
        .select('community_id', 'role')
        .where({ user_id: userId });
      membershipMap = memberships.reduce((acc: any, m: any) => {
        acc[m.community_id] = m.role;
        return acc;
      }, {});
    }

    return communities.map((c: any) => this.mapCommunityWithMembership(c, membershipMap));
  }

  async getById(id: string, userId?: string): Promise<CommunityWithMembership | null> {
    const community = await db('communities').where({ id, is_active: true }).first();
    if (!community) return null;

    let memberRole: string | undefined;
    if (userId) {
      const membership = await db('community_members')
        .where({ community_id: id, user_id: userId })
        .first();
      memberRole = membership?.role;
    }

    return this.mapCommunityWithMembership(community, { [id]: memberRole });
  }

  async getJoinedByUser(userId: string): Promise<CommunityWithMembership[]> {
    const communities = await db('communities')
      .join('community_members', 'communities.id', 'community_members.community_id')
      .where('community_members.user_id', userId)
      .where('communities.is_active', true)
      .select('communities.*', 'community_members.role as member_role')
      .orderBy('community_members.joined_at', 'desc');

    return communities.map((c: any) => ({
      ...this.mapCommunity(c),
      isJoined: true,
      memberRole: c.member_role,
    }));
  }

  async search(query: string, userId?: string): Promise<CommunityWithMembership[]> {
    const communities = await db('communities')
      .where('is_active', true)
      .where(function() {
        this.whereILike('name', `%${query}%`)
          .orWhereILike('description', `%${query}%`);
      })
      .orderBy('member_count', 'desc')
      .limit(50);

    let membershipMap: Record<string, string> = {};
    if (userId) {
      const communityIds = communities.map((c: any) => c.id);
      const memberships = await db('community_members')
        .select('community_id', 'role')
        .where({ user_id: userId })
        .whereIn('community_id', communityIds);
      membershipMap = memberships.reduce((acc: any, m: any) => {
        acc[m.community_id] = m.role;
        return acc;
      }, {});
    }

    return communities.map((c: any) => this.mapCommunityWithMembership(c, membershipMap));
  }

  async create(input: CommunityCreateInput): Promise<Community> {
    const id = uuidv4();
    const now = new Date();

    const community = {
      id,
      name: input.name,
      description: input.description,
      icon: input.icon,
      cover_image: input.coverImage || null,
      category: input.category,
      color: input.color || 'from-pink-400 to-purple-400',
      rules: input.rules ? JSON.stringify(input.rules) : null,
      member_count: 1, // Creator is auto-joined
      post_count: 0,
      is_active: true,
      created_by: input.createdBy,
      created_at: now,
      updated_at: now,
    };

    await db('communities').insert(community);

    // Auto-join creator as admin
    await this.addMember(id, input.createdBy, 'admin');

    return this.mapCommunity(community);
  }

  // ==================== MEMBERS ====================

  async addMember(communityId: string, userId: string, role: 'member' | 'moderator' | 'admin' = 'member'): Promise<void> {
    const existing = await db('community_members')
      .where({ community_id: communityId, user_id: userId })
      .first();

    if (existing) return;

    await db('community_members').insert({
      id: uuidv4(),
      community_id: communityId,
      user_id: userId,
      role,
      joined_at: new Date(),
    });

    await db('communities')
      .where({ id: communityId })
      .increment('member_count', 1);

    logger.info(`User ${userId} joined community ${communityId}`);
  }

  async removeMember(communityId: string, userId: string): Promise<void> {
    const deleted = await db('community_members')
      .where({ community_id: communityId, user_id: userId })
      .del();

    if (deleted > 0) {
      await db('communities')
        .where({ id: communityId })
        .decrement('member_count', 1);

      logger.info(`User ${userId} left community ${communityId}`);
    }
  }

  async getMembers(communityId: string, limit = 20, offset = 0): Promise<{ members: CommunityMember[]; total: number }> {
    const members = await db('community_members')
      .join('users', 'community_members.user_id', 'users.id')
      .where('community_members.community_id', communityId)
      .select(
        'community_members.id',
        'community_members.community_id',
        'community_members.user_id',
        'community_members.role',
        'community_members.joined_at',
        'users.first_name',
        'users.last_name'
      )
      .orderBy('community_members.joined_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('community_members')
      .where({ community_id: communityId })
      .count();

    return {
      members: members.map((m: any) => ({
        id: m.id,
        communityId: m.community_id,
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
        name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Anonymous',
        photoUrl: undefined, // Would need to join with photos table
      })),
      total: Number(count),
    };
  }

  async isMember(communityId: string, userId: string): Promise<boolean> {
    const member = await db('community_members')
      .where({ community_id: communityId, user_id: userId })
      .first();
    return !!member;
  }

  async getMemberRole(communityId: string, userId: string): Promise<string | null> {
    const member = await db('community_members')
      .where({ community_id: communityId, user_id: userId })
      .first();
    return member?.role || null;
  }

  // ==================== POSTS ====================

  async getPosts(communityId: string, userId: string, limit = 20, offset = 0): Promise<{ posts: CommunityPost[]; total: number }> {
    const posts = await db('community_posts')
      .join('users', 'community_posts.author_id', 'users.id')
      .where('community_posts.community_id', communityId)
      .select(
        'community_posts.*',
        'users.first_name',
        'users.last_name'
      )
      .orderBy([
        { column: 'community_posts.is_pinned', order: 'desc' },
        { column: 'community_posts.created_at', order: 'desc' },
      ])
      .limit(limit)
      .offset(offset);

    // Get user's likes
    const postIds = posts.map((p: any) => p.id);
    const likes = await db('community_post_likes')
      .where({ user_id: userId })
      .whereIn('post_id', postIds);
    const likedPostIds = new Set(likes.map((l: any) => l.post_id));

    const [{ count }] = await db('community_posts')
      .where({ community_id: communityId })
      .count();

    return {
      posts: posts.map((p: any) => this.mapPost(p, likedPostIds.has(p.id))),
      total: Number(count),
    };
  }

  async getPostById(postId: string, userId: string): Promise<CommunityPost | null> {
    const post = await db('community_posts')
      .join('users', 'community_posts.author_id', 'users.id')
      .where('community_posts.id', postId)
      .select('community_posts.*', 'users.first_name', 'users.last_name')
      .first();

    if (!post) return null;

    const like = await db('community_post_likes')
      .where({ post_id: postId, user_id: userId })
      .first();

    return this.mapPost(post, !!like);
  }

  async createPost(input: PostCreateInput): Promise<CommunityPost> {
    const id = uuidv4();
    const now = new Date();

    await db('community_posts').insert({
      id,
      community_id: input.communityId,
      author_id: input.authorId,
      content: input.content,
      images: input.images ? JSON.stringify(input.images) : null,
      like_count: 0,
      comment_count: 0,
      is_pinned: false,
      created_at: now,
      updated_at: now,
    });

    await db('communities')
      .where({ id: input.communityId })
      .increment('post_count', 1);

    return this.getPostById(id, input.authorId) as Promise<CommunityPost>;
  }

  async updatePost(postId: string, content: string, images?: string[]): Promise<void> {
    await db('community_posts')
      .where({ id: postId })
      .update({
        content,
        images: images ? JSON.stringify(images) : null,
        updated_at: new Date(),
      });
  }

  async deletePost(postId: string, communityId: string): Promise<void> {
    await db('community_posts').where({ id: postId }).del();
    await db('communities')
      .where({ id: communityId })
      .decrement('post_count', 1);
  }

  async likePost(postId: string, userId: string): Promise<void> {
    const existing = await db('community_post_likes')
      .where({ post_id: postId, user_id: userId })
      .first();

    if (existing) return;

    await db('community_post_likes').insert({
      id: uuidv4(),
      post_id: postId,
      user_id: userId,
      created_at: new Date(),
    });

    await db('community_posts')
      .where({ id: postId })
      .increment('like_count', 1);
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    const deleted = await db('community_post_likes')
      .where({ post_id: postId, user_id: userId })
      .del();

    if (deleted > 0) {
      await db('community_posts')
        .where({ id: postId })
        .decrement('like_count', 1);
    }
  }

  // ==================== COMMENTS ====================

  async getComments(postId: string, userId: string, limit = 20, offset = 0): Promise<{ comments: CommunityComment[]; total: number }> {
    const comments = await db('community_comments')
      .join('users', 'community_comments.author_id', 'users.id')
      .where('community_comments.post_id', postId)
      .whereNull('community_comments.parent_id')
      .select(
        'community_comments.*',
        'users.first_name',
        'users.last_name'
      )
      .orderBy('community_comments.created_at', 'asc')
      .limit(limit)
      .offset(offset);

    // Get replies for each comment
    const commentIds = comments.map((c: any) => c.id);
    const replies = await db('community_comments')
      .join('users', 'community_comments.author_id', 'users.id')
      .whereIn('community_comments.parent_id', commentIds)
      .select('community_comments.*', 'users.first_name', 'users.last_name')
      .orderBy('community_comments.created_at', 'asc');

    // Get user's likes
    const allCommentIds = [...commentIds, ...replies.map((r: any) => r.id)];
    const likes = await db('community_comment_likes')
      .where({ user_id: userId })
      .whereIn('comment_id', allCommentIds);
    const likedCommentIds = new Set(likes.map((l: any) => l.comment_id));

    // Group replies by parent
    const repliesMap = replies.reduce((acc: any, r: any) => {
      if (!acc[r.parent_id]) acc[r.parent_id] = [];
      acc[r.parent_id].push(this.mapComment(r, likedCommentIds.has(r.id)));
      return acc;
    }, {});

    const [{ count }] = await db('community_comments')
      .where({ post_id: postId })
      .whereNull('parent_id')
      .count();

    return {
      comments: comments.map((c: any) => ({
        ...this.mapComment(c, likedCommentIds.has(c.id)),
        replies: repliesMap[c.id] || [],
      })),
      total: Number(count),
    };
  }

  async createComment(input: CommentCreateInput): Promise<CommunityComment> {
    const id = uuidv4();
    const now = new Date();

    await db('community_comments').insert({
      id,
      post_id: input.postId,
      author_id: input.authorId,
      parent_id: input.parentId || null,
      content: input.content,
      like_count: 0,
      created_at: now,
    });

    await db('community_posts')
      .where({ id: input.postId })
      .increment('comment_count', 1);

    const comment = await db('community_comments')
      .join('users', 'community_comments.author_id', 'users.id')
      .where('community_comments.id', id)
      .select('community_comments.*', 'users.first_name', 'users.last_name')
      .first();

    return this.mapComment(comment, false);
  }

  async deleteComment(commentId: string, postId: string): Promise<void> {
    // Delete replies first
    await db('community_comments').where({ parent_id: commentId }).del();
    await db('community_comments').where({ id: commentId }).del();

    // Recalculate comment count
    const [{ count }] = await db('community_comments')
      .where({ post_id: postId })
      .count();

    await db('community_posts')
      .where({ id: postId })
      .update({ comment_count: Number(count) });
  }

  async likeComment(commentId: string, userId: string): Promise<void> {
    const existing = await db('community_comment_likes')
      .where({ comment_id: commentId, user_id: userId })
      .first();

    if (existing) return;

    await db('community_comment_likes').insert({
      id: uuidv4(),
      comment_id: commentId,
      user_id: userId,
      created_at: new Date(),
    });

    await db('community_comments')
      .where({ id: commentId })
      .increment('like_count', 1);
  }

  // ==================== EVENTS ====================

  async getEvents(communityId?: string, userId?: string): Promise<CommunityEvent[]> {
    let query = db('community_events')
      .join('users', 'community_events.host_id', 'users.id')
      .where('community_events.start_date', '>', new Date())
      .select(
        'community_events.*',
        'users.first_name',
        'users.last_name'
      )
      .orderBy('community_events.start_date', 'asc');

    if (communityId) {
      query = query.where('community_events.community_id', communityId);
    }

    const events = await query;

    // Get user's attendances
    let attendingMap: Set<string> = new Set();
    if (userId) {
      const eventIds = events.map((e: any) => e.id);
      const attendances = await db('community_event_attendees')
        .where({ user_id: userId })
        .whereIn('event_id', eventIds);
      attendingMap = new Set(attendances.map((a: any) => a.event_id));
    }

    return events.map((e: any) => this.mapEvent(e, attendingMap.has(e.id)));
  }

  async getEventById(eventId: string, userId?: string): Promise<CommunityEvent | null> {
    const event = await db('community_events')
      .join('users', 'community_events.host_id', 'users.id')
      .where('community_events.id', eventId)
      .select('community_events.*', 'users.first_name', 'users.last_name')
      .first();

    if (!event) return null;

    let isAttending = false;
    if (userId) {
      const attendance = await db('community_event_attendees')
        .where({ event_id: eventId, user_id: userId })
        .first();
      isAttending = !!attendance;
    }

    return this.mapEvent(event, isAttending);
  }

  async createEvent(input: EventCreateInput): Promise<CommunityEvent> {
    const id = uuidv4();
    const now = new Date();

    await db('community_events').insert({
      id,
      community_id: input.communityId,
      title: input.title,
      description: input.description,
      start_date: input.startDate,
      end_date: input.endDate || null,
      location: input.location,
      is_virtual: input.isVirtual,
      meeting_link: input.meetingLink || null,
      attendee_count: 1, // Host is auto-attending
      max_attendees: input.maxAttendees,
      host_id: input.hostId,
      cover_image: input.coverImage || null,
      created_at: now,
      updated_at: now,
    });

    // Auto-register host
    await this.attendEvent(id, input.hostId);

    return this.getEventById(id, input.hostId) as Promise<CommunityEvent>;
  }

  async attendEvent(eventId: string, userId: string): Promise<void> {
    const existing = await db('community_event_attendees')
      .where({ event_id: eventId, user_id: userId })
      .first();

    if (existing) return;

    const event = await db('community_events').where({ id: eventId }).first();
    if (event && event.attendee_count >= event.max_attendees) {
      throw new Error('Event is at full capacity');
    }

    await db('community_event_attendees').insert({
      id: uuidv4(),
      event_id: eventId,
      user_id: userId,
      registered_at: new Date(),
    });

    await db('community_events')
      .where({ id: eventId })
      .increment('attendee_count', 1);
  }

  async unattendEvent(eventId: string, userId: string): Promise<void> {
    const deleted = await db('community_event_attendees')
      .where({ event_id: eventId, user_id: userId })
      .del();

    if (deleted > 0) {
      await db('community_events')
        .where({ id: eventId })
        .decrement('attendee_count', 1);
    }
  }

  async getEventAttendees(eventId: string, limit = 20, offset = 0): Promise<{ attendees: any[]; total: number }> {
    const attendees = await db('community_event_attendees')
      .join('users', 'community_event_attendees.user_id', 'users.id')
      .where('community_event_attendees.event_id', eventId)
      .select(
        'community_event_attendees.user_id',
        'community_event_attendees.registered_at',
        'users.first_name',
        'users.last_name'
      )
      .orderBy('community_event_attendees.registered_at', 'asc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('community_event_attendees')
      .where({ event_id: eventId })
      .count();

    return {
      attendees: attendees.map((a: any) => ({
        userId: a.user_id,
        name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Anonymous',
        registeredAt: a.registered_at,
      })),
      total: Number(count),
    };
  }

  // ==================== CATEGORIES ====================

  getCategories(): CommunityCategory[] {
    return COMMUNITY_CATEGORIES;
  }

  // ==================== MAPPERS ====================

  private mapCommunity(c: any): Community {
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      coverImage: c.cover_image,
      memberCount: c.member_count,
      postCount: c.post_count,
      category: c.category,
      color: c.color,
      rules: c.rules ? JSON.parse(c.rules) : undefined,
      isActive: c.is_active,
      createdBy: c.created_by,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  }

  private mapCommunityWithMembership(c: any, membershipMap: Record<string, string | undefined>): CommunityWithMembership {
    return {
      ...this.mapCommunity(c),
      isJoined: !!membershipMap[c.id],
      memberRole: membershipMap[c.id] as any,
    };
  }

  private mapPost(p: any, isLiked: boolean): CommunityPost {
    return {
      id: p.id,
      communityId: p.community_id,
      authorId: p.author_id,
      content: p.content,
      images: p.images ? JSON.parse(p.images) : undefined,
      likeCount: p.like_count,
      commentCount: p.comment_count,
      isPinned: p.is_pinned,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      author: {
        id: p.author_id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Anonymous',
        photoUrl: '',
      },
      isLiked,
    };
  }

  private mapComment(c: any, isLiked: boolean): CommunityComment {
    return {
      id: c.id,
      postId: c.post_id,
      authorId: c.author_id,
      parentId: c.parent_id,
      content: c.content,
      likeCount: c.like_count,
      createdAt: c.created_at,
      author: {
        id: c.author_id,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Anonymous',
        photoUrl: '',
      },
      isLiked,
    };
  }

  private mapEvent(e: any, isAttending: boolean): CommunityEvent {
    return {
      id: e.id,
      communityId: e.community_id,
      title: e.title,
      description: e.description,
      startDate: e.start_date,
      endDate: e.end_date,
      location: e.location,
      isVirtual: e.is_virtual,
      meetingLink: e.meeting_link,
      attendeeCount: e.attendee_count,
      maxAttendees: e.max_attendees,
      hostId: e.host_id,
      coverImage: e.cover_image,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      host: {
        id: e.host_id,
        name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Anonymous',
        photoUrl: '',
      },
      isAttending,
    };
  }
}

export const communityRepository = new CommunityRepository();
