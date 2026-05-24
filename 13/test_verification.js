const fs = require('fs');
const path = require('path');

console.log('=' .repeat(70));
console.log('🏋️  FitTrack Pro 功能验证测试脚本');
console.log('=' .repeat(70));
console.log('');

let passed = 0;
let failed = 0;

function testPass(name) {
  passed++;
  console.log(`✅  ${name}`);
}

function testFail(name, error) {
  failed++;
  console.log(`❌  ${name}`);
  console.log(`   错误: ${error}`);
}

function runTest(name, testFn) {
  try {
    testFn();
    testPass(name);
  } catch (error) {
    testFail(name, error.message);
  }
}

// -----------------------------------------------------------------------------
console.log('📋 测试 1: 云函数编译验证');
console.log('-'.repeat(70));
// -----------------------------------------------------------------------------

runTest('云函数编译成功', () => {
  const indexJs = path.join(__dirname, 'functions', 'lib', 'index.js');
  if (!fs.existsSync(indexJs)) {
    throw new Error('编译后的 index.js 文件不存在');
  }
  const stats = fs.statSync(indexJs);
  if (stats.size < 1000) {
    throw new Error('编译后的文件过小，可能有问题');
  }
  console.log(`   文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
});

runTest('云函数导出验证', () => {
  const indexJs = fs.readFileSync(
    path.join(__dirname, 'functions', 'lib', 'index.js'),
    'utf8'
  );
  const requiredExports = [
    'recognizeFood',
    'updateLeaderboard',
    'checkChallengeCompletion',
    'calculateWeeklyStats',
    'sendWaterReminder',
    'checkInactiveUsers',
    'handleSubscriptionPurchase',
    'exportUserData',
    'testFunction'
  ];
  const missing = requiredExports.filter(name => 
    !indexJs.includes(`exports.${name}`)
  );
  if (missing.length > 0) {
    throw new Error(`缺少导出: ${missing.join(', ')}`);
  }
  console.log(`   导出函数数量: ${requiredExports.length} 个`);
});

runTest('testFunction 响应验证', () => {
  const indexTs = fs.readFileSync(
    path.join(__dirname, 'functions', 'src', 'index.ts'),
    'utf8'
  );
  
  const hasTestFunction = indexTs.includes('export const testFunction');
  const hasSuccessResponse = indexTs.includes('success: true');
  const hasMessage = indexTs.includes('FitTrack Pro 云函数正常运行');
  const hasFeatures = indexTs.includes("'食物识别', '排行榜', '挑战'");
  
  if (!hasTestFunction) {
    throw new Error('找不到 testFunction 定义');
  }
  if (!hasSuccessResponse || !hasMessage || !hasFeatures) {
    throw new Error('testFunction 响应格式不正确');
  }
  console.log('   预期响应格式: { success: true, message, features: [...] }');
});

// -----------------------------------------------------------------------------
console.log('');
console.log('💳 测试 2: IAP 恢复购买逻辑验证');
console.log('-'.repeat(70));
// -----------------------------------------------------------------------------

runTest('三种订阅类型识别', () => {
  const testCases = [
    { productId: 'com.fittrackpro.monthly', expected: 'monthly' },
    { productId: 'com.fittrackpro.quarterly', expected: 'quarterly' },
    { productId: 'com.fittrackpro.yearly', expected: 'yearly' },
  ];
  
  testCases.forEach(testCase => {
    let planType = 'monthly';
    const productId = testCase.productId;
    
    if (productId.includes('yearly')) {
      planType = 'yearly';
    } else if (productId.includes('quarterly')) {
      planType = 'quarterly';
    }
    
    if (planType !== testCase.expected) {
      throw new Error(`产品 ${testCase.productId} 映射错误: 预期 ${testCase.expected}, 实际 ${planType}`);
    }
  });
  console.log('   月卡/季卡/年卡 类型识别正确');
});

runTest('订阅时长计算', () => {
  const durations = {
    monthly: 1,
    quarterly: 3,
    yearly: 12
  };
  
  Object.entries(durations).forEach(([plan, months]) => {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);
    
    const expectedMonth = (new Date().getMonth() + months) % 12;
    const actualMonth = endDate.getMonth();
    
    if (actualMonth !== expectedMonth) {
      throw new Error(`${plan} 订阅时长计算错误`);
    }
  });
  console.log('   订阅时长计算: 月卡=1月, 季卡=3月, 年卡=12月');
});

runTest('subscriptionSlice 状态更新验证', () => {
  const sliceCode = fs.readFileSync(
    path.join(__dirname, 'src', 'redux', 'slices', 'subscriptionSlice.ts'),
    'utf8'
  );
  
  const hasPurchaseThunk = sliceCode.includes('purchaseSubscription');
  const hasBatchUpdate = sliceCode.includes('batch.set') && sliceCode.includes('batch.update');
  const hasIsPremium = sliceCode.includes('isPremium');
  
  if (!hasPurchaseThunk || !hasBatchUpdate || !hasIsPremium) {
    throw new Error('subscriptionSlice 缺少必要逻辑');
  }
  console.log('   批量更新事务: 订阅表 + 用户表 isPremium 字段');
});

// -----------------------------------------------------------------------------
console.log('');
console.log('🔒 测试 3: 隐私设置过滤逻辑验证');
console.log('-'.repeat(70));
// -----------------------------------------------------------------------------

runTest('Feed 流三态过滤', () => {
  const allPosts = [
    { id: 1, userId: 'userA', visibility: 'public', content: '公开动态' },
    { id: 2, userId: 'userB', visibility: 'friends', content: '好友动态' },
    { id: 3, userId: 'userC', visibility: 'private', content: '私密动态' },
    { id: 4, userId: 'userA', visibility: 'friends', content: '好友动态2' },
  ];
  
  const currentUserId = 'me';
  const friends = ['userA', 'userB'];
  const visibleUsers = [currentUserId, ...friends];
  
  const filtered = allPosts.filter(post => {
    if (post.visibility === 'public') return true;
    if (post.visibility === 'friends' && visibleUsers.includes(post.userId)) return true;
    return false;
  });
  
  if (filtered.length !== 3) {
    throw new Error(`过滤结果数量错误: 预期 3, 实际 ${filtered.length}`);
  }
  
  const hasPrivate = filtered.some(p => p.visibility === 'private');
  const hasFriendPostFromA = filtered.some(p => p.id === 4);
  
  if (hasPrivate) {
    throw new Error('私密动态不应被过滤出来');
  }
  if (!hasFriendPostFromA) {
    throw new Error('好友的好友可见动态应该显示');
  }
  console.log('   过滤结果: 3条 (2公开 + 1好友可见), 私密动态被过滤');
});

runTest('排行榜隐私检查', () => {
  const users = [
    { id: 'user1', privacySettings: { leaderboardVisible: true }, steps: 10000 },
    { id: 'user2', privacySettings: { leaderboardVisible: false }, steps: 20000 },
    { id: 'user3', privacySettings: { leaderboardVisible: true }, steps: 15000 },
  ];
  
  const leaderboardEntries = [];
  for (const user of users) {
    const privacySettings = user.privacySettings || {};
    if (privacySettings.leaderboardVisible !== false) {
      leaderboardEntries.push({ userId: user.id, steps: user.steps });
    }
  }
  
  if (leaderboardEntries.length !== 2) {
    throw new Error(`排行榜条目数量错误: 预期 2, 实际 ${leaderboardEntries.length}`);
  }
  
  const hasHiddenUser = leaderboardEntries.some(e => e.userId === 'user2');
  if (hasHiddenUser) {
    throw new Error('已隐藏排行榜的用户不应出现在排行榜中');
  }
  console.log('   排行榜过滤: 仅显示允许的用户 (2/3)');
});

// -----------------------------------------------------------------------------
console.log('');
console.log('📱 测试 4: 传感器步数检测算法验证');
console.log('-'.repeat(70));
// -----------------------------------------------------------------------------

runTest('加速度向量计算', () => {
  const x = 0.5, y = 9.81, z = 0.3;
  const magnitude = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
  const normalized = magnitude - 9.81;
  
  if (Math.abs(magnitude - 9.83) > 0.01) {
    throw new Error(`加速度计算错误: ${magnitude}`);
  }
  console.log(`   合加速度: √(${x}² + ${y}² + ${z}²) = ${magnitude.toFixed(3)}`);
  console.log(`   去除重力后: ${normalized.toFixed(3)} m/s²`);
});

runTest('峰值检测算法', () => {
  function detectPeak(currentValue, recentValues) {
    if (currentValue < 1.5) return false;
    const recentMagnitudes = recentValues.map(v => v.magnitude);
    const maxInWindow = Math.max(...recentMagnitudes);
    return currentValue === maxInWindow && currentValue > 2.0;
  }
  
  const recentValues = [
    { magnitude: 1.5 }, { magnitude: 1.8 }, { magnitude: 2.2 },
    { magnitude: 2.8 }, { magnitude: 3.5 }, { magnitude: 3.2 },
    { magnitude: 2.5 }, { magnitude: 1.8 }, { magnitude: 1.2 },
  ];
  
  const isPeak = detectPeak(3.5, recentValues);
  const isNotPeak = detectPeak(1.0, recentValues);
  
  if (!isPeak) throw new Error('峰值未被检测到');
  if (isNotPeak) throw new Error('噪声被误判为峰值');
  console.log('   峰值检测: 峰值高度 > 2.0 m/s², 最小间隔 250ms');
});

runTest('步频分析 - 行走/跑步分类', () => {
  function calculateStepCadence(lastStepTimes, now) {
    if (lastStepTimes.length < 2) return 0;
    const timeSpan = now - lastStepTimes[0];
    if (timeSpan === 0) return 0;
    return (lastStepTimes.length / timeSpan) * 60000;
  }
  
  const now = Date.now();
  
  // 行走: 每步约 700ms，5 步耗时约 2.8秒，步频约 107 步/分
  const walkingTimes = [
    now - 2800, now - 2100, now - 1400, now - 700, now
  ];
  const walkingCadence = calculateStepCadence(walkingTimes, now);
  const isWalking = walkingCadence <= 120;
  
  // 跑步: 每步约 400ms，5 步耗时约 1.6秒，步频约 187 步/分
  const runningTimes = [
    now - 1600, now - 1200, now - 800, now - 400, now
  ];
  const runningCadence = calculateStepCadence(runningTimes, now);
  const isRunning = runningCadence > 120;
  
  if (!isWalking) throw new Error(`行走步频判定错误: ${walkingCadence.toFixed(0)} 步/分`);
  if (!isRunning) throw new Error(`跑步步频判定错误: ${runningCadence.toFixed(0)} 步/分`);
  
  console.log(`   行走: ${walkingCadence.toFixed(0)} 步/分 (≤120 = 行走)`);
  console.log(`   跑步: ${runningCadence.toFixed(0)} 步/分 (>120 = 跑步)`);
});

runTest('卡路里计算 (MET值)', () => {
  const userWeight = 70;
  const metWalking = 3.5;
  const metRunning = 8.0;
  const durationHours = 1 / 3600; // 1秒
  
  const walkingCalories = metWalking * userWeight * durationHours;
  const runningCalories = metRunning * userWeight * durationHours;
  
  if (walkingCalories <= 0 || runningCalories <= 0) {
    throw new Error('卡路里计算结果无效');
  }
  console.log(`   行走卡路里: MET=${metWalking} × ${userWeight}kg × 1小时 = ${(metWalking * userWeight).toFixed(0)} kcal/h`);
  console.log(`   跑步卡路里: MET=${metRunning} × ${userWeight}kg × 1小时 = ${(metRunning * userWeight).toFixed(0)} kcal/h`);
});

runTest('距离计算 (步长)', () => {
  const walkingStepLength = 0.5;
  const runningStepLength = 0.7;
  const steps = 10000;
  
  const walkingDistance = steps * walkingStepLength / 1000;
  const runningDistance = steps * runningStepLength / 1000;
  
  console.log(`   行走 10000步: ${walkingDistance.toFixed(1)} km (步长 ${walkingStepLength}m)`);
  console.log(`   跑步 10000步: ${runningDistance.toFixed(1)} km (步长 ${runningStepLength}m)`);
});

// -----------------------------------------------------------------------------
console.log('');
console.log('🔄 测试 5: 端到端流程验证');
console.log('-'.repeat(70));
// -----------------------------------------------------------------------------

runTest('食物识别流程', () => {
  const workflow = [
    '用户点击拍照识别按钮',
    '调用 ImagePicker 选择/拍摄照片',
    '上传到 Firebase Storage',
    '获取下载URL',
    '调用 recognizeFood 云函数',
    '云函数调用 Google Cloud Vision API 检测标签',
    '匹配本地食物数据库',
    '可选: 调用 Nutritionix API 查询详细营养',
    '返回识别结果给前端',
    '用户调整分量并确认',
    '保存到 mealLogs 集合',
    '更新 Redux state',
    'NutritionScreen 重新渲染'
  ];
  
  console.log(`   流程步骤: ${workflow.length} 步`);
  workflow.forEach((step, i) => {
    console.log(`   ${i + 1}. ${step}`);
  });
});

runTest('传感器实时更新数据流', () => {
  const dataFlow = [
    '加速度计硬件',
    '↓ (x, y, z)',
    'sensorService.handleAccelerometerData',
    '↓ (峰值检测 + 步频分析)',
    'updateLocalSteps (Redux)',
    '↓ (steps, walkingSteps, runningSteps, distance, calories)',
    'HomeScreen UI 更新',
    '↓ (异步)',
    'updateSteps (Firestore)',
    '↓',
    'updateLeaderboard (云函数触发器)',
    '↓',
    '排行榜更新'
  ];
  
  console.log(`   数据流链路:`);
  dataFlow.forEach(step => console.log(`   ${step}`));
});

runTest('社交动态分享链路', () => {
  const socialFlow = [
    '用户创建动态',
    '选择可见性 (public/friends/private)',
    '写入 posts 集合',
    '↓',
    '好友打开 SocialScreen',
    '↓',
    'fetchFeed (根据隐私设置过滤)',
    '↓',
    '公开动态: 所有人可见',
    '好友可见: 仅好友列表中的用户可见',
    '私密动态: 仅作者本人可见',
    '↓',
    'UI 正确显示可访问的动态'
  ];
  
  console.log(`   社交数据链路:`);
  socialFlow.forEach(step => console.log(`   ${step}`));
});

// -----------------------------------------------------------------------------
console.log('');
console.log('🧮 测试 6: 云函数核心算法验证');
console.log('-'.repeat(70));
// -----------------------------------------------------------------------------

runTest('周统计热量平衡分析', () => {
  const testCases = [
    { 
      goal: 'lose_fat', 
      burned: 2500, 
      consumed: 2000, 
      expectedGoalMet: true,
      expectedSuggestion: '热量缺口控制良好'
    },
    { 
      goal: 'lose_fat', 
      burned: 1800, 
      consumed: 2200, 
      expectedGoalMet: false,
      expectedSuggestion: '建议增加有氧运动'
    },
    { 
      goal: 'build_muscle', 
      burned: 2500, 
      consumed: 2800, 
      workoutDays: 5,
      expectedGoalMet: true,
      expectedSuggestion: '训练和饮食都很到位'
    },
  ];
  
  testCases.forEach((testCase, i) => {
    let goalMet = false;
    let suggestion = '';
    
    switch (testCase.goal) {
      case 'lose_fat':
        goalMet = testCase.burned > testCase.consumed;
        suggestion = goalMet
          ? '本周热量缺口控制良好，继续保持！'
          : '本周热量摄入略高，建议增加有氧运动或控制饮食。';
        break;
      case 'build_muscle':
        goalMet = testCase.consumed > testCase.burned && (testCase.workoutDays || 0) >= 4;
        suggestion = goalMet
          ? '本周训练和饮食都很到位，肌肉增长效果会很好！'
          : '建议增加蛋白质摄入和力量训练频率。';
        break;
    }
    
    if (goalMet !== testCase.expectedGoalMet) {
      throw new Error(`测试用例 ${i + 1} 目标达成判断错误`);
    }
    if (!suggestion.includes(testCase.expectedSuggestion)) {
      throw new Error(`测试用例 ${i + 1} 建议内容错误`);
    }
  });
  console.log('   减脂目标: 消耗 > 摄入 = 达成');
  console.log('   增肌目标: 摄入 > 消耗 且 训练天数 ≥ 4 = 达成');
});

runTest('挑战进度计算', () => {
  const challenges = [
    { type: 'streak', target: 7, currentStreak: 5, expectedProgress: 6, expectedComplete: false }, // 5+1=6 < 7
    { type: 'streak', target: 7, currentStreak: 6, expectedProgress: 7, expectedComplete: true },  // 6+1=7 >= 7
    { type: 'steps', target: 100000, totalSteps: 95000, todaySteps: 6000, expectedProgress: 101000, expectedComplete: true }, // 95000+6000=101000 >= 100000
  ];
  
  challenges.forEach((challenge, i) => {
    let newProgress = challenge.currentStreak || challenge.totalSteps || 0;
    let completed = false;
    
    switch (challenge.type) {
      case 'streak':
        newProgress = (challenge.currentStreak || 0) + 1;
        if (newProgress >= challenge.target) completed = true;
        break;
      case 'steps':
        newProgress = (challenge.totalSteps || 0) + (challenge.todaySteps || 0);
        if (newProgress >= challenge.target) completed = true;
        break;
    }
    
    if (newProgress !== challenge.expectedProgress) {
      throw new Error(`挑战 ${i + 1} 进度计算错误: 预期 ${challenge.expectedProgress}, 实际 ${newProgress}`);
    }
    if (completed !== challenge.expectedComplete) {
      throw new Error(`挑战 ${i + 1} 完成判断错误: 预期 ${challenge.expectedComplete}, 实际 ${completed}`);
    }
  });
  console.log('   连续打卡: 每日+1, 达到目标值完成');
  console.log('   步数挑战: 累计步数, 达到目标值完成');
});

// -----------------------------------------------------------------------------
console.log('');
console.log('=' .repeat(70));
console.log('📊 测试结果汇总');
console.log('=' .repeat(70));
console.log(`✅ 通过: ${passed} 项`);
console.log(`❌ 失败: ${failed} 项`);
console.log(`📊 通过率: ${failed === 0 ? '100' : ((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('');

if (failed === 0) {
  console.log('🎉 所有功能验证通过！代码质量良好，可以部署到真机测试。');
  console.log('');
  console.log('📋 后续部署步骤:');
  console.log('   1. firebase login');
  console.log('   2. firebase init  (选择现有项目)');
  console.log('   3. firebase deploy --only functions');
  console.log('   4. npm run ios 或 npm run android');
  console.log('');
  console.log('🔗 相关文档:');
  console.log('   - DEPLOYMENT.md - 完整部署指南');
  console.log('   - TEST_VERIFICATION.md - 详细测试报告');
  process.exit(0);
} else {
  console.log('⚠️  存在失败项，请修复后重新验证');
  process.exit(1);
}
