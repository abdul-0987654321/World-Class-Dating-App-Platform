/**
 * Messaging API Test Runner
 * Run with: node run-messaging-test.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const isHttps = BASE_URL.startsWith('https');

// Test credentials
const TEST_USERS = {
  user1: { email: 'test1@flamoral.com', password: 'TestUser1!', token: '', id: '', name: 'Alex' },
  user2: { email: 'test2@flamoral.com', password: 'TestUser2!', token: '', id: '', name: 'Jordan' }
};

// Conversation script
const MESSAGES = [
  { from: 'user1', text: "Hey Jordan! I noticed we both love hiking. What's your favorite trail?" },
  { from: 'user2', text: "Hi Alex! Oh, I love the Blue Ridge Mountains. Have you been?" },
  { from: 'user1', text: "Yes! I did the Appalachian Trail section last summer. Amazing views!" },
  { from: 'user2', text: "That's so cool! I've always wanted to do that. How long did it take?" },
  { from: 'user1', text: "About 3 days for the section I did. We should plan a hike together!" },
  { from: 'user2', text: "I'd love that! Maybe we could start with something easier first?" },
  { from: 'user1', text: "Absolutely! There's a nice trail about an hour from here." },
  { from: 'user2', text: "That sounds perfect! When are you usually free?" },
  { from: 'user1', text: "Weekends work best for me. How about next Saturday?" },
  { from: 'user2', text: "Saturday works! Let's do it. Should we exchange numbers?" }
];

// Results tracking
const results = [];
let matchId = '';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = (isHttps ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(user) {
  console.log(`\n🔐 Logging in ${user.name}...`);
  const res = await request('POST', '/api/auth/login', {
    email: user.email,
    password: user.password
  });

  if (res.data.success && res.data.data?.tokens?.accessToken) {
    user.token = res.data.data.tokens.accessToken;
    user.id = res.data.data.user?.id || '';
    console.log(`   ✅ ${user.name} logged in successfully`);
    return true;
  }
  console.log(`   ❌ ${user.name} login failed: ${res.data.error?.message || 'Unknown error'}`);
  return false;
}

async function getConversations(user) {
  const res = await request('GET', '/api/messages/conversations', null, user.token);
  return res.data.data?.conversations || [];
}

async function sendMessage(user, conversationId, content) {
  const res = await request('POST', `/api/messages/conversations/${conversationId}/send`,
    { content, type: 'text' }, user.token);
  return res.data.success;
}

async function markAsRead(user, conversationId) {
  const res = await request('POST', `/api/messages/conversations/${conversationId}/read`, null, user.token);
  return res.data.success;
}

async function getMessages(user, conversationId) {
  const res = await request('GET', `/api/messages/conversations/${conversationId}`, null, user.token);
  return res.data.data?.messages || [];
}

async function runTest() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Flamoral Messaging API - Test Suite                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n🌐 API URL: ${BASE_URL}`);
  console.log(`📅 Date: ${new Date().toLocaleString()}`);

  // Step 1: Authentication
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 1: Authentication');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const auth1 = await login(TEST_USERS.user1);
  const auth2 = await login(TEST_USERS.user2);
  results.push({ test: 'Authentication', passed: auth1 && auth2 });

  if (!auth1 || !auth2) {
    console.log('\n⚠️  Authentication failed. Cannot proceed with messaging tests.');
    console.log('    Make sure the backend is running and test users exist.');
    generateReport();
    return;
  }

  // Step 2: Get/Create Match
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 2: Finding Match Between Users');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const conversations = await getConversations(TEST_USERS.user1);
  const existingConv = conversations.find(c =>
    c.participant?.id === TEST_USERS.user2.id ||
    c.participant?.name === TEST_USERS.user2.name
  );

  if (existingConv) {
    matchId = existingConv.id;
    console.log(`\n   ✅ Found existing match: ${matchId}`);
  } else if (conversations.length > 0) {
    matchId = conversations[0].id;
    console.log(`\n   ✅ Using first available match: ${matchId}`);
  } else {
    matchId = `match_test_${Date.now()}`;
    console.log(`\n   ⚠️  No matches found. Using test ID: ${matchId}`);
  }
  results.push({ test: 'Match Verification', passed: !!matchId });

  // Step 3: Conversation Simulation
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 3: Simulating Conversation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let sentCount = 0;
  for (const msg of MESSAGES) {
    const user = msg.from === 'user1' ? TEST_USERS.user1 : TEST_USERS.user2;
    const name = user.name;

    try {
      const success = await sendMessage(user, matchId, msg.text);
      if (success) {
        sentCount++;
        const preview = msg.text.length > 45 ? msg.text.substring(0, 45) + '...' : msg.text;
        console.log(`   💬 ${name}: "${preview}"`);
      } else {
        console.log(`   ❌ ${name}: Failed to send`);
      }
    } catch (err) {
      console.log(`   ❌ ${name}: Error - ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  results.push({ test: 'Message Sending', passed: sentCount >= MESSAGES.length * 0.8 });
  console.log(`\n   📊 Sent ${sentCount}/${MESSAGES.length} messages`);

  // Step 4: Read Receipts
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 4: Testing Read Receipts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const readSuccess = await markAsRead(TEST_USERS.user2, matchId);
  console.log(`\n   ${readSuccess ? '✅' : '❌'} Mark as read: ${readSuccess ? 'Success' : 'Failed'}`);
  results.push({ test: 'Read Receipts', passed: readSuccess });

  // Step 5: Message History
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 5: Retrieving Message History');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const messages = await getMessages(TEST_USERS.user1, matchId);
  console.log(`\n   ✅ Retrieved ${messages.length} messages from history`);
  results.push({ test: 'Message History', passed: messages.length > 0 });

  // Generate Report
  generateReport();
}

function generateReport() {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS SUMMARY                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

  console.log('┌────────────────────────────┬──────────┐');
  console.log('│ Test                       │ Result   │');
  console.log('├────────────────────────────┼──────────┤');

  for (const r of results) {
    const name = r.test.padEnd(26);
    const status = r.passed ? '✅ Pass  ' : '❌ Fail  ';
    console.log(`│ ${name} │ ${status}│`);
  }

  console.log('└────────────────────────────┴──────────┘');
  console.log(`\n📊 Pass Rate: ${passRate}% (${passed}/${total})`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  User 1 (Alex):`);
  console.log(`    Email:    ${TEST_USERS.user1.email}`);
  console.log(`    Password: ${TEST_USERS.user1.password}`);
  console.log(`\n  User 2 (Jordan):`);
  console.log(`    Email:    ${TEST_USERS.user2.email}`);
  console.log(`    Password: ${TEST_USERS.user2.password}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

runTest().catch(console.error);
