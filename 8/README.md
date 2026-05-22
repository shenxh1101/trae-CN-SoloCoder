# Realtime Chat Backend

A high-performance realtime chat backend service built with Node.js, Socket.io, Redis (for horizontal scaling), and MongoDB.

## Features

- 🚀 **Real-time Communication** - Powered by Socket.io with WebSocket support
- 🔄 **Horizontal Scaling** - Redis adapter for multi-instance deployment
- 🏠 **Multiple Rooms** - Create and manage multiple chat rooms
- 👥 **User Management** - Join/leave rooms, online user lists
- 💬 **Messaging** - Send messages with @mention notifications
- 💾 **Persistence** - All messages stored in MongoDB
- 📄 **Pagination** - Fetch historical messages (20 per page)
- 🔐 **Authentication** - JWT token-based authentication
- 👑 **Admin Features** - Kick users, mute (temporary/permanent/global)
- 📊 **Performance Test** - Simulate 100+ concurrent connections
- 🐳 **Docker Support** - One-click deployment with Docker Compose

## Tech Stack

- **Node.js 18+** - Runtime environment
- **Express** - HTTP server framework
- **Socket.io** - Real-time bidirectional communication
- **socket.io-redis** - Redis adapter for scaling Socket.io
- **Redis** - Pub/Sub for horizontal scaling
- **MongoDB 6+** - Data persistence
- **Mongoose** - MongoDB ODM
- **JSON Web Token** - Authentication
- **Nginx** - Load balancer (for multi-instance)

## Project Structure

```
├── src/
│   ├── config/
│   │   ├── index.js          # Configuration
│   │   ├── database.js       # MongoDB connection
│   │   └── redis.js          # Redis connection
│   ├── controllers/
│   │   ├── authController.js # Authentication endpoints
│   │   ├── roomController.js # Room management
│   │   └── adminController.js # Admin operations
│   ├── middleware/
│   │   └── auth.js           # Auth middleware
│   ├── models/
│   │   ├── User.js           # User model
│   │   ├── Room.js           # Room model
│   │   ├── Message.js        # Message model
│   │   └── Mute.js           # Mute record model
│   ├── routes/
│   │   ├── auth.js           # Auth routes
│   │   ├── rooms.js          # Room routes
│   │   └── admin.js          # Admin routes
│   ├── socket/
│   │   └── index.js          # Socket.io event handlers
│   ├── utils/
│   │   └── jwt.js            # JWT utilities
│   └── app.js                # Main application entry
├── tests/
│   └── performance-test.js   # Performance testing script
├── Dockerfile                # Docker image definition
├── docker-compose.yml        # Docker Compose configuration
├── nginx.conf                # Nginx load balancer config
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 7+
- npm or yarn

### Local Development

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
MONGO_URI=mongodb://localhost:27017/chatroom
REDIS_HOST=localhost
REDIS_PORT=6379
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

3. **Start MongoDB and Redis:**
```bash
# Using Docker
docker run -d -p 27017:27017 mongo:6-jammy
docker run -d -p 6379:6379 redis:7-alpine
```

4. **Start the server:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

5. **Verify the service is running:**
```bash
curl http://localhost:3000/api/health
```

### Docker Deployment

1. **Start all services:**
```bash
docker-compose up -d
```

This will start:
- MongoDB (port 27017)
- Redis (port 6379)
- Chat App Instance 1 (port 3000)
- Chat App Instance 2 (port 3001)
- Nginx Load Balancer (port 80)

2. **Scale to more instances:**
```bash
docker-compose up -d --scale chat-app=4
```

3. **Stop services:**
```bash
docker-compose down
```

4. **Stop and remove volumes:**
```bash
docker-compose down -v
```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123",
  "nickname": "John"
}
```

Response:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "64f...",
    "username": "john_doe",
    "nickname": "John",
    "isAdmin": false
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123"
}
```

#### Admin Login
```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Room Endpoints

#### Get Rooms List
```http
GET /api/rooms?page=1&limit=10
Authorization: Bearer <token>
```

#### Create Room
```http
POST /api/rooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "General Chat",
  "description": "General discussion room",
  "isPrivate": false
}
```

#### Get Room Details
```http
GET /api/rooms/:roomId
Authorization: Bearer <token>
```

#### Get Room Messages (Paginated)
```http
GET /api/rooms/:roomId/messages?page=1
Authorization: Bearer <token>
```

Response (20 messages per page):
```json
{
  "messages": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 156,
    "pages": 8,
    "hasMore": true
  }
}
```

#### Get Online Users in Room
```http
GET /api/rooms/:roomId/users
Authorization: Bearer <token>
```

### Admin Endpoints

All admin endpoints require admin JWT token.

#### Get All Users
```http
GET /api/admin/users?page=1&limit=20&search=john
Authorization: Bearer <admin-token>
```

#### Kick User from Room
```http
POST /api/admin/kick
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "roomId": "64f...",
  "userId": "64f...",
  "reason": "Violating rules"
}
```

#### Mute User
```http
POST /api/admin/mute
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "roomId": "64f...",
  "userId": "64f...",
  "type": "temporary",
  "duration": 60,
  "reason": "Spamming"
}
```

Mute types:
- `temporary` - For a specified duration (in minutes)
- `permanent` - Permanent mute in the room
- `global` - Permanent mute across all rooms

#### Unmute User
```http
POST /api/admin/unmute
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "roomId": "64f...",
  "userId": "64f..."
}
```

#### Get Mute List
```http
GET /api/admin/mutes?activeOnly=true
Authorization: Bearer <admin-token>
```

## Socket.io Events

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connected', (data) => {
  console.log('Connected:', data.user);
});
```

### Room Events

#### Create Room
```javascript
socket.emit('createRoom', {
  name: 'General',
  description: 'General chat',
  isPrivate: false
});

socket.on('roomCreatedSuccess', (data) => {
  console.log('Room created:', data.room);
});
```

#### Join Room
```javascript
socket.emit('joinRoom', { roomId: '64f...' });

socket.on('joinedRoom', (data) => {
  console.log('Joined room:', data.room);
  console.log('Online users:', data.onlineUsers);
});

socket.on('userJoined', (data) => {
  console.log('User joined:', data.user);
});
```

#### Leave Room
```javascript
socket.emit('leaveRoom', { roomId: '64f...' });

socket.on('userLeft', (data) => {
  console.log('User left:', data.user);
});
```

### Messaging Events

#### Send Message
```javascript
socket.emit('sendMessage', {
  roomId: '64f...',
  content: 'Hello @john_doe!'
});

socket.on('newMessage', (data) => {
  console.log('New message:', data.message);
});

socket.on('mention', (data) => {
  console.log('You were mentioned:', data.message);
});
```

#### Typing Indicator
```javascript
socket.emit('typing', { roomId: '64f...' });
socket.emit('stopTyping', { roomId: '64f...' });

socket.on('userTyping', (data) => {
  console.log(data.user.username, 'is typing...');
});
```

### Admin Events

#### Kick User
```javascript
socket.emit('kickUser', {
  roomId: '64f...',
  userId: '64f...',
  reason: 'Spamming'
});

socket.on('kicked', (data) => {
  console.log('You were kicked:', data.reason);
});
```

#### Mute/Unmute User
```javascript
socket.emit('muteUser', {
  roomId: '64f...',
  userId: '64f...',
  type: 'temporary',
  duration: 30,
  reason: 'Flooding'
});

socket.on('muted', (data) => {
  console.log('You were muted:', data.mute);
});

socket.on('unmuted', (data) => {
  console.log('You were unmuted:', data.mute);
});
```

## Performance Testing

Run the performance test script to simulate 100 concurrent users:

```bash
# Default: 100 users, 10 messages each
npm run test:performance

# Custom configuration
SERVER_URL=http://localhost:3000 \
CONCURRENT_USERS=100 \
MESSAGES_PER_USER=10 \
MESSAGE_INTERVAL=500 \
node tests/performance-test.js
```

The test will output:
- Connection success rate and latency
- Join room performance
- Message latency (avg, min, max, P95, P99)
- Throughput (messages/second)
- Error statistics

### Expected Performance Benchmarks

On a typical development machine:
- Connection time: <50ms average
- Join room time: <30ms average
- Message latency: <100ms average
- Throughput: >100 messages/second

## Horizontal Scaling

The architecture supports horizontal scaling through:

1. **Redis Adapter** - All Socket.io instances communicate via Redis pub/sub
2. **Shared Database** - Single MongoDB instance (or replica set)
3. **Load Balancer** - Nginx distributes connections using ip_hash for sticky sessions

```
                    ┌─────────┐
                    │  Nginx  │  Load Balancer
                    └────┬────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
      ┌────▼───┐    ┌────▼───┐    ┌────▼───┐
      │Chat App│    │Chat App│    │Chat App│  Node.js Instances
      └────┬───┘    └────┬───┘    └────┬───┘
           │             │             │
           └─────────────┼─────────────┘
                         │
                    ┌────▼────┐
                    │  Redis  │  Pub/Sub
                    └────┬────┘
                         │
                    ┌────▼─────┐
                    │  MongoDB │  Data Store
                    └──────────┘
```

To add more instances:
```bash
docker-compose up -d --scale chat-app=5
```

## Security Features

- **JWT Authentication** - All requests require valid tokens
- **Password Hashing** - bcrypt with salt rounds
- **Input Validation** - All user inputs validated and sanitized
- **CORS Configuration** - Restrict cross-origin requests
- **Rate Limiting** - Can be added at Nginx level
- **Admin Authorization** - Separate permissions for admin operations

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `JWT_SECRET` | - | JWT signing key |
| `JWT_EXPIRE` | 7d | JWT expiration time |
| `MONGO_URI` | mongodb://localhost:27017/chatroom | MongoDB connection |
| `REDIS_HOST` | localhost | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `CORS_ORIGIN` | * | Allowed CORS origins |
| `ADMIN_USERNAME` | admin | Default admin username |
| `ADMIN_PASSWORD` | admin123 | Default admin password |

## Troubleshooting

### Common Issues

1. **Redis connection errors** - Ensure Redis is running and accessible
2. **MongoDB connection errors** - Check MongoDB URI and authentication
3. **Socket.io connection failures** - Verify JWT token is valid
4. **CORS errors** - Check CORS_ORIGIN configuration
5. **Docker networking issues** - Ensure all services are on the same network

### Logs

```bash
# View app logs
docker-compose logs -f chat-app

# View all logs
docker-compose logs -f

# View MongoDB logs
docker-compose logs -f mongo

# View Redis logs
docker-compose logs -f redis
```

## License

MIT
