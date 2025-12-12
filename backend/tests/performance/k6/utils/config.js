/**
 * Configuration utilities for k6 performance tests
 */

export const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000/api';
export const WS_URL = __ENV.K6_WS_URL || 'ws://localhost:3000';
export const CDN_URL = __ENV.K6_CDN_URL || 'https://cdn.flamoral.com';

/**
 * Test environment configuration
 */
export const config = {
  // API endpoints
  endpoints: {
    auth: {
      login: `${BASE_URL}/auth/login`,
      register: `${BASE_URL}/auth/register`,
      refresh: `${BASE_URL}/auth/refresh`,
      logout: `${BASE_URL}/auth/logout`,
    },
    users: {
      me: `${BASE_URL}/users/me`,
      profile: `${BASE_URL}/users/:id`,
      update: `${BASE_URL}/users/me`,
      photos: `${BASE_URL}/users/me/photos`,
    },
    discovery: {
      browse: `${BASE_URL}/discover`,
      search: `${BASE_URL}/discover/search`,
      preferences: `${BASE_URL}/discover/preferences`,
    },
    matching: {
      like: `${BASE_URL}/matches/like`,
      pass: `${BASE_URL}/matches/pass`,
      superLike: `${BASE_URL}/matches/superlike`,
      matches: `${BASE_URL}/matches`,
      unmatch: `${BASE_URL}/matches/:id/unmatch`,
    },
    messaging: {
      conversations: `${BASE_URL}/messages/conversations`,
      messages: `${BASE_URL}/messages`,
      send: `${BASE_URL}/messages`,
      read: `${BASE_URL}/messages/:id/read`,
    },
    payments: {
      subscriptions: `${BASE_URL}/payments/subscriptions`,
      purchase: `${BASE_URL}/payments/purchase`,
      coins: `${BASE_URL}/payments/coins`,
      boosts: `${BASE_URL}/payments/boosts`,
    },
    media: {
      upload: `${BASE_URL}/media/upload`,
      delete: `${BASE_URL}/media/:id`,
    },
  },

  // Performance thresholds (in milliseconds)
  thresholds: {
    auth: {
      p95: 150,
      p99: 300,
    },
    discovery: {
      p95: 250,
      p99: 500,
    },
    matching: {
      p95: 150,
      p99: 300,
    },
    messaging: {
      p95: 100,
      p99: 200,
    },
    profile: {
      p95: 150,
      p99: 300,
    },
    payment: {
      p95: 300,
      p99: 600,
    },
    upload: {
      p95: 2000,
      p99: 5000,
    },
    websocket: {
      p95: 50,
      p99: 100,
    },
  },

  // SLO (Service Level Objectives)
  slo: {
    availability: 99.9, // 99.9% uptime
    errorRate: 0.01, // < 1% error rate
    p95ResponseTime: 200, // < 200ms for 95% of requests
    p99ResponseTime: 500, // < 500ms for 99% of requests
  },

  // Load test profiles
  loadProfiles: {
    smoke: {
      vus: 1,
      duration: '1m',
      description: 'Minimal load to verify test setup',
    },
    load: {
      vus: 100,
      duration: '10m',
      description: 'Normal expected load',
    },
    stress: {
      vus: 500,
      duration: '15m',
      description: 'Beyond normal load to find breaking point',
    },
    spike: {
      vus: 1000,
      duration: '5m',
      description: 'Sudden traffic spike',
    },
    soak: {
      vus: 100,
      duration: '2h',
      description: 'Extended duration to find memory leaks',
    },
  },
};

/**
 * Get load profile based on test type
 * @param {string} profileName - Name of the load profile
 * @returns {Object} Load profile configuration
 */
export function getLoadProfile(profileName) {
  return config.loadProfiles[profileName] || config.loadProfiles.load;
}

/**
 * Get endpoint URL by name
 * @param {string} category - Category (e.g., 'auth', 'users')
 * @param {string} endpoint - Endpoint name
 * @param {Object} params - URL parameters to replace
 * @returns {string} Full endpoint URL
 */
export function getEndpoint(category, endpoint, params = {}) {
  let url = config.endpoints[category]?.[endpoint];
  if (!url) {
    throw new Error(`Endpoint not found: ${category}.${endpoint}`);
  }

  // Replace URL parameters
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, value);
  });

  return url;
}

/**
 * Get threshold for specific endpoint
 * @param {string} category - Category name
 * @param {string} percentile - Percentile (p95, p99)
 * @returns {number} Threshold in milliseconds
 */
export function getThreshold(category, percentile = 'p95') {
  return config.thresholds[category]?.[percentile] || config.thresholds.profile[percentile];
}

/**
 * Check if response meets SLO
 * @param {Object} response - HTTP response
 * @param {string} category - Category name
 * @returns {boolean} True if response meets SLO
 */
export function meetsResponseTimeSLO(response, category) {
  const threshold = getThreshold(category, 'p95');
  return response.timings.duration <= threshold;
}

/**
 * Parse environment variables for test configuration
 * @returns {Object} Parsed configuration
 */
export function parseEnvConfig() {
  return {
    baseUrl: __ENV.K6_BASE_URL || BASE_URL,
    wsUrl: __ENV.K6_WS_URL || WS_URL,
    cdnUrl: __ENV.K6_CDN_URL || CDN_URL,
    vus: parseInt(__ENV.K6_VUS) || 10,
    duration: __ENV.K6_DURATION || '5m',
    testEmail: __ENV.K6_TEST_EMAIL || 'loadtest@example.com',
    testPassword: __ENV.K6_TEST_PASSWORD || 'TestPassword123!',
    enableDebug: __ENV.K6_DEBUG === 'true',
    enableInfluxDB: __ENV.K6_INFLUXDB_URL !== undefined,
    influxDBUrl: __ENV.K6_INFLUXDB_URL,
    influxDBDatabase: __ENV.K6_INFLUXDB_DB || 'k6',
    enablePrometheus: __ENV.K6_PROMETHEUS_URL !== undefined,
    prometheusUrl: __ENV.K6_PROMETHEUS_URL,
  };
}

/**
 * Get standard k6 options for a test
 * @param {Object} customOptions - Custom options to merge
 * @returns {Object} k6 options object
 */
export function getK6Options(customOptions = {}) {
  const envConfig = parseEnvConfig();

  const baseOptions = {
    summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)'],
    noConnectionReuse: false,
    userAgent: 'k6-performance-test/1.0',
    batch: 10,
    batchPerHost: 5,
    timeout: '60s',
    gracefulStop: '30s',
    setupTimeout: '60s',
    teardownTimeout: '60s',
  };

  return {
    ...baseOptions,
    ...customOptions,
  };
}

/**
 * Get test data for specific environment
 * @returns {Object} Test data configuration
 */
export function getTestData() {
  return {
    users: {
      count: parseInt(__ENV.K6_TEST_USERS) || 100,
      prefix: __ENV.K6_USER_PREFIX || 'k6test',
    },
    location: {
      defaultLat: parseFloat(__ENV.K6_DEFAULT_LAT) || 40.7128,
      defaultLon: parseFloat(__ENV.K6_DEFAULT_LON) || -74.0060,
      searchRadius: parseInt(__ENV.K6_SEARCH_RADIUS) || 50,
    },
    behavior: {
      thinkTime: {
        min: parseFloat(__ENV.K6_THINK_TIME_MIN) || 1,
        max: parseFloat(__ENV.K6_THINK_TIME_MAX) || 5,
      },
      actionsPerSession: parseInt(__ENV.K6_ACTIONS_PER_SESSION) || 10,
    },
  };
}
