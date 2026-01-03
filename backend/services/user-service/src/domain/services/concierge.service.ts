import { ConciergeRepository } from '../repositories/concierge.repository';
import {
  ConciergeRequest,
  ConciergeRequestCreateInput,
  ConciergeRequestType,
  ConciergeRequestStatus,
  ConciergeRequestPriority,
  ConciergeMessage,
  ConciergeRequestWithMessages,
  ConciergeRequestResponse,
} from '../entities/ConciergeRequest.entity';
import logger from '../../utils/logger';

export interface SubmitRequestInput {
  type: ConciergeRequestType;
  description: string;
  priority?: ConciergeRequestPriority;
  budget_range?: string;
  preferred_date?: Date;
  location_preference?: string;
  attachments?: string[];
}

export interface AddMessageInput {
  message: string;
  attachments?: string[];
}

export class ConciergeService {
  private repository: ConciergeRepository;

  constructor() {
    this.repository = new ConciergeRepository();
  }

  /**
   * Submit a new concierge request
   */
  async submitRequest(
    userId: string,
    input: SubmitRequestInput
  ): Promise<{ success: boolean; request?: ConciergeRequest; error?: string }> {
    try {
      // Validate description length
      if (input.description.length < 10) {
        return { success: false, error: 'Description must be at least 10 characters' };
      }

      if (input.description.length > 2000) {
        return { success: false, error: 'Description must be less than 2000 characters' };
      }

      // Check for too many open requests (limit to 5 active requests)
      const activeCount = await this.repository.countUserRequests(userId, 'pending');
      const inProgressCount = await this.repository.countUserRequests(userId, 'in_progress');

      if (activeCount + inProgressCount >= 5) {
        return {
          success: false,
          error: 'You have reached the maximum number of active requests. Please wait for some to be completed.',
        };
      }

      const requestData: ConciergeRequestCreateInput = {
        user_id: userId,
        type: input.type,
        description: input.description,
        priority: input.priority || 'normal',
        budget_range: input.budget_range,
        preferred_date: input.preferred_date,
        location_preference: input.location_preference,
        attachments: input.attachments,
      };

      const request = await this.repository.createRequest(requestData);

      logger.info(`Concierge request created: ${request.id} by user ${userId}`);
      return { success: true, request };
    } catch (error) {
      logger.error('Error submitting concierge request:', error);
      throw error;
    }
  }

  /**
   * Get all requests for a user
   */
  async getMyRequests(
    userId: string,
    options?: { status?: ConciergeRequestStatus; limit?: number; offset?: number }
  ): Promise<ConciergeRequestResponse[]> {
    try {
      const requests = await this.repository.getUserRequests(userId, {
        status: options?.status,
        limit: options?.limit || 20,
        offset: options?.offset || 0,
      });

      return requests.map((r) => this.toRequestResponse(r));
    } catch (error) {
      logger.error('Error getting user concierge requests:', error);
      throw error;
    }
  }

  /**
   * Get a specific request with full details
   */
  async getRequestStatus(
    userId: string,
    requestId: string
  ): Promise<ConciergeRequestWithMessages | null> {
    try {
      const request = await this.repository.findRequestWithMessages(requestId);

      if (!request) {
        return null;
      }

      // Verify ownership
      if (request.user_id !== userId) {
        return null;
      }

      return request;
    } catch (error) {
      logger.error('Error getting concierge request status:', error);
      throw error;
    }
  }

  /**
   * Add a message to a request
   */
  async addMessage(
    userId: string,
    requestId: string,
    input: AddMessageInput
  ): Promise<{ success: boolean; message?: ConciergeMessage; error?: string }> {
    try {
      const request = await this.repository.findRequestById(requestId);

      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      if (request.user_id !== userId) {
        return { success: false, error: 'Not authorized to message on this request' };
      }

      if (request.status === 'completed' || request.status === 'cancelled') {
        return { success: false, error: 'Cannot add messages to closed requests' };
      }

      const message = await this.repository.createMessage({
        request_id: requestId,
        sender_id: userId,
        sender_type: 'user',
        message: input.message,
        attachments: input.attachments,
      });

      logger.info(`Message added to concierge request ${requestId} by user ${userId}`);
      return { success: true, message };
    } catch (error) {
      logger.error('Error adding message to concierge request:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending request
   */
  async cancelRequest(
    userId: string,
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = await this.repository.findRequestById(requestId);

      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      if (request.user_id !== userId) {
        return { success: false, error: 'Not authorized to cancel this request' };
      }

      if (request.status === 'completed' || request.status === 'cancelled') {
        return { success: false, error: 'Request is already closed' };
      }

      if (request.status === 'in_progress') {
        return {
          success: false,
          error: 'Cannot cancel a request that is in progress. Please contact support.',
        };
      }

      await this.repository.updateRequest(requestId, { status: 'cancelled' });

      logger.info(`Concierge request ${requestId} cancelled by user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error cancelling concierge request:', error);
      throw error;
    }
  }

  /**
   * Get available request types
   */
  getRequestTypes(): { type: ConciergeRequestType; name: string; description: string }[] {
    return [
      {
        type: 'date-planning',
        name: 'Date Planning',
        description: 'Let our experts plan the perfect date for you',
      },
      {
        type: 'reservation',
        name: 'Restaurant Reservation',
        description: 'Secure a table at the best restaurants, even with limited availability',
      },
      {
        type: 'advice',
        name: 'Dating Advice',
        description: 'Get personalized advice from our relationship experts',
      },
      {
        type: 'gift-recommendation',
        name: 'Gift Recommendation',
        description: 'Find the perfect gift for your special someone',
      },
      {
        type: 'travel',
        name: 'Travel Planning',
        description: 'Plan a romantic getaway or travel date',
      },
      {
        type: 'other',
        name: 'Other Request',
        description: 'Any other dating-related assistance you need',
      },
    ];
  }

  /**
   * Get request priority options
   */
  getPriorityOptions(): { priority: ConciergeRequestPriority; name: string; description: string }[] {
    return [
      {
        priority: 'low',
        name: 'Low Priority',
        description: 'Response within 48-72 hours',
      },
      {
        priority: 'normal',
        name: 'Normal Priority',
        description: 'Response within 24-48 hours',
      },
      {
        priority: 'high',
        name: 'High Priority',
        description: 'Response within 12-24 hours',
      },
      {
        priority: 'urgent',
        name: 'Urgent',
        description: 'Response within 4-6 hours',
      },
    ];
  }

  private toRequestResponse(request: ConciergeRequest): ConciergeRequestResponse {
    return {
      id: request.id,
      type: request.type,
      description: request.description,
      status: request.status,
      priority: request.priority,
      response: request.response,
      preferred_date: request.preferred_date,
      location_preference: request.location_preference,
      created_at: request.created_at,
      updated_at: request.updated_at,
    };
  }
}
