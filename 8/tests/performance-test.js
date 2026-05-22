const { io } = require('socket.io-client');
const http = require('http');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '100');
const MESSAGES_PER_USER = parseInt(process.env.MESSAGES_PER_USER || '10');
const MESSAGE_INTERVAL = parseInt(process.env.MESSAGE_INTERVAL || '500');

console.log('=== Realtime Chat Performance Test ===');
console.log(`Server: ${SERVER_URL}`);
console.log(`Concurrent users: ${CONCURRENT_USERS}`);
console.log(`Messages per user: ${MESSAGES_PER_USER}`);
console.log(`Message interval: ${MESSAGE_INTERVAL}ms`);
console.log('====================================\n');

const stats = {
  startTime: null,
  endTime: null,
  connections: {
    success: 0,
    failed: 0,
    times: []
  },
  messages: {
    sent: 0,
    received: 0,
    failed: 0,
    latencies: []
  },
  joinRoom: {
    success: 0,
    failed: 0,
    times: []
  },
  errors: []
};

async function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
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

async function registerUser(username, password) {
  const url = new URL(`${SERVER_URL}/api/auth/register`);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await httpRequest(options, { username, password });
    if (response.statusCode === 201 || response.statusCode === 400) {
      return response.data;
    }
    throw new Error(`Register failed: ${response.statusCode}`);
  } catch (err) {
    return { error: err.message };
  }
}

async function loginUser(username, password) {
  const url = new URL(`${SERVER_URL}/api/auth/login`);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await httpRequest(options, { username, password });
    if (response.statusCode === 200) {
      return response.data;
    }
    throw new Error(`Login failed: ${response.statusCode}`);
  } catch (err) {
    return { error: err.message };
  }
}

async function createRoom(token, roomName) {
  const url = new URL(`${SERVER_URL}/api/rooms`);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  try {
    const response = await httpRequest(options, { name: roomName });
    if (response.statusCode === 201) {
      return response.data;
    }
    throw new Error(`Create room failed: ${response.statusCode}`);
  } catch (err) {
    return { error: err.message };
  }
}

function connectUser(token, userId) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: false
    });
    
    socket.on('connect', () => {
      const connectTime = Date.now() - startTime;
      stats.connections.success++;
      stats.connections.times.push(connectTime);
      console.log(`[User ${userId}] Connected in ${connectTime}ms`);
      resolve({ socket, success: true, connectTime });
    });
    
    socket.on('connect_error', (err) => {
      stats.connections.failed++;
      stats.errors.push(`User ${userId} connect error: ${err.message}`);
      console.error(`[User ${userId}] Connection failed: ${err.message}`);
      resolve({ socket: null, success: false, error: err.message });
    });
    
    socket.on('error', (err) => {
      stats.errors.push(`User ${userId} error: ${err.message}`);
      console.error(`[User ${userId}] Error: ${err.message}`);
    });
  });
}

function joinRoom(socket, roomId, userId) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    socket.emit('joinRoom', { roomId });
    
    socket.once('joinedRoom', (data) => {
      const joinTime = Date.now() - startTime;
      stats.joinRoom.success++;
      stats.joinRoom.times.push(joinTime);
      console.log(`[User ${userId}] Joined room in ${joinTime}ms`);
      resolve({ success: true, joinTime });
    });
    
    socket.once('error', (err) => {
      stats.joinRoom.failed++;
      stats.errors.push(`User ${userId} join room error: ${err.message}`);
      console.error(`[User ${userId}] Join room failed: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}

async function sendMessages(socket, roomId, userId, count, interval) {
  for (let i = 0; i < count; i++) {
    const message = `Test message from user ${userId} - ${i + 1}`;
    const sendTime = Date.now();
    
    await new Promise((resolve) => {
      socket.emit('sendMessage', { roomId, content: message });
      stats.messages.sent++;
      
      socket.once('messageSent', () => {
        const latency = Date.now() - sendTime;
        stats.messages.received++;
        stats.messages.latencies.push(latency);
        console.log(`[User ${userId}] Message ${i + 1} sent, latency: ${latency}ms`);
        resolve();
      });
      
      socket.once('error', (err) => {
        stats.messages.failed++;
        stats.errors.push(`User ${userId} message ${i + 1} error: ${err.message}`);
        console.error(`[User ${userId}] Message ${i + 1} failed: ${err.message}`);
        resolve();
      });
    });
    
    await new Promise(r => setTimeout(r, interval));
  }
}

function calculateStats(numbers) {
  if (numbers.length === 0) return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  return {
    avg: Math.round(sum / sorted.length),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
    p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1]
  };
}

function printReport() {
  const totalTime = stats.endTime - stats.startTime;
  const connectionStats = calculateStats(stats.connections.times);
  const messageStats = calculateStats(stats.messages.latencies);
  const joinRoomStats = calculateStats(stats.joinRoom.times);
  
  console.log('\n====================================');
  console.log('=== Performance Test Report ===');
  console.log('====================================');
  console.log(`Total test time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`Concurrent users: ${CONCURRENT_USERS}`);
  console.log(`Messages per user: ${MESSAGES_PER_USER}`);
  console.log('\n--- Connection Stats ---');
  console.log(`Success: ${stats.connections.success}/${CONCURRENT_USERS} (${((stats.connections.success / CONCURRENT_USERS) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${stats.connections.failed}`);
  console.log(`Avg time: ${connectionStats.avg}ms, Min: ${connectionStats.min}ms, Max: ${connectionStats.max}ms`);
  console.log(`P95: ${connectionStats.p95}ms, P99: ${connectionStats.p99}ms`);
  console.log('\n--- Join Room Stats ---');
  console.log(`Success: ${stats.joinRoom.success}/${stats.connections.success} (${((stats.joinRoom.success / Math.max(stats.connections.success, 1)) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${stats.joinRoom.failed}`);
  console.log(`Avg time: ${joinRoomStats.avg}ms, Min: ${joinRoomStats.min}ms, Max: ${joinRoomStats.max}ms`);
  console.log(`P95: ${joinRoomStats.p95}ms, P99: ${joinRoomStats.p99}ms`);
  console.log('\n--- Message Stats ---');
  console.log(`Sent: ${stats.messages.sent}, Received: ${stats.messages.received}, Failed: ${stats.messages.failed}`);
  console.log(`Success rate: ${((stats.messages.received / Math.max(stats.messages.sent, 1)) * 100).toFixed(1)}%`);
  console.log(`Avg latency: ${messageStats.avg}ms, Min: ${messageStats.min}ms, Max: ${messageStats.max}ms`);
  console.log(`P95: ${messageStats.p95}ms, P99: ${messageStats.p99}ms`);
  console.log(`Throughput: ${(stats.messages.received / (totalTime / 1000)).toFixed(2)} messages/second`);
  console.log('\n--- Errors ---');
  console.log(`Total errors: ${stats.errors.length}`);
  if (stats.errors.length > 0) {
    stats.errors.slice(0, 10).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
  }
  console.log('====================================\n');
}

async function runTest() {
  stats.startTime = Date.now();
  const users = [];
  let roomId = null;
  
  try {
    console.log('Step 1: Creating admin user and test room...');
    const adminLogin = await loginUser('admin', 'admin123');
    if (adminLogin.error) {
      console.log('Admin not found, registering...');
      const registerResult = await registerUser('admin', 'admin123');
      if (registerResult.error) {
        console.error('Failed to register admin:', registerResult.error);
      }
    }
    
    const user0login = await loginUser('testuser0', 'password123');
    let user0token;
    if (user0login.error) {
      const reg = await registerUser('testuser0', 'password123');
      user0token = reg.token;
    } else {
      user0token = user0login.token;
    }
    
    const roomResult = await createRoom(user0token, `performance-test-${Date.now()}`);
    if (roomResult.error || !roomResult.room) {
      console.error('Failed to create room:', roomResult.error);
      const roomsResponse = await new Promise((resolve) => {
        const url = new URL(`${SERVER_URL}/api/rooms`);
        const options = {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user0token}` }
        };
        httpRequest(options).then(resolve);
      });
      if (roomsResponse.data?.rooms?.length > 0) {
        roomId = roomsResponse.data.rooms[0]._id;
        console.log('Using existing room:', roomId);
      } else {
        throw new Error('No rooms available');
      }
    } else {
      roomId = roomResult.room._id;
      console.log('Test room created:', roomId);
    }
    
    console.log('\nStep 2: Registering and logging in test users...');
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const username = `testuser${i}`;
      const password = 'password123';
      
      let loginResult = await loginUser(username, password);
      if (loginResult.error) {
        const regResult = await registerUser(username, password);
        if (regResult.error) {
          console.error(`Failed to register user ${i}:`, regResult.error);
          continue;
        }
        loginResult = regResult;
      }
      
      users.push({
        id: i,
        username,
        token: loginResult.token,
        userId: loginResult.user?._id || loginResult.user?.userId
      });
      
      if ((i + 1) % 20 === 0) {
        console.log(`Registered ${i + 1}/${CONCURRENT_USERS} users`);
      }
    }
    
    console.log('\nStep 3: Connecting users concurrently...');
    const connectPromises = users.map(user => connectUser(user.token, user.id));
    const connectResults = await Promise.all(connectPromises);
    
    const connectedUsers = connectResults
      .map((result, index) => ({ ...users[index], socket: result.socket }))
      .filter(u => u.socket);
    
    console.log(`\nSuccessfully connected ${connectedUsers.length}/${CONCURRENT_USERS} users`);
    
    if (connectedUsers.length === 0) {
      throw new Error('No users connected, aborting test');
    }
    
    console.log('\nStep 4: Joining users to room...');
    const joinPromises = connectedUsers.map(user => joinRoom(user.socket, roomId, user.id));
    await Promise.all(joinPromises);
    
    console.log('\nStep 5: Sending messages...');
    const messagePromises = connectedUsers.map(user => 
      sendMessages(user.socket, roomId, user.id, MESSAGES_PER_USER, MESSAGE_INTERVAL)
    );
    await Promise.all(messagePromises);
    
    console.log('\nStep 6: Cleaning up connections...');
    connectedUsers.forEach(user => {
      if (user.socket) {
        user.socket.disconnect();
      }
    });
    
  } catch (err) {
    console.error('Test failed:', err);
    stats.errors.push(`Test error: ${err.message}`);
  }
  
  stats.endTime = Date.now();
  printReport();
  
  process.exit(stats.connections.failed > 0 || stats.messages.failed > 0 ? 1 : 0);
}

runTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
