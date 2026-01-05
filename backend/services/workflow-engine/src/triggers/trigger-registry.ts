import { TriggerType } from '../interfaces/workflow.interface';

/**
 * Trigger Registry - Maps trigger types to their event sources and routing keys
 *
 * This registry defines all available triggers in the workflow engine.
 * Each trigger type is associated with:
 * - Event source (which RabbitMQ exchange to listen to)
 * - Routing key (the specific event pattern to match)
 * - Description (what the trigger does)
 * - Expected data structure
 */

export interface TriggerDefinition {
  type: TriggerType;
  exchange: string;
  routingKey: string;
  description: string;
  expectedData: string[];
}

export const TRIGGER_REGISTRY: TriggerDefinition[] = [
  {
    type: TriggerType.MATCH_CREATED,
    exchange: 'matching.events',
    routingKey: 'match.created',
    description: 'Triggered when a new match is created between two users',
    expectedData: ['userId', 'matchedUserId', 'matchId', 'timestamp'],
  },
  {
    type: TriggerType.MESSAGE_SENT,
    exchange: 'messaging.events',
    routingKey: 'message.sent',
    description: 'Triggered when a user sends a message',
    expectedData: ['senderId', 'receiverId', 'messageId', 'content', 'timestamp'],
  },
  {
    type: TriggerType.LIKE_RECEIVED,
    exchange: 'matching.events',
    routingKey: 'like.received',
    description: 'Triggered when a user receives a like',
    expectedData: ['likerId', 'receiverId', 'timestamp'],
  },
  {
    type: TriggerType.SUPER_LIKE,
    exchange: 'matching.events',
    routingKey: 'super_like.received',
    description: 'Triggered when a user receives a super like',
    expectedData: ['likerId', 'receiverId', 'timestamp'],
  },
  {
    type: TriggerType.SUBSCRIPTION_PURCHASE,
    exchange: 'payment.events',
    routingKey: 'subscription.purchased',
    description: 'Triggered when a user purchases a subscription',
    expectedData: ['userId', 'subscriptionId', 'planType', 'amount', 'timestamp'],
  },
  {
    type: TriggerType.COIN_PURCHASE,
    exchange: 'payment.events',
    routingKey: 'coins.purchased',
    description: 'Triggered when a user purchases coins',
    expectedData: ['userId', 'amount', 'coins', 'timestamp'],
  },
  {
    type: TriggerType.FIRST_LOGIN,
    exchange: 'user.events',
    routingKey: 'user.first_login',
    description: 'Triggered when a user logs in for the first time',
    expectedData: ['userId', 'timestamp'],
  },
  {
    type: TriggerType.PROFILE_COMPLETED,
    exchange: 'user.events',
    routingKey: 'profile.completed',
    description: 'Triggered when a user completes their profile',
    expectedData: ['userId', 'completeness', 'timestamp'],
  },
  {
    type: TriggerType.ABANDONED_ONBOARDING,
    exchange: 'user.events',
    routingKey: 'onboarding.abandoned',
    description: 'Triggered when a user abandons the onboarding process',
    expectedData: ['userId', 'lastStep', 'timestamp'],
  },
  {
    type: TriggerType.USER_INACTIVE_7D,
    exchange: 'user.events',
    routingKey: 'user.inactive_7d',
    description: 'Triggered when a user has been inactive for 7 days',
    expectedData: ['userId', 'lastActiveAt', 'timestamp'],
  },
];

/**
 * Get trigger definition by type
 */
export function getTriggerDefinition(type: TriggerType): TriggerDefinition | undefined {
  return TRIGGER_REGISTRY.find((t) => t.type === type);
}

/**
 * Get all available trigger types
 */
export function getAllTriggerTypes(): TriggerType[] {
  return TRIGGER_REGISTRY.map((t) => t.type);
}

/**
 * Validate trigger data structure
 */
export function validateTriggerData(
  type: TriggerType,
  data: Record<string, any>
): { valid: boolean; missingFields: string[] } {
  const definition = getTriggerDefinition(type);
  if (!definition) {
    return { valid: false, missingFields: [] };
  }

  const missingFields = definition.expectedData.filter((field) => !(field in data));

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
