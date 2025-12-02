import { sleep } from 'k6';

/**
 * k6 Load Testing Configuration
 * Simulates 100K concurrent users
 */

export const options = {
  scenarios: {
    // Scenario 1: Steady load - Normal traffic
    steady_load: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '5m',
      tags: { scenario: 'steady' },
    },

    // Scenario 2: Ramp up - Gradual increase
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 5000 },
        { duration: '5m', target: 20000 },
        { duration: '5m', target: 50000 },
        { duration: '3m', target: 50000 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'ramp' },
      gracefulRampDown: '30s',
    },

    // Scenario 3: Spike test - Sudden traffic surge
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 1000,
      maxVUs: 10000,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '10s', target: 5000 }, // Spike
        { duration: '1m', target: 5000 },
        { duration: '10s', target: 100 },
      ],
      tags: { scenario: 'spike' },
    },

    // Scenario 4: Stress test - Find breaking point
    stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10000 },
        { duration: '5m', target: 50000 },
        { duration: '5m', target: 100000 },
        { duration: '10m', target: 100000 }, // Sustained load
        { duration: '3m', target: 0 },
      ],
      tags: { scenario: 'stress' },
      gracefulRampDown: '1m',
    },

    // Scenario 5: Soak test - Long duration
    soak_test: {
      executor: 'constant-vus',
      vus: 5000,
      duration: '2h',
      tags: { scenario: 'soak' },
    },
  },

  thresholds: {
    // HTTP errors should be less than 1%
    http_req_failed: ['rate<0.01'],

    // 95% of requests should be below 500ms
    http_req_duration: ['p(95)<500', 'p(99)<1000'],

    // WebSocket connection success rate
    ws_connecting: ['p(95)<1000'],

    // Throughput
    http_reqs: ['rate>1000'],

    // Response times by scenario
    'http_req_duration{scenario:steady}': ['p(95)<400'],
    'http_req_duration{scenario:spike}': ['p(95)<800'],
    'http_req_duration{scenario:stress}': ['p(95)<1000'],

    // Custom metrics
    login_success_rate: ['rate>0.99'],
    message_delivery_rate: ['rate>0.99'],
    match_creation_rate: ['rate>0.95'],
  },

  // External metrics
  ext: {
    loadimpact: {
      projectID: 3567890,
      name: 'Dating App Load Test',
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:eu:dublin': { loadZone: 'amazon:eu:dublin', percent: 30 },
        'amazon:ap:singapore': { loadZone: 'amazon:ap:singapore', percent: 20 },
      },
    },
  },

  // DNS and connection settings
  dns: {
    ttl: '5m',
    select: 'roundRobin',
    policy: 'preferIPv4',
  },

  // User agent
  userAgent: 'k6-load-test/1.0',

  // Batch settings
  batch: 10,
  batchPerHost: 5,

  // HTTP settings
  http: {
    // Response timeout
    timeout: '60s',
  },

  // Disable default metrics
  noConnectionReuse: false,
  noVUConnectionReuse: false,

  // Summary settings
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  summaryTimeUnit: 'ms',
};

// Helper functions
export function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function randomEmail() {
  return `user_${randomString(10)}@loadtest.com`;
}

export function randomUser() {
  return {
    email: randomEmail(),
    password: 'LoadTest123!@#',
    firstName: `User${randomString(5)}`,
    lastName: `Test${randomString(5)}`,
    dateOfBirth: '1990-01-15',
    gender: Math.random() > 0.5 ? 'male' : 'female',
  };
}

export function think(min = 1, max = 5) {
  sleep(Math.random() * (max - min) + min);
}
