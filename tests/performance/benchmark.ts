import Benchmark from 'benchmark';
import axios from 'axios';
import { performance } from 'perf_hooks';

const suite = new Benchmark.Suite();
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

// Test credentials
let authToken: string;

/**
 * Performance Benchmarks for Flamoral Dating Platform
 * Tests critical operations for performance characteristics
 */

// Setup: Get auth token
async function setup() {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: 'benchmark@flamoral.com',
    password: 'Benchmark123!',
  });
  authToken = response.data.token;
}

// Benchmark 1: User Profile Retrieval
suite.add('User Profile Retrieval', {
  defer: true,
  fn: async (deferred: any) => {
    await axios.get(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    deferred.resolve();
  },
});

// Benchmark 2: Discovery Profile Loading
suite.add('Discovery Profile Loading', {
  defer: true,
  fn: async (deferred: any) => {
    await axios.get(`${API_BASE_URL}/matches/discover?limit=10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    deferred.resolve();
  },
});

// Benchmark 3: Swipe Processing
suite.add('Swipe Processing', {
  defer: true,
  fn: async (deferred: any) => {
    await axios.post(
      `${API_BASE_URL}/matches/swipe`,
      {
        targetUserId: `user-${Math.random()}`,
        direction: 'right',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    deferred.resolve();
  },
});

// Benchmark 4: Message Sending
suite.add('Message Sending', {
  defer: true,
  fn: async (deferred: any) => {
    await axios.post(
      `${API_BASE_URL}/messages`,
      {
        conversationId: 'test-conv',
        text: 'Benchmark message',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    deferred.resolve();
  },
});

// Benchmark 5: Search & Filtering
suite.add('Search & Filtering', {
  defer: true,
  fn: async (deferred: any) => {
    await axios.post(
      `${API_BASE_URL}/matches/search`,
      {
        filters: {
          ageMin: 25,
          ageMax: 35,
          distance: 50,
          interests: ['hiking'],
        },
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    deferred.resolve();
  },
});

// Custom performance tests
async function runCustomBenchmarks() {
  console.log('\n=== Custom Performance Benchmarks ===\n');

  // Test 1: Matching Algorithm Performance
  console.log('Testing matching algorithm performance...');
  const matchingStart = performance.now();

  const matchingRequests = [];
  for (let i = 0; i < 100; i++) {
    matchingRequests.push(
      axios.get(`${API_BASE_URL}/matches/discover?limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );
  }

  await Promise.all(matchingRequests);
  const matchingEnd = performance.now();

  console.log(`100 matching requests completed in ${(matchingEnd - matchingStart).toFixed(2)}ms`);
  console.log(`Average: ${((matchingEnd - matchingStart) / 100).toFixed(2)}ms per request\n`);

  // Test 2: Concurrent Message Handling
  console.log('Testing concurrent message handling...');
  const messagingStart = performance.now();

  const messageRequests = [];
  for (let i = 0; i < 50; i++) {
    messageRequests.push(
      axios.post(
        `${API_BASE_URL}/messages`,
        {
          conversationId: `conv-${i}`,
          text: `Message ${i}`,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      )
    );
  }

  await Promise.all(messageRequests);
  const messagingEnd = performance.now();

  console.log(`50 concurrent messages sent in ${(messagingEnd - messagingStart).toFixed(2)}ms`);
  console.log(`Average: ${((messagingEnd - messagingStart) / 50).toFixed(2)}ms per message\n`);

  // Test 3: Database Query Performance
  console.log('Testing database query performance...');
  const queryStart = performance.now();

  for (let i = 0; i < 100; i++) {
    await axios.get(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
  }

  const queryEnd = performance.now();

  console.log(`100 sequential queries completed in ${(queryEnd - queryStart).toFixed(2)}ms`);
  console.log(`Average: ${((queryEnd - queryStart) / 100).toFixed(2)}ms per query\n`);

  // Test 4: Photo Upload Performance
  console.log('Testing photo upload performance...');
  const uploadStart = performance.now();

  const testPhotoData = Buffer.from('test-photo-data').toString('base64');
  const uploadRequests = [];

  for (let i = 0; i < 10; i++) {
    uploadRequests.push(
      axios.post(
        `${API_BASE_URL}/media/upload`,
        {
          photo: testPhotoData,
          type: 'profile',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      )
    );
  }

  await Promise.all(uploadRequests);
  const uploadEnd = performance.now();

  console.log(`10 photo uploads completed in ${(uploadEnd - uploadStart).toFixed(2)}ms`);
  console.log(`Average: ${((uploadEnd - uploadStart) / 10).toFixed(2)}ms per upload\n`);

  // Test 5: Cache Performance
  console.log('Testing cache performance...');

  // First request (cache miss)
  const cacheMissStart = performance.now();
  await axios.get(`${API_BASE_URL}/matches/discover?limit=10`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const cacheMissEnd = performance.now();

  // Second request (cache hit)
  const cacheHitStart = performance.now();
  await axios.get(`${API_BASE_URL}/matches/discover?limit=10`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const cacheHitEnd = performance.now();

  console.log(`Cache miss: ${(cacheMissEnd - cacheMissStart).toFixed(2)}ms`);
  console.log(`Cache hit: ${(cacheHitEnd - cacheHitStart).toFixed(2)}ms`);
  console.log(
    `Cache improvement: ${(
      ((cacheMissEnd - cacheMissStart - (cacheHitEnd - cacheHitStart)) /
        (cacheMissEnd - cacheMissStart)) *
      100
    ).toFixed(2)}%\n`
  );
}

// Memory leak detection
async function detectMemoryLeaks() {
  console.log('\n=== Memory Leak Detection ===\n');

  if (global.gc) {
    global.gc();
  }

  const initialMemory = process.memoryUsage();

  // Simulate sustained operation
  for (let i = 0; i < 1000; i++) {
    await axios.get(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
  }

  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage();

  console.log('Initial Memory:', {
    rss: `${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  });

  console.log('Final Memory:', {
    rss: `${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  });

  const memoryGrowth = {
    rss: finalMemory.rss - initialMemory.rss,
    heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
  };

  console.log('Memory Growth:', {
    rss: `${(memoryGrowth.rss / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(memoryGrowth.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  });

  if (memoryGrowth.heapUsed > 50 * 1024 * 1024) {
    console.warn('⚠ WARNING: Potential memory leak detected (>50MB growth)');
  } else {
    console.log('✓ No significant memory leaks detected');
  }
}

// Run all benchmarks
async function runAllBenchmarks() {
  try {
    await setup();

    console.log('Starting Flamoral Performance Benchmarks...\n');

    // Run custom benchmarks
    await runCustomBenchmarks();

    // Run memory leak detection
    await detectMemoryLeaks();

    // Run Benchmark.js suite
    console.log('\n=== Benchmark.js Suite ===\n');

    suite
      .on('cycle', (event: any) => {
        console.log(String(event.target));
      })
      .on('complete', function (this: any) {
        console.log('\nFastest is ' + this.filter('fastest').map('name'));
        console.log('\n=== Benchmark Complete ===\n');
        process.exit(0);
      })
      .run({ async: true });
  } catch (error) {
    console.error('Benchmark error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllBenchmarks();
}

export { runAllBenchmarks, setup };
