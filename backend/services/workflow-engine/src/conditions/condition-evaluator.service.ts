import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  ConditionConfig,
  ConditionType,
  ExecutionContext,
} from '../interfaces/workflow.interface';

@Injectable()
export class ConditionEvaluatorService {
  private readonly logger = new Logger(ConditionEvaluatorService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Evaluate all conditions for a workflow execution
   */
  async evaluateConditions(
    conditions: ConditionConfig[],
    context: ExecutionContext,
  ): Promise<{ passed: boolean; results: Record<string, boolean> }> {
    if (!conditions || conditions.length === 0) {
      return { passed: true, results: {} };
    }

    const results: Record<string, boolean> = {};
    let overallResult = true;
    let currentLogic: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      try {
        const conditionResult = await this.evaluateCondition(condition, context);
        const conditionKey = `${condition.type}_${condition.operator}_${JSON.stringify(condition.value)}`;
        results[conditionKey] = conditionResult;

        // Apply logical operators
        if (currentLogic === 'AND') {
          overallResult = overallResult && conditionResult;
        } else {
          overallResult = overallResult || conditionResult;
        }

        // Update logic for next iteration
        if (condition.logicalOperator) {
          currentLogic = condition.logicalOperator;
        }

        this.logger.debug(
          `Condition ${conditionKey} evaluated to ${conditionResult}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to evaluate condition ${condition.type}: ${error.message}`,
        );
        results[condition.type] = false;
        if (currentLogic === 'AND') {
          overallResult = false;
        }
      }
    }

    return { passed: overallResult, results };
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: ConditionConfig,
    context: ExecutionContext,
  ): Promise<boolean> {
    let actualValue: any;

    switch (condition.type) {
      case ConditionType.USER_PREMIUM:
        actualValue = await this.checkUserPremium(context.userId);
        break;
      case ConditionType.PROFILE_COMPLETE_PERCENTAGE:
        actualValue = await this.getProfileCompletePercentage(context.userId);
        break;
      case ConditionType.MATCH_COUNT:
        actualValue = await this.getMatchCount(context.userId);
        break;
      case ConditionType.MESSAGE_COUNT:
        actualValue = await this.getMessageCount(context.userId);
        break;
      default:
        this.logger.warn(`Unknown condition type: ${condition.type}`);
        return false;
    }

    return this.compareValues(actualValue, condition.operator, condition.value);
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'neq':
        return actual !== expected;
      case 'gt':
        return actual > expected;
      case 'gte':
        return actual >= expected;
      case 'lt':
        return actual < expected;
      case 'lte':
        return actual <= expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'nin':
        return Array.isArray(expected) && !expected.includes(actual);
      case 'contains':
        return (
          typeof actual === 'string' &&
          typeof expected === 'string' &&
          actual.includes(expected)
        );
      default:
        return false;
    }
  }

  /**
   * Check if user has premium subscription
   */
  private async checkUserPremium(userId: string): Promise<boolean> {
    try {
      const userServiceUrl = this.configService.get<string>(
        'services.userService',
      );
      const response = await axios.get(`${userServiceUrl}/api/users/${userId}`, {
        headers: {
          'X-Internal-Service-Key': this.configService.get<string>(
            'internalServiceKey',
          ),
        },
      });
      return response.data?.subscription?.isPremium || false;
    } catch (error) {
      this.logger.error(`Failed to check user premium status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get user profile completion percentage
   */
  private async getProfileCompletePercentage(userId: string): Promise<number> {
    try {
      const userServiceUrl = this.configService.get<string>(
        'services.userService',
      );
      const response = await axios.get(
        `${userServiceUrl}/api/profiles/${userId}`,
        {
          headers: {
            'X-Internal-Service-Key': this.configService.get<string>(
              'internalServiceKey',
            ),
          },
        },
      );
      return response.data?.profileCompleteness || 0;
    } catch (error) {
      this.logger.error(
        `Failed to get profile completion percentage: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Get user match count
   */
  private async getMatchCount(userId: string): Promise<number> {
    try {
      const matchingServiceUrl = this.configService.get<string>(
        'services.matchingService',
      );
      const response = await axios.get(
        `${matchingServiceUrl}/api/matches/${userId}/count`,
        {
          headers: {
            'X-Internal-Service-Key': this.configService.get<string>(
              'internalServiceKey',
            ),
          },
        },
      );
      return response.data?.count || 0;
    } catch (error) {
      this.logger.error(`Failed to get match count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get user message count
   */
  private async getMessageCount(userId: string): Promise<number> {
    try {
      const userServiceUrl = this.configService.get<string>(
        'services.userService',
      );
      const response = await axios.get(
        `${userServiceUrl}/api/users/${userId}/message-count`,
        {
          headers: {
            'X-Internal-Service-Key': this.configService.get<string>(
              'internalServiceKey',
            ),
          },
        },
      );
      return response.data?.count || 0;
    } catch (error) {
      this.logger.error(`Failed to get message count: ${error.message}`);
      return 0;
    }
  }
}
