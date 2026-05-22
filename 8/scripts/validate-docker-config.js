#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function validateYamlBasic(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  
  if (!content.includes('version:')) {
    errors.push('Missing version field');
  }
  
  if (!content.includes('services:')) {
    errors.push('Missing services section');
  }
  
  if (content.includes('mongodb://') && !content.includes('mongo:27017')) {
    errors.push('MongoDB URI should use service name "mongo"');
  }
  
  if (content.includes('redis://') && !content.includes('redis')) {
    errors.push('Redis should use service name "redis"');
  }
  
  const requiredServices = ['mongo', 'redis', 'chat-app'];
  for (const service of requiredServices) {
    const regex = new RegExp(`^\\s{2}${service}:`, 'm');
    if (!regex.test(content)) {
      errors.push(`Missing required service: ${service}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

function validateDockerfile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  
  if (!content.startsWith('FROM ')) {
    errors.push('Dockerfile must start with FROM instruction');
  }
  
  if (!content.includes('EXPOSE')) {
    errors.push('Missing EXPOSE instruction');
  }
  
  if (!content.includes('CMD')) {
    errors.push('Missing CMD instruction');
  }
  
  if (!content.includes('COPY package*.json ./')) {
    errors.push('Should copy package.json before npm install for better caching');
  }
  
  return { valid: errors.length === 0, errors };
}

function validateNginxConfig(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  
  if (!content.includes('upstream')) {
    errors.push('Missing upstream configuration for load balancing');
  }
  
  if (!content.includes('Upgrade $http_upgrade')) {
    errors.push('Missing WebSocket upgrade header for Socket.io');
  }
  
  if (!content.includes('Connection "upgrade"')) {
    errors.push('Missing Connection upgrade header for Socket.io');
  }
  
  if (!content.includes('ip_hash')) {
    errors.push('Missing ip_hash for sticky sessions (required for Socket.io)');
  }
  
  if (!content.includes('proxy_read_timeout 86400')) {
    errors.push('Missing long timeout for WebSocket connections');
  }
  
  return { valid: errors.length === 0, errors };
}

console.log('=== Docker Configuration Validation ===\n');

const projectRoot = path.resolve(__dirname, '..');
let allValid = true;

const dockerfilePath = path.join(projectRoot, 'Dockerfile');
console.log('1. Validating Dockerfile...');
if (fs.existsSync(dockerfilePath)) {
  const result = validateDockerfile(dockerfilePath);
  if (result.valid) {
    console.log('   ✓ Dockerfile is valid\n');
  } else {
    console.log('   ✗ Dockerfile has errors:');
    result.errors.forEach(e => console.log(`     - ${e}`));
    console.log();
    allValid = false;
  }
} else {
  console.log('   ✗ Dockerfile not found\n');
  allValid = false;
}

const composePath = path.join(projectRoot, 'docker-compose.yml');
console.log('2. Validating docker-compose.yml...');
if (fs.existsSync(composePath)) {
  const result = validateYamlBasic(composePath);
  if (result.valid) {
    console.log('   ✓ docker-compose.yml basic structure is valid\n');
  } else {
    console.log('   ✗ docker-compose.yml has errors:');
    result.errors.forEach(e => console.log(`     - ${e}`));
    console.log();
    allValid = false;
  }
} else {
  console.log('   ✗ docker-compose.yml not found\n');
  allValid = false;
}

const nginxPath = path.join(projectRoot, 'nginx.conf');
console.log('3. Validating nginx.conf...');
if (fs.existsSync(nginxPath)) {
  const result = validateNginxConfig(nginxPath);
  if (result.valid) {
    console.log('   ✓ nginx.conf is valid for Socket.io\n');
  } else {
    console.log('   ⚠  nginx.conf warnings:');
    result.errors.forEach(e => console.log(`     - ${e}`));
    console.log();
  }
}

const envDockerPath = path.join(projectRoot, '.env.docker');
console.log('4. Checking .env.docker...');
if (fs.existsSync(envDockerPath)) {
  const content = fs.readFileSync(envDockerPath, 'utf8');
  if (content.includes('JWT_SECRET=')) {
    console.log('   ✓ .env.docker exists with JWT_SECRET\n');
  } else {
    console.log('   ⚠  .env.docker missing JWT_SECRET\n');
  }
} else {
  console.log('   ⚠  .env.docker not found (using defaults)\n');
}

console.log('=== Deployment Instructions ===\n');
console.log('To deploy with Docker Compose:');
console.log('1. Copy .env.docker to .env and update secrets:');
console.log('   cp .env.docker .env');
console.log('   vi .env  # Update JWT_SECRET and passwords');
console.log();
console.log('2. Start all services:');
console.log('   docker-compose up -d');
console.log();
console.log('3. Scale chat-app to multiple instances:');
console.log('   docker-compose up -d --scale chat-app=4');
console.log();
console.log('4. Check service status:');
console.log('   docker-compose ps');
console.log();
console.log('5. View logs:');
console.log('   docker-compose logs -f chat-app');
console.log();
console.log('6. Stop services:');
console.log('   docker-compose down');
console.log();

console.log('=== Architecture Summary ===\n');
console.log('✓ MongoDB 6.x - Data persistence');
console.log('✓ Redis 7.x - Socket.io clustering & pub/sub');
console.log('✓ Node.js 18.x - Chat service (stateless, scalable)');
console.log('✓ Nginx - Load balancer with ip_hash sticky sessions');
console.log('✓ Socket.io Redis Adapter - Cross-instance message routing');
console.log();

if (allValid) {
  console.log('✅ All Docker configurations are valid!');
  console.log('\nTo verify actual deployment, run:');
  console.log('  docker-compose up -d');
  console.log('  curl http://localhost/api/health');
  process.exit(0);
} else {
  console.log('❌ Some configurations have errors. Please fix them before deployment.');
  process.exit(1);
}
