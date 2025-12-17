import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Stress Test
 * Purpose: Find the breaking point of the system
 * Goal: Identify max capacity and behavior under extreme load
 */

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time', true);

export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '5m', target: 100 },    // Stay at 100 users
    { duration: '2m', target: 200 },    // Ramp up to 200 users
    { duration: '5m', target: 200 },    // Stay at 200 users
    { duration: '2m', target: 300 },    // Ramp up to 300 users
    { duration: '5m', target: 300 },    // Stay at 300 users
    { duration: '2m', target: 400 },    // Ramp up to 400 users
    { duration: '5m', target: 400 },    // Stay at 400 users
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],   // 99% under 2s (relaxed for stress)
    http_req_failed: ['rate<0.10'],      // Error rate < 10% under stress
    errors: ['rate<0.15'],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000/api';

export default function () {
  // High-load scenario: Discovery endpoint (most common)
  const discoverRes = http.get(`${BASE_URL}/discover`, {
    headers: {
      'Authorization': `Bearer ${__ENV.TEST_TOKEN || 'test-token'}`,
    },
  });

  responseTime.add(discoverRes.timings.duration);

  check(discoverRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  // Simulate rapid swiping
  for (let i = 0; i < 3; i++) {
    http.post(`${BASE_URL}/matches/like`, JSON.stringify({ profileId: `profile-${i}` }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.TEST_TOKEN || 'test-token'}`,
      },
    });
    sleep(0.1);
  }

  sleep(Math.random() * 0.5);
}

export function handleSummary(data) {
  const maxVUs = data.metrics.vus_max?.values?.value || 0;
  const avgResponseTime = data.metrics.http_req_duration?.values?.avg || 0;
  const p99ResponseTime = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const errorRate = data.metrics.http_req_failed?.values?.rate || 0;

  console.log(`
================================================================================
                           STRESS TEST RESULTS
================================================================================

Peak Virtual Users: ${maxVUs}
Avg Response Time: ${avgResponseTime.toFixed(2)}ms
P99 Response Time: ${p99ResponseTime.toFixed(2)}ms
Error Rate: ${(errorRate * 100).toFixed(2)}%

ANALYSIS:
${avgResponseTime < 500 ? '✅' : '❌'} Avg response time ${avgResponseTime < 500 ? 'acceptable' : 'too high'}
${p99ResponseTime < 2000 ? '✅' : '❌'} P99 response time ${p99ResponseTime < 2000 ? 'acceptable' : 'too high'}
${errorRate < 0.1 ? '✅' : '❌'} Error rate ${errorRate < 0.1 ? 'acceptable' : 'too high'}

RECOMMENDATIONS:
${avgResponseTime > 500 ? '- Consider adding caching or optimizing database queries\n' : ''}${errorRate > 0.05 ? '- Review error logs for root cause of failures\n' : ''}${p99ResponseTime > 1500 ? '- Consider horizontal scaling or request queuing\n' : ''}
================================================================================
  `);

  return {
    'stress-results.json': JSON.stringify(data),
  };
}
