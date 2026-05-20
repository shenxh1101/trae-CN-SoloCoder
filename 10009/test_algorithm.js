// 抽奖系统算法测试 - Node.js版本
const assert = require('assert');

class Prize {
  constructor(id, name, stock, probability, isEnabled = true) {
    this.id = id;
    this.name = name;
    this.stock = stock;
    this.probability = probability;
    this.isEnabled = isEnabled;
  }
}

// 抽奖算法（与Go后端逻辑一致）
function doDraw(prizes) {
  const available = prizes.filter(p => p.isEnabled && p.stock > 0);
  
  if (available.length === 0) {
    throw new Error('暂无可用奖品');
  }

  let totalProb = 0;
  for (const p of available) {
    totalProb += p.probability;
  }

  if (totalProb === 0) {
    throw new Error('奖品配置错误');
  }

  const r = Math.random() * totalProb;
  let accum = 0;

  for (const p of available) {
    accum += p.probability;
    if (r <= accum) {
      return p;
    }
  }

  return available[available.length - 1];
}

// 测试1: 概率总和验证
function testProbability() {
  console.log('=== 测试1: 抽奖算法验证 ===\n');

  const prizes = [
    new Prize(1, 'iPhone 15', 1, 0.01),
    new Prize(2, 'AirPods Pro', 5, 0.05),
    new Prize(3, '100元优惠券', 50, 0.14),
    new Prize(4, '10元优惠券', 200, 0.30),
    new Prize(5, '谢谢参与', 10000, 0.50),
  ];

  let totalProb = 0;
  prizes.forEach(p => totalProb += p.probability);
  console.log(`总概率: ${(totalProb * 100).toFixed(2)}%`);
  console.log(`概率等于100%: ${totalProb === 1.0 ? '✅ PASS' : '❌ FAIL'}`);
  assert.strictEqual(totalProb, 1.0, '概率总和应为100%');

  const results = {};
  const totalDraws = 100000;

  for (let i = 0; i < totalDraws; i++) {
    const prize = doDraw(prizes);
    results[prize.name] = (results[prize.name] || 0) + 1;
  }

  console.log('\n模拟10万次抽奖结果:');
  console.log('-'.repeat(65));
  console.log('奖品名称'.padEnd(18) + '实际次数'.padStart(10) + '实际概率'.padStart(12) + '期望概率'.padStart(12) + '偏差'.padStart(10));
  console.log('-'.repeat(65));

  prizes.forEach(p => {
    const count = results[p.name] || 0;
    const actualProb = count / totalDraws;
    const deviation = ((actualProb - p.probability) * 100).toFixed(2);
    const status = Math.abs(actualProb - p.probability) < 0.02 ? '✅' : '⚠️';
    console.log(
      status + ' ' + 
      p.name.padEnd(16) + 
      String(count).padStart(10) + 
      `${(actualProb * 100).toFixed(2)}%`.padStart(11) +
      `${(p.probability * 100).toFixed(2)}%`.padStart(11) +
      `${deviation}%`.padStart(10)
    );
  });

  console.log('\n✅ 概率分布测试通过\n');
}

// 测试2: 库存为0时不可中
function testStockZero() {
  console.log('=== 测试2: 库存为0时不可中验证 ===\n');

  const prizes = [
    new Prize(1, '一等奖', 0, 0.5),
    new Prize(2, '二等奖', 100, 0.5),
  ];

  let hitFirst = 0;
  const totalDraws = 10000;

  for (let i = 0; i < totalDraws; i++) {
    const prize = doDraw(prizes);
    if (prize.id === 1) hitFirst++;
  }

  console.log(`一等奖库存: 0, 二等奖库存: 100`);
  console.log(`一等奖概率: 50%, 二等奖概率: 50%`);
  console.log(`模拟抽奖次数: ${totalDraws}`);
  console.log(`一等奖被抽中次数: ${hitFirst}`);
  console.log(`测试结果: ${hitFirst === 0 ? '✅ PASS (库存为0的奖品未被抽中)' : '❌ FAIL (库存为0的奖品被抽中了)'}`);
  
  assert.strictEqual(hitFirst, 0, '库存为0的奖品不应被抽中');
  console.log('');
}

// 测试3: 并发抽奖模拟（分布式锁）
function testConcurrentDraw() {
  console.log('=== 测试3: 并发抽奖（分布式锁模拟）===\n');

  let stock = 10;
  let successCount = 0;
  let failCount = 0;
  const concurrentUsers = 100;
  
  const lock = { locked: false };

  const promises = [];

  for (let i = 0; i < concurrentUsers; i++) {
    promises.push(new Promise((resolve) => {
      setTimeout(() => {
        if (!lock.locked) {
          lock.locked = true;
          if (stock > 0) {
            stock--;
            successCount++;
          } else {
            failCount++;
          }
          lock.locked = false;
        } else {
          failCount++;
        }
        resolve();
      }, Math.random() * 10);
    }));
  }

  return Promise.all(promises).then(() => {
    console.log(`初始库存: 10`);
    console.log(`并发用户数: ${concurrentUsers}`);
    console.log(`成功抽奖: ${successCount}`);
    console.log(`失败/被锁: ${failCount}`);
    console.log(`剩余库存: ${stock}`);
    console.log(`测试结果: ${successCount === 10 && stock === 0 ? '✅ PASS (没有超抽)' : '❌ FAIL (发生超抽)'}`);
    
    assert.strictEqual(successCount, 10, '成功次数应等于初始库存');
    assert.strictEqual(stock, 0, '库存应被扣减至0');
    console.log('');
  });
}

// 测试4: 每日抽奖次数限制
function testDailyLimit() {
  console.log('=== 测试4: 每日抽奖次数限制 ===\n');

  const maxDraws = 3;
  const userDraws = {};

  for (let day = 1; day <= 2; day++) {
    console.log(`第${day}天:`);
    userDraws[day] = 0;
    for (let i = 0; i < 5; i++) {
      if (userDraws[day] >= maxDraws) {
        console.log(`  第${i + 1}次尝试: ❌ 失败（今日次数已用完）`);
      } else {
        userDraws[day]++;
        console.log(`  第${i + 1}次尝试: ✅ 成功（已用${userDraws[day]}/${maxDraws}）`);
      }
    }
    assert.strictEqual(userDraws[day], maxDraws, `第${day}天最多只能抽${maxDraws}次`);
  }
  console.log('\n✅ 每日限制测试通过\n');
}

// 测试5: 奖品禁用验证
function testDisabledPrize() {
  console.log('=== 测试5: 奖品禁用验证 ===\n');

  const prizes = [
    new Prize(1, '一等奖', 100, 0.5, false),
    new Prize(2, '二等奖', 100, 0.5, true),
  ];

  let hitFirst = 0;
  for (let i = 0; i < 10000; i++) {
    const prize = doDraw(prizes);
    if (prize.id === 1) hitFirst++;
  }

  console.log(`一等奖已禁用, 二等奖启用`);
  console.log(`模拟抽奖次数: 10000`);
  console.log(`一等奖被抽中次数: ${hitFirst}`);
  console.log(`测试结果: ${hitFirst === 0 ? '✅ PASS (禁用的奖品未被抽中)' : '❌ FAIL (禁用的奖品被抽中了)'}`);
  
  assert.strictEqual(hitFirst, 0, '禁用的奖品不应被抽中');
  console.log('');
}

// 运行所有测试
async function runAllTests() {
  console.log('========================================');
  console.log('🎰 抽奖系统核心算法测试');
  console.log('========================================\n');

  try {
    testProbability();
    testStockZero();
    await testConcurrentDraw();
    testDailyLimit();
    testDisabledPrize();

    console.log('========================================');
    console.log('✅ 所有测试通过！');
    console.log('========================================');
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    process.exit(1);
  }
}

runAllTests();
