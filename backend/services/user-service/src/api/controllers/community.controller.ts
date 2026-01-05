import { Response } from 'express';

import { CommunityCategory } from '../../domain/entities/Community.entity';
import { communityService, CommunityService } from '../../domain/services/community.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class CommunityController {
  private service: CommunityService;

  constructor(service?: CommunityService) {
    this.service = service || communityService;
  }

  // ==================== COMMUNITIES ====================

  async getCategories(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      const categories = this.service.getCategories();
      return res.status(200).json({ success: true, data: categories });
    } catch (error: any) {
      logger.error('Error getting categories:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async listCommunities(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const category = req.query.category as CommunityCategory | undefined;
      const communities = await this.service.getAllCommunities(userId, category);
      return res.status(200).json({ success: true, data: { communities } });
    } catch (error: any) {
      logger.error('Error getting communities:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getJoinedCommunities(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const communities = await this.service.getJoinedCommunities(userId);
      return res.status(200).json({ success: true, data: { communities } });
    } catch (error: any) {
      logger.error('Error getting joined communities:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async searchCommunities(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ success: false, message: 'Search query required' });
      }
      const communities = await this.service.searchCommunities(query, userId);
      return res.status(200).json({ success: true, data: { communities } });
    } catch (error: any) {
      logger.error('Error searching communities:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCommunity(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const { communityId } = req.params;
      const community = await this.service.getCommunity(communityId, userId);
      if (!community) {
        return res.status(404).json({ success: false, message: 'Community not found' });
      }
      return res.status(200).json({ success: true, data: community });
    } catch (error: any) {
      logger.error('Error getting community:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async createCommunity(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { name, description, icon, coverImage, category, color, rules } = req.body;

      if (!name || !description || !icon || !category) {
        return res.status(400).json({
          success: false,
          message: 'Name, description, icon, and category are required',
        });
      }

      const community = await this.service.createCommunity({
        name,
        description,
        icon,
        coverImage,
        category,
        color,
        rules,
        createdBy: userId,
      });

      return res.status(201).json({ success: true, data: community });
    } catch (error: any) {
      logger.error('Error creating community:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async joinCommunity(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { communityId } = req.params;
      const result = await this.service.joinCommunity(communityId, userId);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      logger.error('Error joining community:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async leaveCommunity(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { communityId } = req.params;
      const result = await this.service.leaveCommunity(communityId, userId);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      logger.error('Error leaving community:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getMembers(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { communityId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const result = await this.service.getMembers(communityId, page, limit);
      return res
        .status(200)
        .json({ success: true, data: { items: result.members, total: result.total } });
    } catch (error: any) {
      logger.error('Error getting members:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ==================== POSTS ====================

  async getPosts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { communityId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const result = await this.service.getPosts(communityId, userId, page, limit);
      return res
        .status(200)
        .json({ success: true, data: { items: result.posts, total: result.total } });
    } catch (error: any) {
      logger.error('Error getting posts:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async createPost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { communityId } = req.params;
      const { content, images } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Content is required' });
      }

      const result = await this.service.createPost(communityId, userId, content, images);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
      return res.status(201).json({ success: true, data: result.post });
    } catch (error: any) {
      logger.error('Error creating post:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async updatePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { postId } = req.params;
      const { content, images } = req.body;
      const result = await this.service.updatePost(postId, userId, content, images);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      logger.error('Error updating post:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async deletePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { postId } = req.params;
      const result = await this.service.deletePost(postId, userId);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      logger.error('Error deleting post:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async likePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { postId } = req.params;
      await this.service.likePost(postId, userId);
      return res.status(200).json({ success: true, message: 'Post liked' });
    } catch (error: any) {
      logger.error('Error liking post:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async unlikePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { postId } = req.params;
      await this.service.unlikePost(postId, userId);
      return res.status(200).json({ success: true, message: 'Post unliked' });
    } catch (error: any) {
      logger.error('Error unliking post:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ==================== COMMENTS ====================

  async getComments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { postId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const result = await this.service.getComments(postId, userId, page, limit);
      return res
        .status(200)
        .json({ success: true, data: { items: result.comments, total: result.total } });
    } catch (error: any) {
      logger.error('Error getting comments:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async createComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { postId } = req.params;
      const { content, parentId } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Content is required' });
      }

      const comment = await this.service.createComment(postId, userId, content, parentId);
      return res.status(201).json({ success: true, data: comment });
    } catch (error: any) {
      logger.error('Error creating comment:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { postId, commentId } = req.params;
      const result = await this.service.deleteComment(commentId, postId, userId);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      logger.error('Error deleting comment:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async likeComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { commentId } = req.params;
      await this.service.likeComment(commentId, userId);
      return res.status(200).json({ success: true, message: 'Comment liked' });
    } catch (error: any) {
      logger.error('Error liking comment:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ==================== EVENTS ====================

  async getAllEvents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const events = await this.service.getEvents(undefined, userId);
      return res.status(200).json({ success: true, data: { events } });
    } catch (error: any) {
      logger.error('Error getting events:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCommunityEvents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const { communityId } = req.params;
      const events = await this.service.getEvents(communityId, userId);
      return res.status(200).json({ success: true, data: { events } });
    } catch (error: any) {
      logger.error('Error getting community events:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getEvent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const { eventId } = req.params;
      const event = await this.service.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      return res.status(200).json({ success: true, data: event });
    } catch (error: any) {
      logger.error('Error getting event:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async attendEvent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const result = await this.service.attendEvent(eventId, userId);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      logger.error('Error attending event:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async unattendEvent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const result = await this.service.unattendEvent(eventId, userId);
      return res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      logger.error('Error unattending event:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getEventAttendees(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { eventId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const result = await this.service.getEventAttendees(eventId, page, limit);
      return res
        .status(200)
        .json({ success: true, data: { items: result.attendees, total: result.total } });
    } catch (error: any) {
      logger.error('Error getting attendees:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const communityController = new CommunityController();
export default communityController;
