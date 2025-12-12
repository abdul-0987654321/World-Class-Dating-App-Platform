import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authenticate, getAuthHeaders } from '../utils/auth.js';
import {
  errorRate, apiLatency, discoveryLatency, createThresholds,
  recordSuccess, recordFailure
} from '../utils/metrics.js';
import { BASE_URL, parseEnvConfig } from '../utils/config.js';

/**
 * SPIKE TEST - Sudden Traffic Increase
 *
 * Purpose: Test system behavior under sudden, massive traffic spikes
 * Scenario: Simulates viral events, marketing campaigns, or news mentions
 *
 * Pattern:
 * - Normal load (100 users)
 * - SUDDEN SPIKE to 5000 users
 * - Maintain spike for short duration
 * - Return to normal
 *
 * What we're testing:
 * - Auto-scaling response time
 * - Circuit breaker behavior
 * - Rate limiting effectiveness
 * - System recovery after spike
 */

export const options = {
  scenarios: {
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },    // Normal load
        { duration: '1m', target: 100 },    // Stable period
        { duration: '30s', target: 5000 },  // 🚀 SPIKE!
        { duration: '3m', target: 5000 },   // Maintain spike
        { duration: '30s', target: 100 },   // Drop back to normal
        { duration: '2m', target: 100 },    // Recovery period
        { duration: '1m', target: 0 },      // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: createThresholds({
    // More lenient thresholds for spike test
    'http_req_duration': ['p(95)<1500', 'p(99)<3000'],
    'http_req_failed': ['rate<0.20'], // Allow up to 20% errors during spike
    'errors': ['rate<0.25'],

    'discovery_latency': ['p(95)<1500', 'p(99)<3000'],
  }),

  summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)'],

  ext: {
    loadimpact: {
      projectID: __ENV.K6_PROJECT_ID,
      name: 'Flamoral Spike Test - Viral Event Simulation',
    },
  },
};

const config = parseEnvConfig();

export function setup() {
  console.log('=== Spike Test Setup ===');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('Simulating sudden traffic spike...');
  console.log('Pattern: 100 → 5000 → 100 users');

  const token = authenticate(config.testEmail, config.testPassword);

  if (!token) {
    console.error('Setup failed: Could not authenticate');
    return null;
  }

  console.log('Setup completed - preparing for spike');
  return { token, spikeStartTime: null };
}

export default function(data) {
  if (!data || !data.token) {
    errorRate.add(1);
    return;
  }

  const headers = getAuthHeaders(data.token);

  // Mark spike start time
  if (!data.spikeStartTime && __VU > 1000) {
    data.spikeStartTime = Date.now();
  }

  group('Spike Test - Discovery Endpoint', () => {
    const startTime = Date.now();

    const discoverRes = http.get(`${BASE_URL}/discover`, {
      headers,
      timeout: '30s',
      tags: { spike_phase: __VU > 1000 ? 'spike' : 'normal' },
    });

    const responseTime = Date.now() - startTime;

    const success = check(discoverRes, {
      'status is 2xx or 429 or 503': (r) =>
        (r.status >= 200 && r.status < 300) ||
        r.status === 429 || // Rate limited (expected)
        r.status === 503,   // Service unavailable (acceptable during spike)
      'response received within 5s': (r) => responseTime < 5000,
      'got response': (r) => r.status !== 0,
    });

    if (success) {
      recordSuccess(discoverRes, discoveryLatency);
    } else {
      recordFailure(discoverRes, discoveryLatency);
    }

    // Log spike behavior
    if (__VU > 1000 && Math.random() < 0.01) { // Sample 1% during spike
      console.log(`Spike status: ${discoverRes.status}, Response time: ${responseTime}ms`);
    }

    // Check for rate limiting
    if (discoverRes.status === 429) {
      const retryAfter = discoverRes.headers['Retry-After'] || 1;
      sleep(parseInt(retryAfter));
    }
  });

  // Minimal sleep during spike to maximize pressure
  sleep(__VU > 1000 ? 0.1 : 1);
}

export function teardown(data) {
  if (!data) return;

  console.log('=== Spike Test Completed ===');
  if (data.spikeStartTime) {
    const spikeDuration = (Date.now() - data.spikeStartTime) / 1000;
    console.log(`Spike duration: ${spikeDuration.toFixed(2)}s`);
  }
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  // Analyze spike impact
  const maxVUs = data.metrics.vus_max?.values?.value || 0;
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;
  const failedRate = data.metrics.http_req_failed?.values?.rate || 0;
  const p95Duration = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99Duration = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const throughput = data.metrics.http_reqs?.values?.rate || 0;

  // Calculate spike handling effectiveness
  const spikeHandled = failedRate < 0.20 && p99Duration < 3000;
  const rateLimitingActive = failedRate > 0 && failedRate < 0.30; // Some failures expected from rate limiting

  const summary = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                     FLAMORAL SPIKE TEST RESULTS                           ║
║                    Sudden Traffic Surge Analysis                          ║
╚═══════════════════════════════════════════════════════════════════════════╝

🚀 SPIKE TEST SUMMARY
─────────────────────────────────────────────────────────────────────────────
Traffic Pattern:         100 → 5,000 → 100 users
Peak Virtual Users:      ${maxVUs.toLocaleString()}
Total Requests:          ${totalReqs.toLocaleString()}
Failed Request Rate:     ${(failedRate * 100).toFixed(2)}%
Peak Throughput:         ${throughput.toFixed(2)} req/s

Spike Handling:          ${spikeHandled ? '✅ SUCCESSFUL' : '⚠️  DEGRADED'}
Rate Limiting:           ${rateLimitingActive ? '✅ ACTIVE' : '❌ NOT DETECTED'}

⏱️  RESPONSE TIME DURING SPIKE
─────────────────────────────────────────────────────────────────────────────
Average:                 ${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms
Median:                  ${(data.metrics.http_req_duration?.values?.med || 0).toFixed(2)}ms
P90:                     ${(data.metrics.http_req_duration?.values?.['p(90)'] || 0).toFixed(2)}ms
P95:                     ${p95Duration.toFixed(2)}ms  ${p95Duration < 1500 ? '✅' : '⚠️'}
P99:                     ${p99Duration.toFixed(2)}ms  ${p99Duration < 3000 ? '✅' : '⚠️'}

📊 SYSTEM RESILIENCE
─────────────────────────────────────────────────────────────────────────────
${failedRate < 0.05 ? '✅' : failedRate < 0.20 ? '⚠️ ' : '❌'} Error rate during spike: ${(failedRate * 100).toFixed(2)}%
${p99Duration < 3000 ? '✅' : '❌'} Response time P99: ${p99Duration.toFixed(0)}ms
${rateLimitingActive ? '✅' : '⚠️ '} Rate limiting: ${rateLimitingActive ? 'Working as expected' : 'May need tuning'}

🔍 OBSERVATIONS
─────────────────────────────────────────────────────────────────────────────
${failedRate < 0.10 ? '• System handled spike gracefully with minimal failures\n' : ''}${failedRate >= 0.10 && failedRate < 0.20 ? '• System degraded but remained partially operational\n' : ''}${failedRate >= 0.20 ? '• System struggled under spike - immediate attention needed\n' : ''}${p99Duration > 2000 ? '• Response times degraded significantly during spike\n' : ''}${rateLimitingActive ? '• Rate limiting protected backend services\n' : ''}
💡 RECOMMENDATIONS
─────────────────────────────────────────────────────────────────────────────
${!spikeHandled ? '• Implement aggressive rate limiting at CDN/gateway level\n• Add request queuing with priority levels\n• Configure auto-scaling for faster response\n' : ''}${p95Duration > 1000 ? '• Add edge caching for static content\n• Implement CDN for geographic distribution\n' : ''}${!rateLimitingActive ? '• Enable rate limiting to protect backend\n• Implement circuit breakers\n' : ''}${spikeHandled ? '• System is resilient to traffic spikes\n• Consider testing even higher spike loads\n' : ''}
═══════════════════════════════════════════════════════════════════════════
`;

  console.log(summary);

  return {
    'stdout': summary,
    [`results/spike-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/spike-test-${timestamp}.html`]: htmlSpikeReport(data, spikeHandled),
  };
}

function htmlSpikeReport(data, spikeHandled) {
  const maxVUs = data.metrics.vus_max?.values?.value || 0;
  const failedRate = data.metrics.http_req_failed?.values?.rate || 0;
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const throughput = data.metrics.http_reqs?.values?.rate || 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Spike Test Results - Flamoral</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%);
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      margin-bottom: 30px;
      text-align: center;
    }
    .spike-badge {
      display: inline-block;
      padding: 15px 40px;
      border-radius: 30px;
      font-weight: bold;
      font-size: 1.3em;
      margin-top: 20px;
      background: ${spikeHandled ? '#10b981' : '#f59e0b'};
      color: white;
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
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
      border-top: 5px solid #f59e0b;
    }
    .metric-value {
      font-size: 2.8em;
      font-weight: bold;
      color: #f59e0b;
      margin: 15px 0;
    }
    .metric-label {
      color: #666;
      font-size: 0.95em;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .chart-container {
      background: white;
      padding: 30px;
      border-radius: 15px;
      margin-top: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Flamoral Spike Test Results</h1>
      <p style="font-size: 1.3em; margin-top: 10px;">Sudden Traffic Surge: 100 → ${maxVUs.toLocaleString()} → 100 Users</p>
      <div class="spike-badge">
        ${spikeHandled ? '✅ SPIKE HANDLED SUCCESSFULLY' : '⚠️  PARTIAL DEGRADATION'}
      </div>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Peak Users (Spike)</div>
        <div class="metric-value">${maxVUs.toLocaleString()}</div>
        <div style="color: #666; font-size: 0.9em;">50x increase</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Error Rate</div>
        <div class="metric-value">${(failedRate * 100).toFixed(1)}%</div>
        <div style="color: ${failedRate < 0.10 ? '#10b981' : '#f59e0b'};">
          ${failedRate < 0.10 ? '✅ Excellent' : failedRate < 0.20 ? '⚠️  Acceptable' : '❌ High'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P95 Response Time</div>
        <div class="metric-value">${p95.toFixed(0)}ms</div>
        <div style="color: ${p95 < 1500 ? '#10b981' : '#f59e0b'};">
          ${p95 < 1500 ? '✅ Good' : '⚠️  Slow'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Peak Throughput</div>
        <div class="metric-value">${throughput.toFixed(0)}</div>
        <div style="color: #666; font-size: 0.9em;">requests/sec</div>
      </div>
    </div>

    <div class="chart-container">
      <h2 style="margin-bottom: 20px; color: #333;">Spike Test Pattern</h2>
      <pre style="font-family: monospace; background: #f3f4f6; padding: 20px; border-radius: 10px; overflow-x: auto;">
Time      Users     Status
────────────────────────────────────
0-2m      0→100     Warm-up
2-3m      100       ✅ Normal load
3-3.5m    100→5000  🚀 SPIKE!
3.5-6.5m  5000      ${spikeHandled ? '✅' : '⚠️ '} Peak load
6.5-7m    5000→100  Recovery
7-9m      100       ✅ Stabilized
9-10m     100→0     Shutdown
      </pre>
    </div>
  </div>
</body>
</html>`;
}
