import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authenticate, getAuthHeaders } from '../utils/auth.js';
import { generateMessage } from '../utils/data-generator.js';
import {
  errorRate, apiLatency, createThresholds, recordSuccess, recordFailure,
  discoveryRequests, matchRequests
} from '../utils/metrics.js';
import { BASE_URL, parseEnvConfig } from '../utils/config.js';

/**
 * STRESS TEST - High Traffic Scenario
 *
 * Purpose: Find the breaking point of the system under extreme load
 * Target: 10,000 concurrent users at peak
 * Goal: Identify system limits and degradation patterns
 *
 * This test gradually increases load beyond normal capacity to:
 * - Identify maximum throughput
 * - Observe system behavior under stress
 * - Find bottlenecks and failure modes
 * - Test auto-scaling capabilities
 */

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },    // Warm up
        { duration: '5m', target: 1000 },   // Normal load
        { duration: '5m', target: 2500 },   // Above normal
        { duration: '5m', target: 5000 },   // High stress
        { duration: '5m', target: 7500 },   // Very high stress
        { duration: '5m', target: 10000 },  // Maximum stress
        { duration: '10m', target: 10000 }, // Maintain stress
        { duration: '5m', target: 5000 },   // Step down
        { duration: '5m', target: 0 },      // Recovery
      ],
      gracefulRampDown: '1m',
    },
  },

  thresholds: createThresholds({
    // Relaxed thresholds for stress test
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.10'], // Allow up to 10% errors under stress
    'errors': ['rate<0.15'],

    // Endpoint specific - relaxed
    'discovery_latency': ['p(95)<1000', 'p(99)<2000'],
    'matching_latency': ['p(95)<800', 'p(99)<1500'],
    'messaging_latency': ['p(95)<500', 'p(99)<1000'],
  }),

  summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)'],

  ext: {
    loadimpact: {
      projectID: __ENV.K6_PROJECT_ID,
      name: 'Flamoral Stress Test - Breaking Point',
    },
  },
};

const config = parseEnvConfig();

export function setup() {
  console.log('=== Stress Test Setup ===');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Peak VUs: 10,000`);
  console.log(`Test duration: 47 minutes`);
  console.log('⚠️  WARNING: This test will push the system to its limits');

  const token = authenticate(config.testEmail, config.testPassword);

  if (!token) {
    console.error('Setup failed: Could not authenticate');
    return null;
  }

  console.log('Setup completed - starting stress test');
  return { token, startTime: Date.now() };
}

export default function(data) {
  if (!data || !data.token) {
    errorRate.add(1);
    return;
  }

  const headers = getAuthHeaders(data.token);

  // Focus on high-traffic endpoints
  group('High Load Discovery', () => {
    const discoverRes = http.get(`${BASE_URL}/discover`, {
      headers,
      timeout: '30s', // Longer timeout under stress
    });

    discoveryRequests.add(1);

    const success = check(discoverRes, {
      'status is 2xx or 503': (r) => r.status >= 200 && r.status < 300 || r.status === 503,
      'response received': (r) => r.status !== 0,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });

    success ? recordSuccess(discoverRes, apiLatency) : recordFailure(discoverRes, apiLatency);

    // Rapid fire swiping under stress
    if (discoverRes.status === 200) {
      try {
        const profiles = JSON.parse(discoverRes.body).profiles || [];
        const swipeCount = Math.min(profiles.length, 3); // Limit to 3 under stress

        for (let i = 0; i < swipeCount; i++) {
          const action = Math.random() < 0.5 ? 'like' : 'pass';
          const swipeRes = http.post(
            `${BASE_URL}/matches/${action}`,
            JSON.stringify({ profileId: profiles[i].id || `stress-${i}` }),
            { headers, timeout: '10s' }
          );

          matchRequests.add(1);

          check(swipeRes, {
            'swipe status OK or service unavailable': (r) =>
              (r.status >= 200 && r.status < 300) || r.status === 503 || r.status === 429,
          });

          sleep(0.1); // Minimal delay under stress
        }
      } catch (e) {
        errorRate.add(1);
      }
    }
  });

  // Minimal think time under stress
  sleep(Math.random() * 0.5);
}

export function teardown(data) {
  if (!data) return;

  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log('=== Stress Test Completed ===');
  console.log(`Total duration: ${duration.toFixed(2)} minutes`);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  // Calculate key metrics
  const maxVUs = data.metrics.vus_max?.values?.value || 0;
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;
  const failedRate = data.metrics.http_req_failed?.values?.rate || 0;
  const avgDuration = data.metrics.http_req_duration?.values?.avg || 0;
  const p95Duration = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99Duration = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const p999Duration = data.metrics.http_req_duration?.values?.['p(99.9)'] || 0;
  const throughput = data.metrics.http_reqs?.values?.rate || 0;

  // Determine breaking point
  const breakingPointReached = failedRate > 0.10 || p99Duration > 2000;

  const summary = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                    FLAMORAL STRESS TEST RESULTS                           ║
║                     Breaking Point Analysis                               ║
╚═══════════════════════════════════════════════════════════════════════════╝

🔥 STRESS TEST SUMMARY
─────────────────────────────────────────────────────────────────────────────
Peak Virtual Users:      ${maxVUs.toLocaleString()}
Total Requests:          ${totalReqs.toLocaleString()}
Failed Request Rate:     ${(failedRate * 100).toFixed(2)}%
Peak Throughput:         ${throughput.toFixed(2)} req/s

⚠️  BREAKING POINT: ${breakingPointReached ? 'REACHED' : 'NOT REACHED'}

⏱️  RESPONSE TIME DISTRIBUTION
─────────────────────────────────────────────────────────────────────────────
Average:                 ${avgDuration.toFixed(2)}ms
Median:                  ${(data.metrics.http_req_duration?.values?.med || 0).toFixed(2)}ms
P90:                     ${(data.metrics.http_req_duration?.values?.['p(90)'] || 0).toFixed(2)}ms
P95:                     ${p95Duration.toFixed(2)}ms  ${p95Duration < 1000 ? '✅' : '⚠️'}
P99:                     ${p99Duration.toFixed(2)}ms  ${p99Duration < 2000 ? '✅' : '⚠️'}
P99.9:                   ${p999Duration.toFixed(2)}ms

📊 CAPACITY ANALYSIS
─────────────────────────────────────────────────────────────────────────────
Discovery Requests:      ${data.metrics.discovery_requests?.values?.count || 0}
Match Requests:          ${data.metrics.match_requests?.values?.count || 0}

System Status:           ${failedRate < 0.05 ? '✅ STABLE' : failedRate < 0.10 ? '⚠️  DEGRADED' : '❌ OVERLOADED'}

📈 PERFORMANCE DEGRADATION
─────────────────────────────────────────────────────────────────────────────
${avgDuration < 300 ? '✅' : '❌'} Average response time ${avgDuration < 300 ? 'acceptable' : 'degraded'}
${p95Duration < 1000 ? '✅' : '❌'} P95 response time ${p95Duration < 1000 ? 'acceptable' : 'degraded'}
${p99Duration < 2000 ? '✅' : '❌'} P99 response time ${p99Duration < 2000 ? 'acceptable' : 'degraded'}
${failedRate < 0.10 ? '✅' : '❌'} Error rate ${failedRate < 0.10 ? 'acceptable' : 'too high'}

💡 RECOMMENDATIONS
─────────────────────────────────────────────────────────────────────────────
${failedRate > 0.05 ? '• Review error logs for failure patterns\n' : ''}${avgDuration > 500 ? '• Consider implementing request queuing\n' : ''}${p99Duration > 1500 ? '• Add caching layer for frequently accessed data\n' : ''}${breakingPointReached ? '• Implement auto-scaling rules\n• Add circuit breakers\n• Consider database read replicas\n' : '• System handled stress well - consider testing higher loads\n'}
═══════════════════════════════════════════════════════════════════════════
`;

  console.log(summary);

  return {
    'stdout': summary,
    [`results/stress-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/stress-test-${timestamp}.html`]: htmlStressReport(data, breakingPointReached),
  };
}

function htmlStressReport(data, breakingPointReached) {
  const maxVUs = data.metrics.vus_max?.values?.value || 0;
  const failedRate = data.metrics.http_req_failed?.values?.rate || 0;
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const throughput = data.metrics.http_reqs?.values?.rate || 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stress Test Results - Flamoral</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #1e3a8a 0%, #991b1b 100%);
      padding: 20px;
      color: #333;
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
    .warning-badge {
      display: inline-block;
      padding: 15px 30px;
      border-radius: 25px;
      font-weight: bold;
      font-size: 1.2em;
      margin-top: 15px;
      background: ${breakingPointReached ? '#dc2626' : '#059669'};
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
      border-left: 5px solid ${breakingPointReached ? '#dc2626' : '#059669'};
    }
    .metric-value {
      font-size: 3em;
      font-weight: bold;
      color: ${breakingPointReached ? '#dc2626' : '#1e3a8a'};
      margin: 15px 0;
    }
    .metric-label {
      color: #666;
      font-size: 1em;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
    }
    .recommendations {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .recommendations h2 { margin-bottom: 20px; color: #1e3a8a; }
    .recommendations ul { list-style: none; }
    .recommendations li {
      padding: 10px;
      margin: 10px 0;
      background: #f3f4f6;
      border-radius: 5px;
      border-left: 3px solid #1e3a8a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 Flamoral Stress Test Results</h1>
      <p style="font-size: 1.2em; margin-top: 10px;">Breaking Point Analysis - ${maxVUs.toLocaleString()} Peak Users</p>
      <div class="warning-badge">
        ${breakingPointReached ? '⚠️  BREAKING POINT REACHED' : '✅ SYSTEM STABLE UNDER STRESS'}
      </div>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Peak Virtual Users</div>
        <div class="metric-value">${maxVUs.toLocaleString()}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Error Rate</div>
        <div class="metric-value">${(failedRate * 100).toFixed(2)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P95 Response Time</div>
        <div class="metric-value">${p95.toFixed(0)}ms</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Peak Throughput</div>
        <div class="metric-value">${throughput.toFixed(0)} <span style="font-size:0.4em">req/s</span></div>
      </div>
    </div>

    <div class="recommendations">
      <h2>💡 Recommendations</h2>
      <ul>
        ${breakingPointReached ? `
        <li>🔴 Implement auto-scaling rules to handle traffic spikes</li>
        <li>🔴 Add circuit breakers to prevent cascade failures</li>
        <li>🔴 Consider database read replicas for load distribution</li>
        <li>🔴 Implement request queuing and rate limiting</li>
        ` : `
        <li>✅ System handled stress well - current capacity is sufficient</li>
        <li>💡 Consider testing with higher loads to find true breaking point</li>
        <li>💡 Monitor production metrics to ensure consistent performance</li>
        `}
      </ul>
    </div>
  </div>
</body>
</html>`;
}
