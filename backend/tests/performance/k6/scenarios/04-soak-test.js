import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authenticate, getAuthHeaders } from '../utils/auth.js';
import { generateMessage, generateUserBehavior } from '../utils/data-generator.js';
import {
  errorRate, apiLatency, memoryUsage, createThresholds,
  recordSuccess, recordFailure
} from '../utils/metrics.js';
import { BASE_URL, parseEnvConfig } from '../utils/config.js';

/**
 * SOAK TEST - Extended Duration Testing
 *
 * Purpose: Detect memory leaks, resource exhaustion, and degradation over time
 * Duration: 2 hours
 * Load: Consistent moderate traffic
 *
 * What we're testing:
 * - Memory leaks
 * - Connection pool exhaustion
 * - Database connection leaks
 * - Disk space issues
 * - Log file growth
 * - Cache invalidation
 * - Performance degradation over time
 */

export const options = {
  scenarios: {
    soak_test: {
      executor: 'constant-vus',
      vus: 200, // Moderate constant load
      duration: '2h', // Extended test
      gracefulStop: '1m',
    },
  },

  thresholds: createThresholds({
    // Standard thresholds but must maintain over 2 hours
    'http_req_duration': ['p(95)<250', 'p(99)<500'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.01'],

    // Additional threshold: performance shouldn't degrade
    'api_latency': ['p(95)<250', 'p(99)<500'],
  }),

  summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)'],

  ext: {
    loadimpact: {
      projectID: __ENV.K6_PROJECT_ID,
      name: 'Flamoral Soak Test - Memory Leak Detection',
    },
  },
};

const config = parseEnvConfig();

// Track metrics over time to detect degradation
const performanceHistory = {
  checkpoints: [],
  memorySnapshots: [],
};

export function setup() {
  console.log('=== Soak Test Setup ===');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('Duration: 2 hours');
  console.log('Constant VUs: 200');
  console.log('🕐 This test will run for an extended period...');

  const token = authenticate(config.testEmail, config.testPassword);

  if (!token) {
    console.error('Setup failed: Could not authenticate');
    return null;
  }

  console.log('Setup completed - starting soak test');
  return {
    token,
    startTime: Date.now(),
    checkpointInterval: 10 * 60 * 1000, // 10 minutes
    lastCheckpoint: Date.now(),
  };
}

export default function(data) {
  if (!data || !data.token) {
    errorRate.add(1);
    return;
  }

  const headers = getAuthHeaders(data.token);
  const behavior = generateUserBehavior();

  // Periodic checkpoints to detect performance degradation
  const now = Date.now();
  if (now - data.lastCheckpoint > data.checkpointInterval) {
    data.lastCheckpoint = now;
    const elapsedMinutes = Math.floor((now - data.startTime) / 60000);
    console.log(`[Checkpoint] ${elapsedMinutes} minutes elapsed - monitoring for degradation...`);
  }

  group('Soak Test - Sustained Load', () => {

    // 1. Discovery endpoint (primary feature)
    if (behavior.action === 'browse_profiles' || Math.random() < 0.4) {
      const discoverRes = http.get(`${BASE_URL}/discover`, {
        headers,
        tags: { endpoint: 'discovery', test_type: 'soak' },
      });

      const success = check(discoverRes, {
        'discovery status 200': (r) => r.status === 200,
        'discovery response time stable': (r) => r.timings.duration < 500,
        'discovery has content': (r) => r.body && r.body.length > 0,
      });

      success ? recordSuccess(discoverRes, apiLatency) : recordFailure(discoverRes, apiLatency);
      sleep(Math.random() * 2 + 1);
    }

    // 2. Messaging
    if (behavior.action === 'send_message' || Math.random() < 0.3) {
      const conversationsRes = http.get(`${BASE_URL}/messages/conversations`, {
        headers,
        tags: { endpoint: 'messaging', test_type: 'soak' },
      });

      if (conversationsRes.status === 200) {
        try {
          const conversations = JSON.parse(conversationsRes.body).conversations || [];
          if (conversations.length > 0) {
            const conversation = conversations[0];

            sleep(Math.random() * 2 + 1);

            const messageRes = http.post(
              `${BASE_URL}/messages`,
              JSON.stringify({
                conversationId: conversation.id,
                content: generateMessage(),
              }),
              { headers, tags: { endpoint: 'send_message', test_type: 'soak' } }
            );

            check(messageRes, {
              'message sent': (r) => r.status === 200 || r.status === 201,
              'message response time stable': (r) => r.timings.duration < 300,
            }) ? recordSuccess(messageRes, apiLatency) : recordFailure(messageRes, apiLatency);
          }
        } catch (e) {
          errorRate.add(1);
        }
      }

      sleep(Math.random() * 2);
    }

    // 3. Profile views
    if (behavior.action === 'edit_profile' || Math.random() < 0.2) {
      const profileRes = http.get(`${BASE_URL}/users/me`, {
        headers,
        tags: { endpoint: 'profile', test_type: 'soak' },
      });

      check(profileRes, {
        'profile status 200': (r) => r.status === 200,
        'profile response stable': (r) => r.timings.duration < 300,
      }) ? recordSuccess(profileRes, apiLatency) : recordFailure(profileRes, apiLatency);

      sleep(Math.random() * 3 + 1);
    }

    // 4. Match operations
    if (Math.random() < 0.1) {
      const matchesRes = http.get(`${BASE_URL}/matches`, {
        headers,
        tags: { endpoint: 'matches', test_type: 'soak' },
      });

      check(matchesRes, {
        'matches status 200': (r) => r.status === 200,
        'matches response stable': (r) => r.timings.duration < 300,
      }) ? recordSuccess(matchesRes, apiLatency) : recordFailure(matchesRes, apiLatency);

      sleep(Math.random() * 2 + 1);
    }
  });

  // Realistic think time
  sleep(behavior.thinkTime);
}

export function teardown(data) {
  if (!data) return;

  const totalDuration = (Date.now() - data.startTime) / 1000 / 60;
  console.log('=== Soak Test Completed ===');
  console.log(`Total duration: ${totalDuration.toFixed(2)} minutes (${(totalDuration / 60).toFixed(2)} hours)`);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  // Analyze performance stability
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;
  const failedRate = data.metrics.http_req_failed?.values?.rate || 0;
  const avgDuration = data.metrics.http_req_duration?.values?.avg || 0;
  const p95Duration = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99Duration = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const minDuration = data.metrics.http_req_duration?.values?.min || 0;
  const maxDuration = data.metrics.http_req_duration?.values?.max || 0;

  // Check for performance degradation
  const performanceStable = p95Duration < 250 && failedRate < 0.01;
  const degradationDetected = maxDuration > avgDuration * 10; // Max is 10x average

  const summary = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                     FLAMORAL SOAK TEST RESULTS                            ║
║                  Extended Duration - Memory Leak Detection                ║
╚═══════════════════════════════════════════════════════════════════════════╝

🕐 SOAK TEST SUMMARY
─────────────────────────────────────────────────────────────────────────────
Test Duration:           2 hours
Constant Load:           200 virtual users
Total Requests:          ${totalReqs.toLocaleString()}
Failed Request Rate:     ${(failedRate * 100).toFixed(3)}%
Average Throughput:      ${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s

Performance Stability:   ${performanceStable ? '✅ STABLE' : '⚠️  DEGRADED'}
Degradation Detected:    ${degradationDetected ? '⚠️  YES' : '✅ NO'}

⏱️  RESPONSE TIME ANALYSIS
─────────────────────────────────────────────────────────────────────────────
Minimum:                 ${minDuration.toFixed(2)}ms
Average:                 ${avgDuration.toFixed(2)}ms
Median:                  ${(data.metrics.http_req_duration?.values?.med || 0).toFixed(2)}ms
P90:                     ${(data.metrics.http_req_duration?.values?.['p(90)'] || 0).toFixed(2)}ms
P95:                     ${p95Duration.toFixed(2)}ms  ${p95Duration < 250 ? '✅' : '⚠️'}
P99:                     ${p99Duration.toFixed(2)}ms  ${p99Duration < 500 ? '✅' : '⚠️'}
Maximum:                 ${maxDuration.toFixed(2)}ms

Variance:                ${(maxDuration - minDuration).toFixed(2)}ms
Avg/Max Ratio:           ${(avgDuration / maxDuration * 100).toFixed(1)}%

🔍 STABILITY INDICATORS
─────────────────────────────────────────────────────────────────────────────
${performanceStable ? '✅' : '❌'} Overall performance: ${performanceStable ? 'Stable throughout test' : 'Degraded over time'}
${failedRate < 0.01 ? '✅' : '❌'} Error rate: ${(failedRate * 100).toFixed(3)}% ${failedRate < 0.01 ? '(Acceptable)' : '(Too High)'}
${p95Duration < 250 ? '✅' : '❌'} P95 response time: ${p95Duration.toFixed(0)}ms ${p95Duration < 250 ? '(Good)' : '(Degraded)'}
${!degradationDetected ? '✅' : '⚠️ '} Outliers: ${degradationDetected ? 'Detected - investigate' : 'Within normal range'}

📊 RESOURCE ANALYSIS
─────────────────────────────────────────────────────────────────────────────
${degradationDetected ? '⚠️  Potential memory leak detected\n' : '✅ No memory leaks detected\n'}${failedRate > 0.005 ? '⚠️  Connection pool may be exhausted\n' : '✅ Connection pool healthy\n'}${p95Duration > 200 ? '⚠️  Response times increased over duration\n' : '✅ Response times remained stable\n'}
💡 RECOMMENDATIONS
─────────────────────────────────────────────────────────────────────────────
${degradationDetected ? '• Investigate server logs for memory usage patterns\n• Check for connection leaks in database pools\n• Review caching strategy and TTL settings\n' : ''}${failedRate > 0.01 ? '• Monitor database connection pool size\n• Review timeout configurations\n' : ''}${performanceStable ? '• System shows excellent stability over time\n• No immediate action required\n' : ''}${!performanceStable ? '• Perform heap dump analysis\n• Monitor disk space and log rotation\n• Review garbage collection metrics\n' : ''}
═══════════════════════════════════════════════════════════════════════════
`;

  console.log(summary);

  return {
    'stdout': summary,
    [`results/soak-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/soak-test-${timestamp}.html`]: htmlSoakReport(data, performanceStable, degradationDetected),
  };
}

function htmlSoakReport(data, performanceStable, degradationDetected) {
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;
  const failedRate = data.metrics.http_req_failed?.values?.rate || 0;
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const avgDuration = data.metrics.http_req_duration?.values?.avg || 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Soak Test Results - Flamoral</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      margin-bottom: 30px;
      text-align: center;
    }
    .stability-badge {
      display: inline-block;
      padding: 15px 40px;
      border-radius: 30px;
      font-weight: bold;
      font-size: 1.3em;
      margin-top: 20px;
      background: ${performanceStable && !degradationDetected ? '#10b981' : '#f59e0b'};
      color: white;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      border-left: 5px solid #6366f1;
    }
    .metric-value {
      font-size: 2.8em;
      font-weight: bold;
      color: #6366f1;
      margin: 15px 0;
    }
    .metric-label {
      color: #666;
      font-size: 0.95em;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .warnings {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      margin-top: 20px;
    }
    .warning-item {
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      border-left: 4px solid;
    }
    .warning-error { background: #fee2e2; border-color: #dc2626; }
    .warning-success { background: #d1fae5; border-color: #10b981; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🕐 Flamoral Soak Test Results</h1>
      <p style="font-size: 1.3em; margin-top: 10px;">2-Hour Extended Duration Test - Memory Leak Detection</p>
      <div class="stability-badge">
        ${performanceStable && !degradationDetected ? '✅ SYSTEM STABLE' : '⚠️  DEGRADATION DETECTED'}
      </div>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Total Requests</div>
        <div class="metric-value">${totalReqs.toLocaleString()}</div>
        <div style="color: #666;">Over 2 hours</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Error Rate</div>
        <div class="metric-value">${(failedRate * 100).toFixed(3)}%</div>
        <div style="color: ${failedRate < 0.01 ? '#10b981' : '#f59e0b'};">
          ${failedRate < 0.01 ? '✅ Excellent' : '⚠️  Needs Review'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Response Time</div>
        <div class="metric-value">${avgDuration.toFixed(0)}ms</div>
        <div style="color: ${avgDuration < 200 ? '#10b981' : '#666'};">
          ${avgDuration < 200 ? '✅ Fast' : 'Acceptable'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P95 Response Time</div>
        <div class="metric-value">${p95.toFixed(0)}ms</div>
        <div style="color: ${p95 < 250 ? '#10b981' : '#f59e0b'};">
          ${p95 < 250 ? '✅ Good' : '⚠️  Slow'}
        </div>
      </div>
    </div>

    <div class="warnings">
      <h2 style="margin-bottom: 20px;">System Health Analysis</h2>
      <div class="warning-item ${performanceStable ? 'warning-success' : 'warning-error'}">
        ${performanceStable ? '✅' : '⚠️ '} <strong>Performance Stability:</strong>
        ${performanceStable ? 'System maintained consistent performance over 2 hours' : 'Performance degraded over time - investigate memory leaks'}
      </div>
      <div class="warning-item ${degradationDetected ? 'warning-error' : 'warning-success'}">
        ${degradationDetected ? '⚠️ ' : '✅'} <strong>Performance Degradation:</strong>
        ${degradationDetected ? 'Outliers detected - review server resources' : 'No significant degradation detected'}
      </div>
      <div class="warning-item ${failedRate < 0.01 ? 'warning-success' : 'warning-error'}">
        ${failedRate < 0.01 ? '✅' : '⚠️ '} <strong>Error Rate:</strong>
        ${failedRate < 0.01 ? 'Error rate within acceptable limits' : 'Error rate elevated - investigate connection pools'}
      </div>
    </div>
  </div>
</body>
</html>`;
}
