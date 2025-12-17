import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { authenticate } from '../utils/auth.js';
import { generateMessage } from '../utils/data-generator.js';
import { WS_URL, parseEnvConfig } from '../utils/config.js';

/**
 * WEBSOCKET CONNECTION TEST
 *
 * Purpose: Test real-time messaging performance via WebSocket
 * Focus:
 * - Connection establishment time
 * - Message latency
 * - Connection stability
 * - Concurrent connection handling
 * - Message throughput
 */

// Custom WebSocket metrics
const wsConnections = new Counter('ws_connections');
const wsConnectionTime = new Trend('ws_connection_time', true);
const wsMessageLatency = new Trend('ws_message_latency', true);
const wsErrors = new Rate('ws_errors');
const wsMessagesReceived = new Counter('ws_messages_received');
const wsMessagesSent = new Counter('ws_messages_sent');

export const options = {
  scenarios: {
    websocket_connections: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },    // Ramp up to 50 connections
        { duration: '3m', target: 200 },   // Ramp up to 200 connections
        { duration: '5m', target: 500 },   // Ramp up to 500 connections
        { duration: '5m', target: 500 },   // Maintain 500 connections
        { duration: '2m', target: 100 },   // Ramp down
        { duration: '1m', target: 0 },     // Complete ramp down
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    'ws_connection_time': ['p(95)<500', 'p(99)<1000'],
    'ws_message_latency': ['p(95)<50', 'p(99)<100'],
    'ws_errors': ['rate<0.05'],
    'http_req_duration': ['p(95)<200'],
  },

  summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)'],
};

const config = parseEnvConfig();

export function setup() {
  console.log('=== WebSocket Performance Test Setup ===');
  console.log(`WebSocket URL: ${WS_URL}`);
  console.log('Testing real-time messaging performance...');

  // Authenticate to get token for WebSocket connection
  const token = authenticate(config.testEmail, config.testPassword);

  if (!token) {
    console.error('Setup failed: Could not authenticate');
    return null;
  }

  return { token };
}

export default function(data) {
  if (!data || !data.token) {
    wsErrors.add(1);
    return;
  }

  const url = `${WS_URL}/ws?token=${data.token}`;
  const params = { tags: { test_type: 'websocket' } };

  const connectionStart = Date.now();

  const res = ws.connect(url, params, function(socket) {
    const connectionTime = Date.now() - connectionStart;
    wsConnectionTime.add(connectionTime);
    wsConnections.add(1);

    // Connection established
    socket.on('open', () => {
      console.log(`[VU ${__VU}] WebSocket connected in ${connectionTime}ms`);

      // Send join room message
      socket.send(JSON.stringify({
        type: 'join_room',
        roomId: `room-${__VU}`,
      }));

      // Send periodic messages
      const messageInterval = setInterval(() => {
        const messageSentTime = Date.now();

        socket.send(JSON.stringify({
          type: 'message',
          content: generateMessage(),
          timestamp: messageSentTime,
        }));

        wsMessagesSent.add(1);
      }, 5000); // Every 5 seconds

      // Send typing indicators (simulate realistic behavior)
      const typingInterval = setInterval(() => {
        socket.send(JSON.stringify({
          type: 'typing',
          isTyping: Math.random() > 0.5,
        }));
      }, 3000); // Every 3 seconds

      // Clean up intervals after 30 seconds
      socket.setTimeout(() => {
        clearInterval(messageInterval);
        clearInterval(typingInterval);
        socket.close();
      }, 30000);
    });

    // Handle incoming messages
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        wsMessagesReceived.add(1);

        // Calculate message latency if timestamp is present
        if (data.timestamp) {
          const latency = Date.now() - data.timestamp;
          wsMessageLatency.add(latency);
        }

        // Check message structure
        check(data, {
          'message has type': (msg) => msg.type !== undefined,
          'message has content': (msg) => msg.content !== undefined || msg.type === 'typing',
        }) || wsErrors.add(1);

      } catch (e) {
        console.error(`[VU ${__VU}] Error parsing message:`, e.message);
        wsErrors.add(1);
      }
    });

    // Handle errors
    socket.on('error', (e) => {
      if (e.error() !== 'websocket: close sent') {
        console.error(`[VU ${__VU}] WebSocket error:`, e.error());
        wsErrors.add(1);
      }
    });

    // Handle close
    socket.on('close', () => {
      console.log(`[VU ${__VU}] WebSocket connection closed`);
    });

    // Keep connection alive for test duration
    socket.setInterval(() => {
      socket.ping();
    }, 10000); // Ping every 10 seconds
  });

  // Check connection attempt
  check(res, {
    'websocket connected': (r) => r && r.status === 101,
  }) || wsErrors.add(1);

  // Wait before next iteration
  sleep(Math.random() * 5 + 5); // 5-10 seconds
}

export function teardown(data) {
  console.log('=== WebSocket Test Completed ===');
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  const totalConnections = data.metrics.ws_connections?.values?.count || 0;
  const avgConnectionTime = data.metrics.ws_connection_time?.values?.avg || 0;
  const p95ConnectionTime = data.metrics.ws_connection_time?.values?.['p(95)'] || 0;
  const avgMessageLatency = data.metrics.ws_message_latency?.values?.avg || 0;
  const p95MessageLatency = data.metrics.ws_message_latency?.values?.['p(95)'] || 0;
  const p99MessageLatency = data.metrics.ws_message_latency?.values?.['p(99)'] || 0;
  const errorRate = data.metrics.ws_errors?.values?.rate || 0;
  const messagesSent = data.metrics.ws_messages_sent?.values?.count || 0;
  const messagesReceived = data.metrics.ws_messages_received?.values?.count || 0;

  const connectionSuccess = p95ConnectionTime < 500 && errorRate < 0.05;
  const messagePerformance = p95MessageLatency < 50;

  const summary = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                  FLAMORAL WEBSOCKET PERFORMANCE TEST                      ║
║                     Real-Time Messaging Analysis                          ║
╚═══════════════════════════════════════════════════════════════════════════╝

🔌 WEBSOCKET CONNECTION METRICS
─────────────────────────────────────────────────────────────────────────────
Total Connections:       ${totalConnections.toLocaleString()}
Avg Connection Time:     ${avgConnectionTime.toFixed(2)}ms
P95 Connection Time:     ${p95ConnectionTime.toFixed(2)}ms  ${p95ConnectionTime < 500 ? '✅' : '⚠️'}
P99 Connection Time:     ${(data.metrics.ws_connection_time?.values?.['p(99)'] || 0).toFixed(2)}ms

Connection Success:      ${connectionSuccess ? '✅ EXCELLENT' : '⚠️  NEEDS IMPROVEMENT'}

💬 MESSAGE PERFORMANCE
─────────────────────────────────────────────────────────────────────────────
Messages Sent:           ${messagesSent.toLocaleString()}
Messages Received:       ${messagesReceived.toLocaleString()}
Message Delivery Rate:   ${messagesSent > 0 ? ((messagesReceived / messagesSent) * 100).toFixed(2) : 0}%

Avg Message Latency:     ${avgMessageLatency.toFixed(2)}ms
Median Latency:          ${(data.metrics.ws_message_latency?.values?.med || 0).toFixed(2)}ms
P95 Message Latency:     ${p95MessageLatency.toFixed(2)}ms  ${p95MessageLatency < 50 ? '✅' : '⚠️'}
P99 Message Latency:     ${p99MessageLatency.toFixed(2)}ms  ${p99MessageLatency < 100 ? '✅' : '⚠️'}

Message Performance:     ${messagePerformance ? '✅ EXCELLENT' : '⚠️  NEEDS OPTIMIZATION'}

⚠️  ERROR METRICS
─────────────────────────────────────────────────────────────────────────────
Error Rate:              ${(errorRate * 100).toFixed(2)}%  ${errorRate < 0.05 ? '✅' : '⚠️'}

📊 REAL-TIME CAPABILITY ASSESSMENT
─────────────────────────────────────────────────────────────────────────────
${p95ConnectionTime < 500 ? '✅' : '❌'} Connection establishment: ${p95ConnectionTime < 500 ? 'Fast' : 'Slow'}
${p95MessageLatency < 50 ? '✅' : '❌'} Message latency: ${p95MessageLatency < 50 ? 'Real-time capable' : 'Delayed'}
${errorRate < 0.05 ? '✅' : '❌'} Connection stability: ${errorRate < 0.05 ? 'Stable' : 'Unstable'}
${messagesReceived >= messagesSent * 0.95 ? '✅' : '❌'} Message reliability: ${messagesReceived >= messagesSent * 0.95 ? 'High' : 'Low'}

💡 RECOMMENDATIONS
─────────────────────────────────────────────────────────────────────────────
${!connectionSuccess ? '• Optimize WebSocket handshake process\n• Review load balancer WebSocket configuration\n' : ''}${!messagePerformance ? '• Consider Redis Pub/Sub for message routing\n• Implement connection pooling\n' : ''}${errorRate > 0.03 ? '• Investigate connection drops and timeouts\n• Review WebSocket keep-alive settings\n' : ''}${connectionSuccess && messagePerformance ? '• WebSocket performance is excellent\n• System is well-suited for real-time features\n' : ''}
═══════════════════════════════════════════════════════════════════════════
`;

  console.log(summary);

  return {
    'stdout': summary,
    [`results/websocket-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/websocket-test-${timestamp}.html`]: htmlWebSocketReport(data, connectionSuccess, messagePerformance),
  };
}

function htmlWebSocketReport(data, connectionSuccess, messagePerformance) {
  const totalConnections = data.metrics.ws_connections?.values?.count || 0;
  const p95ConnectionTime = data.metrics.ws_connection_time?.values?.['p(95)'] || 0;
  const p95MessageLatency = data.metrics.ws_message_latency?.values?.['p(95)'] || 0;
  const errorRate = data.metrics.ws_errors?.values?.rate || 0;
  const messagesSent = data.metrics.ws_messages_sent?.values?.count || 0;
  const messagesReceived = data.metrics.ws_messages_received?.values?.count || 0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WebSocket Performance - Flamoral</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
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
    .status-badge {
      display: inline-block;
      padding: 15px 30px;
      border-radius: 25px;
      font-weight: bold;
      font-size: 1.2em;
      margin-top: 15px;
      background: ${connectionSuccess && messagePerformance ? '#10b981' : '#f59e0b'};
      color: white;
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
      border-top: 5px solid #ec4899;
    }
    .metric-value {
      font-size: 2.5em;
      font-weight: bold;
      color: #ec4899;
      margin: 15px 0;
    }
    .metric-label {
      color: #666;
      font-size: 0.95em;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔌 WebSocket Performance Test</h1>
      <p style="font-size: 1.2em; margin-top: 10px;">Real-Time Messaging Analysis</p>
      <div class="status-badge">
        ${connectionSuccess && messagePerformance ? '✅ REAL-TIME CAPABLE' : '⚠️  OPTIMIZATION NEEDED'}
      </div>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Total Connections</div>
        <div class="metric-value">${totalConnections.toLocaleString()}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P95 Connection Time</div>
        <div class="metric-value">${p95ConnectionTime.toFixed(0)}ms</div>
        <div style="color: ${p95ConnectionTime < 500 ? '#10b981' : '#f59e0b'};">
          ${p95ConnectionTime < 500 ? '✅ Fast' : '⚠️  Slow'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P95 Message Latency</div>
        <div class="metric-value">${p95MessageLatency.toFixed(0)}ms</div>
        <div style="color: ${p95MessageLatency < 50 ? '#10b981' : '#f59e0b'};">
          ${p95MessageLatency < 50 ? '✅ Excellent' : '⚠️  High'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Message Delivery</div>
        <div class="metric-value">${messagesSent > 0 ? ((messagesReceived / messagesSent) * 100).toFixed(1) : 0}%</div>
        <div style="color: #666; font-size: 0.85em;">${messagesSent.toLocaleString()} sent / ${messagesReceived.toLocaleString()} received</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
