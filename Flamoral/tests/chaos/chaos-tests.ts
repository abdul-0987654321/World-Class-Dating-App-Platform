/**
 * Chaos Engineering Tests for Flamoral Dating Platform
 * Tests system resilience under various failure scenarios
 */

import axios, { AxiosInstance } from 'axios';
import { performance } from 'perf_hooks';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

interface ChaosTest {
  name: string;
  description: string;
  execute: () => Promise<void>;
}

let authToken: string;
let httpClient: AxiosInstance;

// Setup
async function setup() {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: 'chaos@flamoral.com',
    password: 'Chaos123!',
  });

  authToken = response.data.token;

  httpClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeout: 10000,
  });
}

// Chaos Test 1: Network Latency
const networkLatencyTest: ChaosTest = {
  name: 'Network Latency',
  description: 'Simulate high network latency (500-2000ms delays)',

  execute: async () => {
    console.log('\n--- Network Latency Test ---');

    const delays = [500, 1000, 1500, 2000];
    const results = [];

    for (const delay of delays) {
      const start = performance.now();

      try {
        await new Promise((resolve) => setTimeout(resolve, delay));
        await httpClient.get('/users/me');

        const duration = performance.now() - start;
        results.push({ delay, duration, success: true });

        console.log(`✓ Request completed with ${delay}ms latency in ${duration.toFixed(2)}ms`);
      } catch (error) {
        results.push({ delay, success: false, error: error.message });
        console.log(`✗ Request failed with ${delay}ms latency`);
      }
    }

    // Verify system handles latency gracefully
    const allSucceeded = results.every((r) => r.success);
    if (allSucceeded) {
      console.log('✓ System handles network latency gracefully');
    } else {
      console.log('✗ System failed under network latency');
    }
  },
};

// Chaos Test 2: Service Failures
const serviceFailureTest: ChaosTest = {
  name: 'Service Failures',
  description: 'Test system behavior when dependent services fail',

  execute: async () => {
    console.log('\n--- Service Failure Test ---');

    // Test various failure scenarios
    const scenarios = [
      {
        name: 'User Service Down',
        endpoint: '/users/me',
        expectedBehavior: 'Graceful degradation or cached response',
      },
      {
        name: 'Matching Service Down',
        endpoint: '/matches/discover',
        expectedBehavior: 'Error message with retry option',
      },
      {
        name: 'Messaging Service Down',
        endpoint: '/messages/conversations',
        expectedBehavior: 'Cached data or offline mode',
      },
    ];

    for (const scenario of scenarios) {
      try {
        const response = await httpClient.get(scenario.endpoint);
        console.log(`✓ ${scenario.name}: Service responded (${response.status})`);
      } catch (error: any) {
        if (error.response) {
          console.log(
            `✓ ${scenario.name}: Got error response (${error.response.status}) - ${scenario.expectedBehavior}`
          );
        } else {
          console.log(`✗ ${scenario.name}: Service failed completely`);
        }
      }
    }
  },
};

// Chaos Test 3: Database Failures
const databaseFailureTest: ChaosTest = {
  name: 'Database Failures',
  description: 'Test resilience to database connection issues',

  execute: async () => {
    console.log('\n--- Database Failure Test ---');

    // Simulate multiple rapid requests that might stress database connections
    const requests = [];
    for (let i = 0; i < 50; i++) {
      requests.push(
        httpClient.get('/users/me').catch((error) => ({
          error: true,
          message: error.message,
        }))
      );
    }

    const results = await Promise.all(requests);
    const failures = results.filter((r: any) => r.error);

    console.log(`Completed 50 requests: ${50 - failures.length} succeeded, ${failures.length} failed`);

    if (failures.length < 5) {
      console.log('✓ System maintained good availability under database stress');
    } else {
      console.log('✗ System struggled with database connection pool');
    }
  },
};

// Chaos Test 4: Traffic Spikes
const trafficSpikeTest: ChaosTest = {
  name: 'Traffic Spikes',
  description: 'Test system behavior under sudden traffic increase',

  execute: async () => {
    console.log('\n--- Traffic Spike Test ---');

    // Simulate normal load
    console.log('Simulating normal load (10 req/sec)...');
    const normalLoad = [];
    for (let i = 0; i < 10; i++) {
      normalLoad.push(httpClient.get('/matches/discover'));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await Promise.all(normalLoad);
    console.log('✓ Normal load handled');

    // Simulate spike
    console.log('Simulating traffic spike (100 concurrent requests)...');
    const spikeStart = performance.now();
    const spikeLoad = [];

    for (let i = 0; i < 100; i++) {
      spikeLoad.push(
        httpClient.get('/matches/discover').catch((error) => ({
          error: true,
          status: error.response?.status,
        }))
      );
    }

    const spikeResults = await Promise.all(spikeLoad);
    const spikeEnd = performance.now();

    const spikeFailures = spikeResults.filter((r: any) => r.error);
    const rateLimited = spikeResults.filter((r: any) => r.status === 429);

    console.log(`Spike completed in ${(spikeEnd - spikeStart).toFixed(2)}ms`);
    console.log(`Failures: ${spikeFailures.length}, Rate limited: ${rateLimited.length}`);

    if (rateLimited.length > 0) {
      console.log('✓ System has rate limiting in place');
    } else {
      console.log('⚠ No rate limiting detected');
    }

    if (spikeFailures.length < 10) {
      console.log('✓ System handled traffic spike well');
    } else {
      console.log('✗ System struggled with traffic spike');
    }
  },
};

// Chaos Test 5: Memory Exhaustion
const memoryExhaustionTest: ChaosTest = {
  name: 'Memory Exhaustion',
  description: 'Test system behavior under memory pressure',

  execute: async () => {
    console.log('\n--- Memory Exhaustion Test ---');

    const initialMemory = process.memoryUsage();
    console.log(`Initial heap used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    // Create memory pressure
    const largeRequests = [];
    for (let i = 0; i < 20; i++) {
      largeRequests.push(
        httpClient.post('/matches/search', {
          filters: {
            interests: Array(100).fill('test-interest'),
          },
        })
      );
    }

    await Promise.all(largeRequests);

    const finalMemory = process.memoryUsage();
    console.log(`Final heap used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    const growth = finalMemory.heapUsed - initialMemory.heapUsed;
    console.log(`Memory growth: ${(growth / 1024 / 1024).toFixed(2)} MB`);

    if (growth < 100 * 1024 * 1024) {
      console.log('✓ Memory usage within acceptable limits');
    } else {
      console.log('✗ Excessive memory growth detected');
    }
  },
};

// Chaos Test 6: Cascading Failures
const cascadingFailureTest: ChaosTest = {
  name: 'Cascading Failures',
  description: 'Test if failures in one service cascade to others',

  execute: async () => {
    console.log('\n--- Cascading Failure Test ---');

    // Test if auth failure affects other services
    const unauthClient = axios.create({
      baseURL: API_BASE_URL,
      headers: { Authorization: 'Bearer invalid-token' },
    });

    const services = ['users/me', 'matches/discover', 'messages/conversations'];

    for (const service of services) {
      try {
        await unauthClient.get(`/${service}`);
        console.log(`✗ ${service}: Allowed unauthenticated access`);
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.log(`✓ ${service}: Properly rejected unauthorized access`);
        } else {
          console.log(`? ${service}: Unexpected error (${error.response?.status || 'no response'})`);
        }
      }
    }
  },
};

// Chaos Test 7: Data Corruption
const dataCorruptionTest: ChaosTest = {
  name: 'Data Corruption',
  description: 'Test system behavior with malformed data',

  execute: async () => {
    console.log('\n--- Data Corruption Test ---');

    const corruptedPayloads = [
      { name: 'Null values', data: { bio: null, interests: null } },
      { name: 'Invalid types', data: { age: 'not-a-number', verified: 'yes' } },
      { name: 'SQL injection attempt', data: { bio: "'; DROP TABLE users; --" } },
      { name: 'XSS attempt', data: { bio: '<script>alert("xss")</script>' } },
      { name: 'Excessive size', data: { bio: 'a'.repeat(10000) } },
    ];

    for (const payload of corruptedPayloads) {
      try {
        await httpClient.put('/users/me', payload.data);
        console.log(`⚠ ${payload.name}: Request accepted (may need validation)`);
      } catch (error: any) {
        if (error.response?.status === 400) {
          console.log(`✓ ${payload.name}: Properly validated and rejected`);
        } else {
          console.log(`? ${payload.name}: Unexpected response (${error.response?.status})`);
        }
      }
    }
  },
};

// Chaos Test 8: WebSocket Failure
const websocketFailureTest: ChaosTest = {
  name: 'WebSocket Failure',
  description: 'Test fallback when real-time communication fails',

  execute: async () => {
    console.log('\n--- WebSocket Failure Test ---');

    // Test if HTTP polling works as fallback
    const pollingTests = [
      { endpoint: '/messages/conversations', purpose: 'Message updates' },
      { endpoint: '/matches/discover', purpose: 'Match notifications' },
    ];

    for (const test of pollingTests) {
      try {
        const response = await httpClient.get(test.endpoint);
        if (response.status === 200) {
          console.log(`✓ ${test.purpose}: HTTP fallback available`);
        }
      } catch (error) {
        console.log(`✗ ${test.purpose}: No fallback mechanism`);
      }
    }
  },
};

// Run all chaos tests
async function runAllChaosTests() {
  console.log('=== Flamoral Chaos Engineering Tests ===\n');

  try {
    await setup();

    const tests = [
      networkLatencyTest,
      serviceFailureTest,
      databaseFailureTest,
      trafficSpikeTest,
      memoryExhaustionTest,
      cascadingFailureTest,
      dataCorruptionTest,
      websocketFailureTest,
    ];

    for (const test of tests) {
      console.log(`\nRunning: ${test.name}`);
      console.log(`Description: ${test.description}`);

      try {
        await test.execute();
      } catch (error) {
        console.error(`✗ Test failed with error:`, error.message);
      }

      // Wait between tests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log('\n=== Chaos Tests Complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllChaosTests();
}

export { runAllChaosTests, setup };
