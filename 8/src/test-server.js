const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const http = require('http');
const cors = require('cors');

let mongoServer = null;

async function startTestServer() {
  console.log('=== Starting Test Server with In-Memory MongoDB ===\n');
  
  try {
    mongoServer = await MongoMemoryServer.create();
    
    const mongoUri = mongoServer.getUri();
    console.log(`In-memory MongoDB started at: ${mongoUri}`);
    
    process.env.MONGO_URI = mongoUri;
    process.env.DOCKER = 'false';
    
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/config/') || key.includes('/src/config/')) {
        delete require.cache[key];
      }
    });
    
    const { connectDB } = require('./config/database');
    const { connectRedis } = require('./config/redis');
    const { initSocket } = require('./socket');
    const config = require('./config');
    
    const authRoutes = require('./routes/auth');
    const roomRoutes = require('./routes/rooms');
    const adminRoutes = require('./routes/admin');
    
    const app = express();
    const server = http.createServer(app);
    
    app.use(cors({
      origin: config.cors.origin,
      credentials: true
    }));
    
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongoUri: mongoUri
      });
    });
    
    app.use('/api/auth', authRoutes);
    app.use('/api/rooms', roomRoutes);
    app.use('/api/admin', adminRoutes);
    
    app.use((req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
    
    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
    
    await connectDB();
    await connectRedis();
    initSocket(server);
    
    server.listen(config.port, () => {
      console.log(`\nTest server running on port ${config.port}`);
      console.log(`Health check: http://localhost:${config.port}/api/health`);
      console.log('\n=== Test Server Ready ===\n');
    });
    
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await require('./config/database').disconnectDB();
        await require('./config/redis').disconnectRedis();
        if (mongoServer) {
          await mongoServer.stop();
        }
        process.exit(0);
      });
    });
    
    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await require('./config/database').disconnectDB();
        await require('./config/redis').disconnectRedis();
        if (mongoServer) {
          await mongoServer.stop();
        }
        process.exit(0);
      });
    });
    
    return { server, mongoServer };
    
  } catch (err) {
    console.error('Failed to start test server:', err);
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  startTestServer();
}

module.exports = { startTestServer };
