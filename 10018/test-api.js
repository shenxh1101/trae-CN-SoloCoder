#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

let authToken = '';
let testArticleId = '';
let testTagId = '';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const log = (message, type = 'info') => {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
};

const test = async (name, fn) => {
  try {
    log(`\n▶️  测试: ${name}`, 'info');
    await fn();
    log(`✅ 通过: ${name}`, 'success');
    return true;
  } catch (error) {
    log(`❌ 失败: ${name}`, 'error');
    log(`   错误: ${error.message}`, 'error');
    if (error.response) {
      log(`   状态码: ${error.response.status}`, 'error');
      log(`   响应: ${JSON.stringify(error.response.data)}`, 'error');
    }
    return false;
  }
};

const runTests = async () => {
  log('🚀 开始 API 测试...\n', 'info');
  
  const results = [];

  results.push(await test('健康检查', async () => {
    const res = await axios.get(`${BASE_URL}/health`);
    if (res.data.status !== 'ok') throw new Error('健康检查失败');
  }));

  await delay(500);

  results.push(await test('用户注册', async () => {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      username: 'testuser',
      email: 'test@example.com',
      password: 'test123456'
    });
    if (!res.data.token) throw new Error('注册失败');
    authToken = res.data.token;
  }));

  await delay(500);

  results.push(await test('用户登录', async () => {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'test123456'
    });
    if (!res.data.token) throw new Error('登录失败');
    authToken = res.data.token;
  }));

  await delay(500);

  results.push(await test('创建标签', async () => {
    const res = await axios.post(`${BASE_URL}/tags`, {
      name: '测试标签',
      description: '这是一个测试标签'
    }, {
      headers: { 'x-auth-token': authToken }
    });
    testTagId = res.data._id;
  }));

  await delay(500);

  results.push(await test('获取标签列表', async () => {
    const res = await axios.get(`${BASE_URL}/tags`);
    if (!Array.isArray(res.data)) throw new Error('获取标签列表失败');
  }));

  await delay(500);

  results.push(await test('创建文章', async () => {
    const res = await axios.post(`${BASE_URL}/articles`, {
      title: 'Test Article',
      content: '# Test Article\n\nThis is a test article content.\n\n```javascript\nconsole.log("Hello World!");\n```',
      tags: [testTagId],
      status: 'published',
      visibility: 'public'
    }, {
      headers: { 'x-auth-token': authToken }
    });
    testArticleId = res.data._id;
  }));

  await delay(500);

  results.push(await test('获取文章列表', async () => {
    const res = await axios.get(`${BASE_URL}/articles`);
    if (!res.data.articles) throw new Error('获取文章列表失败');
  }));

  await delay(500);

  results.push(await test('获取文章详情', async () => {
    const article = await axios.post(`${BASE_URL}/articles`, {
      title: 'Detail Test Article',
      content: '# Detail Test\n\nContent',
      status: 'published',
      visibility: 'public'
    }, {
      headers: { 'x-auth-token': authToken }
    });
    
    const res = await axios.get(`${BASE_URL}/articles/${article.data.slug}`);
    if (!res.data.article) throw new Error('获取文章详情失败');
  }));

  await delay(500);

  results.push(await test('文章点赞', async () => {
    const res = await axios.post(`${BASE_URL}/articles/${testArticleId}/like`, {}, {
      headers: { 'x-auth-token': authToken }
    });
    if (typeof res.data.likes !== 'number') throw new Error('点赞失败');
  }));

  await delay(500);

  results.push(await test('文章收藏', async () => {
    const res = await axios.post(`${BASE_URL}/articles/${testArticleId}/favorite`, {}, {
      headers: { 'x-auth-token': authToken }
    });
    if (typeof res.data.favorites !== 'number') throw new Error('收藏失败');
  }));

  await delay(500);

  results.push(await test('创建评论', async () => {
    const res = await axios.post(`${BASE_URL}/comments/${testArticleId}`, {
      author: '评论者',
      content: '这是一条测试评论'
    });
    if (!res.data._id) throw new Error('创建评论失败');
  }));

  await delay(500);

  results.push(await test('获取评论列表', async () => {
    const res = await axios.get(`${BASE_URL}/comments/${testArticleId}`);
    if (!Array.isArray(res.data)) throw new Error('获取评论列表失败');
  }));

  await delay(500);

  results.push(await test('获取归档', async () => {
    const res = await axios.get(`${BASE_URL}/articles/archive`);
    if (typeof res.data !== 'object') throw new Error('获取归档失败');
  }));

  await delay(500);

  results.push(await test('获取用户个人主页', async () => {
    const res = await axios.get(`${BASE_URL}/users/profile/testuser`);
    if (!res.data.user) throw new Error('获取用户主页失败');
  }));

  await delay(500);

  results.push(await test('更新文章', async () => {
    const res = await axios.put(`${BASE_URL}/articles/${testArticleId}`, {
      title: '更新后的测试文章',
      content: '# 更新后的内容',
      status: 'published'
    }, {
      headers: { 'x-auth-token': authToken }
    });
    if (res.data.title !== '更新后的测试文章') throw new Error('更新文章失败');
  }));

  await delay(500);

  results.push(await test('删除文章', async () => {
    await axios.delete(`${BASE_URL}/articles/${testArticleId}`, {
      headers: { 'x-auth-token': authToken }
    });
  }));

  await delay(500);

  results.push(await test('删除标签', async () => {
    await axios.delete(`${BASE_URL}/tags/${testTagId}`, {
      headers: { 'x-auth-token': authToken }
    });
  }));

  const passed = results.filter(r => r).length;
  const total = results.length;

  log('\n' + '='.repeat(50), 'info');
  log(`📊 测试结果: ${passed}/${total} 通过`, passed === total ? 'success' : 'warning');
  
  if (passed === total) {
    log('🎉 所有测试通过！API 接口正常工作。', 'success');
  } else {
    log(`⚠️  有 ${total - passed} 个测试失败，请检查。`, 'warning');
  }
  log('='.repeat(50), 'info');
};

runTests().catch(err => {
  log('\n❌ 测试运行出错:', 'error');
  log(err.message, 'error');
  log('\n💡 请确保后端服务已启动: cd backend && npm run dev', 'warning');
  process.exit(1);
});
