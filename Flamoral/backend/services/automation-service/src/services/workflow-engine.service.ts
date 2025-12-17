import { v4 as uuidv4 } from 'uuid';
import db from '../infrastructure/database/knex';
import { TABLES, AutomationFlow, FlowExecution } from '../models';
import {
  FlowExecutionDto,
  FlowExecutionResultDto,
  TriggerType,
  ConditionType,
  ActionType,
} from '../dtos';
import { IcebreakerService } from './icebreaker.service';
import { ServiceClient } from './service-client';
import config from '../config';

/**
 * Workflow Engine Service
 * Executes automation flows based on triggers and conditions
 */
export class WorkflowEngineService {
  private icebreakerService: IcebreakerService;
  private messagingClient: ServiceClient;
  private notificationClient: ServiceClient;

  constructor() {
    this.icebreakerService = new IcebreakerService();
    this.messagingClient = new ServiceClient({
      baseURL: config.services.messaging,
      serviceName: 'automation-service',
    });
    this.notificationClient = new ServiceClient({
      baseURL: config.services.notification,
      serviceName: 'automation-service',
    });
  }

  /**
   * Execute an automation flow
   */
  async executeFlow(executionDto: FlowExecutionDto): Promise<FlowExecutionResultDto> {
    const executionId = uuidv4();
    const startedAt = new Date();

    try {
      // Get the flow configuration
      const flow = await this.getFlow(executionDto.flowId);
      if (!flow) {
        throw new Error(`Flow ${executionDto.flowId} not found`);
      }

      if (flow.status !== 'active') {
        throw new Error(`Flow ${executionDto.flowId} is not active`);
      }

      // Create execution record
      await this.createExecution({
        id: executionId,
        flow_id: executionDto.flowId,
        user_id: executionDto.userId,
        match_id: executionDto.matchId || null,
        conversation_id: executionDto.conversationId || null,
        trigger_data: executionDto.triggerData,
        status: 'running',
        started_at: startedAt,
        completed_at: null,
        actions_executed: 0,
        actions_failed: 0,
        error_message: null,
        results: {},
        created_at: new Date(),
      });

      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(flow, executionDto);
      if (!conditionsMet) {
        await this.updateExecution(executionId, {
          status: 'success',
          completed_at: new Date(),
          results: { skipped: true, reason: 'Conditions not met' },
        });

        return {
          executionId,
          flowId: executionDto.flowId,
          userId: executionDto.userId,
          status: 'success',
          startedAt,
          completedAt: new Date(),
          actionsExecuted: 0,
          actionsFailed: 0,
          results: { skipped: true },
        };
      }

      // Execute actions
      const results: Record<string, any> = {};
      let actionsExecuted = 0;
      let actionsFailed = 0;

      for (const [index, action] of flow.actions.entries()) {
        try {
          // Apply delay if specified
          if (action.delayMs) {
            await this.delay(action.delayMs);
          }

          // Execute action
          const actionResult = await this.executeAction(action, executionDto);
          results[`action_${index}`] = actionResult;
          actionsExecuted++;
        } catch (error: any) {
          console.error(`[WorkflowEngine] Action ${index} failed:`, error.message);
          results[`action_${index}`] = { error: error.message };
          actionsFailed++;

          // Stop execution if action doesn't allow retry or max retries exceeded
          if (!action.retryOnFailure) {
            break;
          }
        }
      }

      const completedAt = new Date();
      const status = actionsFailed === 0 ? 'success' : actionsExecuted > 0 ? 'partial' : 'failed';

      // Update execution record
      await this.updateExecution(executionId, {
        status,
        completed_at: completedAt,
        actions_executed: actionsExecuted,
        actions_failed: actionsFailed,
        results,
      });

      // Update flow statistics
      await this.updateFlowStats(executionDto.flowId, status);

      return {
        executionId,
        flowId: executionDto.flowId,
        userId: executionDto.userId,
        status,
        startedAt,
        completedAt,
        actionsExecuted,
        actionsFailed,
        results,
      };
    } catch (error: any) {
      console.error('[WorkflowEngine] Flow execution failed:', error.message);

      await this.updateExecution(executionId, {
        status: 'failed',
        completed_at: new Date(),
        error_message: error.message,
      });

      throw error;
    }
  }

  /**
   * Evaluate flow conditions
   */
  private async evaluateConditions(
    flow: AutomationFlow,
    executionDto: FlowExecutionDto
  ): Promise<boolean> {
    if (!flow.conditions || flow.conditions.length === 0) {
      return true;
    }

    for (const condition of flow.conditions) {
      const met = await this.evaluateCondition(condition, executionDto);
      if (!met) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: any, executionDto: FlowExecutionDto): Promise<boolean> {
    // Implement condition evaluation logic based on condition type
    switch (condition.type) {
      case ConditionType.TIME_ELAPSED:
        return this.evaluateTimeElapsed(condition, executionDto);
      case ConditionType.MESSAGE_COUNT:
        return this.evaluateMessageCount(condition, executionDto);
      case ConditionType.USER_ACTIVITY:
        return this.evaluateUserActivity(condition, executionDto);
      default:
        console.warn(`[WorkflowEngine] Unknown condition type: ${condition.type}`);
        return true;
    }
  }

  /**
   * Execute an action
   */
  private async executeAction(action: any, executionDto: FlowExecutionDto): Promise<any> {
    switch (action.type) {
      case ActionType.SEND_MESSAGE:
        return this.sendMessage(action.parameters, executionDto);
      case ActionType.SEND_NOTIFICATION:
        return this.sendNotification(action.parameters, executionDto);
      case ActionType.SEND_ICEBREAKER:
        return this.sendIcebreaker(action.parameters, executionDto);
      case ActionType.GENERATE_SUGGESTION:
        return this.generateSuggestion(action.parameters, executionDto);
      case ActionType.WAIT:
        return this.delay(action.parameters.durationMs || 0);
      default:
        console.warn(`[WorkflowEngine] Unknown action type: ${action.type}`);
        return { skipped: true };
    }
  }

  /**
   * Action implementations
   */
  private async sendMessage(parameters: any, executionDto: FlowExecutionDto): Promise<any> {
    if (!executionDto.conversationId) {
      throw new Error('Conversation ID required for send message action');
    }

    const response = await this.messagingClient.post('/api/internal/messages/send-system', {
      conversationId: executionDto.conversationId,
      userId: executionDto.userId,
      content: parameters.content,
      type: parameters.type || 'system',
    });

    return response.data;
  }

  private async sendNotification(parameters: any, executionDto: FlowExecutionDto): Promise<any> {
    const response = await this.notificationClient.post('/api/internal/notifications/send', {
      userId: executionDto.userId,
      type: parameters.notificationType || 'automation',
      title: parameters.title,
      body: parameters.body,
      data: parameters.data || {},
      channel: parameters.channel || 'push',
    });

    return response.data;
  }

  private async sendIcebreaker(parameters: any, executionDto: FlowExecutionDto): Promise<any> {
    if (!executionDto.matchId || !executionDto.conversationId) {
      throw new Error('Match ID and Conversation ID required for send icebreaker action');
    }

    // Generate icebreaker suggestions
    const suggestions = await this.icebreakerService.generateIcebreakers({
      userId: executionDto.userId,
      matchUserId: parameters.matchUserId,
      matchId: executionDto.matchId,
      category: parameters.category,
      tone: parameters.tone || 'casual',
    });

    if (suggestions.suggestions.length === 0) {
      throw new Error('No icebreaker suggestions generated');
    }

    // Use the top suggestion
    const topSuggestion = suggestions.suggestions[0];

    // Send the message
    await this.sendMessage(
      {
        content: topSuggestion.message,
        type: 'icebreaker',
      },
      executionDto
    );

    return { suggestionId: topSuggestion.id, message: topSuggestion.message };
  }

  private async generateSuggestion(parameters: any, executionDto: FlowExecutionDto): Promise<any> {
    // Placeholder for generating suggestions
    return { generated: true, type: parameters.suggestionType };
  }

  /**
   * Condition evaluation helpers
   */
  private async evaluateTimeElapsed(condition: any, executionDto: FlowExecutionDto): Promise<boolean> {
    const referenceTime = new Date(executionDto.triggerData.referenceTime || Date.now());
    const elapsedMs = Date.now() - referenceTime.getTime();
    const thresholdMs = condition.value * 1000; // Assuming value is in seconds

    return condition.operator === 'greater_than'
      ? elapsedMs > thresholdMs
      : elapsedMs < thresholdMs;
  }

  private async evaluateMessageCount(condition: any, executionDto: FlowExecutionDto): Promise<boolean> {
    const messageCount = executionDto.triggerData.messageCount || 0;

    switch (condition.operator) {
      case 'equals':
        return messageCount === condition.value;
      case 'greater_than':
        return messageCount > condition.value;
      case 'less_than':
        return messageCount < condition.value;
      default:
        return true;
    }
  }

  private async evaluateUserActivity(condition: any, executionDto: FlowExecutionDto): Promise<boolean> {
    // Placeholder - would check user's recent activity
    return true;
  }

  /**
   * Database operations
   */
  private async getFlow(flowId: string): Promise<AutomationFlow | null> {
    const flow = await db(TABLES.AUTOMATION_FLOWS).where({ id: flowId }).first();
    return flow || null;
  }

  private async createExecution(execution: FlowExecution): Promise<void> {
    await db(TABLES.FLOW_EXECUTIONS).insert(execution);
  }

  private async updateExecution(executionId: string, updates: Partial<FlowExecution>): Promise<void> {
    await db(TABLES.FLOW_EXECUTIONS).where({ id: executionId }).update(updates);
  }

  private async updateFlowStats(flowId: string, status: string): Promise<void> {
    const updates: any = {
      execution_count: db.raw('execution_count + 1'),
      last_executed_at: new Date(),
    };

    if (status === 'success') {
      updates.success_count = db.raw('success_count + 1');
    } else {
      updates.failure_count = db.raw('failure_count + 1');
    }

    await db(TABLES.AUTOMATION_FLOWS).where({ id: flowId }).update(updates);
  }

  /**
   * Utility methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
