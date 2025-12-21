import { db } from '../infrastructure/database';
import { SupportTicket } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class TicketsService {
  async listTickets(filters: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = db('support_tickets')
      .select('support_tickets.*', 'users.email as user_email', 'users.first_name as user_first_name', 'users.last_name as user_last_name')
      .leftJoin('users', 'support_tickets.user_id', 'users.id');

    if (filters.status) {
      query = query.where('support_tickets.status', filters.status);
    }

    if (filters.priority) {
      query = query.where('support_tickets.priority', filters.priority);
    }

    if (filters.assignedTo) {
      query = query.where('support_tickets.assigned_to', filters.assignedTo);
    }

    const [tickets, [{ count }]] = await Promise.all([
      query.orderBy('support_tickets.created_at', 'desc').limit(limit).offset(offset),
      query.clone().count('* as count'),
    ]);

    return {
      tickets: tickets.map(this.formatTicket),
      total: parseInt(count as string),
      page,
      limit,
    };
  }

  async getTicket(ticketId: string): Promise<SupportTicket> {
    const ticket = await db('support_tickets')
      .select('support_tickets.*', 'users.email as user_email', 'users.first_name as user_first_name', 'users.last_name as user_last_name')
      .leftJoin('users', 'support_tickets.user_id', 'users.id')
      .where('support_tickets.id', ticketId)
      .first();

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Fetch messages
    const messages = await db('ticket_messages')
      .where({ ticket_id: ticketId })
      .orderBy('created_at', 'asc');

    return {
      ...this.formatTicket(ticket),
      messages: messages.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        senderType: msg.sender_type,
        content: msg.content,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
        createdAt: msg.created_at,
      })),
    };
  }

  async createTicket(data: {
    userId: string;
    subject: string;
    description: string;
    category: string;
    priority: string;
  }): Promise<SupportTicket> {
    const ticketId = uuidv4();

    await db('support_tickets').insert({
      id: ticketId,
      user_id: data.userId,
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: 'open',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    logger.info(`Support ticket created: ${ticketId}`);

    return this.getTicket(ticketId);
  }

  async assignTicket(ticketId: string, adminId: string, adminName: string): Promise<void> {
    await db('support_tickets')
      .where({ id: ticketId })
      .update({
        assigned_to: adminId,
        assigned_to_name: adminName,
        status: 'in_progress',
        updated_at: db.fn.now(),
      });

    logger.info(`Ticket assigned: ${ticketId} to ${adminName}`);
  }

  async addMessage(ticketId: string, senderId: string, senderType: 'user' | 'admin', content: string, attachments?: string[]): Promise<void> {
    const messageId = uuidv4();

    await db('ticket_messages').insert({
      id: messageId,
      ticket_id: ticketId,
      sender_id: senderId,
      sender_type: senderType,
      content,
      attachments: attachments ? JSON.stringify(attachments) : null,
      created_at: db.fn.now(),
    });

    // Update ticket status if admin responded
    if (senderType === 'admin') {
      await db('support_tickets')
        .where({ id: ticketId })
        .update({
          status: 'waiting_user',
          updated_at: db.fn.now(),
        });
    } else {
      await db('support_tickets')
        .where({ id: ticketId })
        .update({
          status: 'in_progress',
          updated_at: db.fn.now(),
        });
    }

    logger.info(`Message added to ticket: ${ticketId}`);
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<void> {
    const updates: any = {
      status,
      updated_at: db.fn.now(),
    };

    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = db.fn.now();
    }

    await db('support_tickets')
      .where({ id: ticketId })
      .update(updates);

    logger.info(`Ticket status updated: ${ticketId} to ${status}`);
  }

  async updateTicketPriority(ticketId: string, priority: string): Promise<void> {
    await db('support_tickets')
      .where({ id: ticketId })
      .update({
        priority,
        updated_at: db.fn.now(),
      });

    logger.info(`Ticket priority updated: ${ticketId} to ${priority}`);
  }

  async getTicketStats() {
    const [open, inProgress, waitingUser, resolved, byPriority, avgResponseTime] = await Promise.all([
      db('support_tickets').where({ status: 'open' }).count('* as count').first(),
      db('support_tickets').where({ status: 'in_progress' }).count('* as count').first(),
      db('support_tickets').where({ status: 'waiting_user' }).count('* as count').first(),
      db('support_tickets').where({ status: 'resolved' }).count('* as count').first(),
      db('support_tickets').select('priority').count('* as count').groupBy('priority'),
      this.calculateAvgResponseTime(),
    ]);

    return {
      open: parseInt(open?.count as string) || 0,
      inProgress: parseInt(inProgress?.count as string) || 0,
      waitingUser: parseInt(waitingUser?.count as string) || 0,
      resolved: parseInt(resolved?.count as string) || 0,
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = parseInt(item.count as string);
        return acc;
      }, {} as Record<string, number>),
      avgResponseTime,
    };
  }

  private async calculateAvgResponseTime(): Promise<number> {
    // Calculate average time from ticket creation to first admin response
    const result = await db('support_tickets')
      .select(
        db.raw('AVG(EXTRACT(EPOCH FROM (ticket_messages.created_at - support_tickets.created_at))) as avg_seconds')
      )
      .join('ticket_messages', function() {
        this.on('support_tickets.id', '=', 'ticket_messages.ticket_id')
          .andOn('ticket_messages.sender_type', '=', db.raw('?', ['admin']));
      })
      .whereNotNull('ticket_messages.created_at')
      .first();

    return Math.round((result as { avg_seconds?: number })?.avg_seconds || 0);
  }

  private formatTicket(ticket: any): SupportTicket {
    return {
      id: ticket.id,
      userId: ticket.user_id,
      userEmail: ticket.user_email,
      userName: `${ticket.user_first_name} ${ticket.user_last_name}`,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedTo: ticket.assigned_to,
      assignedToName: ticket.assigned_to_name,
      messages: [],
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      resolvedAt: ticket.resolved_at,
    };
  }
}
