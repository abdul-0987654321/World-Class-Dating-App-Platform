import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Gauge } from 'k6/metrics';
import { authenticate, getAuthHeaders } from '../utils/auth.js';
import { BASE_URL, parseEnvConfig } from '../utils/config.js';

/**
 * AUTO-SCALING VERIFICATION TEST
 *
 * Purpose: Verify that auto-scaling triggers correctly under load
 * Focus:
 * - Scale-up trigger points
 * - Scale-up response time
 * - Scale-down behavior
 * - Performance during scaling events
 * - Resource utilization
 *
 * Test Pattern:
 * 1. Baseline load
 * 2. Gradual increase to trigger scale-up
 * 3. Maintain high load
 * 4. Rapid decrease to trigger scale-down
 * 5. Verify performance throughout
 */

// Custom auto-scaling metrics
const activeInstances = new Gauge('active_instances');
const cpuUtilization = new Gauge('cpu_utilization');
const memoryUtilization = new Gauge('memory_utilization');
const scaleUpEvents = new Counter('scale_up_events');
const scaleDownEvents = new Counter('scale_down_events');
const scalingLatency = new Trend('scaling_latency', true);
const performanceDuringScaling = new Trend('performance_during_scaling', true);

export const options = {
  scenarios: {
    autoscaling_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Phase 1: Baseline
        { duration: '2m', target: 50 },      // Low baseline
        { duration: '2m', target: 50 },      // Stable baseline

        // Phase 2: Gradual scale-up trigger
        { duration: '3m', target: 200 },     // Increase load
        { duration: '3m', target: 500 },     // Higher load - should trigger scale-up
        { duration: '3m', target: 1000 },    // Peak load - multiple instances

        // Phase 3: Maintain high load
        { duration: '5m', target: 1000 },    // Verify scaled infrastructure

        // Phase 4: Scale-down trigger
        { duration: '2m', target: 500 },     // Reduce load
        { duration: '2m', target: 200 },     // Further reduction
        { duration: '2m', target: 50 },      // Back to baseline - should trigger scale-down

        // Phase 5: Verify scale-down
        { duration: '3m', target: 50 },      // Stable at baseline
        { duration: '1m', target: 0 },       // Complete
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.02'],
    'performance_during_scaling': ['p(95)<800'], // More lenient during scaling
    'scaling_latency': ['p(95)<60000'], // Scale-up should complete within 60s
  },

  summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)'],
};

const config = parseEnvConfig();

// Track scaling events
let lastInstanceCount = 0;
let scalingInProgress = false;
let scalingStartTime = 0;

export function setup() {
  console.log('=== Auto-Scaling Verification Test Setup ===');
  console.log('Testing auto-scaling behavior under varying load...');
  console.log('Duration: ~30 minutes');

  const token = authenticate(config.testEmail, config.testPassword);

  if (!token) {
    console.error('Setup failed: Could not authenticate');
    return null;
  }

  return {
    token,
    testStartTime: Date.now(),
    checkpointInterval: 30000, // 30 seconds
    lastCheckpoint: Date.now(),
  };
}

export default function(data) {
  if (!data || !data.token) return;

  const headers = getAuthHeaders(data.token);
  const now = Date.now();

  // Periodic infrastructure checks
  if (now - data.lastCheckpoint > data.checkpointInterval) {
    data.lastCheckpoint = now;
    checkInfrastructure(headers);
  }

  // Tag requests with current load phase
  const elapsedMinutes = Math.floor((now - data.testStartTime) / 60000);
  let phase = 'baseline';
  if (elapsedMinutes >= 4 && elapsedMinutes < 13) phase = 'scale-up';
  else if (elapsedMinutes >= 13 && elapsedMinutes < 18) phase = 'peak-load';
  else if (elapsedMinutes >= 18 && elapsedMinutes < 24) phase = 'scale-down';
  else if (elapsedMinutes >= 24) phase = 'post-scale';

  group(`Auto-Scaling Test - ${phase}`, () => {
    const startTime = Date.now();

    // Test primary endpoint
    const discoverRes = http.get(`${BASE_URL}/discover`, {
      headers,
      tags: { scaling_phase: phase, scaling_event: scalingInProgress },
    });

    const responseTime = Date.now() - startTime;

    // Track performance during scaling separately
    if (scalingInProgress) {
      performanceDuringScaling.add(responseTime);
    }

    check(discoverRes, {
      'status OK during scaling': (r) => r.status === 200,
      'response time acceptable': (r) => responseTime < 1000,
      'no connection errors': (r) => r.status !== 0,
    });

    // Check for scaling indicators in response headers
    if (discoverRes.headers['X-Instance-Id']) {
      const instanceId = discoverRes.headers['X-Instance-Id'];
      console.log(`Served by instance: ${instanceId}`);
    }

    sleep(Math.random() * 2 + 1);
  });
}

/**
 * Check infrastructure status and detect scaling events
 */
function checkInfrastructure(headers) {
  // In a real scenario, this would query your infrastructure API
  // (e.g., AWS CloudWatch, Kubernetes metrics, Azure Monitor)

  // Simulated infrastructure check
  const healthRes = http.get(`${BASE_URL}/health/infrastructure`, {
    headers,
    tags: { endpoint: 'infrastructure' },
  });

  if (healthRes.status === 200) {
    try {
      const health = JSON.parse(healthRes.body);

      // Track metrics
      if (health.instances !== undefined) {
        activeInstances.add(health.instances);

        // Detect scaling events
        if (health.instances > lastInstanceCount) {
          scaleUpEvents.add(1);
          console.log(`🔼 Scale-up detected: ${lastInstanceCount} → ${health.instances} instances`);

          if (scalingInProgress) {
            const scalingDuration = Date.now() - scalingStartTime;
            scalingLatency.add(scalingDuration);
            scalingInProgress = false;
            console.log(`Scale-up completed in ${scalingDuration}ms`);
          }
        } else if (health.instances < lastInstanceCount) {
          scaleDownEvents.add(1);
          console.log(`🔽 Scale-down detected: ${lastInstanceCount} → ${health.instances} instances`);
        } else if (health.instances === lastInstanceCount && lastInstanceCount < __VU / 100) {
          // If load is high but instance count hasn't increased, scaling may be in progress
          if (!scalingInProgress) {
            scalingInProgress = true;
            scalingStartTime = Date.now();
            console.log(`⏳ Scaling appears to be in progress...`);
          }
        }

        lastInstanceCount = health.instances;
      }

      if (health.cpu !== undefined) cpuUtilization.add(health.cpu);
      if (health.memory !== undefined) memoryUtilization.add(health.memory);

    } catch (e) {
      console.error('Error parsing health response:', e.message);
    }
  }
}

export function teardown(data) {
  if (!data) return;

  const totalDuration = (Date.now() - data.testStartTime) / 1000 / 60;
  console.log('=== Auto-Scaling Test Completed ===');
  console.log(`Total duration: ${totalDuration.toFixed(2)} minutes`);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  const maxInstances = data.metrics.active_instances?.values?.max || 0;
  const minInstances = data.metrics.active_instances?.values?.min || 0;
  const avgCPU = data.metrics.cpu_utilization?.values?.avg || 0;
  const maxCPU = data.metrics.cpu_utilization?.values?.max || 0;
  const avgMemory = data.metrics.memory_utilization?.values?.avg || 0;
  const maxMemory = data.metrics.memory_utilization?.values?.max || 0;

  const scaleUpCount = data.metrics.scale_up_events?.values?.count || 0;
  const scaleDownCount = data.metrics.scale_down_events?.values?.count || 0;
  const avgScalingLatency = data.metrics.scaling_latency?.values?.avg || 0;
  const p95ScalingLatency = data.metrics.scaling_latency?.values?.['p(95)'] || 0;

  const p95Performance = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p95DuringScaling = data.metrics.performance_during_scaling?.values?.['p(95)'] || 0;
  const errorRate = data.metrics.http_req_failed?.values?.rate || 0;

  const scalingWorking = scaleUpCount > 0 && scaleDownCount > 0;
  const scalingTimely = p95ScalingLatency < 60000;
  const performanceMaintained = p95Performance < 500 && p95DuringScaling < 800;

  const summary = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                 FLAMORAL AUTO-SCALING VERIFICATION TEST                   ║
║                       Infrastructure Elasticity                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

🔄 SCALING BEHAVIOR
─────────────────────────────────────────────────────────────────────────────
Scale-Up Events:         ${scaleUpCount}  ${scaleUpCount > 0 ? '✅' : '⚠️  Not detected'}
Scale-Down Events:       ${scaleDownCount}  ${scaleDownCount > 0 ? '✅' : '⚠️  Not detected'}

Instance Range:          ${minInstances} → ${maxInstances} instances
Scaling Detected:        ${scalingWorking ? '✅ YES' : '❌ NO'}

⏱️  SCALING PERFORMANCE
─────────────────────────────────────────────────────────────────────────────
Avg Scaling Time:        ${avgScalingLatency.toFixed(0)}ms
P95 Scaling Time:        ${p95ScalingLatency.toFixed(0)}ms  ${p95ScalingLatency < 60000 ? '✅' : '⚠️'}
Scaling Speed:           ${scalingTimely ? '✅ FAST' : '⚠️  SLOW'}

📊 RESOURCE UTILIZATION
─────────────────────────────────────────────────────────────────────────────
CPU Utilization:
  Average: ${avgCPU.toFixed(1)}%
  Peak:    ${maxCPU.toFixed(1)}%  ${maxCPU < 80 ? '✅' : '⚠️'}

Memory Utilization:
  Average: ${avgMemory.toFixed(1)}%
  Peak:    ${maxMemory.toFixed(1)}%  ${maxMemory < 80 ? '✅' : '⚠️'}

🎯 APPLICATION PERFORMANCE
─────────────────────────────────────────────────────────────────────────────
P95 Response Time:       ${p95Performance.toFixed(0)}ms  ${p95Performance < 500 ? '✅' : '⚠️'}
P95 During Scaling:      ${p95DuringScaling.toFixed(0)}ms  ${p95DuringScaling < 800 ? '✅' : '⚠️'}
Error Rate:              ${(errorRate * 100).toFixed(3)}%  ${errorRate < 0.02 ? '✅' : '⚠️'}

Performance Maintained:  ${performanceMaintained ? '✅ YES' : '⚠️  DEGRADED'}

✅ AUTO-SCALING ASSESSMENT
─────────────────────────────────────────────────────────────────────────────
${scalingWorking ? '✅' : '❌'} Scale-up triggers: ${scalingWorking ? 'Working correctly' : 'Not detected'}
${scaleDownCount > 0 ? '✅' : '⚠️ '} Scale-down triggers: ${scaleDownCount > 0 ? 'Working correctly' : 'Not detected'}
${scalingTimely ? '✅' : '❌'} Scaling speed: ${scalingTimely ? 'Acceptable' : 'Too slow'}
${performanceMaintained ? '✅' : '❌'} Performance: ${performanceMaintained ? 'Maintained during scaling' : 'Degraded'}
${maxCPU < 80 ? '✅' : '⚠️ '} Resource headroom: ${maxCPU < 80 ? 'Adequate' : 'Insufficient'}

💡 RECOMMENDATIONS
─────────────────────────────────────────────────────────────────────────────
${!scalingWorking ? '• Verify auto-scaling rules are configured\n• Check CloudWatch/monitoring metrics\n• Review scale-up thresholds\n' : ''}${!scalingTimely ? '• Optimize container startup time\n• Consider pre-warmed instances\n• Review scaling cooldown periods\n' : ''}${!performanceMaintained ? '• Implement connection draining\n• Add health checks during scaling\n• Consider blue-green deployments\n' : ''}${maxCPU > 80 ? '• Lower CPU threshold for scaling\n• Add more aggressive scale-up rules\n' : ''}${maxMemory > 80 ? '• Review memory usage patterns\n• Consider memory-based scaling rules\n' : ''}${scalingWorking && scalingTimely && performanceMaintained ? '• Auto-scaling is working excellently\n• Current configuration is optimal\n• Monitor for load pattern changes\n' : ''}
═══════════════════════════════════════════════════════════════════════════
`;

  console.log(summary);

  return {
    'stdout': summary,
    [`results/autoscaling-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/autoscaling-${timestamp}.html`]: htmlAutoscalingReport(data, scalingWorking, scalingTimely, performanceMaintained),
  };
}

function htmlAutoscalingReport(data, scalingWorking, scalingTimely, performanceMaintained) {
  const scaleUpCount = data.metrics.scale_up_events?.values?.count || 0;
  const scaleDownCount = data.metrics.scale_down_events?.values?.count || 0;
  const maxInstances = data.metrics.active_instances?.values?.max || 0;
  const p95ScalingLatency = data.metrics.scaling_latency?.values?.['p(95)'] || 0;

  const overallStatus = scalingWorking && scalingTimely && performanceMaintained;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Auto-Scaling Test - Flamoral</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 40px;
      border-radius: 15px;
      text-align: center;
      margin-bottom: 30px;
    }
    .status {
      padding: 15px 40px;
      border-radius: 30px;
      font-weight: bold;
      font-size: 1.3em;
      margin-top: 20px;
      background: ${overallStatus ? '#10b981' : '#f59e0b'};
      color: white;
      display: inline-block;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    .metric-card {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      border-top: 5px solid #10b981;
    }
    .metric-value {
      font-size: 2.5em;
      font-weight: bold;
      color: #10b981;
      margin: 15px 0;
    }
    .metric-label { color: #666; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔄 Auto-Scaling Verification</h1>
      <p style="font-size: 1.2em; margin: 10px 0;">Infrastructure Elasticity Test</p>
      <div class="status">
        ${overallStatus ? '✅ AUTO-SCALING WORKING' : '⚠️  ISSUES DETECTED'}
      </div>
    </div>
    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Scale-Up Events</div>
        <div class="metric-value">${scaleUpCount}</div>
        <div style="color: ${scaleUpCount > 0 ? '#10b981' : '#f59e0b'};">
          ${scaleUpCount > 0 ? '✅ Detected' : '⚠️  None'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Scale-Down Events</div>
        <div class="metric-value">${scaleDownCount}</div>
        <div style="color: ${scaleDownCount > 0 ? '#10b981' : '#f59e0b'};">
          ${scaleDownCount > 0 ? '✅ Detected' : '⚠️  None'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Peak Instances</div>
        <div class="metric-value">${maxInstances}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P95 Scaling Time</div>
        <div class="metric-value">${(p95ScalingLatency / 1000).toFixed(1)}s</div>
        <div style="color: ${p95ScalingLatency < 60000 ? '#10b981' : '#f59e0b'};">
          ${p95ScalingLatency < 60000 ? '✅ Fast' : '⚠️  Slow'}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
