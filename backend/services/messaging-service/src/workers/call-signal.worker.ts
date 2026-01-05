/**
 * Call Signal Worker
 * Background worker for handling call signaling timeouts and cleanup
 */

import { RedisClient } from '../infrastructure/cache/redis';
import { VideoCallService, CallSession } from '../services/video-call.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('call-signal-worker');

// Configuration
const CALL_TIMEOUT_CHECK_INTERVAL = 5000; // Check every 5 seconds
const CALL_RING_TIMEOUT = 30000; // 30 seconds before marking as missed
const CALL_SESSION_PREFIX = 'call:session:';

// Agora configuration
const agoraConfig = {
  appId: process.env.AGORA_APP_ID || '',
  appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
  tokenExpiryTime: parseInt(process.env.AGORA_TOKEN_EXPIRY || '3600', 10),
};

export class CallSignalWorker {
  private redis: RedisClient;
  private videoCallService: VideoCallService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.redis = RedisClient.getInstance();
    this.videoCallService = new VideoCallService(this.redis, agoraConfig);
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Call signal worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting call signal worker');

    // Run initial check
    await this.processTimeouts();

    // Set up interval for checking timeouts
    this.intervalId = setInterval(async () => {
      try {
        await this.processTimeouts();
      } catch (error) {
        logger.error('Error in call signal worker loop', { error });
      }
    }, CALL_TIMEOUT_CHECK_INTERVAL);

    logger.info('Call signal worker started', {
      checkInterval: CALL_TIMEOUT_CHECK_INTERVAL,
      ringTimeout: CALL_RING_TIMEOUT,
    });
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Call signal worker stopped');
  }

  /**
   * Process call timeouts
   */
  private async processTimeouts(): Promise<void> {
    try {
      // Get all active call sessions
      const keys = await this.redis.keys(`${CALL_SESSION_PREFIX}*`);

      if (keys.length === 0) {
        return;
      }

      const now = Date.now();
      let processedCount = 0;
      let timedOutCount = 0;

      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (!data) continue;

          const session: CallSession = JSON.parse(data);
          processedCount++;

          // Check for ringing timeout
          if (session.status === 'ringing' || session.status === 'initiated') {
            const elapsed = now - session.startTime;

            if (elapsed >= CALL_RING_TIMEOUT) {
              await this.handleCallTimeout(session);
              timedOutCount++;
            }
          }
        } catch (parseError) {
          logger.warn('Error parsing call session', { key, error: parseError });
        }
      }

      if (timedOutCount > 0) {
        logger.info('Processed call timeouts', {
          processed: processedCount,
          timedOut: timedOutCount,
        });
      }
    } catch (error) {
      logger.error('Error processing call timeouts', { error });
    }
  }

  /**
   * Handle a timed-out call
   */
  private async handleCallTimeout(session: CallSession): Promise<void> {
    try {
      logger.info('Call timed out', {
        callId: session.callId,
        callerId: session.callerId,
        calleeId: session.calleeId,
      });

      // Mark call as missed
      await this.videoCallService.markCallAsMissed(session.callId);

      // Emit WebSocket events for timeout notification
      // This would typically be done via a shared event emitter or Redis pub/sub
      await this.publishCallTimeoutEvent(session);
    } catch (error) {
      logger.error('Error handling call timeout', {
        callId: session.callId,
        error,
      });
    }
  }

  /**
   * Publish call timeout event via Redis pub/sub
   */
  private async publishCallTimeoutEvent(session: CallSession): Promise<void> {
    try {
      const event = {
        type: 'call:timeout',
        data: {
          callId: session.callId,
          callerId: session.callerId,
          calleeId: session.calleeId,
          callType: session.callType,
        },
        timestamp: Date.now(),
      };

      // Publish to Redis for socket manager to pick up
      await this.redis.publish('call:events', JSON.stringify(event));
    } catch (error) {
      logger.error('Error publishing call timeout event', { error });
    }
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean; config: object } {
    return {
      isRunning: this.isRunning,
      config: {
        checkInterval: CALL_TIMEOUT_CHECK_INTERVAL,
        ringTimeout: CALL_RING_TIMEOUT,
      },
    };
  }
}

// Create singleton instance
let workerInstance: CallSignalWorker | null = null;

export function getCallSignalWorker(): CallSignalWorker {
  if (!workerInstance) {
    workerInstance = new CallSignalWorker();
  }
  return workerInstance;
}

/**
 * Start the worker (can be called from index.ts)
 */
export async function startCallSignalWorker(): Promise<void> {
  const worker = getCallSignalWorker();
  await worker.start();
}

/**
 * Stop the worker (for graceful shutdown)
 */
export async function stopCallSignalWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.stop();
  }
}

export default CallSignalWorker;
