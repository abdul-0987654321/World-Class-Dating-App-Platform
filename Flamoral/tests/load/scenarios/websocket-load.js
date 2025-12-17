import { check, sleep } from 'k6';
import ws from 'k6/ws';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomUser } from '../k6-config.js';

/**
 * Load Test: WebSocket Connections (Messaging)
 * Tests concurrent WebSocket connections, message delivery
 */

export const options = {
  scenarios: {
    websocket_connections: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1000 },
        { duration: '3m', target: 5000 },
        { duration: '5m', target: 10000 },
        { duration: '5m', target: 10000 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    ws_connecting: ['p(95)<1000'],
    ws_session_duration: ['p(95)<300000'],
    message_delivery_rate: ['rate>0.99'],
    ws_msgs_sent: ['count>10000'],
    ws_msgs_received: ['count>10000'],
  },
};

// Custom metrics
const messageDeliveryRate = new Rate('message_delivery_rate');
const messagesDelivered = new Counter('messages_delivered');
const messageLatency = new Trend('message_latency');
const connectionFailures = new Counter('connection_failures');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3004';

export function setup() {
  console.log('Starting WebSocket load test...');

  // Create test users
  const users = [];
  for (let i = 0; i < 100; i++) {
    const user = randomUser();
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify(user),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (res.status === 201) {
      const body = JSON.parse(res.body);
      users.push({
        id: body.user.id,
        token: body.accessToken,
      });
    }
  }

  console.log(`Created ${users.length} test users for WebSocket testing`);
  return { users };
}

export default function (data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];

  if (!user || !user.token) {
    return;
  }

  const url = `${WS_URL}?token=${user.token}`;
  let messagesSent = 0;
  let messagesReceived = 0;

  const res = ws.connect(url, { tags: { name: 'websocket_connection' } }, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');

      // Send ping to verify connection
      socket.send(JSON.stringify({ type: 'ping' }));

      // Join rooms (conversations)
      socket.send(
        JSON.stringify({
          type: 'join',
          matchId: 'test-match-id',
        })
      );

      // Simulate typing indicator
      socket.setInterval(() => {
        socket.send(
          JSON.stringify({
            type: 'typing:start',
            matchId: 'test-match-id',
          })
        );
      }, 3000);

      // Send messages periodically
      socket.setInterval(() => {
        const sendTime = Date.now();
        const messageId = `msg_${sendTime}_${messagesSent}`;

        socket.send(
          JSON.stringify({
            type: 'message:send',
            messageId: messageId,
            matchId: 'test-match-id',
            content: `Test message ${messagesSent}`,
            timestamp: sendTime,
          })
        );

        messagesSent++;
      }, 5000);
    });

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messagesReceived++;

        // Check message types
        if (message.type === 'message:new') {
          const latency = Date.now() - (message.timestamp || Date.now());
          messageLatency.add(latency);
          messagesDelivered.add(1);
          messageDeliveryRate.add(1);
        } else if (message.type === 'message:delivered') {
          messageDeliveryRate.add(1);
        } else if (message.type === 'pong') {
          // Pong received
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    });

    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
      connectionFailures.add(1);
      messageDeliveryRate.add(0);
    });

    socket.on('close', () => {
      console.log('WebSocket closed');
    });

    // Keep connection alive for random duration
    socket.setTimeout(() => {
      console.log(`Closing connection. Sent: ${messagesSent}, Received: ${messagesReceived}`);
      socket.close();
    }, Math.random() * 60000 + 30000); // 30-90 seconds
  });

  check(res, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });

  if (!res || res.status !== 101) {
    connectionFailures.add(1);
  }

  sleep(1);
}

export function teardown(data) {
  console.log('WebSocket load test completed');
}
