/**
 * Flamoral Platform - Comprehensive Health Check System
 * Checks all service endpoints, databases, external integrations, and Kubernetes health
 */

import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import * as tls from 'tls';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface Config {
  domain: string;
  apiEndpoint: string;
  b2cTenant: string;
  kubernetesNamespace: string;
  prometheusUrl?: string;
  databaseUrl?: string;
  redisUrl?: string;
  stripeApiKey?: string;
  azureCommunicationConnectionString?: string;
  timeout: number;
}

const config: Config = {
  domain: process.env.DOMAIN || 'flamoral.com',
  apiEndpoint: process.env.API_ENDPOINT || 'https://api.flamoral.com',
  b2cTenant: process.env.B2C_TENANT || 'flamoralb2c',
  kubernetesNamespace: process.env.KUBERNETES_NAMESPACE || 'flamoral-prod',
  prometheusUrl: process.env.PROMETHEUS_URL,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  stripeApiKey: process.env.STRIPE_API_KEY,
  azureCommunicationConnectionString: process.env.AZURE_COMMUNICATION_CONNECTION_STRING,
  timeout: parseInt(process.env.TIMEOUT || '10000'),
};

// =============================================================================
// TYPES
// =============================================================================

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  duration: number;
  details?: Record<string, unknown>;
}

interface HealthReport {
  timestamp: string;
  environment: string;
  overallStatus: 'healthy' | 'warning' | 'critical';
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

const httpRequest = (url: string, options: https.RequestOptions = {}): Promise<{ statusCode: number; body: string; headers: http.IncomingHttpHeaders }> => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = options.timeout || config.timeout;

    const req = protocol.request(url, { ...options, timeout }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body,
          headers: res.headers,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

const timed = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = Date.now();
  const result = await fn();
  return { result, duration: Date.now() - start };
};

const execCommand = (cmd: string): string => {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    return '';
  }
};

const log = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  pass: (msg: string) => console.log(`[PASS] ${msg}`),
  warn: (msg: string) => console.log(`[WARNING] ${msg}`),
  fail: (msg: string) => console.log(`[CRITICAL] ${msg}`),
};

// =============================================================================
// SERVICE ENDPOINT CHECKS
// =============================================================================

async function checkServiceEndpoints(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  const endpoints = [
    { name: 'API Gateway Health', url: `${config.apiEndpoint}/health`, expectedStatus: 200 },
    { name: 'API Gateway Readiness', url: `${config.apiEndpoint}/health/ready`, expectedStatus: 200 },
    { name: 'API Gateway Liveness', url: `${config.apiEndpoint}/health/live`, expectedStatus: 200 },
    { name: 'Auth Service', url: `${config.apiEndpoint}/api/auth/health`, expectedStatus: 200 },
    { name: 'User Service', url: `${config.apiEndpoint}/api/users/health`, expectedStatus: 200 },
    { name: 'Matching Service', url: `${config.apiEndpoint}/api/matching/health`, expectedStatus: 200 },
    { name: 'Messaging Service', url: `${config.apiEndpoint}/api/messaging/health`, expectedStatus: 200 },
    { name: 'Media Service', url: `${config.apiEndpoint}/api/media/health`, expectedStatus: 200 },
    { name: 'Payment Service', url: `${config.apiEndpoint}/api/payments/health`, expectedStatus: 200 },
    { name: 'Notification Service', url: `${config.apiEndpoint}/api/notifications/health`, expectedStatus: 200 },
    { name: 'Analytics Service', url: `${config.apiEndpoint}/api/analytics/health`, expectedStatus: 200 },
  ];

  for (const endpoint of endpoints) {
    try {
      const { result, duration } = await timed(async () => {
        return await httpRequest(endpoint.url);
      });

      if (result.statusCode === endpoint.expectedStatus) {
        results.push({
          name: endpoint.name,
          status: 'healthy',
          message: `Responding with ${result.statusCode}`,
          duration,
        });
        log.pass(`${endpoint.name}: OK (${duration}ms)`);
      } else if (result.statusCode >= 500) {
        results.push({
          name: endpoint.name,
          status: 'critical',
          message: `Server error: ${result.statusCode}`,
          duration,
        });
        log.fail(`${endpoint.name}: Server error ${result.statusCode}`);
      } else {
        results.push({
          name: endpoint.name,
          status: 'warning',
          message: `Unexpected status: ${result.statusCode}`,
          duration,
        });
        log.warn(`${endpoint.name}: Unexpected status ${result.statusCode}`);
      }
    } catch (error) {
      results.push({
        name: endpoint.name,
        status: 'critical',
        message: `Failed: ${(error as Error).message}`,
        duration: 0,
      });
      log.fail(`${endpoint.name}: ${(error as Error).message}`);
    }
  }

  return results;
}

// =============================================================================
// DATABASE CONNECTIVITY
// =============================================================================

async function checkDatabaseConnectivity(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Check PostgreSQL via API health endpoint that includes DB check
  try {
    const { result, duration } = await timed(async () => {
      return await httpRequest(`${config.apiEndpoint}/health/db`);
    });

    if (result.statusCode === 200) {
      results.push({
        name: 'PostgreSQL Connection',
        status: 'healthy',
        message: 'Database connectivity verified',
        duration,
      });
      log.pass(`PostgreSQL: Connected (${duration}ms)`);
    } else {
      results.push({
        name: 'PostgreSQL Connection',
        status: 'critical',
        message: 'Database health check failed',
        duration,
      });
      log.fail('PostgreSQL: Health check failed');
    }
  } catch (error) {
    results.push({
      name: 'PostgreSQL Connection',
      status: 'warning',
      message: `Health endpoint not available: ${(error as Error).message}`,
      duration: 0,
    });
    log.warn(`PostgreSQL: Health endpoint not available`);
  }

  // Check via Kubernetes if kubectl available
  const pgPodStatus = execCommand(
    `kubectl get pods -n ${config.kubernetesNamespace} -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].status.phase}' 2>/dev/null`
  );

  if (pgPodStatus) {
    if (pgPodStatus === 'Running') {
      results.push({
        name: 'PostgreSQL Pod',
        status: 'healthy',
        message: 'Pod is running',
        duration: 0,
      });
      log.pass('PostgreSQL Pod: Running');
    } else {
      results.push({
        name: 'PostgreSQL Pod',
        status: 'critical',
        message: `Pod status: ${pgPodStatus}`,
        duration: 0,
      });
      log.fail(`PostgreSQL Pod: ${pgPodStatus}`);
    }
  }

  return results;
}

// =============================================================================
// REDIS CONNECTIVITY
// =============================================================================

async function checkRedisConnectivity(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Check via Kubernetes
  const redisPodStatus = execCommand(
    `kubectl get pods -n ${config.kubernetesNamespace} -l app.kubernetes.io/name=redis -o jsonpath='{.items[0].status.phase}' 2>/dev/null`
  );

  if (redisPodStatus) {
    if (redisPodStatus === 'Running') {
      results.push({
        name: 'Redis Pod',
        status: 'healthy',
        message: 'Pod is running',
        duration: 0,
      });
      log.pass('Redis Pod: Running');

      // Check Redis PING via kubectl exec
      const redisPing = execCommand(
        `kubectl exec -n ${config.kubernetesNamespace} $(kubectl get pods -n ${config.kubernetesNamespace} -l app.kubernetes.io/name=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null) -- redis-cli ping 2>/dev/null`
      );

      if (redisPing === 'PONG') {
        results.push({
          name: 'Redis Connection',
          status: 'healthy',
          message: 'PING/PONG successful',
          duration: 0,
        });
        log.pass('Redis: PING successful');
      } else {
        results.push({
          name: 'Redis Connection',
          status: 'warning',
          message: 'Could not verify PING',
          duration: 0,
        });
        log.warn('Redis: Could not verify PING');
      }
    } else {
      results.push({
        name: 'Redis Pod',
        status: 'critical',
        message: `Pod status: ${redisPodStatus}`,
        duration: 0,
      });
      log.fail(`Redis Pod: ${redisPodStatus}`);
    }
  } else {
    results.push({
      name: 'Redis Pod',
      status: 'warning',
      message: 'Could not check Redis pod status',
      duration: 0,
    });
    log.warn('Redis: Could not check pod status');
  }

  return results;
}

// =============================================================================
// EXTERNAL INTEGRATIONS
// =============================================================================

async function checkExternalIntegrations(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Stripe API Check
  if (config.stripeApiKey) {
    try {
      const { result, duration } = await timed(async () => {
        return await httpRequest('https://api.stripe.com/v1/balance', {
          headers: {
            'Authorization': `Bearer ${config.stripeApiKey}`,
          },
        });
      });

      if (result.statusCode === 200) {
        results.push({
          name: 'Stripe API',
          status: 'healthy',
          message: 'API accessible',
          duration,
        });
        log.pass(`Stripe API: Connected (${duration}ms)`);
      } else if (result.statusCode === 401) {
        results.push({
          name: 'Stripe API',
          status: 'warning',
          message: 'Authentication issue',
          duration,
        });
        log.warn('Stripe API: Authentication issue');
      } else {
        results.push({
          name: 'Stripe API',
          status: 'critical',
          message: `Error: ${result.statusCode}`,
          duration,
        });
        log.fail(`Stripe API: Error ${result.statusCode}`);
      }
    } catch (error) {
      results.push({
        name: 'Stripe API',
        status: 'critical',
        message: (error as Error).message,
        duration: 0,
      });
      log.fail(`Stripe API: ${(error as Error).message}`);
    }
  }

  // Azure B2C Check
  try {
    const b2cUrl = `https://${config.b2cTenant}.b2clogin.com/${config.b2cTenant}.onmicrosoft.com/v2.0/.well-known/openid-configuration`;
    const { result, duration } = await timed(async () => {
      return await httpRequest(b2cUrl);
    });

    if (result.statusCode === 200 && result.body.includes('authorization_endpoint')) {
      results.push({
        name: 'Azure B2C',
        status: 'healthy',
        message: 'OpenID configuration accessible',
        duration,
      });
      log.pass(`Azure B2C: Accessible (${duration}ms)`);
    } else {
      results.push({
        name: 'Azure B2C',
        status: 'critical',
        message: 'Invalid configuration response',
        duration,
      });
      log.fail('Azure B2C: Invalid configuration');
    }
  } catch (error) {
    results.push({
      name: 'Azure B2C',
      status: 'critical',
      message: (error as Error).message,
      duration: 0,
    });
    log.fail(`Azure B2C: ${(error as Error).message}`);
  }

  // Azure Communication Services Check
  if (config.azureCommunicationConnectionString) {
    results.push({
      name: 'Azure Communication Services',
      status: 'healthy',
      message: 'Connection string configured',
      duration: 0,
    });
    log.pass('Azure Communication Services: Configured');
  }

  return results;
}

// =============================================================================
// CERTIFICATE EXPIRY
// =============================================================================

async function checkCertificateExpiry(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  const domains = [config.domain, `api.${config.domain}`, `www.${config.domain}`];

  for (const domain of domains) {
    try {
      const { result, duration } = await timed(async () => {
        return new Promise<{ daysRemaining: number; expiry: Date }>((resolve, reject) => {
          const socket = tls.connect({
            host: domain,
            port: 443,
            servername: domain,
            timeout: config.timeout,
          }, () => {
            const cert = socket.getPeerCertificate();
            socket.destroy();

            if (!cert || !cert.valid_to) {
              reject(new Error('Could not get certificate'));
              return;
            }

            const expiry = new Date(cert.valid_to);
            const daysRemaining = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            resolve({ daysRemaining, expiry });
          });

          socket.on('error', reject);
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timeout'));
          });
        });
      });

      if (result.daysRemaining > 30) {
        results.push({
          name: `Certificate: ${domain}`,
          status: 'healthy',
          message: `Expires in ${result.daysRemaining} days`,
          duration,
          details: { expiry: result.expiry.toISOString(), daysRemaining: result.daysRemaining },
        });
        log.pass(`Certificate ${domain}: ${result.daysRemaining} days remaining`);
      } else if (result.daysRemaining > 7) {
        results.push({
          name: `Certificate: ${domain}`,
          status: 'warning',
          message: `Expires in ${result.daysRemaining} days - renewal recommended`,
          duration,
          details: { expiry: result.expiry.toISOString(), daysRemaining: result.daysRemaining },
        });
        log.warn(`Certificate ${domain}: ${result.daysRemaining} days remaining`);
      } else {
        results.push({
          name: `Certificate: ${domain}`,
          status: 'critical',
          message: `Expires in ${result.daysRemaining} days - URGENT`,
          duration,
          details: { expiry: result.expiry.toISOString(), daysRemaining: result.daysRemaining },
        });
        log.fail(`Certificate ${domain}: ${result.daysRemaining} days remaining`);
      }
    } catch (error) {
      results.push({
        name: `Certificate: ${domain}`,
        status: 'warning',
        message: `Could not check: ${(error as Error).message}`,
        duration: 0,
      });
      log.warn(`Certificate ${domain}: ${(error as Error).message}`);
    }
  }

  return results;
}

// =============================================================================
// KUBERNETES POD HEALTH
// =============================================================================

async function checkKubernetesPodHealth(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Get all pods status
  const podsJson = execCommand(
    `kubectl get pods -n ${config.kubernetesNamespace} -o json 2>/dev/null`
  );

  if (!podsJson) {
    results.push({
      name: 'Kubernetes Pods',
      status: 'warning',
      message: 'Could not retrieve pod status',
      duration: 0,
    });
    log.warn('Kubernetes: Could not retrieve pod status');
    return results;
  }

  try {
    const pods = JSON.parse(podsJson);
    let healthyCount = 0;
    let unhealthyPods: string[] = [];
    let crashLoopPods: string[] = [];
    let pendingPods: string[] = [];

    for (const pod of pods.items) {
      const name = pod.metadata.name;
      const phase = pod.status.phase;
      const containerStatuses = pod.status.containerStatuses || [];

      // Check for CrashLoopBackOff
      const crashLoop = containerStatuses.some((cs: any) =>
        cs.state?.waiting?.reason === 'CrashLoopBackOff'
      );

      if (crashLoop) {
        crashLoopPods.push(name);
      } else if (phase === 'Running') {
        const ready = containerStatuses.every((cs: any) => cs.ready);
        if (ready) {
          healthyCount++;
        } else {
          unhealthyPods.push(name);
        }
      } else if (phase === 'Pending') {
        pendingPods.push(name);
      } else if (phase !== 'Succeeded') {
        unhealthyPods.push(name);
      }
    }

    // Report crash loop pods
    if (crashLoopPods.length > 0) {
      results.push({
        name: 'Pods in CrashLoopBackOff',
        status: 'critical',
        message: `${crashLoopPods.length} pods in CrashLoopBackOff`,
        duration: 0,
        details: { pods: crashLoopPods },
      });
      log.fail(`CrashLoopBackOff: ${crashLoopPods.join(', ')}`);
    }

    // Report unhealthy pods
    if (unhealthyPods.length > 0) {
      results.push({
        name: 'Unhealthy Pods',
        status: 'critical',
        message: `${unhealthyPods.length} unhealthy pods`,
        duration: 0,
        details: { pods: unhealthyPods },
      });
      log.fail(`Unhealthy: ${unhealthyPods.join(', ')}`);
    }

    // Report pending pods
    if (pendingPods.length > 0) {
      results.push({
        name: 'Pending Pods',
        status: 'warning',
        message: `${pendingPods.length} pods pending`,
        duration: 0,
        details: { pods: pendingPods },
      });
      log.warn(`Pending: ${pendingPods.join(', ')}`);
    }

    // Overall pod health
    const totalPods = pods.items.length;
    if (healthyCount === totalPods) {
      results.push({
        name: 'Kubernetes Pod Health',
        status: 'healthy',
        message: `All ${totalPods} pods healthy`,
        duration: 0,
      });
      log.pass(`All ${totalPods} pods healthy`);
    } else if (crashLoopPods.length > 0 || unhealthyPods.length > 0) {
      results.push({
        name: 'Kubernetes Pod Health',
        status: 'critical',
        message: `${healthyCount}/${totalPods} pods healthy`,
        duration: 0,
      });
    } else {
      results.push({
        name: 'Kubernetes Pod Health',
        status: 'warning',
        message: `${healthyCount}/${totalPods} pods healthy`,
        duration: 0,
      });
    }

  } catch (error) {
    results.push({
      name: 'Kubernetes Pods',
      status: 'warning',
      message: `Parse error: ${(error as Error).message}`,
      duration: 0,
    });
  }

  return results;
}

// =============================================================================
// KUBERNETES RESOURCE PRESSURE
// =============================================================================

async function checkKubernetesResourcePressure(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Check node conditions
  const nodesJson = execCommand('kubectl get nodes -o json 2>/dev/null');

  if (nodesJson) {
    try {
      const nodes = JSON.parse(nodesJson);

      for (const node of nodes.items) {
        const nodeName = node.metadata.name;
        const conditions = node.status.conditions || [];

        const memoryPressure = conditions.find((c: any) => c.type === 'MemoryPressure');
        const diskPressure = conditions.find((c: any) => c.type === 'DiskPressure');
        const pidPressure = conditions.find((c: any) => c.type === 'PIDPressure');

        if (memoryPressure?.status === 'True') {
          results.push({
            name: `Node Memory Pressure: ${nodeName}`,
            status: 'critical',
            message: 'Memory pressure detected',
            duration: 0,
          });
          log.fail(`Node ${nodeName}: Memory pressure`);
        }

        if (diskPressure?.status === 'True') {
          results.push({
            name: `Node Disk Pressure: ${nodeName}`,
            status: 'critical',
            message: 'Disk pressure detected',
            duration: 0,
          });
          log.fail(`Node ${nodeName}: Disk pressure`);
        }

        if (pidPressure?.status === 'True') {
          results.push({
            name: `Node PID Pressure: ${nodeName}`,
            status: 'warning',
            message: 'PID pressure detected',
            duration: 0,
          });
          log.warn(`Node ${nodeName}: PID pressure`);
        }

        const ready = conditions.find((c: any) => c.type === 'Ready');
        if (ready?.status !== 'True') {
          results.push({
            name: `Node Ready: ${nodeName}`,
            status: 'critical',
            message: 'Node not ready',
            duration: 0,
          });
          log.fail(`Node ${nodeName}: Not ready`);
        }
      }

      // Check HPA status
      const hpaJson = execCommand(`kubectl get hpa -n ${config.kubernetesNamespace} -o json 2>/dev/null`);
      if (hpaJson) {
        const hpas = JSON.parse(hpaJson);
        for (const hpa of hpas.items) {
          const name = hpa.metadata.name;
          const current = hpa.status.currentReplicas;
          const max = hpa.spec.maxReplicas;

          if (current >= max) {
            results.push({
              name: `HPA at Max: ${name}`,
              status: 'warning',
              message: `${current}/${max} replicas - at maximum`,
              duration: 0,
            });
            log.warn(`HPA ${name}: At max replicas (${current}/${max})`);
          }
        }
      }

    } catch (error) {
      results.push({
        name: 'Node Resource Check',
        status: 'warning',
        message: `Parse error: ${(error as Error).message}`,
        duration: 0,
      });
    }
  }

  return results;
}

// =============================================================================
// PROMETHEUS ALERTS
// =============================================================================

async function checkPrometheusAlerts(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  if (!config.prometheusUrl) {
    return results;
  }

  try {
    const { result, duration } = await timed(async () => {
      return await httpRequest(`${config.prometheusUrl}/api/v1/alerts`);
    });

    if (result.statusCode === 200) {
      const data = JSON.parse(result.body);
      const firingAlerts = data.data?.alerts?.filter((a: any) => a.state === 'firing') || [];

      if (firingAlerts.length === 0) {
        results.push({
          name: 'Prometheus Alerts',
          status: 'healthy',
          message: 'No firing alerts',
          duration,
        });
        log.pass('Prometheus: No firing alerts');
      } else {
        const criticalAlerts = firingAlerts.filter((a: any) => a.labels.severity === 'critical');
        const warningAlerts = firingAlerts.filter((a: any) => a.labels.severity === 'warning');

        if (criticalAlerts.length > 0) {
          results.push({
            name: 'Prometheus Critical Alerts',
            status: 'critical',
            message: `${criticalAlerts.length} critical alerts firing`,
            duration,
            details: { alerts: criticalAlerts.map((a: any) => a.labels.alertname) },
          });
          log.fail(`Prometheus: ${criticalAlerts.length} critical alerts`);
        }

        if (warningAlerts.length > 0) {
          results.push({
            name: 'Prometheus Warning Alerts',
            status: 'warning',
            message: `${warningAlerts.length} warning alerts firing`,
            duration,
            details: { alerts: warningAlerts.map((a: any) => a.labels.alertname) },
          });
          log.warn(`Prometheus: ${warningAlerts.length} warning alerts`);
        }
      }
    }
  } catch (error) {
    results.push({
      name: 'Prometheus Alerts',
      status: 'warning',
      message: `Could not check: ${(error as Error).message}`,
      duration: 0,
    });
    log.warn(`Prometheus: ${(error as Error).message}`);
  }

  return results;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function runHealthChecks(): Promise<HealthReport> {
  console.log('============================================');
  console.log('   FLAMORAL PLATFORM HEALTH CHECK');
  console.log('============================================');
  console.log(`Domain:      ${config.domain}`);
  console.log(`API:         ${config.apiEndpoint}`);
  console.log(`Namespace:   ${config.kubernetesNamespace}`);
  console.log(`Time:        ${new Date().toISOString()}`);
  console.log('============================================\n');

  const allResults: HealthCheckResult[] = [];

  // Run all health checks
  console.log('--- Service Endpoints ---');
  allResults.push(...await checkServiceEndpoints());

  console.log('\n--- Database Connectivity ---');
  allResults.push(...await checkDatabaseConnectivity());

  console.log('\n--- Redis Connectivity ---');
  allResults.push(...await checkRedisConnectivity());

  console.log('\n--- External Integrations ---');
  allResults.push(...await checkExternalIntegrations());

  console.log('\n--- Certificate Expiry ---');
  allResults.push(...await checkCertificateExpiry());

  console.log('\n--- Kubernetes Pod Health ---');
  allResults.push(...await checkKubernetesPodHealth());

  console.log('\n--- Resource Pressure ---');
  allResults.push(...await checkKubernetesResourcePressure());

  console.log('\n--- Prometheus Alerts ---');
  allResults.push(...await checkPrometheusAlerts());

  // Calculate summary
  const summary = {
    total: allResults.length,
    healthy: allResults.filter(r => r.status === 'healthy').length,
    warning: allResults.filter(r => r.status === 'warning').length,
    critical: allResults.filter(r => r.status === 'critical').length,
  };

  // Determine overall status
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (summary.critical > 0) {
    overallStatus = 'critical';
  } else if (summary.warning > 0) {
    overallStatus = 'warning';
  }

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    environment: config.kubernetesNamespace,
    overallStatus,
    checks: allResults,
    summary,
  };

  // Print summary
  console.log('\n============================================');
  console.log('           HEALTH CHECK SUMMARY');
  console.log('============================================');
  console.log(`Total Checks:  ${summary.total}`);
  console.log(`Healthy:       ${summary.healthy}`);
  console.log(`Warnings:      ${summary.warning}`);
  console.log(`Critical:      ${summary.critical}`);
  console.log('--------------------------------------------');
  console.log(`Overall Status: ${overallStatus.toUpperCase()}`);
  console.log('============================================\n');

  // Output JSON for CI/CD
  if (process.env.OUTPUT_JSON === 'true') {
    console.log('\nJSON Output:');
    console.log(JSON.stringify(report, null, 2));
  }

  return report;
}

// Run health checks
runHealthChecks()
  .then((report) => {
    if (report.overallStatus === 'critical') {
      process.exit(2);
    } else if (report.overallStatus === 'warning') {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Health check failed:', error);
    process.exit(2);
  });
