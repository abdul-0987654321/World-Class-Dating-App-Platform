/**
 * Churn Prediction Scheduled Job
 *
 * Runs daily churn predictions and automatic interventions for at-risk users.
 * Designed to run as a cron job or scheduled task.
 */

import { CronJob } from 'cron';
import { churnPredictionService } from '../services/churn-prediction.service';
import { createLogger } from '@flamoral/backend-shared';
import { ChurnPredictionJob, ChurnRiskTier } from '../types';

const logger = createLogger('churn-prediction-job');

// Job configuration
const DAILY_PREDICTION_CRON = process.env.CHURN_PREDICTION_CRON || '0 2 * * *'; // 2 AM daily
const MODEL_UPDATE_CRON = process.env.CHURN_MODEL_UPDATE_CRON || '0 3 * * 0'; // 3 AM Sundays
const INTERVENTION_CHECK_CRON = process.env.INTERVENTION_CHECK_CRON || '0 */4 * * *'; // Every 4 hours

interface JobResult {
  jobId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  details: any;
  error?: string;
}

class ChurnPredictionJobRunner {
  private dailyJob: CronJob | null = null;
  private modelUpdateJob: CronJob | null = null;
  private interventionJob: CronJob | null = null;
  private isRunning: boolean = false;
  private lastJobResult: JobResult | null = null;

  /**
   * Start all scheduled jobs
   */
  start(): void {
    logger.info('Starting churn prediction scheduled jobs...');

    // Daily prediction job
    this.dailyJob = new CronJob(
      DAILY_PREDICTION_CRON,
      async () => {
        await this.runDailyPredictions();
      },
      null,
      true,
      'UTC'
    );

    // Weekly model update job
    this.modelUpdateJob = new CronJob(
      MODEL_UPDATE_CRON,
      async () => {
        await this.runModelUpdate();
      },
      null,
      true,
      'UTC'
    );

    // Periodic intervention check
    this.interventionJob = new CronJob(
      INTERVENTION_CHECK_CRON,
      async () => {
        await this.runInterventionCheck();
      },
      null,
      true,
      'UTC'
    );

    logger.info(`Daily predictions scheduled: ${DAILY_PREDICTION_CRON}`);
    logger.info(`Model updates scheduled: ${MODEL_UPDATE_CRON}`);
    logger.info(`Intervention checks scheduled: ${INTERVENTION_CHECK_CRON}`);
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    logger.info('Stopping churn prediction scheduled jobs...');

    if (this.dailyJob) {
      this.dailyJob.stop();
      this.dailyJob = null;
    }

    if (this.modelUpdateJob) {
      this.modelUpdateJob.stop();
      this.modelUpdateJob = null;
    }

    if (this.interventionJob) {
      this.interventionJob.stop();
      this.interventionJob = null;
    }

    logger.info('All churn prediction jobs stopped');
  }

  /**
   * Run daily churn predictions for all users
   */
  async runDailyPredictions(): Promise<JobResult> {
    const startTime = new Date();
    const jobId = `daily_${startTime.getTime()}`;

    logger.info(`Starting daily churn prediction job: ${jobId}`);

    if (this.isRunning) {
      logger.warn('Skipping job - previous job still running');
      return {
        jobId,
        success: false,
        startTime,
        endTime: new Date(),
        duration: 0,
        details: { skipped: true, reason: 'Previous job still running' },
      };
    }

    this.isRunning = true;

    try {
      const job: ChurnPredictionJob = await churnPredictionService.runDailyPredictions();

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: JobResult = {
        jobId,
        success: job.status === 'completed',
        startTime,
        endTime,
        duration,
        details: {
          usersProcessed: job.usersProcessed,
          usersTotal: job.usersTotal,
          modelVersion: job.modelVersion,
          status: job.status,
        },
        error: job.errorMessage,
      };

      this.lastJobResult = result;

      logger.info(`Daily prediction job completed: ${job.usersProcessed}/${job.usersTotal} users processed in ${duration}ms`);

      // Emit metrics for monitoring
      await this.emitJobMetrics(result);

      return result;
    } catch (error: any) {
      const endTime = new Date();

      const result: JobResult = {
        jobId,
        success: false,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        details: {},
        error: error.message,
      };

      this.lastJobResult = result;
      logger.error('Daily prediction job failed:', error);

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run model weight update based on historical data
   */
  async runModelUpdate(): Promise<JobResult> {
    const startTime = new Date();
    const jobId = `model_update_${startTime.getTime()}`;

    logger.info(`Starting model update job: ${jobId}`);

    try {
      const modelWeights = await churnPredictionService.updateChurnModel();

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: JobResult = {
        jobId,
        success: true,
        startTime,
        endTime,
        duration,
        details: {
          newVersion: modelWeights.version,
          accuracy: modelWeights.accuracy,
          trainingDataSize: modelWeights.trainingDataSize,
        },
      };

      logger.info(`Model update completed: v${modelWeights.version} with ${modelWeights.accuracy.toFixed(2)} accuracy`);

      return result;
    } catch (error: any) {
      const endTime = new Date();

      const result: JobResult = {
        jobId,
        success: false,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        details: {},
        error: error.message,
      };

      logger.error('Model update job failed:', error);
      return result;
    }
  }

  /**
   * Check for and trigger interventions for at-risk users
   */
  async runInterventionCheck(): Promise<JobResult> {
    const startTime = new Date();
    const jobId = `intervention_${startTime.getTime()}`;

    logger.info(`Starting intervention check job: ${jobId}`);

    try {
      let interventionCount = 0;

      // Get critical risk users
      const criticalUsers = await churnPredictionService.getAtRiskUsers(
        ChurnRiskTier.CRITICAL,
        50
      );

      for (const user of criticalUsers) {
        // Only intervene if no recent campaign
        const daysSinceLastCampaign = user.lastCampaignDate
          ? Math.floor((Date.now() - user.lastCampaignDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceLastCampaign >= 3) {
          try {
            // Get recommended campaign from latest prediction
            const risk = await churnPredictionService.calculateChurnRisk(user.userId);
            if (risk.recommendedCampaigns.length > 0) {
              await churnPredictionService.triggerRetentionCampaign(
                user.userId,
                risk.recommendedCampaigns[0]
              );
              interventionCount++;
            }
          } catch (error) {
            logger.error(`Failed to trigger intervention for user ${user.userId}:`, error);
          }
        }
      }

      // Get high risk users who haven't been contacted in a week
      const highRiskUsers = await churnPredictionService.getAtRiskUsers(
        ChurnRiskTier.HIGH,
        100
      );

      for (const user of highRiskUsers) {
        const daysSinceLastCampaign = user.lastCampaignDate
          ? Math.floor((Date.now() - user.lastCampaignDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceLastCampaign >= 7) {
          try {
            const risk = await churnPredictionService.calculateChurnRisk(user.userId);
            if (risk.recommendedCampaigns.length > 0) {
              await churnPredictionService.triggerRetentionCampaign(
                user.userId,
                risk.recommendedCampaigns[0]
              );
              interventionCount++;
            }
          } catch (error) {
            logger.error(`Failed to trigger intervention for user ${user.userId}:`, error);
          }
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: JobResult = {
        jobId,
        success: true,
        startTime,
        endTime,
        duration,
        details: {
          criticalUsersChecked: criticalUsers.length,
          highRiskUsersChecked: highRiskUsers.length,
          interventionsTriggered: interventionCount,
        },
      };

      logger.info(`Intervention check completed: ${interventionCount} interventions triggered`);

      return result;
    } catch (error: any) {
      const endTime = new Date();

      const result: JobResult = {
        jobId,
        success: false,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        details: {},
        error: error.message,
      };

      logger.error('Intervention check job failed:', error);
      return result;
    }
  }

  /**
   * Manually trigger prediction for specific users
   */
  async runPredictionForUsers(userIds: string[]): Promise<{
    success: number;
    failed: number;
    results: Array<{ userId: string; success: boolean; error?: string }>;
  }> {
    logger.info(`Running predictions for ${userIds.length} specific users`);

    const results: Array<{ userId: string; success: boolean; error?: string }> = [];
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await churnPredictionService.calculateChurnRisk(userId);
        results.push({ userId, success: true });
        success++;
      } catch (error: any) {
        results.push({ userId, success: false, error: error.message });
        failed++;
      }
    }

    logger.info(`Batch prediction completed: ${success} success, ${failed} failed`);

    return { success, failed, results };
  }

  /**
   * Get job status
   */
  getStatus(): {
    isRunning: boolean;
    lastJobResult: JobResult | null;
    scheduledJobs: {
      dailyPredictions: { nextRun: Date | null; isActive: boolean };
      modelUpdate: { nextRun: Date | null; isActive: boolean };
      interventionCheck: { nextRun: Date | null; isActive: boolean };
    };
  } {
    return {
      isRunning: this.isRunning,
      lastJobResult: this.lastJobResult,
      scheduledJobs: {
        dailyPredictions: {
          nextRun: this.dailyJob?.nextDate()?.toJSDate() || null,
          isActive: this.dailyJob?.running || false,
        },
        modelUpdate: {
          nextRun: this.modelUpdateJob?.nextDate()?.toJSDate() || null,
          isActive: this.modelUpdateJob?.running || false,
        },
        interventionCheck: {
          nextRun: this.interventionJob?.nextDate()?.toJSDate() || null,
          isActive: this.interventionJob?.running || false,
        },
      },
    };
  }

  /**
   * Emit job metrics for monitoring
   */
  private async emitJobMetrics(result: JobResult): Promise<void> {
    // Would integrate with monitoring system (Prometheus, DataDog, etc.)
    logger.info('Job metrics:', {
      jobId: result.jobId,
      success: result.success,
      duration: result.duration,
      usersProcessed: result.details.usersProcessed,
    });
  }
}

// Export singleton instance
export const churnPredictionJobRunner = new ChurnPredictionJobRunner();
export default churnPredictionJobRunner;
