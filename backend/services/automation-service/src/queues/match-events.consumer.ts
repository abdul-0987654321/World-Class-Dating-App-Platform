import { createLogger } from '@flamoral/backend-shared';

import config from '../config';
import { FlowExecutionDto, TriggerType } from '../dtos';
import db from '../infrastructure/database/knex';
import { TABLES } from '../models';
import { IcebreakerService } from '../services/icebreaker.service';
import { WorkflowEngineService } from '../services/workflow-engine.service';

import { rabbitmqClient } from './rabbitmq-client';

const logger = createLogger('automation-service:match-events');

/**
 * Match Events Consumer
 * Listens to match events and triggers automation flows
 */
export class MatchEventsConsumer {
  private workflowEngine: WorkflowEngineService;
  private icebreakerService: IcebreakerService;

  constructor() {
    this.workflowEngine = new WorkflowEngineService();
    this.icebreakerService = new IcebreakerService();
  }

  /**
   * Start consuming match events
   */
  async start(): Promise<void> {
    try {
      await rabbitmqClient.subscribe(
        config.rabbitmq.queues.match,
        ['match.created', 'match.superlike', 'match.anniversary'],
        this.handleMatchEvent.bind(this)
      );

      logger.info('Started listening to match events');
    } catch (error: any) {
      logger.error('Failed to start', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle match event
   */
  private async handleMatchEvent(event: any): Promise<void> {
    try {
      logger.info('Received event', { eventType: event.type });

      switch (event.type) {
        case 'match.created':
          await this.handleNewMatch(event.data);
          break;
        case 'match.superlike':
          await this.handleSuperLike(event.data);
          break;
        case 'match.anniversary':
          await this.handleMatchAnniversary(event.data);
          break;
        default:
          logger.warn('Unknown event type', { eventType: event.type });
      }
    } catch (error: any) {
      logger.error('Event handling failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle new match event
   */
  private async handleNewMatch(data: any): Promise<void> {
    const { matchId, userId1, userId2, conversationId } = data;

    if (!config.automation.enableAutoDmFlows) {
      return;
    }

    // Find all flows triggered by new matches
    const flows = await db(TABLES.AUTOMATION_FLOWS)
      .where({ status: 'active' })
      .whereRaw("trigger->>'type' = ?", [TriggerType.NEW_MATCH]);

    // Execute flows for both users
    for (const userId of [userId1, userId2]) {
      const otherUserId = userId === userId1 ? userId2 : userId1;

      for (const flow of flows) {
        const executionDto: FlowExecutionDto = {
          flowId: flow.id,
          userId,
          matchId,
          conversationId,
          triggerData: {
            eventType: 'match.created',
            matchId,
            otherUserId,
            timestamp: new Date(),
          },
        };

        try {
          await this.workflowEngine.executeFlow(executionDto);
        } catch (error: any) {
          logger.error('Flow execution failed', { error: error.message });
        }
      }
    }

    // Auto-generate icebreaker suggestions if enabled
    if (config.automation.enableIcebreakerSuggestions) {
      try {
        await this.icebreakerService.generateIcebreakers({
          userId: userId1,
          matchUserId: userId2,
          matchId,
        });

        await this.icebreakerService.generateIcebreakers({
          userId: userId2,
          matchUserId: userId1,
          matchId,
        });
      } catch (error: any) {
        logger.error('Icebreaker generation failed', { error: error.message });
      }
    }
  }

  /**
   * Handle super like event
   */
  private async handleSuperLike(data: any): Promise<void> {
    const { matchId, superLikerId, recipientId } = data;

    const flows = await db(TABLES.AUTOMATION_FLOWS)
      .where({ status: 'active' })
      .whereRaw("trigger->>'type' = ?", [TriggerType.SUPER_LIKE_RECEIVED]);

    for (const flow of flows) {
      const executionDto: FlowExecutionDto = {
        flowId: flow.id,
        userId: recipientId,
        matchId,
        triggerData: {
          eventType: 'match.superlike',
          superLikerId,
          timestamp: new Date(),
        },
      };

      try {
        await this.workflowEngine.executeFlow(executionDto);
      } catch (error: any) {
        logger.error('Super like flow failed', { error: error.message });
      }
    }
  }

  /**
   * Handle match anniversary event
   */
  private async handleMatchAnniversary(data: any): Promise<void> {
    const { matchId, userId1, userId2, conversationId, daysSinceMatch } = data;

    const flows = await db(TABLES.AUTOMATION_FLOWS)
      .where({ status: 'active' })
      .whereRaw("trigger->>'type' = ?", [TriggerType.MATCH_ANNIVERSARY]);

    for (const userId of [userId1, userId2]) {
      for (const flow of flows) {
        const executionDto: FlowExecutionDto = {
          flowId: flow.id,
          userId,
          matchId,
          conversationId,
          triggerData: {
            eventType: 'match.anniversary',
            daysSinceMatch,
            timestamp: new Date(),
          },
        };

        try {
          await this.workflowEngine.executeFlow(executionDto);
        } catch (error: any) {
          logger.error('Anniversary flow failed', { error: error.message });
        }
      }
    }
  }
}
