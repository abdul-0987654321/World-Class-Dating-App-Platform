import { communityRepository, CommunityRepository } from '../repositories/community.repository';
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
  EventCreateInput,
} from '../entities/Community.entity';
import logger from '../../utils/logger';

export class CommunityService {
  constructor(private repository: CommunityRepository = communityRepository) {}

  // ==================== COMMUNITIES ====================

  async getAllCommunities(userId?: string, category?: CommunityCategory): Promise<CommunityWithMembership[]> {
    return this.repository.getAll(userId, category);
  }

  async getCommunity(communityId: string, userId?: string): Promise<CommunityWithMembership | null> {
    return this.repository.getById(communityId, userId);
  }

  async getJoinedCommunities(userId: string): Promise<CommunityWithMembership[]> {
    return this.repository.getJoinedByUser(userId);
  }

  async searchCommunities(query: string, userId?: string): Promise<CommunityWithMembership[]> {
    return this.repository.search(query, userId);
  }

  async createCommunity(input: CommunityCreateInput): Promise<Community> {
    logger.info(`Creating community: ${input.name} by user ${input.createdBy}`);
    return this.repository.create(input);
  }

  // ==================== MEMBERSHIP ====================

  async joinCommunity(communityId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const community = await this.repository.getById(communityId);
    if (!community) {
      return { success: false, message: 'Community not found' };
    }

    const isMember = await this.repository.isMember(communityId, userId);
    if (isMember) {
      return { success: false, message: 'Already a member' };
    }

    await this.repository.addMember(communityId, userId, 'member');
    return { success: true, message: 'Joined community successfully' };
  }

  async leaveCommunity(communityId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const role = await this.repository.getMemberRole(communityId, userId);
    if (!role) {
      return { success: false, message: 'Not a member of this community' };
    }

    if (role === 'admin') {
      // Check if there are other admins
      const { members } = await this.repository.getMembers(communityId, 100, 0);
      const otherAdmins = members.filter(m => m.role === 'admin' && m.userId !== userId);
      if (otherAdmins.length === 0) {
        return { success: false, message: 'Cannot leave: you are the only admin. Transfer ownership first.' };
      }
    }

    await this.repository.removeMember(communityId, userId);
    return { success: true, message: 'Left community successfully' };
  }

  async getMembers(communityId: string, page: number, limit: number): Promise<{ members: CommunityMember[]; total: number }> {
    const offset = (page - 1) * limit;
    return this.repository.getMembers(communityId, limit, offset);
  }

  // ==================== POSTS ====================

  async getPosts(communityId: string, userId: string, page: number, limit: number): Promise<{ posts: CommunityPost[]; total: number }> {
    const offset = (page - 1) * limit;
    return this.repository.getPosts(communityId, userId, limit, offset);
  }

  async createPost(communityId: string, userId: string, content: string, images?: string[]): Promise<{ success: boolean; post?: CommunityPost; message?: string }> {
    const isMember = await this.repository.isMember(communityId, userId);
    if (!isMember) {
      return { success: false, message: 'Must be a member to post' };
    }

    const post = await this.repository.createPost({
      communityId,
      authorId: userId,
      content,
      images,
    });

    return { success: true, post };
  }

  async updatePost(postId: string, userId: string, content: string, images?: string[]): Promise<{ success: boolean; message: string }> {
    const post = await this.repository.getPostById(postId, userId);
    if (!post) {
      return { success: false, message: 'Post not found' };
    }

    if (post.authorId !== userId) {
      // Check if user is moderator/admin
      const role = await this.repository.getMemberRole(post.communityId, userId);
      if (role !== 'moderator' && role !== 'admin') {
        return { success: false, message: 'Not authorized to edit this post' };
      }
    }

    await this.repository.updatePost(postId, content, images);
    return { success: true, message: 'Post updated' };
  }

  async deletePost(postId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const post = await this.repository.getPostById(postId, userId);
    if (!post) {
      return { success: false, message: 'Post not found' };
    }

    if (post.authorId !== userId) {
      const role = await this.repository.getMemberRole(post.communityId, userId);
      if (role !== 'moderator' && role !== 'admin') {
        return { success: false, message: 'Not authorized to delete this post' };
      }
    }

    await this.repository.deletePost(postId, post.communityId);
    return { success: true, message: 'Post deleted' };
  }

  async likePost(postId: string, userId: string): Promise<void> {
    await this.repository.likePost(postId, userId);
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    await this.repository.unlikePost(postId, userId);
  }

  // ==================== COMMENTS ====================

  async getComments(postId: string, userId: string, page: number, limit: number): Promise<{ comments: CommunityComment[]; total: number }> {
    const offset = (page - 1) * limit;
    return this.repository.getComments(postId, userId, limit, offset);
  }

  async createComment(postId: string, userId: string, content: string, parentId?: string): Promise<CommunityComment> {
    return this.repository.createComment({
      postId,
      authorId: userId,
      parentId,
      content,
    });
  }

  async deleteComment(commentId: string, postId: string, userId: string): Promise<{ success: boolean; message: string }> {
    // Get comment to check author
    const { comments } = await this.repository.getComments(postId, userId, 100, 0);
    const comment = comments.find(c => c.id === commentId);

    if (!comment) {
      return { success: false, message: 'Comment not found' };
    }

    if (comment.authorId !== userId) {
      // Check if user is moderator/admin of the community
      const post = await this.repository.getPostById(postId, userId);
      if (post) {
        const role = await this.repository.getMemberRole(post.communityId, userId);
        if (role !== 'moderator' && role !== 'admin') {
          return { success: false, message: 'Not authorized to delete this comment' };
        }
      }
    }

    await this.repository.deleteComment(commentId, postId);
    return { success: true, message: 'Comment deleted' };
  }

  async likeComment(commentId: string, userId: string): Promise<void> {
    await this.repository.likeComment(commentId, userId);
  }

  // ==================== EVENTS ====================

  async getEvents(communityId?: string, userId?: string): Promise<CommunityEvent[]> {
    return this.repository.getEvents(communityId, userId);
  }

  async getEvent(eventId: string, userId?: string): Promise<CommunityEvent | null> {
    return this.repository.getEventById(eventId, userId);
  }

  async createEvent(input: EventCreateInput): Promise<CommunityEvent> {
    logger.info(`Creating event: ${input.title} in community ${input.communityId}`);
    return this.repository.createEvent(input);
  }

  async attendEvent(eventId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.repository.attendEvent(eventId, userId);
      return { success: true, message: 'Registered for event' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async unattendEvent(eventId: string, userId: string): Promise<{ success: boolean; message: string }> {
    await this.repository.unattendEvent(eventId, userId);
    return { success: true, message: 'Unregistered from event' };
  }

  async getEventAttendees(eventId: string, page: number, limit: number): Promise<{ attendees: any[]; total: number }> {
    const offset = (page - 1) * limit;
    return this.repository.getEventAttendees(eventId, limit, offset);
  }

  // ==================== CATEGORIES ====================

  getCategories(): CommunityCategory[] {
    return this.repository.getCategories();
  }
}

export const communityService = new CommunityService();
