/**
 * Call Signal Worker
 * Handles call signaling events
 * Manages call timeouts
 * Tracks call quality metrics
 */

import { createLogger } from '@flamoral/backend-shared';
import axios from 'axios';
import { Job } from 'bull';

import { BaseWorker, WorkerQueueName, BaseJobData, JobResult, JobPriority } from './base-worker';

const logger = createLogger('call-signal-worker');

// Service URLs
const MESSAGING_SERVICE_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:3005';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3011';

// Call status enum
export enum CallStatus {
  INITIATING = 'initiating',
  RINGING = 'ringing',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ON_HOLD = 'on_hold',
  ENDED = 'ended',
  MISSED = 'missed',
  DECLINED = 'declined',
  FAILED = 'failed',
  BUSY = 'busy',
}

// Call type enum
export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

// Signal type enum
export enum SignalType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice_candidate',
  HANG_UP = 'hang_up',
  RINGING = 'ringing',
  BUSY = 'busy',
  RECONNECT = 'reconnect',
}

// Job data interfaces
export interface CallSignalJobData extends BaseJobData {
  type:
    | 'initiate_call'
    | 'relay_signal'
    | 'check_timeout'
    | 'end_call'
    | 'record_metrics'
    | 'handle_missed_call';
  callId: string;
  callerId: string;
  calleeId: string;
  callType?: CallType;
  signalType?: SignalType;
  signalData?: any;
  callStartTime?: string;
  callEndTime?: string;
  callDurationSeconds?: number;
  qualityMetrics?: CallQualityMetrics;
}

export interface CallQualityMetrics {
  averageLatencyMs?: number;
  packetLossPercent?: number;
  jitterMs?: number;
  audioQualityScore?: number;
  videoQualityScore?: number;
  connectionType?: string;
  dropCount?: number;
}

export interface CallSignalResult {
  callId: string;
  status: CallStatus;
  signalDelivered?: boolean;
  callDurationSeconds?: number;
  metricsRecorded?: boolean;
}

/**
 * Call Signal Worker
 */
export class CallSignalWorker extends BaseWorker<CallSignalJobData, CallSignalResult> {
  private readonly callTimeoutSeconds = 60; // 60 seconds to answer
  private readonly maxReconnectAttempts = 3;

  constructor() {
    super(WorkerQueueName.CALL_SIGNAL, 15); // High concurrency for real-time signaling
  }

  /**
   * Process call signal job
   */
  protected async processJob(job: Job<CallSignalJobData>): Promise<JobResult<CallSignalResult>> {
    const { type, callId, callerId, calleeId } = job.data;
    const startTime = Date.now();

    try {
      let result: CallSignalResult;

      switch (type) {
        case 'initiate_call':
          result = await this.initiateCall(job.data);
          break;

        case 'relay_signal':
          result = await this.relaySignal(job.data);
          break;

        case 'check_timeout':
          result = await this.checkCallTimeout(job.data);
          break;

        case 'end_call':
          result = await this.endCall(job.data);
          break;

        case 'record_metrics':
          result = await this.recordCallMetrics(job.data);
          break;

        case 'handle_missed_call':
          result = await this.handleMissedCall(job.data);
          break;

        default:
          throw new Error(`Unknown call signal type: ${type}`);
      }

      await job.progress(100);

      logger.info(`Call signal processed`, {
        type,
        correlationId: job.data.correlationId,
        callId,
        status: result.status,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      logger.error(`Call signal processing failed`, {
        type,
        correlationId: job.data.correlationId,
        callId,
        callerId,
        calleeId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Initiate a new call
   */
  private async initiateCall(jobData: CallSignalJobData): Promise<CallSignalResult> {
    const { callId, callerId, calleeId, callType = CallType.AUDIO } = jobData;

    try {
      // Check if callee is online
      const isCalleeOnline = await this.checkUserOnline(calleeId);

      if (!isCalleeOnline) {
        // User is offline - send push notification and mark as initiating
        await this.sendIncomingCallPush(callId, callerId, calleeId, callType);

        return {
          callId,
          status: CallStatus.INITIATING,
          signalDelivered: false,
        };
      }

      // Check if callee is busy (on another call)
      const isCalleeBusy = await this.checkUserBusy(calleeId);

      if (isCalleeBusy) {
        await this.relaySignalToUser(callerId, callId, SignalType.BUSY, {});

        return {
          callId,
          status: CallStatus.BUSY,
          signalDelivered: true,
        };
      }

      // Create call record
      await this.createCallRecord(callId, callerId, calleeId, callType);

      // Send ringing signal to callee via WebSocket
      const signalSent = await this.relaySignalToUser(calleeId, callId, SignalType.RINGING, {
        callerId,
        callType,
        callId,
      });

      // Also send push notification as backup
      await this.sendIncomingCallPush(callId, callerId, calleeId, callType);

      // Schedule timeout check
      await this.scheduleTimeoutCheck(callId, callerId, calleeId);

      return {
        callId,
        status: CallStatus.RINGING,
        signalDelivered: signalSent,
      };
    } catch (error: any) {
      logger.error(`Failed to initiate call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Relay a WebRTC signal between peers
   */
  private async relaySignal(jobData: CallSignalJobData): Promise<CallSignalResult> {
    const { callId, callerId, calleeId, signalType, signalData } = jobData;

    if (!signalType) {
      throw new Error('Signal type is required for relay_signal');
    }

    try {
      // Determine recipient based on who sent the signal
      const recipientId = signalData?.senderId === callerId ? calleeId : callerId;

      // Relay the signal
      const signalSent = await this.relaySignalToUser(recipientId, callId, signalType, signalData);

      // Update call status based on signal type
      let status: CallStatus = CallStatus.CONNECTING;

      switch (signalType) {
        case SignalType.OFFER:
          status = CallStatus.CONNECTING;
          break;
        case SignalType.ANSWER:
          status = CallStatus.CONNECTED;
          await this.updateCallStatus(callId, CallStatus.CONNECTED);
          break;
        case SignalType.HANG_UP:
          status = CallStatus.ENDED;
          await this.updateCallStatus(callId, CallStatus.ENDED);
          break;
        case SignalType.ICE_CANDIDATE:
          // ICE candidates don't change call status
          break;
      }

      return {
        callId,
        status,
        signalDelivered: signalSent,
      };
    } catch (error: any) {
      logger.error(`Failed to relay signal for call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Check if call has timed out (not answered)
   */
  private async checkCallTimeout(jobData: CallSignalJobData): Promise<CallSignalResult> {
    const { callId, callerId, calleeId } = jobData;

    try {
      // Get current call status
      const callStatus = await this.getCallStatus(callId);

      // If call is still ringing after timeout, mark as missed
      if (callStatus === CallStatus.RINGING || callStatus === CallStatus.INITIATING) {
        await this.updateCallStatus(callId, CallStatus.MISSED);

        // Notify caller that call was not answered
        await this.relaySignalToUser(callerId, callId, SignalType.HANG_UP, {
          reason: 'timeout',
        });

        // Handle missed call notification
        await this.handleMissedCall({
          ...jobData,
          type: 'handle_missed_call',
        });

        return {
          callId,
          status: CallStatus.MISSED,
          signalDelivered: true,
        };
      }

      // Call is no longer ringing, no action needed
      return {
        callId,
        status: callStatus || CallStatus.ENDED,
        signalDelivered: false,
      };
    } catch (error: any) {
      logger.error(`Failed to check timeout for call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * End a call
   */
  private async endCall(jobData: CallSignalJobData): Promise<CallSignalResult> {
    const { callId, callerId, calleeId, callDurationSeconds } = jobData;

    try {
      // Update call status
      await this.updateCallStatus(callId, CallStatus.ENDED, callDurationSeconds);

      // Notify both parties
      await Promise.all([
        this.relaySignalToUser(callerId, callId, SignalType.HANG_UP, { reason: 'ended' }),
        this.relaySignalToUser(calleeId, callId, SignalType.HANG_UP, { reason: 'ended' }),
      ]);

      // Record call in messaging service (for chat history)
      await this.recordCallInConversation(callId, callerId, calleeId, callDurationSeconds || 0);

      return {
        callId,
        status: CallStatus.ENDED,
        signalDelivered: true,
        callDurationSeconds,
      };
    } catch (error: any) {
      logger.error(`Failed to end call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Record call quality metrics
   */
  private async recordCallMetrics(jobData: CallSignalJobData): Promise<CallSignalResult> {
    const { callId, callerId, calleeId, callDurationSeconds, qualityMetrics } = jobData;

    try {
      // Send metrics to analytics service
      await axios.post(
        `${ANALYTICS_SERVICE_URL}/api/v1/events/call`,
        {
          callId,
          callerId,
          calleeId,
          durationSeconds: callDurationSeconds,
          metrics: qualityMetrics,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      // Store quality metrics for monitoring
      await this.storeQualityMetrics(callId, qualityMetrics);

      return {
        callId,
        status: CallStatus.ENDED,
        metricsRecorded: true,
        callDurationSeconds,
      };
    } catch (error: any) {
      logger.error(`Failed to record metrics for call ${callId}:`, error);
      // Don't throw - metrics recording failure shouldn't fail the job
      return {
        callId,
        status: CallStatus.ENDED,
        metricsRecorded: false,
        callDurationSeconds,
      };
    }
  }

  /**
   * Handle missed call notification
   */
  private async handleMissedCall(jobData: CallSignalJobData): Promise<CallSignalResult> {
    const { callId, callerId, calleeId, callType = CallType.AUDIO } = jobData;

    try {
      // Get caller name
      const callerName = await this.getUserName(callerId);

      // Send missed call notification to callee
      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
        {
          userId: calleeId,
          type: 'missed_call',
          title: 'Missed Call',
          body: `You missed a ${callType} call from ${callerName}`,
          data: {
            callId,
            callerId,
            callType,
            action: 'call_back',
          },
          channels: ['push', 'in_app'],
          priority: 'high',
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      // Record missed call in conversation
      await this.recordCallInConversation(callId, callerId, calleeId, 0, true);

      return {
        callId,
        status: CallStatus.MISSED,
        signalDelivered: true,
      };
    } catch (error: any) {
      logger.error(`Failed to handle missed call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user is online
   */
  private async checkUserOnline(userId: string): Promise<boolean> {
    try {
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/internal/presence/${userId}`, {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 3000,
      });

      return response.data.isOnline === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user is busy (on another call)
   */
  private async checkUserBusy(userId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${MESSAGING_SERVICE_URL}/api/v1/internal/calls/active/${userId}`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 3000,
        }
      );

      return response.data.hasActiveCall === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Relay signal to user via WebSocket
   */
  private async relaySignalToUser(
    userId: string,
    callId: string,
    signalType: SignalType,
    signalData: any
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        `${API_GATEWAY_URL}/api/v1/internal/ws/deliver`,
        {
          recipientId: userId,
          event: 'call_signal',
          payload: {
            callId,
            signalType,
            signalData,
            timestamp: new Date().toISOString(),
          },
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data.delivered === true;
    } catch (error: any) {
      logger.warn(`Failed to relay signal to user ${userId}:`, error.message);
      return false;
    }
  }

  /**
   * Send incoming call push notification
   */
  private async sendIncomingCallPush(
    callId: string,
    callerId: string,
    calleeId: string,
    callType: CallType
  ): Promise<void> {
    try {
      const callerName = await this.getUserName(callerId);

      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/notifications/voip`,
        {
          userId: calleeId,
          callId,
          callerId,
          callerName,
          callType,
          hasVideo: callType === CallType.VIDEO,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to send incoming call push:`, error);
    }
  }

  /**
   * Create call record
   */
  private async createCallRecord(
    callId: string,
    callerId: string,
    calleeId: string,
    callType: CallType
  ): Promise<void> {
    try {
      await axios.post(
        `${MESSAGING_SERVICE_URL}/api/v1/internal/calls`,
        {
          callId,
          callerId,
          calleeId,
          callType,
          status: CallStatus.INITIATING,
          startedAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to create call record:`, error);
    }
  }

  /**
   * Update call status
   */
  private async updateCallStatus(
    callId: string,
    status: CallStatus,
    durationSeconds?: number
  ): Promise<void> {
    try {
      await axios.patch(
        `${MESSAGING_SERVICE_URL}/api/v1/internal/calls/${callId}`,
        {
          status,
          durationSeconds,
          endedAt: status === CallStatus.ENDED ? new Date().toISOString() : undefined,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to update call status:`, error);
    }
  }

  /**
   * Get call status
   */
  private async getCallStatus(callId: string): Promise<CallStatus | null> {
    try {
      const response = await axios.get(`${MESSAGING_SERVICE_URL}/api/v1/internal/calls/${callId}`, {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      });

      return response.data.status as CallStatus;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user name
   */
  private async getUserName(userId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${process.env.USER_SERVICE_URL || 'http://localhost:3002'}/api/v1/users/${userId}/profile`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 3000,
        }
      );

      return response.data.firstName || 'Someone';
    } catch (error) {
      return 'Someone';
    }
  }

  /**
   * Record call in conversation
   */
  private async recordCallInConversation(
    callId: string,
    callerId: string,
    calleeId: string,
    durationSeconds: number,
    missed = false
  ): Promise<void> {
    try {
      await axios.post(
        `${MESSAGING_SERVICE_URL}/api/v1/internal/messages`,
        {
          senderId: callerId,
          recipientId: calleeId,
          type: 'call',
          content: {
            callId,
            durationSeconds,
            missed,
          },
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to record call in conversation:`, error);
    }
  }

  /**
   * Store quality metrics
   */
  private async storeQualityMetrics(callId: string, metrics?: CallQualityMetrics): Promise<void> {
    if (!metrics) return;

    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      });

      const key = `call:metrics:${callId}`;
      await redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(metrics)); // 7 days TTL
      await redis.quit();
    } catch (error: any) {
      logger.error(`Failed to store quality metrics:`, error);
    }
  }

  /**
   * Schedule timeout check
   */
  private async scheduleTimeoutCheck(
    callId: string,
    callerId: string,
    calleeId: string
  ): Promise<void> {
    await this.addJob(
      {
        type: 'check_timeout',
        callId,
        callerId,
        calleeId,
      },
      {
        delay: this.callTimeoutSeconds * 1000,
        priority: JobPriority.HIGH,
      }
    );
  }

  /**
   * Schedule call initiation
   */
  async scheduleCallInitiation(
    callId: string,
    callerId: string,
    calleeId: string,
    callType: CallType = CallType.AUDIO
  ): Promise<void> {
    await this.addJob(
      {
        type: 'initiate_call',
        callId,
        callerId,
        calleeId,
        callType,
      },
      {
        priority: JobPriority.CRITICAL,
      }
    );
  }

  /**
   * Schedule signal relay
   */
  async scheduleSignalRelay(
    callId: string,
    callerId: string,
    calleeId: string,
    signalType: SignalType,
    signalData: any
  ): Promise<void> {
    await this.addJob(
      {
        type: 'relay_signal',
        callId,
        callerId,
        calleeId,
        signalType,
        signalData,
      },
      {
        priority: JobPriority.CRITICAL,
      }
    );
  }

  /**
   * Schedule call end
   */
  async scheduleCallEnd(
    callId: string,
    callerId: string,
    calleeId: string,
    durationSeconds: number
  ): Promise<void> {
    await this.addJob(
      {
        type: 'end_call',
        callId,
        callerId,
        calleeId,
        callDurationSeconds: durationSeconds,
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }

  /**
   * Schedule metrics recording
   */
  async scheduleMetricsRecording(
    callId: string,
    callerId: string,
    calleeId: string,
    durationSeconds: number,
    qualityMetrics: CallQualityMetrics
  ): Promise<void> {
    await this.addJob(
      {
        type: 'record_metrics',
        callId,
        callerId,
        calleeId,
        callDurationSeconds: durationSeconds,
        qualityMetrics,
      },
      {
        priority: JobPriority.LOW,
      }
    );
  }
}

// Export singleton instance
export const callSignalWorker = new CallSignalWorker();
export default callSignalWorker;
