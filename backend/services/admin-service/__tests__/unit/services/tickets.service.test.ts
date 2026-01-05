import { TicketsService } from '../../../src/services/tickets.service';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234'),
}));

// Mock the database
jest.mock('../../../src/infrastructure/database', () => {
  const mockDb = jest.fn().mockImplementation((tableName: string) => {
    return {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      andOn: jest.fn().mockReturnThis(),
      whereNotNull: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn(),
      first: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
    };
  });
  mockDb.fn = {
    now: jest.fn().mockReturnValue(new Date('2026-01-04T12:00:00.000Z')),
  };
  mockDb.raw = jest.fn();
  return { db: mockDb };
});

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { db } from '../../../src/infrastructure/database';
import { logger } from '../../../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

describe('TicketsService', () => {
  let ticketsService: TicketsService;
  const mockDb = db as jest.MockedFunction<typeof db>;

  beforeEach(() => {
    ticketsService = new TicketsService();
    jest.clearAllMocks();
  });

  describe('listTickets', () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      count: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return paginated tickets with default filters', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          user_id: 'user-1',
          user_email: 'john@example.com',
          user_first_name: 'John',
          user_last_name: 'Doe',
          subject: 'Login issue',
          description: 'Cannot log in',
          category: 'technical',
          priority: 'high',
          status: 'open',
          assigned_to: null,
          assigned_to_name: null,
          created_at: new Date('2026-01-04'),
          updated_at: new Date('2026-01-04'),
          resolved_at: null,
        },
      ];

      mockQueryBuilder.offset.mockResolvedValue(mockTickets);
      mockQueryBuilder.count.mockResolvedValue([{ count: '1' }]);

      const result = await ticketsService.listTickets({});

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0]).toEqual(
        expect.objectContaining({
          id: 'ticket-1',
          userId: 'user-1',
          userEmail: 'john@example.com',
          userName: 'John Doe',
          subject: 'Login issue',
          status: 'open',
        })
      );
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockQueryBuilder.offset.mockResolvedValue([]);
      mockQueryBuilder.count.mockResolvedValue([{ count: '0' }]);

      await ticketsService.listTickets({ status: 'open' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'support_tickets.status',
        'open'
      );
    });

    it('should filter by priority', async () => {
      mockQueryBuilder.offset.mockResolvedValue([]);
      mockQueryBuilder.count.mockResolvedValue([{ count: '0' }]);

      await ticketsService.listTickets({ priority: 'urgent' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'support_tickets.priority',
        'urgent'
      );
    });

    it('should filter by assignedTo', async () => {
      mockQueryBuilder.offset.mockResolvedValue([]);
      mockQueryBuilder.count.mockResolvedValue([{ count: '0' }]);

      await ticketsService.listTickets({ assignedTo: 'admin-1' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'support_tickets.assigned_to',
        'admin-1'
      );
    });

    it('should apply pagination correctly', async () => {
      mockQueryBuilder.offset.mockResolvedValue([]);
      mockQueryBuilder.count.mockResolvedValue([{ count: '100' }]);

      await ticketsService.listTickets({ page: 3, limit: 10 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(20); // (3-1) * 10
    });
  });

  describe('getTicket', () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return ticket with messages', async () => {
      const mockTicket = {
        id: 'ticket-1',
        user_id: 'user-1',
        user_email: 'test@example.com',
        user_first_name: 'Test',
        user_last_name: 'User',
        subject: 'Help needed',
        description: 'I need help',
        category: 'technical',
        priority: 'medium',
        status: 'in_progress',
        assigned_to: 'admin-1',
        assigned_to_name: 'Admin User',
        created_at: new Date('2026-01-03'),
        updated_at: new Date('2026-01-04'),
        resolved_at: null,
      };

      const mockMessages = [
        {
          id: 'msg-1',
          sender_id: 'user-1',
          sender_type: 'user',
          content: 'Initial message',
          attachments: null,
          created_at: new Date('2026-01-03'),
        },
        {
          id: 'msg-2',
          sender_id: 'admin-1',
          sender_type: 'admin',
          content: 'Response from admin',
          attachments: JSON.stringify(['file1.pdf']),
          created_at: new Date('2026-01-04'),
        },
      ];

      mockQueryBuilder.first
        .mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce(mockMessages);

      // Fix: Need to mock the second query for messages
      let callCount = 0;
      (mockDb as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            first: jest.fn().mockResolvedValue(mockTicket),
          };
        }
        return {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockMessages),
        };
      });

      const result = await ticketsService.getTicket('ticket-1');

      expect(result.id).toBe('ticket-1');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].attachments).toEqual(['file1.pdf']);
    });

    it('should throw error when ticket not found', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(null);

      await expect(ticketsService.getTicket('non-existent'))
        .rejects.toThrow('Ticket not found');
    });
  });

  describe('createTicket', () => {
    const mockQueryBuilder = {
      insert: jest.fn(),
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
      (uuidv4 as jest.Mock).mockReturnValue('new-ticket-uuid');
    });

    it('should create a new ticket', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const mockTicket = {
        id: 'new-ticket-uuid',
        user_id: 'user-1',
        user_email: 'user@test.com',
        user_first_name: 'Test',
        user_last_name: 'User',
        subject: 'New issue',
        description: 'Description of issue',
        category: 'billing',
        priority: 'high',
        status: 'open',
        assigned_to: null,
        assigned_to_name: null,
        created_at: new Date(),
        updated_at: new Date(),
        resolved_at: null,
      };

      let callCount = 0;
      (mockDb as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            insert: jest.fn().mockResolvedValue([1]),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockTicket),
        };
      });

      const ticketData = {
        userId: 'user-1',
        subject: 'New issue',
        description: 'Description of issue',
        category: 'billing',
        priority: 'high',
      };

      const result = await ticketsService.createTicket(ticketData);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Support ticket created')
      );
    });

    it('should set status to open for new tickets', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);
      mockQueryBuilder.first.mockResolvedValue({
        id: 'new-ticket-uuid',
        user_id: 'user-1',
        user_email: 'test@test.com',
        user_first_name: 'Test',
        user_last_name: 'User',
        subject: 'Test',
        description: 'Test',
        category: 'technical',
        priority: 'low',
        status: 'open',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await ticketsService.createTicket({
        userId: 'user-1',
        subject: 'Test',
        description: 'Test',
        category: 'technical',
        priority: 'low',
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'open',
        })
      );
    });
  });

  describe('assignTicket', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should assign ticket to admin', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.assignTicket('ticket-1', 'admin-1', 'John Admin');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          assigned_to: 'admin-1',
          assigned_to_name: 'John Admin',
          status: 'in_progress',
        })
      );
    });

    it('should log assignment', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.assignTicket('ticket-1', 'admin-1', 'John Admin');

      expect(logger.info).toHaveBeenCalledWith(
        'Ticket assigned: ticket-1 to John Admin'
      );
    });
  });

  describe('addMessage', () => {
    const mockQueryBuilder = {
      insert: jest.fn(),
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
      (uuidv4 as jest.Mock).mockReturnValue('msg-uuid');
    });

    it('should add message from admin and update status', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.addMessage(
        'ticket-1',
        'admin-1',
        'admin',
        'Here is help'
      );

      expect(mockDb).toHaveBeenCalledWith('ticket_messages');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket_id: 'ticket-1',
          sender_id: 'admin-1',
          sender_type: 'admin',
          content: 'Here is help',
        })
      );

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'waiting_user',
        })
      );
    });

    it('should add message from user and update status', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.addMessage(
        'ticket-1',
        'user-1',
        'user',
        'Thanks for help'
      );

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
        })
      );
    });

    it('should handle attachments', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.addMessage(
        'ticket-1',
        'user-1',
        'user',
        'See attached',
        ['file1.pdf', 'image.png']
      );

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: JSON.stringify(['file1.pdf', 'image.png']),
        })
      );
    });

    it('should log message addition', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.addMessage('ticket-1', 'admin-1', 'admin', 'Response');

      expect(logger.info).toHaveBeenCalledWith('Message added to ticket: ticket-1');
    });
  });

  describe('updateTicketStatus', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should update ticket status', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.updateTicketStatus('ticket-1', 'in_progress');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
        })
      );
    });

    it('should set resolved_at when status is resolved', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.updateTicketStatus('ticket-1', 'resolved');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          resolved_at: expect.anything(),
        })
      );
    });

    it('should set resolved_at when status is closed', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.updateTicketStatus('ticket-1', 'closed');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'closed',
          resolved_at: expect.anything(),
        })
      );
    });

    it('should log status update', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.updateTicketStatus('ticket-1', 'waiting_user');

      expect(logger.info).toHaveBeenCalledWith(
        'Ticket status updated: ticket-1 to waiting_user'
      );
    });
  });

  describe('updateTicketPriority', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should update ticket priority', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.updateTicketPriority('ticket-1', 'urgent');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'urgent',
        })
      );
    });

    it('should log priority update', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await ticketsService.updateTicketPriority('ticket-1', 'high');

      expect(logger.info).toHaveBeenCalledWith(
        'Ticket priority updated: ticket-1 to high'
      );
    });
  });

  describe('getTicketStats', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn(),
      join: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      andOn: jest.fn().mockReturnThis(),
      whereNotNull: jest.fn().mockReturnThis(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return ticket statistics', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: '10' })  // open
        .mockResolvedValueOnce({ count: '5' })   // in_progress
        .mockResolvedValueOnce({ count: '3' })   // waiting_user
        .mockResolvedValueOnce({ count: '20' })  // resolved
        .mockResolvedValueOnce({ avg_seconds: 3600 }); // avg response time

      mockQueryBuilder.groupBy.mockResolvedValue([
        { priority: 'high', count: '8' },
        { priority: 'medium', count: '15' },
        { priority: 'low', count: '15' },
      ]);

      const stats = await ticketsService.getTicketStats();

      expect(stats).toEqual({
        open: 10,
        inProgress: 5,
        waitingUser: 3,
        resolved: 20,
        byPriority: {
          high: 8,
          medium: 15,
          low: 15,
        },
        avgResponseTime: 3600,
      });
    });

    it('should handle null counts gracefully', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ avg_seconds: null });

      mockQueryBuilder.groupBy.mockResolvedValue([]);

      const stats = await ticketsService.getTicketStats();

      expect(stats.open).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.avgResponseTime).toBe(0);
    });
  });
});
