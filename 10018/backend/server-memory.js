const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_for_testing_only';

const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const tagRoutes = require('./routes/tags');
const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');

let mongoServer;

async function startServer() {
  console.log('🚀 启动内存 MongoDB...');
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  console.log(`📦 内存 MongoDB 已启动: ${mongoUri}`);

  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB 连接成功');

  const app = express();
  const PORT = 5001;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir));

  app.use('/api/auth', authRoutes);
  app.use('/api/articles', articleRoutes);
  app.use('/api/tags', tagRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api', uploadRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
  });

  const server = app.listen(PORT, () => {
    console.log(`
🎉 服务启动成功！
============================
🌐 API 地址: http://localhost:${PORT}
🧪 健康检查: http://localhost:${PORT}/api/health
📦 数据库: 内存 MongoDB
============================

📋 测试命令:
   node test-api.js
   
📝 注意: 内存数据库中的数据会在服务停止后丢失
    `);
  });

  const gracefulShutdown = async () => {
    console.log('\n📤 正在关闭服务...');
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close(() => {
      console.log('✅ 服务已关闭');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

startServer().catch(err => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});
