const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const config = require('./index');

let redisClient = null;
let redisPub = null;
let redisSub = null;

function buildRedisUrl() {
  const password = config.redis.password ? `:${config.redis.password}@` : '';
  return `redis://${password}${config.redis.host}:${config.redis.port}`;
}

async function connectRedis() {
  try {
    const url = buildRedisUrl();
    const options = {
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return new Error('Too many Redis reconnect attempts');
          }
          return Math.min(retries * 50, 1000);
        }
      }
    };
    
    redisClient = createClient(options);
    redisPub = createClient(options);
    redisSub = redisPub.duplicate();
    
    redisClient.on('error', (err) => {
      console.error('Redis Client error:', err);
    });
    
    redisPub.on('error', (err) => {
      console.error('Redis Pub error:', err);
    });
    
    redisSub.on('error', (err) => {
      console.error('Redis Sub error:', err);
    });
    
    await Promise.all([
      redisClient.connect(),
      redisPub.connect(),
      redisSub.connect()
    ]);
    
    console.log('Redis connected successfully');
    
    return { redisClient, redisPub, redisSub };
  } catch (err) {
    console.error('Redis connection error:', err);
    process.exit(1);
  }
}

function getRedisAdapter() {
  if (!redisPub || !redisSub) {
    throw new Error('Redis clients not initialized');
  }
  return createAdapter(redisPub, redisSub);
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}

async function disconnectRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log('Redis client disconnected');
    }
    if (redisPub) {
      await redisPub.quit();
      console.log('Redis pub disconnected');
    }
    if (redisSub) {
      await redisSub.quit();
      console.log('Redis sub disconnected');
    }
  } catch (err) {
    console.error('Error disconnecting Redis:', err);
  }
}

module.exports = {
  connectRedis,
  getRedisAdapter,
  getRedisClient,
  disconnectRedis
};
