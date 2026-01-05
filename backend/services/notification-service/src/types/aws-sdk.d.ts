// Type declarations for AWS SDK modules
// These are placeholder declarations to satisfy TypeScript compilation
// The actual implementations come from @aws-sdk packages at runtime

declare module '@aws-sdk/client-sns' {
  export class SNSClient {
    constructor(config?: any);
    send(command: any): Promise<any>;
  }

  export class PublishCommand {
    constructor(input: any);
  }

  export class CreatePlatformEndpointCommand {
    constructor(input: any);
  }

  export class DeleteEndpointCommand {
    constructor(input: any);
  }

  export class SubscribeCommand {
    constructor(input: any);
  }

  export class UnsubscribeCommand {
    constructor(input: any);
  }

  export class SetEndpointAttributesCommand {
    constructor(input: any);
  }

  export class GetEndpointAttributesCommand {
    constructor(input: any);
  }

  export class ListEndpointsByPlatformApplicationCommand {
    constructor(input: any);
  }

  export class SetSMSAttributesCommand {
    constructor(input: any);
  }

  export class CheckIfPhoneNumberIsOptedOutCommand {
    constructor(input: any);
  }

  export interface PublishCommandInput {
    TopicArn?: string;
    TargetArn?: string;
    PhoneNumber?: string;
    Message: string;
    Subject?: string;
    MessageStructure?: string;
    MessageAttributes?: Record<string, any>;
  }

  export interface PublishCommandOutput {
    MessageId?: string;
    SequenceNumber?: string;
  }
}

declare module '@aws-sdk/client-sqs' {
  export class SQSClient {
    constructor(config?: any);
    send(command: any): Promise<any>;
  }

  export class SendMessageCommand {
    constructor(input: any);
  }

  export class SendMessageBatchCommand {
    constructor(input: any);
  }

  export class ReceiveMessageCommand {
    constructor(input: any);
  }

  export class DeleteMessageCommand {
    constructor(input: any);
  }

  export class DeleteMessageBatchCommand {
    constructor(input: any);
  }

  export class GetQueueUrlCommand {
    constructor(input: any);
  }

  export class GetQueueAttributesCommand {
    constructor(input: any);
  }

  export class CreateQueueCommand {
    constructor(input: any);
  }

  export class PurgeQueueCommand {
    constructor(input: any);
  }

  export class ChangeMessageVisibilityCommand {
    constructor(input: any);
  }

  export interface SendMessageCommandInput {
    QueueUrl: string;
    MessageBody: string;
    DelaySeconds?: number;
    MessageAttributes?: Record<string, any>;
    MessageDeduplicationId?: string;
    MessageGroupId?: string;
  }

  export interface SendMessageCommandOutput {
    MessageId?: string;
    MD5OfMessageBody?: string;
    SequenceNumber?: string;
  }

  export interface ReceiveMessageCommandInput {
    QueueUrl: string;
    MaxNumberOfMessages?: number;
    VisibilityTimeout?: number;
    WaitTimeSeconds?: number;
    AttributeNames?: string[];
    MessageAttributeNames?: string[];
  }

  export interface Message {
    MessageId?: string;
    ReceiptHandle?: string;
    Body?: string;
    Attributes?: Record<string, string>;
    MessageAttributes?: Record<string, any>;
  }
}

declare module 'aws-sdk-client-mock' {
  interface MockCommandBehavior {
    resolves: (value: any) => MockCommandBehavior;
    resolvesOnce: (value: any) => MockCommandBehavior;
    rejects: (error: any) => MockCommandBehavior;
    rejectsOnce: (error: any) => MockCommandBehavior;
    callsFake: (fn: (...args: any[]) => any) => MockCommandBehavior;
  }

  interface AwsMock {
    on: (command: any, input?: any) => MockCommandBehavior;
    onAnyCommand: () => MockCommandBehavior;
    reset: () => void;
    restore: () => void;
    resetHistory: () => void;
    calls: () => any[];
    call: (index: number) => any;
    commandCalls: (command: any, input?: any) => any[];
  }

  export function mockClient(client: any): AwsMock;
}
