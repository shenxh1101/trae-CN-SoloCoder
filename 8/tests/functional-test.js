const { io } = require('socket.io-client');
const http = require('http');
const assert = require('assert');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

console.log('=== Realtime Chat Functional Test ===');
console.log(`Server: ${SERVER_URL}\n`);

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  testResults.total++;
  return async () => {
    try {
      await fn();
      testResults.passed++;
      testResults.tests.push({ name, status: 'PASSED' });
      console.log(`✓ ${name}`);
      return true;
    } catch (err) {
      testResults.failed++;
      testResults.tests.push({ name, status: 'FAILED', error: err.message });
      console.log(`✗ ${name}`);
      console.log(`  Error: ${err.message}`);
      return false;
    }
  };
}

async function httpRequest(options, body = null, parseJson = true) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = parseJson ? JSON.parse(data) : data;
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function getOptions(path, method = 'GET', token = null) {
  const url = new URL(`${SERVER_URL}${path}`);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  return options;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let testUser1Token = null;
let testUser2Token = null;
let adminToken = null;
let testRoomId = null;
let testMessageId = null;

const tests = [
  test('Health check endpoint', async () => {
    const res = await httpRequest(getOptions('/api/health'));
    assert.strictEqual(res.statusCode, 200, 'Health check should return 200');
    assert.strictEqual(res.data.status, 'ok', 'Status should be ok');
  }),

  test('Register test user 1', async () => {
    const res = await httpRequest(
      getOptions('/api/auth/register', 'POST'),
      { username: 'testuser1', password: 'password123', nickname: 'Test User 1' }
    );
    assert.ok([201, 400].includes(res.statusCode), 'Register should return 201 or 400');
    if (res.statusCode === 201) {
      assert.ok(res.data.token, 'Response should include token');
      testUser1Token = res.data.token;
    }
  }),

  test('Register test user 2', async () => {
    const res = await httpRequest(
      getOptions('/api/auth/register', 'POST'),
      { username: 'testuser2', password: 'password123', nickname: 'Test User 2' }
    );
    assert.ok([201, 400].includes(res.statusCode), 'Register should return 201 or 400');
    if (res.statusCode === 201) {
      assert.ok(res.data.token, 'Response should include token');
      testUser2Token = res.data.token;
    }
  }),

  test('Login test user 1', async () => {
    const res = await httpRequest(
      getOptions('/api/auth/login', 'POST'),
      { username: 'testuser1', password: 'password123' }
    );
    assert.strictEqual(res.statusCode, 200, 'Login should return 200');
    assert.ok(res.data.token, 'Response should include token');
    testUser1Token = res.data.token;
  }),

  test('Login test user 2', async () => {
    const res = await httpRequest(
      getOptions('/api/auth/login', 'POST'),
      { username: 'testuser2', password: 'password123' }
    );
    assert.strictEqual(res.statusCode, 200, 'Login should return 200');
    assert.ok(res.data.token, 'Response should include token');
    testUser2Token = res.data.token;
  }),

  test('Admin login', async () => {
    const res = await httpRequest(
      getOptions('/api/auth/admin/login', 'POST'),
      { username: 'admin', password: 'admin123' }
    );
    assert.strictEqual(res.statusCode, 200, 'Admin login should return 200');
    assert.ok(res.data.token, 'Response should include token');
    adminToken = res.data.token;
  }),

  test('Get current user info', async () => {
    const res = await httpRequest(getOptions('/api/auth/me', 'GET', testUser1Token));
    assert.strictEqual(res.statusCode, 200, 'Get user should return 200');
    assert.strictEqual(res.data.user.username, 'testuser1', 'Username should match');
  }),

  test('Create room', async () => {
    const res = await httpRequest(
      getOptions('/api/rooms', 'POST', testUser1Token),
      { name: `Functional Test Room ${Date.now()}`, description: 'Test room for functional tests' }
    );
    assert.strictEqual(res.statusCode, 201, 'Create room should return 201');
    assert.ok(res.data.room._id, 'Room should have _id');
    testRoomId = res.data.room._id;
    console.log(`  Created room: ${testRoomId}`);
  }),

  test('Get rooms list', async () => {
    const res = await httpRequest(getOptions('/api/rooms?page=1&limit=10', 'GET', testUser1Token));
    assert.strictEqual(res.statusCode, 200, 'Get rooms should return 200');
    assert.ok(Array.isArray(res.data.rooms), 'Rooms should be an array');
  }),

  test('Socket.io connection for user 1', async () => {
    return new Promise((resolve, reject) => {
      const socket = io(SERVER_URL, {
        auth: { token: testUser1Token },
        transports: ['websocket'],
        reconnection: false
      });
      
      socket.on('connected', (data) => {
        assert.ok(data.user, 'Connected event should include user');
        assert.strictEqual(data.user.username, 'testuser1', 'Username should match');
        socket.disconnect();
        resolve();
      });
      
      socket.on('connect_error', (err) => {
        reject(new Error(`Connection failed: ${err.message}`));
      });
      
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
    });
  }),

  test('Socket.io join room', async () => {
    return new Promise((resolve, reject) => {
      const socket = io(SERVER_URL, {
        auth: { token: testUser1Token },
        transports: ['websocket'],
        reconnection: false
      });
      
      socket.on('connected', () => {
        socket.emit('joinRoom', { roomId: testRoomId });
      });
      
      socket.on('joinedRoom', (data) => {
        assert.strictEqual(data.roomId, testRoomId, 'Room ID should match');
        assert.ok(Array.isArray(data.onlineUsers), 'Online users should be array');
        socket.disconnect();
        resolve();
      });
      
      socket.on('error', (err) => {
        reject(new Error(err.message || 'Join room failed'));
      });
      
      setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 10000);
    });
  }),

  test('Send message and @mention user 2', async () => {
    return new Promise((resolve, reject) => {
      const socket1 = io(SERVER_URL, {
        auth: { token: testUser1Token },
        transports: ['websocket'],
        reconnection: false
      });
      
      const socket2 = io(SERVER_URL, {
        auth: { token: testUser2Token },
        transports: ['websocket'],
        reconnection: false
      });
      
      let socket2Joined = false;
      let mentionReceived = false;
      
      socket2.on('connected', () => {
        socket2.emit('joinRoom', { roomId: testRoomId });
      });
      
      socket2.on('joinedRoom', () => {
        socket2Joined = true;
      });
      
      socket2.on('mention', (data) => {
        assert.ok(data.message, 'Mention should include message');
        assert.ok(data.message.content.includes('@testuser2'), 'Message should include @mention');
        assert.strictEqual(data.mentionedBy.username, 'testuser1', 'Mentioned by should be user1');
        mentionReceived = true;
      });
      
      socket1.on('connected', () => {
        socket1.emit('joinRoom', { roomId: testRoomId });
      });
      
      socket1.on('joinedRoom', async () => {
        await delay(1000);
        if (socket2Joined) {
          socket1.emit('sendMessage', {
            roomId: testRoomId,
            content: 'Hello @testuser2! This is a test message with mention.'
          });
        }
      });
      
      socket1.on('messageSent', async (data) => {
        testMessageId = data.messageId;
        await delay(2000);
        assert.ok(mentionReceived, 'Mention should be received by user 2');
        socket1.disconnect();
        socket2.disconnect();
        resolve();
      });
      
      socket1.on('error', (err) => {
        reject(new Error(err.message || 'Send message failed'));
      });
      
      setTimeout(() => {
        socket1.disconnect();
        socket2.disconnect();
        reject(new Error('Message/mention test timeout'));
      }, 15000);
    });
  }),

  test('Message persistence - get room messages', async () => {
    await delay(1000);
    const res = await httpRequest(
      getOptions(`/api/rooms/${testRoomId}/messages?page=1`, 'GET', testUser1Token)
    );
    assert.strictEqual(res.statusCode, 200, 'Get messages should return 200');
    assert.ok(Array.isArray(res.data.messages), 'Messages should be an array');
    assert.ok(res.data.messages.length > 0, 'Should have at least one message');
    assert.ok(res.data.pagination, 'Should have pagination info');
    assert.strictEqual(res.data.pagination.pageSize, 20, 'Page size should be 20');
    
    const hasMentionMessage = res.data.messages.some(
      m => m.content && m.content.includes('@testuser2')
    );
    assert.ok(hasMentionMessage, 'Mention message should be persisted');
  }),

  test('Get online users in room', async () => {
    const res = await httpRequest(
      getOptions(`/api/rooms/${testRoomId}/users`, 'GET', testUser1Token)
    );
    assert.strictEqual(res.statusCode, 200, 'Get online users should return 200');
    assert.ok(Array.isArray(res.data.users), 'Users should be an array');
    assert.ok(typeof res.data.count === 'number', 'Count should be a number');
  }),

  test('Admin mute user 2 (temporary)', async () => {
    const res = await httpRequest(
      getOptions('/api/admin/mute', 'POST', adminToken),
      {
        roomId: testRoomId,
        userId: JSON.parse(Buffer.from(testUser2Token.split('.')[1], 'base64').toString()).userId,
        type: 'temporary',
        duration: 5,
        reason: 'Test temporary mute'
      }
    );
    assert.strictEqual(res.statusCode, 200, 'Mute should return 200');
    assert.ok(res.data.mute, 'Response should include mute record');
    assert.strictEqual(res.data.mute.type, 'temporary', 'Mute type should be temporary');
    assert.strictEqual(res.data.mute.duration, 5, 'Duration should be 5 minutes');
  }),

  test('Muted user cannot send messages', async () => {
    return new Promise((resolve, reject) => {
      const socket = io(SERVER_URL, {
        auth: { token: testUser2Token },
        transports: ['websocket'],
        reconnection: false
      });
      
      socket.on('connected', () => {
        socket.emit('joinRoom', { roomId: testRoomId });
      });
      
      socket.on('joinedRoom', async () => {
        await delay(500);
        socket.emit('sendMessage', {
          roomId: testRoomId,
          content: 'This message should be blocked'
        });
      });
      
      socket.on('error', (err) => {
        if (err.message && err.message.includes('muted')) {
          assert.ok(true, 'Muted user should receive error');
          socket.disconnect();
          resolve();
        } else {
          reject(new Error(`Unexpected error: ${err.message}`));
        }
      });
      
      socket.on('messageSent', () => {
        socket.disconnect();
        reject(new Error('Muted user should not be able to send messages'));
      });
      
      setTimeout(() => {
        socket.disconnect();
        reject(new Error('Mute test timeout'));
      }, 10000);
    });
  }),

  test('Admin unmute user 2', async () => {
    const userId = JSON.parse(Buffer.from(testUser2Token.split('.')[1], 'base64').toString()).userId;
    const res = await httpRequest(
      getOptions('/api/admin/unmute', 'POST', adminToken),
      { roomId: testRoomId, userId }
    );
    assert.strictEqual(res.statusCode, 200, 'Unmute should return 200');
    assert.ok(res.data.mute, 'Response should include mute record');
    assert.strictEqual(res.data.mute.isActive, false, 'Mute should be inactive');
  }),

  test('Unmuted user can send messages again', async () => {
    return new Promise((resolve, reject) => {
      const socket = io(SERVER_URL, {
        auth: { token: testUser2Token },
        transports: ['websocket'],
        reconnection: false
      });
      
      socket.on('connected', () => {
        socket.emit('joinRoom', { roomId: testRoomId });
      });
      
      socket.on('joinedRoom', async () => {
        await delay(500);
        socket.emit('sendMessage', {
          roomId: testRoomId,
          content: 'I am unmuted now!'
        });
      });
      
      socket.on('messageSent', () => {
        assert.ok(true, 'Unmuted user should be able to send messages');
        socket.disconnect();
        resolve();
      });
      
      socket.on('error', (err) => {
        socket.disconnect();
        reject(new Error(`Unmuted user should not receive error: ${err.message}`));
      });
      
      setTimeout(() => {
        socket.disconnect();
        reject(new Error('Unmute test timeout'));
      }, 10000);
    });
  }),

  test('Admin kick user from room', async () => {
    const userId = JSON.parse(Buffer.from(testUser2Token.split('.')[1], 'base64').toString()).userId;
    
    await new Promise((resolve, reject) => {
      const socket = io(SERVER_URL, {
        auth: { token: testUser2Token },
        transports: ['websocket'],
        reconnection: false
      });
      
      socket.on('connected', () => {
        socket.emit('joinRoom', { roomId: testRoomId });
      });
      
      socket.on('joinedRoom', async () => {
        await delay(500);
        socket.disconnect();
        resolve();
      });
      
      socket.on('error', (err) => {
        socket.disconnect();
        resolve();
      });
      
      setTimeout(() => {
        socket.disconnect();
        resolve();
      }, 5000);
    });
    
    await delay(500);
    
    const res = await httpRequest(
      getOptions('/api/admin/kick', 'POST', adminToken),
      { roomId: testRoomId, userId, reason: 'Test kick' }
    );
    assert.strictEqual(res.statusCode, 200, 'Kick should return 200');
    assert.strictEqual(res.data.message, 'User kicked successfully', 'Kick message should be correct');
  }),

  test('Pagination - get second page of messages', async () => {
    for (let i = 0; i < 25; i++) {
      await httpRequest(
        getOptions('/api/rooms', 'POST', testUser1Token),
        { name: `Msg Test Room ${i}`, description: 'Room for pagination test' }
      );
    }
    
    const res = await httpRequest(
      getOptions('/api/rooms?page=2&limit=10', 'GET', testUser1Token)
    );
    assert.strictEqual(res.statusCode, 200, 'Get rooms should return 200');
    assert.ok(res.data.pagination, 'Should have pagination');
    assert.strictEqual(res.data.pagination.page, 2, 'Page should be 2');
    assert.strictEqual(res.data.pagination.limit, 10, 'Limit should be 10');
  }),

  test('Admin get mute list', async () => {
    const res = await httpRequest(
      getOptions('/api/admin/mutes?activeOnly=true', 'GET', adminToken)
    );
    assert.strictEqual(res.statusCode, 200, 'Get mutes should return 200');
    assert.ok(Array.isArray(res.data.mutes), 'Mutes should be an array');
  })
];

async function runTests() {
  console.log('Running functional tests...\n');
  
  let allPassed = true;
  
  try {
    const healthRes = await httpRequest(getOptions('/api/health'));
    if (healthRes.statusCode !== 200) {
      throw new Error(`Server is not running at ${SERVER_URL}. Start it with: npm run dev`);
    }
    console.log('✓ Server is running\n');
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
  
  for (const testFn of tests) {
    const passed = await testFn();
    if (!passed) allPassed = false;
    console.log();
  }
  
  console.log('\n=== Test Results ===');
  console.log(`Total: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\nFailed tests:');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
  }
  
  console.log('\n==================');
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
