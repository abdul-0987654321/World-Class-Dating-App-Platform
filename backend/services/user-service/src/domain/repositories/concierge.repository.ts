import db from '../../infrastructure/database/connection';
import {
  ConciergeRequest,
  ConciergeRequestCreateInput,
  ConciergeRequestUpdateInput,
  ConciergeMessage,
  ConciergeMessageCreateInput,
  ConciergeRequestWithMessages,
} from '../entities/ConciergeRequest.entity';

export class ConciergeRepository {
  private requestsTable = 'concierge_requests';
  private messagesTable = 'concierge_messages';

  // ============ Concierge Requests ============

  async createRequest(data: ConciergeRequestCreateInput): Promise<ConciergeRequest> {
    const [request] = await db(this.requestsTable)
      .insert({
        user_id: data.user_id,
        type: data.type,
        description: data.description,
        status: 'pending',
        priority: data.priority || 'normal',
        budget_range: data.budget_range,
        preferred_date: data.preferred_date,
        location_preference: data.location_preference,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null,
      })
      .returning('*');

    return this.parseRequest(request);
  }

  async findRequestById(id: string): Promise<ConciergeRequest | null> {
    const request = await db(this.requestsTable).where({ id }).first();
    return request ? this.parseRequest(request) : null;
  }

  async findRequestWithMessages(id: string): Promise<ConciergeRequestWithMessages | null> {
    const request = await this.findRequestById(id);
    if (!request) return null;

    const messages = await this.getRequestMessages(id);

    return {
      ...request,
      messages,
    };
  }

  async updateRequest(id: string, data: ConciergeRequestUpdateInput): Promise<ConciergeRequest | null> {
    const updateData: any = { ...data, updated_at: db.fn.now() };
    if (data.attachments) {
      updateData.attachments = JSON.stringify(data.attachments);
    }

    const [request] = await db(this.requestsTable)
      .where({ id })
      .update(updateData)
      .returning('*');

    return request ? this.parseRequest(request) : null;
  }

  async getUserRequests(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<ConciergeRequest[]> {
    let query = db(this.requestsTable)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    if (options?.status) {
      query = query.where('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const requests = await query;
    return requests.map((r: any) => this.parseRequest(r));
  }

  async countUserRequests(userId: string, status?: string): Promise<number> {
    let query = db(this.requestsTable)
      .where({ user_id: userId })
      .count('id as count');

    if (status) {
      query = query.where('status', status);
    }

    const result = await query.first();
    return parseInt(result?.count as string, 10) || 0;
  }

  async getPendingRequests(): Promise<ConciergeRequest[]> {
    const requests = await db(this.requestsTable)
      .whereIn('status', ['pending', 'in_progress', 'awaiting_info'])
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'asc');

    return requests.map((r: any) => this.parseRequest(r));
  }

  // ============ Concierge Messages ============

  async createMessage(data: ConciergeMessageCreateInput): Promise<ConciergeMessage> {
    const [message] = await db(this.messagesTable)
      .insert({
        request_id: data.request_id,
        sender_id: data.sender_id,
        sender_type: data.sender_type,
        message: data.message,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null,
      })
      .returning('*');

    return this.parseMessage(message);
  }

  async getRequestMessages(requestId: string): Promise<ConciergeMessage[]> {
    const messages = await db(this.messagesTable)
      .where({ request_id: requestId })
      .orderBy('created_at', 'asc');

    return messages.map((m: any) => this.parseMessage(m));
  }

  async getLatestMessage(requestId: string): Promise<ConciergeMessage | null> {
    const message = await db(this.messagesTable)
      .where({ request_id: requestId })
      .orderBy('created_at', 'desc')
      .first();

    return message ? this.parseMessage(message) : null;
  }

  private parseRequest(request: any): ConciergeRequest {
    return {
      ...request,
      attachments: request.attachments
        ? typeof request.attachments === 'string'
          ? JSON.parse(request.attachments)
          : request.attachments
        : [],
    };
  }

  private parseMessage(message: any): ConciergeMessage {
    return {
      ...message,
      attachments: message.attachments
        ? typeof message.attachments === 'string'
          ? JSON.parse(message.attachments)
          : message.attachments
        : [],
    };
  }
}
