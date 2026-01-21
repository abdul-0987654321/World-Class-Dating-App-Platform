import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

// Services
import { VulnerabilityWindowService, WindowTheme } from '../services/vulnerability-window.service';
import { ConversationMomentumService } from '../services/conversation-momentum.service';
import { MicroDateService } from '../services/micro-date.service';
import { GhostingPreventionService, ConversationData, UserProfile } from '../services/ghosting-prevention.service';

// DTOs
import {
  InitiateVulnerabilityWindowDto,
  DeclineVulnerabilityWindowDto,
  VulnerabilityWindowIdParams,
  ConversationIdParams,
  MomentumParams,
  MomentumHistoryQueryDto,
  ProposeMicroDateDto,
  AcceptMicroDateDto,
  DeclineMicroDateDto,
  MicroDateIdParams,
  UpcomingMicroDatesQueryDto,
  TimeSuggestionsQueryDto,
  GhostingRiskParams,
  AtRiskConversationsQueryDto,
  ApiResponse,
} from '../dto/engagement.dto';

// Infrastructure
import { messageRepository } from '../domain/repositories/message.repository';
import { conversationRepository } from '../domain/repositories/conversation.repository';
import { createLogger } from '../utils/logger';

const logger = createLogger('engagement-controller');

/**
 * Interface for authenticated request with user data
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    userId: string;
    email: string;
  };
}

/**
 * Simple JWT Auth Guard for NestJS
 * In production, this would validate JWT tokens and extract user info
 */
@Injectable()
class JwtAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    // In a real implementation, this would verify the JWT token
    // For now, we check if the user object exists (set by middleware)
    if (!request.user || !request.user.userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return true;
  }
}

/**
 * EngagementController
 *
 * Handles all Tier 2 engagement feature endpoints:
 * - Vulnerability Windows: Time-limited deeper sharing features
 * - Conversation Momentum: Real-time conversation analysis
 * - Micro-Dates: 15-minute video date scheduling
 * - Ghosting Prevention: Proactive re-engagement system
 */
@Controller('engagement')
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(
    private readonly vulnerabilityWindowService: VulnerabilityWindowService,
    private readonly conversationMomentumService: ConversationMomentumService,
    private readonly microDateService: MicroDateService,
    private readonly ghostingPreventionService: GhostingPreventionService,
  ) {}

  // ===========================================================================
  // VULNERABILITY WINDOWS ENDPOINTS
  // ===========================================================================

  /**
   * POST /engagement/vulnerability-windows
   * Initiate a new vulnerability window
   */
  @Post('vulnerability-windows')
  async initiateVulnerabilityWindow(
    @Body() dto: InitiateVulnerabilityWindowDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Initiating vulnerability window', {
      userId,
      conversationId: dto.conversationId,
      theme: dto.theme,
    });

    try {
      const result = await this.vulnerabilityWindowService.initiateWindow({
        userId,
        conversationId: dto.conversationId,
        responderId: dto.responderId,
        theme: dto.theme as WindowTheme,
        durationMinutes: dto.durationMinutes,
      });

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: result.errorCode || 'INITIATION_FAILED',
              message: result.error || 'Failed to initiate vulnerability window',
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        data: result.window,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      logger.error('Failed to initiate vulnerability window', { error: error.message, userId });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to initiate vulnerability window',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /engagement/vulnerability-windows/:id/accept
   * Accept a pending vulnerability window invitation
   */
  @Post('vulnerability-windows/:id/accept')
  async acceptVulnerabilityWindow(
    @Param() params: VulnerabilityWindowIdParams,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Accepting vulnerability window', { windowId: params.id, userId });

    try {
      const result = await this.vulnerabilityWindowService.acceptWindow(params.id, userId);

      if (!result.success) {
        const statusCode =
          result.errorCode === 'WINDOW_NOT_FOUND'
            ? HttpStatus.NOT_FOUND
            : result.errorCode === 'UNAUTHORIZED'
              ? HttpStatus.FORBIDDEN
              : HttpStatus.BAD_REQUEST;

        throw new HttpException(
          {
            success: false,
            error: {
              code: result.errorCode || 'ACCEPT_FAILED',
              message: result.error || 'Failed to accept vulnerability window',
            },
          },
          statusCode,
        );
      }

      return {
        success: true,
        data: result.window,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      logger.error('Failed to accept vulnerability window', { error: error.message, userId });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to accept vulnerability window',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /engagement/vulnerability-windows/:id/decline
   * Decline a pending vulnerability window invitation
   */
  @Post('vulnerability-windows/:id/decline')
  async declineVulnerabilityWindow(
    @Param() params: VulnerabilityWindowIdParams,
    @Body() dto: DeclineVulnerabilityWindowDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Declining vulnerability window', { windowId: params.id, userId });

    try {
      const result = await this.vulnerabilityWindowService.declineWindow(
        params.id,
        userId,
        dto.reason,
      );

      if (!result.success) {
        const statusCode =
          result.errorCode === 'WINDOW_NOT_FOUND'
            ? HttpStatus.NOT_FOUND
            : result.errorCode === 'UNAUTHORIZED'
              ? HttpStatus.FORBIDDEN
              : HttpStatus.BAD_REQUEST;

        throw new HttpException(
          {
            success: false,
            error: {
              code: result.errorCode || 'DECLINE_FAILED',
              message: result.error || 'Failed to decline vulnerability window',
            },
          },
          statusCode,
        );
      }

      return {
        success: true,
        data: result.window,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      logger.error('Failed to decline vulnerability window', { error: error.message, userId });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to decline vulnerability window',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /engagement/vulnerability-windows/:conversationId/active
   * Get the active vulnerability window for a conversation
   */
  @Get('vulnerability-windows/:conversationId/active')
  async getActiveVulnerabilityWindow(
    @Param() params: ConversationIdParams,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Getting active vulnerability window', {
      conversationId: params.conversationId,
      userId,
    });

    try {
      const window = await this.vulnerabilityWindowService.getActiveWindow(params.conversationId);

      return {
        success: true,
        data: window,
      };
    } catch (error: any) {
      logger.error('Failed to get active vulnerability window', { error: error.message, userId });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get active vulnerability window',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /engagement/vulnerability-windows/themes
   * Get all available vulnerability window themes
   */
  @Get('vulnerability-windows/themes')
  async getAvailableThemes(@Req() req: AuthenticatedRequest): Promise<ApiResponse<any>> {
    logger.info('Getting available vulnerability window themes', { userId: req.user.userId });

    try {
      const themes = this.vulnerabilityWindowService.getAvailableThemes();

      return {
        success: true,
        data: themes,
      };
    } catch (error: any) {
      logger.error('Failed to get available themes', { error: error.message });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get available themes',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===========================================================================
  // CONVERSATION MOMENTUM ENDPOINTS
  // ===========================================================================

  /**
   * GET /engagement/momentum/:conversationId
   * Get current momentum score for a conversation
   */
  @Get('momentum/:conversationId')
  async getConversationMomentum(
    @Param() params: MomentumParams,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Getting conversation momentum', {
      conversationId: params.conversationId,
      userId,
    });

    try {
      // Verify user has access to conversation
      const conversation = await conversationRepository.findById(params.conversationId);
      if (!conversation) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'CONVERSATION_NOT_FOUND',
              message: 'Conversation not found',
            },
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to view this conversation',
            },
          },
          HttpStatus.FORBIDDEN,
        );
      }

      // Get messages for momentum calculation
      const messages = await messageRepository.getMessagesByConversation(params.conversationId, 100);

      // Calculate momentum
      const momentum = await this.conversationMomentumService.calculateMomentum(
        params.conversationId,
        messages,
        userId,
      );

      return {
        success: true,
        data: momentum,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      logger.error('Failed to get conversation momentum', { error: error.message, userId });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get conversation momentum',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /engagement/momentum/:conversationId/history
   * Get momentum history for a conversation
   */
  @Get('momentum/:conversationId/history')
  async getMomentumHistory(
    @Param() params: MomentumParams,
    @Query() query: MomentumHistoryQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Getting momentum history', {
      conversationId: params.conversationId,
      hours: query.hours,
      userId,
    });

    try {
      // Verify user has access to conversation
      const conversation = await conversationRepository.findById(params.conversationId);
      if (!conversation) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'CONVERSATION_NOT_FOUND',
              message: 'Conversation not found',
            },
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to view this conversation',
            },
          },
          HttpStatus.FORBIDDEN,
        );
      }

      const history = await this.conversationMomentumService.getMomentumHistory(
        params.conversationId,
        query.hours,
      );

      return {
        success: true,
        data: {
          conversationId: params.conversationId,
          history,
          periodHours: query.hours,
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      logger.error('Failed to get momentum history', { error: error.message, userId });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get momentum history',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===========================================================================
  // MICRO-DATE ENDPOINTS
  // ===========================================================================

  /**
   * POST /engagement/micro-dates/propose
   * Propose a new micro-date
   */
  @Post('micro-dates/propose')
  async proposeMicroDate(
    @Body() dto: ProposeMicroDateDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Proposing micro-date', {
      userId,
      recipientId: dto.recipientId,
      type: dto.type,
    });

    try {
      // Convert string dates to Date objects
      const suggestedTimes = dto.suggestedTimes.map((time) => new Date(time));

      const proposal = await this.microDateService.proposeMicroDate(
        userId,
        dto.recipientId,
        suggestedTimes,
        dto.type,
        dto.conversationId,
        dto.message,
      );

      return {
        success: true,
        data: proposal,
      };
    } catch (error: any) {
      logger.error('Failed to propose micro-date', { error: error.message, userId });

      if (error.message.includes('Cannot propose') || error.message.includes('Maximum')) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: error.message,
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to propose micro-date',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /engagement/micro-dates/:id/accept
   * Accept a micro-date proposal
   */
  @Post('micro-dates/:id/accept')
  async acceptMicroDate(
    @Param() params: MicroDateIdParams,
    @Body() dto: AcceptMicroDateDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Accepting micro-date', { proposalId: params.id, userId });

    try {
      const selectedTime = new Date(dto.selectedTime);
      const microDate = await this.microDateService.acceptProposal(params.id, selectedTime, userId);

      return {
        success: true,
        data: microDate,
      };
    } catch (error: any) {
      logger.error('Failed to accept micro-date', { error: error.message, userId });

      if (error.message.includes('not found') || error.message.includes('expired')) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (error.message.includes('Only the recipient')) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: error.message,
            },
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (error.message.includes('must be')) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: error.message,
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to accept micro-date',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /engagement/micro-dates/:id/decline
   * Decline a micro-date proposal
   */
  @Post('micro-dates/:id/decline')
  async declineMicroDate(
    @Param() params: MicroDateIdParams,
    @Body() dto: DeclineMicroDateDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Declining micro-date', { proposalId: params.id, userId });

    try {
      const reason = dto.reason
        ? { reason: dto.reason, customMessage: dto.customMessage }
        : undefined;

      await this.microDateService.declineProposal(params.id, userId, reason);

      return {
        success: true,
        data: { message: 'Proposal declined successfully' },
      };
    } catch (error: any) {
      logger.error('Failed to decline micro-date', { error: error.message, userId });

      if (error.message.includes('not found') || error.message.includes('expired')) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (error.message.includes('Only the recipient')) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: error.message,
            },
          },
          HttpStatus.FORBIDDEN,
        );
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to decline micro-date',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /engagement/micro-dates/upcoming
   * Get upcoming micro-dates for the authenticated user
   */
  @Get('micro-dates/upcoming')
  async getUpcomingMicroDates(
    @Query() query: UpcomingMicroDatesQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Getting upcoming micro-dates', { userId, limit: query.limit });

    try {
      const microDates = await this.microDateService.getUpcomingDates(userId, query.limit);

      return {
        success: true,
        data: {
          upcoming: microDates,
          count: microDates.length,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get upcoming micro-dates', { error: error.message, userId });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get upcoming micro-dates',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /engagement/micro-dates/suggestions/times
   * Get optimal time suggestions for scheduling a micro-date
   */
  @Get('micro-dates/suggestions/times')
  async getTimeSuggestions(
    @Query() query: TimeSuggestionsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Getting time suggestions', {
      userId,
      recipientId: query.recipientId,
      daysAhead: query.daysAhead,
    });

    try {
      const suggestions = await this.microDateService.suggestOptimalTimes(
        userId,
        query.recipientId,
        query.daysAhead,
      );

      return {
        success: true,
        data: {
          suggestions,
          count: suggestions.length,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get time suggestions', { error: error.message, userId });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get time suggestions',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===========================================================================
  // GHOSTING PREVENTION ENDPOINTS
  // ===========================================================================

  /**
   * GET /engagement/ghosting-risk/:conversationId
   * Assess the ghosting risk for a specific conversation
   */
  @Get('ghosting-risk/:conversationId')
  async assessGhostingRisk(
    @Param() params: GhostingRiskParams,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Assessing ghosting risk', {
      conversationId: params.conversationId,
      userId,
    });

    try {
      // Verify user has access to conversation
      const conversation = await conversationRepository.findById(params.conversationId);
      if (!conversation) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'CONVERSATION_NOT_FOUND',
              message: 'Conversation not found',
            },
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to view this conversation',
            },
          },
          HttpStatus.FORBIDDEN,
        );
      }

      // Get messages for analysis
      const messages = await messageRepository.getMessagesByConversation(params.conversationId, 50);

      // Determine the match ID (the other participant)
      const matchId =
        conversation.participant1Id === userId
          ? conversation.participant2Id
          : conversation.participant1Id;

      // Build conversation data for ghosting prevention
      const conversationData: ConversationData = {
        conversationId: params.conversationId,
        userId,
        matchId,
        messages: messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content || '',
          timestamp: new Date(m.sentAt),
          readAt: m.readAt ? new Date(m.readAt) : undefined,
          messageLength: (m.content || '').length,
        })),
        createdAt: conversation.createdAt,
        lastMessageAt: messages.length > 0 ? new Date(messages[0].sentAt) : undefined,
      };

      // Assess ghosting risk
      const assessment = await this.ghostingPreventionService.assessGhostingRisk(
        conversationData,
        userId,
      );

      return {
        success: true,
        data: assessment,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      logger.error('Failed to assess ghosting risk', { error: error.message, userId });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to assess ghosting risk',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /engagement/at-risk-conversations
   * Get all conversations at risk of ghosting for the authenticated user
   */
  @Get('at-risk-conversations')
  async getAtRiskConversations(
    @Query() query: AtRiskConversationsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<any>> {
    const userId = req.user.userId;

    logger.info('Getting at-risk conversations', { userId, limit: query.limit });

    try {
      // Get user's conversations
      const conversations = await conversationRepository.findByUserId(userId);

      // Build conversation data objects
      const conversationDataList: ConversationData[] = [];
      const matchProfiles = new Map<string, UserProfile>();

      for (const conv of conversations.slice(0, query.limit)) {
        const messages = await messageRepository.getMessagesByConversation(conv.id, 50);

        const matchId =
          conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;

        conversationDataList.push({
          conversationId: conv.id,
          userId,
          matchId,
          messages: messages.map((m) => ({
            id: m.id,
            senderId: m.senderId,
            content: m.content || '',
            timestamp: new Date(m.sentAt),
            readAt: m.readAt ? new Date(m.readAt) : undefined,
            messageLength: (m.content || '').length,
          })),
          createdAt: conv.createdAt,
          lastMessageAt: messages.length > 0 ? new Date(messages[0].sentAt) : undefined,
        });

        // In production, you would fetch actual match profiles from user service
        matchProfiles.set(matchId, { userId: matchId });
      }

      // Get at-risk conversations
      const atRiskConversations = await this.ghostingPreventionService.getAtRiskConversations(
        userId,
        conversationDataList,
        matchProfiles,
      );

      return {
        success: true,
        data: {
          conversations: atRiskConversations,
          count: atRiskConversations.length,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get at-risk conversations', { error: error.message, userId });
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get at-risk conversations',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
