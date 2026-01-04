/**
 * Flamoral Dating Platform - Messaging Throughput Load Test
 *
 * This K6 script tests the messaging system under load including:
 * - Sending messages
 * - Receiving messages
 * - WebSocket connections (simulated via polling)
 * - Message read receipts
 * - Typing indicators
 * - Photo/media message uploads
 *
 * Usage:
 *   k6 run --env BASE_URL=https://api.flamoral.com messaging.js
 *   k6 run --env BASE_URL=https://api.flamoral.com --vus 200 --duration 20m messaging.js
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group, fail } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const messagesSent = new Counter('messages_sent');
const messagesReceived = new Counter('messages_received');
const messageDeliveryTime = new Trend('message_delivery_time_ms');
const wsConnectionTime = new Trend('ws_connection_time_ms');
const typingIndicatorsSent = new Counter('typing_indicators_sent');
const readReceiptsSent = new Counter('read_receipts_sent');
const mediaMessagesSent = new Counter('media_messages_sent');
const errorRate = new Rate('errors');
const activeConnections = new Gauge('active_ws_connections');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.flamoral.com';
const WS_URL = __ENV.WS_URL || 'wss://ws.flamoral.com';
const TEST_USERS = JSON.parse(__ENV.TEST_USERS || '[]');

// Test options
export const options = {
  scenarios: {
    // Scenario 1: Sustained messaging load
    sustained_messaging: {
      executor: 'constant-vus',
      vus: 100,
      duration: '15m',
      startTime: '0s',
      tags: { scenario: 'sustained' },
    },
    // Scenario 2: Spike test - sudden increase
    spike_messaging: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '30s', target: 300 },   // Spike to 300 users
        { duration: '2m', target: 300 },    // Maintain spike
        { duration: '30s', target: 50 },    // Return to normal
        { duration: '2m', target: 50 },
      ],
      startTime: '5m',
      tags: { scenario: 'spike' },
    },
    // Scenario 3: Stress test - gradual increase
    stress_messaging: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 1000,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '3m', target: 50 },
      ],
      startTime: '20m',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],       // Message API < 1s at p95
    'http_req_duration{name:SendMessage}': ['p(95)<500'], // Send message < 500ms
    'http_req_duration{name:GetMessages}': ['p(95)<800'], // Get messages < 800ms
    http_req_failed: ['rate<0.02'],                        // Error rate < 2%
    errors: ['rate<0.05'],                                 // Overall error rate < 5%
    message_delivery_time_ms: ['p(95)<1500'],              // Message delivery < 1.5s
    ws_connection_time_ms: ['p(95)<3000'],                 // WS connection < 3s
  },
  tags: {
    environment: __ENV.ENVIRONMENT || 'load-test',
    service: 'messaging-service',
    test_name: 'messaging-throughput',
  },
};

// Pre-defined conversation messages
const messageTemplates = [
  'Hey! How are you doing today?',
  'That sounds really interesting!',
  'I love that place too!',
  'What are your plans for the weekend?',
  "I'd love to hear more about that",
  'Have you been there before?',
  "That's so cool! Tell me more",
  'I totally agree with you on that',
  'What do you think about meeting up?',
  'I really enjoyed our conversation yesterday',
  "You have a great sense of humor!",
  "What's your favorite thing to do for fun?",
  'I noticed we have similar interests',
  'That made me smile :)',
  "I'm really enjoying getting to know you",
];

const shortMessages = [
  'Hi!',
  'Hey!',
  'Haha',
  'Nice!',
  'Cool',
  'Sure',
  'Okay',
  'Sounds good',
  'Perfect!',
  '?',
];

// Helper functions
function getRandomMessage() {
  const useShort = Math.random() > 0.7;
  const messages = useShort ? shortMessages : messageTemplates;
  return messages[randomIntBetween(0, messages.length - 1)];
}

function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Request-ID': `k6-msg-${randomString(16)}`,
  };
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Request-ID': `k6-msg-${randomString(16)}`,
  };
}

// Login function to get auth token
function login(email, password) {
  const loginPayload = JSON.stringify({
    email: email,
    password: password,
  });

  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    loginPayload,
    { headers: getHeaders(), tags: { name: 'Login' } }
  );

  if (loginRes.status === 200) {
    try {
      const body = JSON.parse(loginRes.body);
      return {
        token: body.data.accessToken,
        userId: body.data.userId,
      };
    } catch (e) {
      console.log(`Login parse error: ${e}`);
      return null;
    }
  }

  return null;
}

// Setup function
export function setup() {
  console.log(`Starting messaging throughput load test against ${BASE_URL}`);

  // Verify API is accessible
  const healthRes = http.get(`${BASE_URL}/health`, { headers: getHeaders() });

  if (healthRes.status !== 200) {
    fail('API health check failed. Aborting test.');
  }

  // Create test users if needed or use provided ones
  const testUsers = [];

  // Try to login with test users
  const testCredentials = [
    { email: 'loadtest1@test.flamoral.com', password: 'LoadTest123!@#' },
    { email: 'loadtest2@test.flamoral.com', password: 'LoadTest123!@#' },
    { email: 'loadtest3@test.flamoral.com', password: 'LoadTest123!@#' },
    { email: 'loadtest4@test.flamoral.com', password: 'LoadTest123!@#' },
    { email: 'loadtest5@test.flamoral.com', password: 'LoadTest123!@#' },
  ];

  for (const cred of testCredentials) {
    const auth = login(cred.email, cred.password);
    if (auth) {
      testUsers.push({
        email: cred.email,
        token: auth.token,
        userId: auth.userId,
      });
    }
  }

  console.log(`Logged in ${testUsers.length} test users`);

  return {
    healthy: true,
    testUsers: testUsers,
    startTime: new Date().toISOString(),
  };
}

// Main test function
export default function(data) {
  if (!data.healthy || data.testUsers.length < 2) {
    console.log('Insufficient test users, using registration flow');
    sleep(5);
    return;
  }

  // Select a random test user
  const userIndex = randomIntBetween(0, data.testUsers.length - 1);
  const currentUser = data.testUsers[userIndex];
  const authToken = currentUser.token;
  const userId = currentUser.userId;

  // Get a different user to message
  let partnerIndex = randomIntBetween(0, data.testUsers.length - 1);
  while (partnerIndex === userIndex && data.testUsers.length > 1) {
    partnerIndex = randomIntBetween(0, data.testUsers.length - 1);
  }
  const partnerUser = data.testUsers[partnerIndex];

  // Get or create conversation
  group('Get Conversations', function() {
    const conversationsRes = http.get(
      `${BASE_URL}/api/v1/messaging/conversations`,
      { headers: getAuthHeaders(authToken), tags: { name: 'GetConversations' } }
    );

    check(conversationsRes, {
      'get conversations status is 200': (r) => r.status === 200,
    });
  });

  sleep(randomIntBetween(1, 2));

  // Send messages
  group('Send Messages', function() {
    const numMessages = randomIntBetween(1, 5);

    for (let i = 0; i < numMessages; i++) {
      const messagePayload = JSON.stringify({
        recipientId: partnerUser.userId,
        content: getRandomMessage(),
        type: 'text',
      });

      const sendStartTime = Date.now();

      const sendRes = http.post(
        `${BASE_URL}/api/v1/messaging/messages`,
        messagePayload,
        { headers: getAuthHeaders(authToken), tags: { name: 'SendMessage' } }
      );

      const sendDuration = Date.now() - sendStartTime;

      const sendSuccess = check(sendRes, {
        'send message status is 201': (r) => r.status === 201,
        'send message returns message id': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data && body.data.messageId;
          } catch {
            return false;
          }
        },
      });

      if (sendSuccess) {
        messagesSent.add(1);
        messageDeliveryTime.add(sendDuration);
      } else {
        errorRate.add(1);
        console.log(`Send message failed: ${sendRes.status} - ${sendRes.body}`);
      }

      // Simulate typing between messages
      if (i < numMessages - 1) {
        sleep(randomIntBetween(2, 5)); // Typing time
      }
    }
  });

  sleep(randomIntBetween(1, 3));

  // Send typing indicator
  group('Typing Indicator', function() {
    const typingPayload = JSON.stringify({
      conversationId: `${userId}-${partnerUser.userId}`,
      isTyping: true,
    });

    const typingRes = http.post(
      `${BASE_URL}/api/v1/messaging/typing`,
      typingPayload,
      { headers: getAuthHeaders(authToken), tags: { name: 'TypingIndicator' } }
    );

    const typingSuccess = check(typingRes, {
      'typing indicator status is 200': (r) => r.status === 200 || r.status === 204,
    });

    if (typingSuccess) {
      typingIndicatorsSent.add(1);
    }

    sleep(randomIntBetween(1, 3));

    // Stop typing
    const stopTypingPayload = JSON.stringify({
      conversationId: `${userId}-${partnerUser.userId}`,
      isTyping: false,
    });

    http.post(
      `${BASE_URL}/api/v1/messaging/typing`,
      stopTypingPayload,
      { headers: getAuthHeaders(authToken), tags: { name: 'TypingIndicatorStop' } }
    );
  });

  sleep(randomIntBetween(1, 2));

  // Get messages in conversation
  group('Get Messages', function() {
    const getMessagesRes = http.get(
      `${BASE_URL}/api/v1/messaging/conversations/${partnerUser.userId}/messages?limit=50`,
      { headers: getAuthHeaders(authToken), tags: { name: 'GetMessages' } }
    );

    const getSuccess = check(getMessagesRes, {
      'get messages status is 200': (r) => r.status === 200,
      'get messages returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && Array.isArray(body.data.messages);
        } catch {
          return false;
        }
      },
    });

    if (getSuccess) {
      try {
        const body = JSON.parse(getMessagesRes.body);
        messagesReceived.add(body.data.messages.length);

        // Mark messages as read
        const unreadMessages = body.data.messages.filter(m => !m.readAt && m.senderId !== userId);

        if (unreadMessages.length > 0) {
          const readReceiptPayload = JSON.stringify({
            messageIds: unreadMessages.slice(0, 10).map(m => m.id),
          });

          const readRes = http.post(
            `${BASE_URL}/api/v1/messaging/read-receipts`,
            readReceiptPayload,
            { headers: getAuthHeaders(authToken), tags: { name: 'ReadReceipt' } }
          );

          if (readRes.status === 200 || readRes.status === 204) {
            readReceiptsSent.add(unreadMessages.slice(0, 10).length);
          }
        }
      } catch (e) {
        console.log(`Error processing messages: ${e}`);
      }
    } else {
      errorRate.add(1);
    }
  });

  sleep(randomIntBetween(1, 2));

  // Occasionally send media message (10% of time)
  if (Math.random() < 0.1) {
    group('Send Media Message', function() {
      // First, get a presigned URL for upload
      const uploadUrlRes = http.post(
        `${BASE_URL}/api/v1/messaging/upload-url`,
        JSON.stringify({
          fileName: `test-image-${randomString(8)}.jpg`,
          contentType: 'image/jpeg',
          fileSize: randomIntBetween(50000, 500000),
        }),
        { headers: getAuthHeaders(authToken), tags: { name: 'GetUploadUrl' } }
      );

      if (uploadUrlRes.status === 200) {
        try {
          const body = JSON.parse(uploadUrlRes.body);

          // Simulate media message (without actual file upload in load test)
          const mediaMessagePayload = JSON.stringify({
            recipientId: partnerUser.userId,
            content: 'Check out this photo!',
            type: 'image',
            mediaUrl: body.data.mediaUrl || 'https://example.com/test.jpg',
            mediaType: 'image/jpeg',
          });

          const mediaRes = http.post(
            `${BASE_URL}/api/v1/messaging/messages`,
            mediaMessagePayload,
            { headers: getAuthHeaders(authToken), tags: { name: 'SendMediaMessage' } }
          );

          if (mediaRes.status === 201) {
            mediaMessagesSent.add(1);
          }
        } catch (e) {
          console.log(`Error sending media message: ${e}`);
        }
      }
    });
  }

  sleep(randomIntBetween(2, 5));

  // Poll for new messages (simulating real-time)
  group('Poll for Updates', function() {
    const pollRes = http.get(
      `${BASE_URL}/api/v1/messaging/updates?since=${Date.now() - 30000}`,
      { headers: getAuthHeaders(authToken), tags: { name: 'PollUpdates' } }
    );

    check(pollRes, {
      'poll updates status is 200': (r) => r.status === 200,
    });
  });

  // Final sleep between iterations
  sleep(randomIntBetween(3, 8));
}

// WebSocket test scenario (separate)
export function websocketTest(data) {
  if (!data.healthy || data.testUsers.length < 1) {
    sleep(5);
    return;
  }

  const user = data.testUsers[randomIntBetween(0, data.testUsers.length - 1)];
  const wsUrl = `${WS_URL}/messaging?token=${user.token}`;

  const startTime = Date.now();

  const res = ws.connect(wsUrl, {}, function(socket) {
    const connectionTime = Date.now() - startTime;
    wsConnectionTime.add(connectionTime);
    activeConnections.add(1);

    socket.on('open', function() {
      console.log('WebSocket connected');

      // Subscribe to updates
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'messages',
      }));
    });

    socket.on('message', function(message) {
      try {
        const msg = JSON.parse(message);
        if (msg.type === 'new_message') {
          messagesReceived.add(1);
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    socket.on('error', function(e) {
      console.log(`WebSocket error: ${e.error()}`);
      errorRate.add(1);
    });

    socket.on('close', function() {
      activeConnections.add(-1);
    });

    // Keep connection open for some time
    socket.setTimeout(function() {
      socket.close();
    }, randomIntBetween(30000, 60000));
  });

  check(res, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
}

// Teardown function
export function teardown(data) {
  console.log('Messaging load test completed');
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
}
