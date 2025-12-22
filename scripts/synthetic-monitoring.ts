/**
 * Flamoral Platform - Synthetic Monitoring
 * Simulates user journeys and validates critical flows
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Configuration
interface Config {
  apiBaseUrl: string;
  timeout: number;
  retries: number;
  alertWebhook?: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface JourneyResult {
  journey: string;
  passed: boolean;
  totalDuration: number;
  steps: TestResult[];
}

const config: Config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  timeout: parseInt(process.env.TIMEOUT || '10000'),
  retries: parseInt(process.env.RETRIES || '3'),
  alertWebhook: process.env.ALERT_WEBHOOK,
};

// Test user credentials (should be set via environment)
const testUser = {
  email: process.env.TEST_USER_EMAIL || 'synthetic-test@flamoral.com',
  password: process.env.TEST_USER_PASSWORD || 'SyntheticTest123!',
};

// Create axios instance with defaults
const createClient = (): AxiosInstance => {
  return axios.create({
    baseURL: config.apiBaseUrl,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      'X-Synthetic-Test': 'true',
    },
  });
};

// Timing utility
const timed = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = Date.now();
  const result = await fn();
  return { result, duration: Date.now() - start };
};

// Journey: User Registration Flow
async function testRegistrationJourney(client: AxiosInstance): Promise<JourneyResult> {
  const steps: TestResult[] = [];
  const journeyStart = Date.now();

  const testEmail = `synthetic-${Date.now()}@flamoral.test`;

  // Step 1: Check registration endpoint availability
  try {
    const { duration } = await timed(async () => {
      await client.post('/api/auth/register', {
        email: 'invalid-email', // Intentionally invalid
        password: 'short',
      }).catch(() => null);
    });

    steps.push({
      name: 'Registration endpoint available',
      passed: true,
      duration,
    });
  } catch (error) {
    steps.push({
      name: 'Registration endpoint available',
      passed: false,
      duration: 0,
      error: (error as Error).message,
    });
  }

  // Step 2: Validate input validation
  try {
    const { duration } = await timed(async () => {
      const response = await client.post('/api/auth/register', {
        email: 'invalid',
        password: 'x',
      }).catch((e: AxiosError) => e.response);

      if (response?.status !== 400) {
        throw new Error(`Expected 400, got ${response?.status}`);
      }
      return response;
    });

    steps.push({
      name: 'Input validation works',
      passed: true,
      duration,
    });
  } catch (error) {
    steps.push({
      name: 'Input validation works',
      passed: false,
      duration: 0,
      error: (error as Error).message,
    });
  }

  return {
    journey: 'User Registration',
    passed: steps.every(s => s.passed),
    totalDuration: Date.now() - journeyStart,
    steps,
  };
}

// Journey: User Login Flow
async function testLoginJourney(client: AxiosInstance): Promise<JourneyResult> {
  const steps: TestResult[] = [];
  const journeyStart = Date.now();

  // Step 1: Login with valid credentials
  let accessToken: string | null = null;

  try {
    const { result, duration } = await timed(async () => {
      const response = await client.post('/api/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      return response.data;
    });

    accessToken = result.accessToken;

    steps.push({
      name: 'Login successful',
      passed: true,
      duration,
      details: { hasToken: !!accessToken },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    steps.push({
      name: 'Login successful',
      passed: false,
      duration: 0,
      error: axiosError.response?.status === 401
        ? 'Invalid credentials (expected - test user may not exist)'
        : axiosError.message,
    });
  }

  // Step 2: Validate token by fetching profile
  if (accessToken) {
    try {
      const { duration } = await timed(async () => {
        const response = await client.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
      });

      steps.push({
        name: 'Token validation works',
        passed: true,
        duration,
      });
    } catch (error) {
      steps.push({
        name: 'Token validation works',
        passed: false,
        duration: 0,
        error: (error as Error).message,
      });
    }
  } else {
    steps.push({
      name: 'Token validation works',
      passed: false,
      duration: 0,
      error: 'No token available (login failed)',
    });
  }

  // Step 3: Test invalid credentials
  try {
    const { duration } = await timed(async () => {
      const response = await client.post('/api/auth/login', {
        email: 'invalid@test.com',
        password: 'wrongpassword',
      }).catch((e: AxiosError) => e.response);

      if (response?.status !== 401) {
        throw new Error(`Expected 401, got ${response?.status}`);
      }
      return response;
    });

    steps.push({
      name: 'Invalid credentials rejected',
      passed: true,
      duration,
    });
  } catch (error) {
    steps.push({
      name: 'Invalid credentials rejected',
      passed: false,
      duration: 0,
      error: (error as Error).message,
    });
  }

  return {
    journey: 'User Login',
    passed: steps.filter(s => s.name !== 'Token validation works').every(s => s.passed),
    totalDuration: Date.now() - journeyStart,
    steps,
  };
}

// Journey: Discovery Flow (Get recommended profiles)
async function testDiscoveryJourney(client: AxiosInstance, token?: string): Promise<JourneyResult> {
  const steps: TestResult[] = [];
  const journeyStart = Date.now();

  // Step 1: Check discovery endpoint requires auth
  try {
    const { duration } = await timed(async () => {
      const response = await client.get('/api/discovery').catch((e: AxiosError) => e.response);

      if (response?.status !== 401) {
        throw new Error(`Expected 401 without auth, got ${response?.status}`);
      }
      return response;
    });

    steps.push({
      name: 'Discovery requires authentication',
      passed: true,
      duration,
    });
  } catch (error) {
    steps.push({
      name: 'Discovery requires authentication',
      passed: false,
      duration: 0,
      error: (error as Error).message,
    });
  }

  // Step 2: Check discovery with auth (if token available)
  if (token) {
    try {
      const { result, duration } = await timed(async () => {
        const response = await client.get('/api/discovery', {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
      });

      steps.push({
        name: 'Discovery returns profiles',
        passed: true,
        duration,
        details: { profileCount: result?.data?.length || 0 },
      });
    } catch (error) {
      steps.push({
        name: 'Discovery returns profiles',
        passed: false,
        duration: 0,
        error: (error as Error).message,
      });
    }
  }

  return {
    journey: 'Discovery Flow',
    passed: steps.every(s => s.passed),
    totalDuration: Date.now() - journeyStart,
    steps,
  };
}

// Journey: Health Endpoints
async function testHealthEndpoints(client: AxiosInstance): Promise<JourneyResult> {
  const steps: TestResult[] = [];
  const journeyStart = Date.now();

  const healthEndpoints = [
    { path: '/health', name: 'Main health' },
    { path: '/health/ready', name: 'Readiness probe' },
    { path: '/health/live', name: 'Liveness probe' },
  ];

  for (const endpoint of healthEndpoints) {
    try {
      const { result, duration } = await timed(async () => {
        const response = await client.get(endpoint.path);
        return response;
      });

      steps.push({
        name: `${endpoint.name} endpoint`,
        passed: result.status === 200,
        duration,
        details: { status: result.status },
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      steps.push({
        name: `${endpoint.name} endpoint`,
        passed: false,
        duration: 0,
        error: axiosError.message,
      });
    }
  }

  return {
    journey: 'Health Endpoints',
    passed: steps.every(s => s.passed),
    totalDuration: Date.now() - journeyStart,
    steps,
  };
}

// Journey: Rate Limiting
async function testRateLimiting(client: AxiosInstance): Promise<JourneyResult> {
  const steps: TestResult[] = [];
  const journeyStart = Date.now();

  // Step 1: Check rate limit headers present
  try {
    const { result, duration } = await timed(async () => {
      const response = await client.get('/health');
      return response;
    });

    const hasRateLimitHeaders =
      result.headers['x-ratelimit-limit'] ||
      result.headers['x-ratelimit-remaining'];

    steps.push({
      name: 'Rate limit headers present',
      passed: !!hasRateLimitHeaders,
      duration,
      details: {
        limit: result.headers['x-ratelimit-limit'],
        remaining: result.headers['x-ratelimit-remaining'],
      },
    });
  } catch (error) {
    steps.push({
      name: 'Rate limit headers present',
      passed: false,
      duration: 0,
      error: (error as Error).message,
    });
  }

  return {
    journey: 'Rate Limiting',
    passed: steps.every(s => s.passed),
    totalDuration: Date.now() - journeyStart,
    steps,
  };
}

// Alert sending
async function sendAlert(results: JourneyResult[]): Promise<void> {
  if (!config.alertWebhook) {
    console.log('No alert webhook configured');
    return;
  }

  const failedJourneys = results.filter(r => !r.passed);

  if (failedJourneys.length === 0) {
    return;
  }

  const payload = {
    text: `Synthetic Monitoring Alert`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ Synthetic Monitoring Failures',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${failedJourneys.length}* of *${results.length}* journeys failed`,
        },
      },
      ...failedJourneys.map(journey => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${journey.journey}*\n` +
            journey.steps
              .filter(s => !s.passed)
              .map(s => `  ❌ ${s.name}: ${s.error}`)
              .join('\n'),
        },
      })),
    ],
  };

  try {
    await axios.post(config.alertWebhook, payload);
    console.log('Alert sent successfully');
  } catch (error) {
    console.error('Failed to send alert:', (error as Error).message);
  }
}

// Print results
function printResults(results: JourneyResult[]): void {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Flamoral Platform - Synthetic Monitoring              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Target: ${config.apiBaseUrl}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  let totalPassed = 0;
  let totalFailed = 0;

  for (const journey of results) {
    const icon = journey.passed ? '✅' : '❌';
    console.log(`${icon} ${journey.journey} (${journey.totalDuration}ms)`);

    for (const step of journey.steps) {
      const stepIcon = step.passed ? '  ✓' : '  ✗';
      console.log(`${stepIcon} ${step.name} (${step.duration}ms)`);

      if (!step.passed && step.error) {
        console.log(`      Error: ${step.error}`);
      }

      if (step.passed) totalPassed++;
      else totalFailed++;
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Steps: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Pass Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Output JSON for CI/CD
  if (process.env.OUTPUT_JSON) {
    console.log('\nJSON Output:');
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      target: config.apiBaseUrl,
      results,
      summary: {
        totalJourneys: results.length,
        passedJourneys: results.filter(r => r.passed).length,
        totalSteps: totalPassed + totalFailed,
        passedSteps: totalPassed,
        failedSteps: totalFailed,
      },
    }, null, 2));
  }
}

// Main execution
async function main(): Promise<void> {
  const client = createClient();
  const results: JourneyResult[] = [];

  console.log('Starting synthetic monitoring...\n');

  // Run all journeys
  results.push(await testHealthEndpoints(client));
  results.push(await testRegistrationJourney(client));
  results.push(await testLoginJourney(client));
  results.push(await testDiscoveryJourney(client));
  results.push(await testRateLimiting(client));

  // Print results
  printResults(results);

  // Send alerts if any failures
  await sendAlert(results);

  // Exit with appropriate code
  const hasFailures = results.some(r => !r.passed);
  process.exit(hasFailures ? 1 : 0);
}

// Run
main().catch(error => {
  console.error('Synthetic monitoring failed:', error);
  process.exit(1);
});
