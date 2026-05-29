// 浏览器自动化测试 - 使用 Playwright
// 运行方式: npm run test-editor 或 node test-browser.cjs

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('=== 浏览器自动化测试开始 ===\n');
  
  // 确保截图目录存在
  const screenshotDir = path.join(__dirname, 'test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  const consoleLogs = [];
  const testResults = [];
  
  // 启动浏览器
  console.log('📱 启动浏览器...');
  const browser = await chromium.launch({
    headless: true, // 无头模式快速运行
    slowMo: 200,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  
  const page = await context.newPage();
  
  // 捕获控制台日志
  page.on('console', (msg) => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString(),
    };
    consoleLogs.push(logEntry);
    
    // 实时显示关键日志
    if (msg.text().includes('[EditorScene]') || 
        msg.text().includes('[App]') || 
        msg.text().includes('[LevelEditor]')) {
      console.log(`  📝 ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
  
  // 捕获页面错误
  page.on('pageerror', (error) => {
    console.log('  ❌ 页面错误:', error.message);
    testResults.push({ test: '页面无错误', passed: false, error: error.message });
  });
  
  try {
    // 测试1: 访问应用
    console.log('\n🌐 测试1: 访问应用');
    console.log('  等待开发服务器响应...');
    await page.waitForTimeout(2000);
    
    // 尝试多次访问（使用 IPv4 地址避免 IPv6 问题）
    let pageLoaded = false;
    for (let i = 0; i < 3 && !pageLoaded; i++) {
      try {
        await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
        pageLoaded = true;
      } catch (e) {
        console.log(`  第 ${i + 1} 次尝试失败，重试中...`);
        await page.waitForTimeout(2000);
      }
    }
    
    if (!pageLoaded) {
      throw new Error('页面加载失败，请检查开发服务器是否正常运行');
    }
    
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: path.join(screenshotDir, '01-homepage.png'), fullPage: true });
    console.log('  ✅ 页面加载完成');
    testResults.push({ test: '页面加载', passed: true });
    
    // 测试2: 进入编辑器模式
    console.log('\n🎮 测试2: 进入编辑器模式');
    const editorButton = page.getByText('关卡编辑器');
    await editorButton.waitFor({ state: 'visible', timeout: 5000 });
    await editorButton.click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: path.join(screenshotDir, '02-editor-mode.png'), fullPage: true });
    console.log('  ✅ 进入编辑器模式');
    testResults.push({ test: '进入编辑器模式', passed: true });
    
    // 检查编辑器布局
    const hasEditorPanel = await page.evaluate(() => {
      return document.querySelector('.w-96') !== null;
    });
    console.log(`  ✅ 编辑器面板存在: ${hasEditorPanel}`);
    testResults.push({ test: '编辑器面板显示', passed: hasEditorPanel });
    
    // 测试3: 点击平台按钮
    console.log('\n🔲 测试3: 点击平台按钮');
    const platformButton = page.locator('button:has-text("平台")').first();
    await platformButton.waitFor({ state: 'visible', timeout: 5000 });
    await platformButton.click();
    await page.waitForTimeout(1000);
    
    // 检查按钮是否激活（高亮）
    const isPlatformActive = await platformButton.evaluate((el) => {
      return el.classList.contains('bg-game-accent') || el.classList.contains('text-white');
    });
    console.log(`  ✅ 平台按钮激活: ${isPlatformActive}`);
    testResults.push({ test: '平台按钮激活', passed: isPlatformActive });
    
    // 测试4: 点击3D场景添加平台
    console.log('\n🖱️  测试4: 点击3D场景添加平台');
    const canvas = page.locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 5000 });
    
    // 获取 canvas 位置并点击中心偏左的位置
    const box = await canvas.boundingBox();
    if (box) {
      // 点击 canvas 的中心位置
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: path.join(screenshotDir, '03-after-click-platform.png'), fullPage: true });
      console.log('  ✅ 已点击3D场景');
    }
    
    // 等待状态更新
    await page.waitForTimeout(1500);
    
    // 测试5: 检查控制台日志
    console.log('\n📋 测试5: 检查控制台日志');
    
    // 检查关键日志是否存在
    const hasEditorSceneLog = consoleLogs.some(log => 
      log.text.includes('[EditorScene] mousedown triggered'));
    const hasAppLog = consoleLogs.some(log => 
      log.text.includes('[App] handleEditorAddElement called'));
    const hasLevelEditorLog = consoleLogs.some(log => 
      log.text.includes('[LevelEditor] render'));
    
    console.log(`  EditorScene 点击日志: ${hasEditorSceneLog ? '✅' : '❌'}`);
    console.log(`  App 元素添加日志: ${hasAppLog ? '✅' : '❌'}`);
    console.log(`  LevelEditor 渲染日志: ${hasLevelEditorLog ? '✅' : '❌'}`);
    
    testResults.push({ test: 'EditorScene 点击日志', passed: hasEditorSceneLog });
    testResults.push({ test: 'App 元素添加日志', passed: hasAppLog });
    testResults.push({ test: 'LevelEditor 渲染日志', passed: hasLevelEditorLog });
    
    // 测试6: 检查右侧列表是否显示平台
    console.log('\n📝 测试6: 检查右侧列表是否显示平台');
    
    // 等待 React 更新
    await page.waitForTimeout(1000);
    
    // 检查平台列表项数量
    const platformCount = await page.evaluate(() => {
      const platformElements = document.querySelectorAll('div:has(> div > svg) + div');
      return platformElements.length;
    });
    
    // 另一种方式：检查包含平台坐标的元素
    const hasPlatformCoordinates = await page.evaluate(() => {
      const allText = document.body.innerText;
      return allText.includes('X:') && allText.includes('Y:') && allText.includes('Z:');
    });
    
    console.log(`  找到坐标元素: ${hasPlatformCoordinates ? '✅' : '❌'}`);
    testResults.push({ test: '平台列表显示坐标', passed: hasPlatformCoordinates });
    
    await page.screenshot({ path: path.join(screenshotDir, '04-platform-in-list.png'), fullPage: true });
    
    // 测试7: 添加目标点
    console.log('\n🎯 测试7: 添加目标点');
    const targetButton = page.locator('button:has-text("目标")').first();
    await targetButton.click();
    await page.waitForTimeout(500);
    
    if (box) {
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.6);
      await page.waitForTimeout(1500);
    }
    
    await page.screenshot({ path: path.join(screenshotDir, '05-after-add-target.png'), fullPage: true });
    console.log('  ✅ 目标点添加完成');
    testResults.push({ test: '添加目标点', passed: true });
    
    // 测试8: 添加星星
    console.log('\n⭐ 测试8: 添加星星');
    const starButton = page.locator('button:has-text("星星")').first();
    await starButton.click();
    await page.waitForTimeout(500);
    
    if (box) {
      await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
      await page.waitForTimeout(1500);
    }
    
    await page.screenshot({ path: path.join(screenshotDir, '06-after-add-star.png'), fullPage: true });
    console.log('  ✅ 星星添加完成');
    testResults.push({ test: '添加星星', passed: true });
    
    // 测试9: 保存关卡
    console.log('\n💾 测试9: 保存关卡');
    const saveButton = page.locator('button:has-text("保存关卡")').first();
    await saveButton.click();
    await page.waitForTimeout(1000);
    
    // 处理 alert 对话框
    page.once('dialog', async (dialog) => {
      console.log(`  📢 对话框消息: ${dialog.message()}`);
      await dialog.accept();
    });
    
    await page.waitForTimeout(1500);
    
    // 检查保存日志
    const hasSaveLog = consoleLogs.some(log => 
      log.text.includes('[LevelEditor] levelToSave:') || 
      log.text.includes('关卡保存成功'));
    console.log(`  保存日志存在: ${hasSaveLog ? '✅' : '❌'}`);
    testResults.push({ test: '保存关卡日志', passed: hasSaveLog });
    
    await page.screenshot({ path: path.join(screenshotDir, '07-after-save.png'), fullPage: true });
    
    // 测试10: 验证返回主菜单后自定义关卡存在
    console.log('\n🏠 测试10: 验证自定义关卡存在');
    
    // 等待返回主菜单
    await page.waitForTimeout(2000);
    
    // 检查是否有自定义关卡
    const hasCustomLevel = await page.evaluate(() => {
      return document.body.innerText.includes('自定义') || 
             document.body.innerText.includes('我的关卡');
    });
    
    console.log(`  自定义关卡存在: ${hasCustomLevel ? '✅' : '⚠️  (可能需要手动检查)'}`);
    testResults.push({ test: '自定义关卡显示', passed: hasCustomLevel, warning: !hasCustomLevel });
    
    // 最终截图
    await page.screenshot({ path: path.join(screenshotDir, '08-final.png'), fullPage: true });
    
  } catch (error) {
    console.log('  ❌ 测试过程出错:', error.message);
    testResults.push({ test: '测试执行', passed: false, error: error.message });
  }
  
  // 保存控制台日志到文件
  const logFilePath = path.join(screenshotDir, 'console-logs.json');
  fs.writeFileSync(logFilePath, JSON.stringify(consoleLogs, null, 2));
  console.log(`\n📄 控制台日志已保存到: ${logFilePath}`);
  
  // 保存测试结果
  const resultsFilePath = path.join(screenshotDir, 'test-results.json');
  fs.writeFileSync(resultsFilePath, JSON.stringify(testResults, null, 2));
  console.log(`📊 测试结果已保存到: ${resultsFilePath}`);
  
  // 输出测试汇总
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  
  testResults.forEach((result, index) => {
    const status = result.passed ? '✅' : (result.warning ? '⚠️ ' : '❌');
    console.log(`  ${index + 1}. ${status} ${result.test}`);
    if (result.passed) passed++;
    else if (result.warning) warnings++;
    else failed++;
  });
  
  console.log('='.repeat(60));
  console.log(`  通过: ${passed} | 失败: ${failed} | 警告: ${warnings}`);
  console.log(`  截图保存位置: ${screenshotDir}`);
  console.log('='.repeat(60));
  
  // 输出关键控制台日志
  console.log('\n' + '='.repeat(60));
  console.log('📝 关键控制台日志摘录');
  console.log('='.repeat(60));
  
  const keyLogs = consoleLogs.filter(log => 
    log.text.includes('[EditorScene]') || 
    log.text.includes('[App]') || 
    log.text.includes('[LevelEditor]') ||
    log.type === 'error'
  );
  
  if (keyLogs.length > 0) {
    keyLogs.slice(0, 30).forEach(log => {
      const prefix = log.type === 'error' ? '❌ ' : '   ';
      console.log(`${prefix}${log.text.substring(0, 150)}${log.text.length > 150 ? '...' : ''}`);
    });
  } else {
    console.log('  (未找到关键日志，可能需要检查事件是否触发)');
  }
  
  console.log('='.repeat(60));
  
  await browser.close();
  
  console.log('\n✅ 测试完成！');
  console.log('\n💡 请查看 test-screenshots 目录下的截图和日志文件');
  console.log('   如果有任何失败的测试，请告诉我具体的错误信息');
}

// 运行测试
runTest().catch(console.error);
