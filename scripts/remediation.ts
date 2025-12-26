/**
 * Flamoral Platform - Automated Remediation System
 * Detects and automatically fixes common infrastructure issues
 */

import { execSync, exec } from 'child_process';
import https from 'https';
import http from 'http';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface RemediationConfig {
  namespace: string;
  dryRun: boolean;
  maxRestartAttempts: number;
  podRestartBackoffSeconds: number;
  scaleUpThreshold: number;
  prometheusUrl?: string;
  slackWebhookUrl?: string;
}

interface RemediationAction {
  type: string;
  target: string;
  action: string;
  success: boolean;
  message: string;
  timestamp: string;
}

interface RemediationReport {
  timestamp: string;
  namespace: string;
  dryRun: boolean;
  actionsAttempted: number;
  actionsSucceeded: number;
  actionsFailed: number;
  actions: RemediationAction[];
}

// Parse command line arguments
function parseArgs(): RemediationConfig {
  const args = process.argv.slice(2);
  const config: RemediationConfig = {
    namespace: 'flamoral-prod',
    dryRun: false,
    maxRestartAttempts: 3,
    podRestartBackoffSeconds: 60,
    scaleUpThreshold: 80,
    prometheusUrl: process.env.PROMETHEUS_URL,
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  };

  for (const arg of args) {
    if (arg.startsWith('--namespace=')) {
      config.namespace = arg.split('=')[1];
    } else if (arg.startsWith('--dry-run=')) {
      config.dryRun = arg.split('=')[1] === 'true';
    } else if (arg.startsWith('--issues=')) {
      // Parse issues JSON (handled separately)
    } else if (arg.startsWith('--unhealthy-pods=')) {
      // Handled in remediation logic
    } else if (arg.startsWith('--restart-candidates=')) {
      // Handled in remediation logic
    } else if (arg.startsWith('--memory-pressure=')) {
      // Handled in remediation logic
    }
  }

  return config;
}

const config = parseArgs();

// =============================================================================
// UTILITIES
// =============================================================================

const log = {
  info: (msg: string) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  action: (msg: string) => console.log(`[ACTION] ${new Date().toISOString()} ${msg}`),
  success: (msg: string) => console.log(`[SUCCESS] ${new Date().toISOString()} ${msg}`),
  error: (msg: string) => console.log(`[ERROR] ${new Date().toISOString()} ${msg}`),
  dryRun: (msg: string) => console.log(`[DRY-RUN] ${new Date().toISOString()} ${msg}`),
};

const execCommand = (cmd: string, timeout: number = 30000): { success: boolean; output: string } => {
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { success: true, output };
  } catch (error: any) {
    return { success: false, output: error.message };
  }
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const sendWebhook = async (url: string, payload: object): Promise<boolean> => {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const req = protocol.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.write(data);
    req.end();
  });
};

// =============================================================================
// REMEDIATION ACTIONS
// =============================================================================

class RemediationEngine {
  private actions: RemediationAction[] = [];

  private recordAction(action: Omit<RemediationAction, 'timestamp'>): void {
    this.actions.push({
      ...action,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Restart unhealthy pods with exponential backoff
   */
  async restartUnhealthyPods(podNames: string[]): Promise<void> {
    log.info(`Processing ${podNames.length} pods for restart`);

    for (const podName of podNames) {
      if (!podName) continue;

      log.action(`Restarting pod: ${podName}`);

      if (config.dryRun) {
        log.dryRun(`Would delete pod: ${podName}`);
        this.recordAction({
          type: 'pod_restart',
          target: podName,
          action: 'delete',
          success: true,
          message: 'Dry run - no action taken',
        });
        continue;
      }

      // Check restart count to avoid infinite restart loops
      const restartInfo = execCommand(
        `kubectl get pod ${podName} -n ${config.namespace} -o jsonpath='{.status.containerStatuses[0].restartCount}' 2>/dev/null`
      );

      const restartCount = parseInt(restartInfo.output) || 0;

      if (restartCount >= config.maxRestartAttempts) {
        log.error(`Pod ${podName} has already restarted ${restartCount} times - skipping`);
        this.recordAction({
          type: 'pod_restart',
          target: podName,
          action: 'skipped',
          success: false,
          message: `Exceeded max restart attempts (${restartCount}/${config.maxRestartAttempts})`,
        });
        continue;
      }

      // Delete the pod (Kubernetes will recreate it)
      const result = execCommand(
        `kubectl delete pod ${podName} -n ${config.namespace} --grace-period=30`
      );

      if (result.success) {
        log.success(`Successfully deleted pod ${podName} for restart`);
        this.recordAction({
          type: 'pod_restart',
          target: podName,
          action: 'deleted',
          success: true,
          message: 'Pod deleted successfully, will be recreated by deployment',
        });

        // Wait for backoff before next restart
        await sleep(config.podRestartBackoffSeconds * 1000);
      } else {
        log.error(`Failed to delete pod ${podName}: ${result.output}`);
        this.recordAction({
          type: 'pod_restart',
          target: podName,
          action: 'delete_failed',
          success: false,
          message: result.output,
        });
      }
    }
  }

  /**
   * Scale up deployments under resource pressure
   */
  async scaleUpForMemoryPressure(): Promise<void> {
    log.info('Checking deployments for scale-up due to memory pressure');

    // Get HPA status
    const hpaResult = execCommand(
      `kubectl get hpa -n ${config.namespace} -o json 2>/dev/null`
    );

    if (!hpaResult.success) {
      log.error('Could not retrieve HPA status');
      return;
    }

    try {
      const hpas = JSON.parse(hpaResult.output);

      for (const hpa of hpas.items) {
        const name = hpa.metadata.name;
        const currentReplicas = hpa.status.currentReplicas;
        const maxReplicas = hpa.spec.maxReplicas;
        const currentCpuUtilization = hpa.status.currentCPUUtilizationPercentage || 0;

        // If at max replicas but still under pressure, log warning
        if (currentReplicas >= maxReplicas) {
          log.info(`HPA ${name} already at max replicas (${currentReplicas}/${maxReplicas})`);

          if (currentCpuUtilization > config.scaleUpThreshold) {
            log.action(`Consider increasing maxReplicas for ${name} (CPU: ${currentCpuUtilization}%)`);
            this.recordAction({
              type: 'scale_recommendation',
              target: name,
              action: 'increase_max_replicas',
              success: true,
              message: `Recommend increasing maxReplicas (current CPU: ${currentCpuUtilization}%)`,
            });
          }
          continue;
        }

        // Manually scale up if CPU is high
        if (currentCpuUtilization > config.scaleUpThreshold) {
          const targetReplicas = Math.min(currentReplicas + 1, maxReplicas);
          log.action(`Scaling ${name} from ${currentReplicas} to ${targetReplicas} replicas`);

          if (config.dryRun) {
            log.dryRun(`Would scale ${name} to ${targetReplicas} replicas`);
            this.recordAction({
              type: 'scale_up',
              target: name,
              action: 'scale',
              success: true,
              message: 'Dry run - no action taken',
            });
            continue;
          }

          const scaleResult = execCommand(
            `kubectl scale deployment ${name.replace('-hpa', '')} -n ${config.namespace} --replicas=${targetReplicas}`
          );

          if (scaleResult.success) {
            log.success(`Scaled ${name} to ${targetReplicas} replicas`);
            this.recordAction({
              type: 'scale_up',
              target: name,
              action: 'scaled',
              success: true,
              message: `Scaled to ${targetReplicas} replicas`,
            });
          } else {
            log.error(`Failed to scale ${name}: ${scaleResult.output}`);
            this.recordAction({
              type: 'scale_up',
              target: name,
              action: 'scale_failed',
              success: false,
              message: scaleResult.output,
            });
          }
        }
      }
    } catch (error) {
      log.error(`Failed to parse HPA data: ${(error as Error).message}`);
    }
  }

  /**
   * Clear stuck job queues
   */
  async clearStuckJobQueues(): Promise<void> {
    log.info('Checking for stuck jobs');

    // Get completed/failed jobs older than 1 hour
    const jobsResult = execCommand(
      `kubectl get jobs -n ${config.namespace} -o json 2>/dev/null`
    );

    if (!jobsResult.success) {
      log.info('Could not retrieve jobs or no jobs found');
      return;
    }

    try {
      const jobs = JSON.parse(jobsResult.output);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      for (const job of jobs.items) {
        const name = job.metadata.name;
        const completionTime = job.status.completionTime
          ? new Date(job.status.completionTime).getTime()
          : null;
        const failed = job.status.failed > 0;
        const succeeded = job.status.succeeded > 0;

        // Delete completed jobs older than 1 hour
        if ((succeeded || failed) && completionTime && completionTime < oneHourAgo) {
          log.action(`Cleaning up old job: ${name}`);

          if (config.dryRun) {
            log.dryRun(`Would delete job: ${name}`);
            this.recordAction({
              type: 'job_cleanup',
              target: name,
              action: 'delete',
              success: true,
              message: 'Dry run - no action taken',
            });
            continue;
          }

          const deleteResult = execCommand(
            `kubectl delete job ${name} -n ${config.namespace}`
          );

          if (deleteResult.success) {
            log.success(`Deleted old job: ${name}`);
            this.recordAction({
              type: 'job_cleanup',
              target: name,
              action: 'deleted',
              success: true,
              message: 'Old job cleaned up',
            });
          } else {
            this.recordAction({
              type: 'job_cleanup',
              target: name,
              action: 'delete_failed',
              success: false,
              message: deleteResult.output,
            });
          }
        }

        // Handle stuck jobs (running > 30 minutes without completion)
        const startTime = job.status.startTime
          ? new Date(job.status.startTime).getTime()
          : null;
        const running = job.status.active > 0;
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);

        if (running && startTime && startTime < thirtyMinutesAgo && !completionTime) {
          log.action(`Found stuck job: ${name} (running since ${job.status.startTime})`);

          if (config.dryRun) {
            log.dryRun(`Would delete stuck job: ${name}`);
            this.recordAction({
              type: 'stuck_job',
              target: name,
              action: 'delete',
              success: true,
              message: 'Dry run - no action taken',
            });
            continue;
          }

          const deleteResult = execCommand(
            `kubectl delete job ${name} -n ${config.namespace} --force --grace-period=0`
          );

          if (deleteResult.success) {
            log.success(`Force deleted stuck job: ${name}`);
            this.recordAction({
              type: 'stuck_job',
              target: name,
              action: 'force_deleted',
              success: true,
              message: 'Stuck job force deleted',
            });
          } else {
            this.recordAction({
              type: 'stuck_job',
              target: name,
              action: 'delete_failed',
              success: false,
              message: deleteResult.output,
            });
          }
        }
      }
    } catch (error) {
      log.error(`Failed to process jobs: ${(error as Error).message}`);
    }
  }

  /**
   * Reset connection pools by restarting services with stale connections
   */
  async resetConnectionPools(): Promise<void> {
    log.info('Checking for services with potential stale connections');

    // Look for pods with high restart counts or error logs
    const podsResult = execCommand(
      `kubectl get pods -n ${config.namespace} -o json 2>/dev/null`
    );

    if (!podsResult.success) return;

    try {
      const pods = JSON.parse(podsResult.output);
      const connectionResetCandidates: string[] = [];

      for (const pod of pods.items) {
        const name = pod.metadata.name;
        const containerStatuses = pod.status.containerStatuses || [];

        for (const status of containerStatuses) {
          // Check for connection-related errors in last termination reason
          const lastTermination = status.lastState?.terminated;
          if (lastTermination) {
            const reason = lastTermination.reason || '';
            const exitCode = lastTermination.exitCode;

            // Connection timeout or similar issues often exit with specific codes
            if (reason.includes('Connection') ||
                reason.includes('Timeout') ||
                exitCode === 137 ||  // OOMKilled
                exitCode === 143) {  // SIGTERM
              // Check logs for connection errors
              const logsResult = execCommand(
                `kubectl logs ${name} -n ${config.namespace} --tail=50 2>/dev/null | grep -i "connection\|timeout\|pool" | head -5`
              );

              if (logsResult.output.includes('connection') ||
                  logsResult.output.includes('timeout') ||
                  logsResult.output.includes('pool exhausted')) {
                connectionResetCandidates.push(name);
              }
            }
          }
        }
      }

      if (connectionResetCandidates.length > 0) {
        log.action(`Found ${connectionResetCandidates.length} pods with potential connection issues`);

        for (const podName of connectionResetCandidates) {
          // Rolling restart the deployment
          const deploymentName = podName.replace(/-[a-z0-9]+-[a-z0-9]+$/, '');

          log.action(`Rolling restart deployment: ${deploymentName}`);

          if (config.dryRun) {
            log.dryRun(`Would restart deployment: ${deploymentName}`);
            this.recordAction({
              type: 'connection_reset',
              target: deploymentName,
              action: 'rollout_restart',
              success: true,
              message: 'Dry run - no action taken',
            });
            continue;
          }

          const restartResult = execCommand(
            `kubectl rollout restart deployment/${deploymentName} -n ${config.namespace}`
          );

          if (restartResult.success) {
            log.success(`Rolling restart initiated for ${deploymentName}`);
            this.recordAction({
              type: 'connection_reset',
              target: deploymentName,
              action: 'rollout_restart',
              success: true,
              message: 'Rolling restart initiated to reset connections',
            });
          } else {
            this.recordAction({
              type: 'connection_reset',
              target: deploymentName,
              action: 'restart_failed',
              success: false,
              message: restartResult.output,
            });
          }
        }
      }
    } catch (error) {
      log.error(`Failed to check connection pools: ${(error as Error).message}`);
    }
  }

  /**
   * Spawn additional workers for queue backlog
   */
  async handleQueueBacklog(): Promise<void> {
    log.info('Checking for queue backlog');

    // Check Redis queue lengths (if accessible)
    const redisPodResult = execCommand(
      `kubectl get pods -n ${config.namespace} -l app.kubernetes.io/name=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null`
    );

    if (!redisPodResult.success || !redisPodResult.output) {
      log.info('Redis pod not found - skipping queue check');
      return;
    }

    const redisPod = redisPodResult.output;

    // Get queue lengths for known queues
    const queues = ['notification-queue', 'email-queue', 'matching-queue', 'analytics-queue'];

    for (const queue of queues) {
      const lengthResult = execCommand(
        `kubectl exec ${redisPod} -n ${config.namespace} -- redis-cli llen ${queue} 2>/dev/null`
      );

      if (lengthResult.success) {
        const queueLength = parseInt(lengthResult.output) || 0;

        if (queueLength > 1000) {
          log.action(`Queue ${queue} has ${queueLength} items - considering scale up`);

          // Get related deployment
          const deploymentName = queue.replace('-queue', '-service');

          // Scale up the worker deployment
          const currentScaleResult = execCommand(
            `kubectl get deployment ${deploymentName} -n ${config.namespace} -o jsonpath='{.spec.replicas}' 2>/dev/null`
          );

          if (currentScaleResult.success) {
            const currentReplicas = parseInt(currentScaleResult.output) || 1;
            const targetReplicas = Math.min(currentReplicas + 2, 10);

            if (config.dryRun) {
              log.dryRun(`Would scale ${deploymentName} to ${targetReplicas} for queue backlog`);
              this.recordAction({
                type: 'queue_backlog',
                target: deploymentName,
                action: 'scale_up',
                success: true,
                message: `Dry run - queue length: ${queueLength}`,
              });
              continue;
            }

            const scaleResult = execCommand(
              `kubectl scale deployment ${deploymentName} -n ${config.namespace} --replicas=${targetReplicas}`
            );

            if (scaleResult.success) {
              log.success(`Scaled ${deploymentName} to ${targetReplicas} for queue backlog`);
              this.recordAction({
                type: 'queue_backlog',
                target: deploymentName,
                action: 'scaled_up',
                success: true,
                message: `Scaled to handle queue backlog (${queueLength} items)`,
              });
            } else {
              this.recordAction({
                type: 'queue_backlog',
                target: deploymentName,
                action: 'scale_failed',
                success: false,
                message: scaleResult.output,
              });
            }
          }
        }
      }
    }
  }

  /**
   * Send alert notification
   */
  async sendAlert(report: RemediationReport): Promise<void> {
    if (!config.slackWebhookUrl) return;

    const failedActions = report.actions.filter(a => !a.success);
    if (failedActions.length === 0 && report.actionsSucceeded > 0) {
      // Only send success notification if something was actually remediated
      return;
    }

    if (failedActions.length > 0) {
      const payload = {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: 'Self-Healing Remediation Alert',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Namespace:*\n${report.namespace}`,
              },
              {
                type: 'mrkdwn',
                text: `*Status:*\n${failedActions.length > 0 ? 'Partial Failure' : 'Success'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Actions Succeeded:*\n${report.actionsSucceeded}`,
              },
              {
                type: 'mrkdwn',
                text: `*Actions Failed:*\n${report.actionsFailed}`,
              },
            ],
          },
          ...(failedActions.length > 0 ? [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Failed Actions:*\n${failedActions.map(a => `- ${a.target}: ${a.message}`).join('\n')}`,
            },
          }] : []),
        ],
      };

      await sendWebhook(config.slackWebhookUrl, payload);
    }
  }

  /**
   * Generate remediation report
   */
  generateReport(): RemediationReport {
    const succeeded = this.actions.filter(a => a.success).length;
    const failed = this.actions.filter(a => !a.success).length;

    return {
      timestamp: new Date().toISOString(),
      namespace: config.namespace,
      dryRun: config.dryRun,
      actionsAttempted: this.actions.length,
      actionsSucceeded: succeeded,
      actionsFailed: failed,
      actions: this.actions,
    };
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main(): Promise<void> {
  console.log('============================================');
  console.log('   FLAMORAL SELF-HEALING REMEDIATION');
  console.log('============================================');
  console.log(`Namespace:   ${config.namespace}`);
  console.log(`Dry Run:     ${config.dryRun}`);
  console.log(`Time:        ${new Date().toISOString()}`);
  console.log('============================================\n');

  const engine = new RemediationEngine();

  // Parse restart candidates from CLI args
  const args = process.argv.slice(2);
  let restartCandidates: string[] = [];
  let unhealthyPodCount = 0;
  let memoryPressure = 0;

  for (const arg of args) {
    if (arg.startsWith('--restart-candidates=')) {
      const candidates = arg.split('=')[1];
      restartCandidates = candidates.split(',').filter(c => c.length > 0);
    } else if (arg.startsWith('--unhealthy-pods=')) {
      unhealthyPodCount = parseInt(arg.split('=')[1]) || 0;
    } else if (arg.startsWith('--memory-pressure=')) {
      memoryPressure = parseInt(arg.split('=')[1]) || 0;
    }
  }

  // 1. Restart pods in CrashLoopBackOff
  if (restartCandidates.length > 0) {
    log.info('=== Restarting CrashLoopBackOff Pods ===');
    await engine.restartUnhealthyPods(restartCandidates);
  }

  // 2. Handle memory pressure
  if (memoryPressure > 0) {
    log.info('=== Handling Memory Pressure ===');
    await engine.scaleUpForMemoryPressure();
  }

  // 3. Clear stuck job queues
  log.info('=== Clearing Stuck Jobs ===');
  await engine.clearStuckJobQueues();

  // 4. Reset stale connections
  log.info('=== Checking Connection Pools ===');
  await engine.resetConnectionPools();

  // 5. Handle queue backlog
  log.info('=== Checking Queue Backlog ===');
  await engine.handleQueueBacklog();

  // Generate and output report
  const report = engine.generateReport();

  console.log('\n============================================');
  console.log('       REMEDIATION SUMMARY');
  console.log('============================================');
  console.log(`Actions Attempted: ${report.actionsAttempted}`);
  console.log(`Actions Succeeded: ${report.actionsSucceeded}`);
  console.log(`Actions Failed:    ${report.actionsFailed}`);
  console.log('============================================\n');

  if (report.actions.length > 0) {
    console.log('Actions Taken:');
    for (const action of report.actions) {
      const status = action.success ? '[OK]' : '[FAIL]';
      console.log(`  ${status} ${action.type} - ${action.target}: ${action.message}`);
    }
  } else {
    console.log('No remediation actions were necessary.');
  }

  // Send alert if there were failures
  await engine.sendAlert(report);

  // Output JSON for CI/CD
  if (process.env.OUTPUT_JSON === 'true') {
    console.log('\nJSON Output:');
    console.log(JSON.stringify(report, null, 2));
  }

  // Exit with error code if there were failures
  if (report.actionsFailed > 0) {
    process.exit(1);
  }
}

// Run remediation
main().catch((error) => {
  console.error('Remediation failed:', error);
  process.exit(1);
});
