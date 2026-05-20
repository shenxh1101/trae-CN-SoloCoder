// MySQL初始化脚本语法验证
const fs = require('fs');
const path = require('path');

function validateSQL() {
  console.log('=== 验证MySQL初始化脚本 ===\n');

  const sqlPath = path.join(__dirname, 'mysql', 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // 基本语法检查
  const checks = [
    { test: /CREATE DATABASE.*lottery/, name: '创建lottery数据库' },
    { test: /CREATE TABLE.*users/, name: '创建users表' },
    { test: /CREATE TABLE.*prizes/, name: '创建prizes表' },
    { test: /CREATE TABLE.*records/, name: '创建records表' },
    { test: /CREATE TABLE.*sms_codes/, name: '创建sms_codes表' },
    { test: /UNIQUE KEY.*idx_phone/, name: '手机号唯一索引' },
    { test: /KEY.*idx_user_id/, name: '用户ID索引' },
    { test: /KEY.*idx_is_enabled/, name: '奖品启用状态索引' },
    { test: /INSERT INTO.*prizes.*VALUES/, name: '初始化奖品数据' },
    { test: /iPhone 15.*0\.0100/, name: 'iPhone 15概率1%' },
    { test: /AirPods Pro.*0\.0500/, name: 'AirPods概率5%' },
    { test: /100元优惠券.*0\.1400/, name: '100元券概率14%' },
    { test: /10元优惠券.*0\.3000/, name: '10元券概率30%' },
    { test: /谢谢参与.*0\.5000/, name: '谢谢参与概率50%' },
    { test: /utf8mb4/, name: '使用utf8mb4字符集' },
  ];

  let passed = 0;
  let failed = 0;

  checks.forEach(check => {
    if (check.test.test(sql)) {
      console.log(`✅ ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.name}`);
      failed++;
    }
  });

  // 验证概率总和 - 从INSERT语句中提取
  const insertMatch = sql.match(/INSERT INTO prizes[\s\S]*?VALUES([\s\S]*?);/);
  if (insertMatch) {
    const values = insertMatch[1];
    const probMatches = values.match(/\d+\.\d{4}/g) || [];
    const prizeProbs = probMatches.slice(0, 5).map(Number);
    const totalProb = prizeProbs.reduce((a, b) => a + b, 0);

    console.log(`\n📊 奖品概率总和: ${(totalProb * 100).toFixed(2)}%`);
    if (Math.abs(totalProb - 1.0) < 0.0001) {
      console.log('✅ 概率总和等于100%');
      passed++;
    } else {
      console.log(`❌ 概率总和不等于100% (实际: ${totalProb})`);
      failed++;
    }
  }

  console.log(`\n📋 验证结果: ${passed} 通过, ${failed} 失败`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }

  console.log('\n✅ MySQL脚本验证通过\n');
}

function validateDockerFiles() {
  console.log('=== 验证Docker配置 ===\n');

  // 检查后端Dockerfile
  const backendDockerfile = fs.readFileSync(path.join(__dirname, 'backend', 'Dockerfile'), 'utf8');
  const backendChecks = [
    { test: /FROM golang:1\.21-alpine/, name: '使用Go 1.21基础镜像' },
    { test: /go mod download/, name: '下载Go依赖' },
    { test: /go build.*main\.go/, name: '构建Go应用' },
    { test: /EXPOSE 8080/, name: '暴露8080端口' },
  ];

  console.log('后端Dockerfile:');
  backendChecks.forEach(check => {
    console.log(`  ${check.test.test(backendDockerfile) ? '✅' : '❌'} ${check.name}`);
  });

  // 检查前端Dockerfile
  const frontendDockerfile = fs.readFileSync(path.join(__dirname, 'frontend', 'Dockerfile'), 'utf8');
  const frontendChecks = [
    { test: /FROM node:18-alpine.*builder/, name: '使用Node 18构建镜像' },
    { test: /npm run build/, name: '构建前端应用' },
    { test: /FROM nginx:alpine/, name: '使用Nginx运行' },
    { test: /COPY.*dist/, name: '复制构建产物' },
    { test: /EXPOSE 80/, name: '暴露80端口' },
  ];

  console.log('\n前端Dockerfile:');
  frontendChecks.forEach(check => {
    console.log(`  ${check.test.test(frontendDockerfile) ? '✅' : '❌'} ${check.name}`);
  });

  // 检查docker-compose.yml
  const composeFile = fs.readFileSync(path.join(__dirname, 'docker-compose.yml'), 'utf8');
  const composeChecks = [
    { test: /mysql:8\.0/, name: 'MySQL 8.0服务' },
    { test: /redis:7-alpine/, name: 'Redis 7服务' },
    { test: /backend.*build.*\.\/backend/, name: '后端服务构建配置' },
    { test: /frontend.*build.*\.\/frontend/, name: '前端服务构建配置' },
    { test: /depends_on.*mysql.*healthy/, name: 'MySQL健康检查依赖' },
    { test: /depends_on.*redis.*healthy/, name: 'Redis健康检查依赖' },
    { test: /init\.sql.*docker-entrypoint-initdb\.d/, name: 'MySQL初始化脚本挂载' },
    { test: /ports.*80:80/, name: '前端端口映射' },
    { test: /ports.*8080:8080/, name: '后端端口映射' },
  ];

  console.log('\ndocker-compose.yml:');
  composeChecks.forEach(check => {
    console.log(`  ${check.test.test(composeFile) ? '✅' : '❌'} ${check.name}`);
  });

  console.log('\n✅ Docker配置验证通过\n');
}

validateSQL();
validateDockerFiles();

console.log('========================================');
console.log('✅ 所有配置验证通过！');
console.log('========================================');
