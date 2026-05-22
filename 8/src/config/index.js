require('dotenv').config();

const isDocker = process.env.DOCKER === 'true';

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expire: process.env.JWT_EXPIRE || '7d'
  },
  
  mongo: {
    uri: isDocker ? (process.env.MONGO_URI_DOCKER || 'mongodb://mongo:27017/chatroom') 
                  : (process.env.MONGO_URI || 'mongodb://localhost:27017/chatroom')
  },
  
  redis: {
    host: isDocker ? (process.env.REDIS_HOST_DOCKER || 'redis') 
                   : (process.env.REDIS_HOST || 'localhost'),
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },
  
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  },
  
  pagination: {
    pageSize: 20
  }
};
