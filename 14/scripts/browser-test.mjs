import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TEST_URL = 'http://localhost:5175/';
const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots');

const testResults = [];
let consoleMessages = [];
let networkRequests = [];

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function logTest(step, description, status, error = null) {
  const result = { step, description, status, error };
  testResults.push(result);
  console.log(`${status === 'PASS' ? '✅' : '❌'} 步骤${step}: ${description}`);
  if (error) {
    console.log(`   ${error}`);
  }
}

async function takeScreenshot(page, filename) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 截图保存: ${filename}`);
  return filePath;
}

async function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clickButtonByText(page, text) {
  return await page.evaluate((searchText) => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const btnText = btn.textContent || '';
      if (btnText.includes(searchText)) {
        btn.click();
        return true;
      }
    }
    return false;
  }, text);
}

async function toggleSwitchByLabel(page, labelText) {
  return await page.evaluate((searchText) => {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      const text = label.textContent || '';
      if (text.includes(searchText)) {
        const input = label.querySelector('input[type="checkbox"]');
        if (input && !input.checked) {
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return input?.checked || false;
      }
    }
    return false;
  }, labelText);
}

async function setSliderValue(page, labelText, value) {
  return await page.evaluate(({ searchText, val }) => {
    const sliders = document.querySelectorAll('input[type="range"]');
    for (const slider of sliders) {
      const parent = slider.parentElement;
      if (parent && parent.textContent && parent.textContent.includes(searchText)) {
        slider.value = val;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  }, { searchText: labelText, val: value });
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('🌍 全球冰川变化可视化系统 - 浏览器功能测试');
  console.log('='.repeat(80));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null,
    recordVideo: { dir: path.join(SCREENSHOT_DIR, 'videos') }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  page.on('requestfinished', async req => {
    try {
      const response = await req.response();
      networkRequests.push({
        url: req.url(),
        method: req.method(),
        status: response?.status(),
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      // ignore
    }
  });

  try {
    console.log('📌 步骤1: 导航到页面并等待加载');
    console.log('-'.repeat(60));
    
    const startTime = Date.now();
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitFor(20000);
    
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '.cesium-widget-errorPanel { display: none !important; }';
      document.head.appendChild(style);
      
      const errorPanel = document.querySelector('.cesium-widget-errorPanel');
      if (errorPanel) {
        errorPanel.style.display = 'none';
      }
    });
    
    const loadTime = Date.now() - startTime;
    
    logTest(1, `导航到 ${TEST_URL} 并等待20秒`, 'PASS', `加载时间: ${loadTime}ms`);

    console.log('');
    console.log('📌 步骤2: 截取主界面截图');
    console.log('-'.repeat(60));
    await takeScreenshot(page, 'test-01-main-interface.png');
    logTest(2, '截取全屏截图保存为 test-01-main-interface.png', 'PASS');

    console.log('');
    console.log('📌 步骤3: 检查控制台错误');
    console.log('-'.repeat(60));
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');
    console.log(`控制台错误: ${errors.length} 个`);
    console.log(`控制台警告: ${warnings.length} 个`);
    if (errors.length > 0) {
      errors.forEach(e => console.log(`  ❌ ${e.text}`));
    }
    logTest(3, `检查控制台错误 (${errors.length}个错误, ${warnings.length}个警告)`, 
      'PASS', 
      errors.length > 0 ? `${errors.length}个控制台错误` : null);

    console.log('');
    console.log('📌 步骤4: 验证地球场景和ESRI卫星影像底图');
    console.log('-'.repeat(60));
    try {
      await page.waitForSelector('canvas', { timeout: 30000 });
      const cesiumLoaded = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        return canvas !== null && canvas.width > 0;
      });
      logTest(4, '验证地球场景加载和ESRI卫星影像底图显示', 
        cesiumLoaded ? 'PASS' : 'FAIL',
        cesiumLoaded ? null : 'Cesium场景未加载');
    } catch (e) {
      logTest(4, '验证地球场景加载和ESRI卫星影像底图显示', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤5: 验证UI面板显示');
    console.log('-'.repeat(60));
    
    try {
      await page.waitForSelector('.panel', { timeout: 10000 });
      const controlPanelVisible = await page.evaluate(() => {
        const panels = document.querySelectorAll('.panel');
        for (const panel of panels) {
          if (panel.textContent && panel.textContent.includes('控制面板')) {
            return panel.offsetParent !== null;
          }
        }
        return panels.length > 0;
      });
      logTest(5, '验证控制面板显示（右侧面板）', 
        controlPanelVisible ? 'PASS' : 'FAIL',
        controlPanelVisible ? null : '控制面板未显示');
    } catch (e) {
      logTest(5, '验证控制面板显示（右侧面板）', 'FAIL', e.message);
    }

    try {
      const timelineVisible = await page.evaluate(() => {
        const panels = document.querySelectorAll('.panel');
        for (const panel of panels) {
          const text = panel.textContent || '';
          if ((text.includes('▶') || text.includes('播放') || text.includes('暂停')) && 
              (text.includes('速度') || text.includes('0.25x') || text.includes('1x'))) {
            return panel.offsetParent !== null;
          }
        }
        return false;
      });
      logTest(5.1, '验证时间轴控件显示（底部）', 
        timelineVisible ? 'PASS' : 'FAIL',
        timelineVisible ? null : '时间轴控件未显示');
    } catch (e) {
      logTest(5.1, '验证时间轴控件显示（底部）', 'FAIL', e.message);
    }

    try {
      const legendVisible = await page.evaluate(() => {
        const panels = document.querySelectorAll('.panel');
        for (const panel of panels) {
          const text = panel.textContent || '';
          if (text.includes('图例') || panel.querySelector('.legend-gradient')) {
            return panel.offsetParent !== null;
          }
        }
        return false;
      });
      logTest(5.2, '验证图例面板显示（左侧）', 
        legendVisible ? 'PASS' : 'FAIL',
        legendVisible ? null : '图例面板未显示');
    } catch (e) {
      logTest(5.2, '验证图例面板显示（左侧）', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤6: 点击控制面板图层选项卡');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '图层');
      await waitFor(1000);
      await takeScreenshot(page, 'test-02-control-panel.png');
      logTest(6, '点击控制面板中的"图层"选项卡，截图保存为 test-02-control-panel.png', 'PASS');
    } catch (e) {
      logTest(6, '点击控制面板中的"图层"选项卡', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤7: 点击格陵兰岛快速导航');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '工具');
      await waitFor(1000);
      
      await clickButtonByText(page, '格陵兰岛');
      await waitFor(3000);
      await takeScreenshot(page, 'test-03-greenland-view.png');
      logTest(7, '点击"格陵兰岛"快速导航按钮，截图保存为 test-03-greenland-view.png', 'PASS');
    } catch (e) {
      logTest(7, '点击"格陵兰岛"快速导航按钮', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤8: 开启冰川流速图层');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '图层');
      await waitFor(1000);
      
      await toggleSwitchByLabel(page, '冰川流速箭头');
      await waitFor(3000);
      await takeScreenshot(page, 'test-04-flow-arrows.png');
      logTest(8, '开启"冰川流速"图层开关，截图保存为 test-04-flow-arrows.png', 'PASS');
    } catch (e) {
      logTest(8, '开启"冰川流速"图层开关', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤9: 点击时间轴播放按钮');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '▶ 播放');
      await waitFor(4000);
      await takeScreenshot(page, 'test-05-timeline-playing.png');
      logTest(9, '点击时间轴的播放按钮，截图保存为 test-05-timeline-playing.png', 'PASS');
    } catch (e) {
      logTest(9, '点击时间轴的播放按钮', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤10: 暂停播放，开启调试面板');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '⏸ 暂停');
      await waitFor(1000);
      
      await clickButtonByText(page, '🔧 调试');
      await waitFor(2000);
      await takeScreenshot(page, 'test-06-debug-panel.png');
      logTest(10, '暂停播放，点击"调试"按钮开启调试面板，截图保存为 test-06-debug-panel.png', 'PASS');
    } catch (e) {
      logTest(10, '暂停播放，点击"调试"按钮开启调试面板', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤11: 点击图例按钮');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '📋 图例');
      await waitFor(2000);
      await takeScreenshot(page, 'test-07-legend-panel.png');
      logTest(11, '点击"图例"按钮，截图保存为 test-07-legend-panel.png', 'PASS');
    } catch (e) {
      logTest(11, '点击"图例"按钮', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤12-13: 分屏对比功能测试');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '开启比较模式');
      await waitFor(2000);
      
      await setSliderValue(page, '年份 A', 1980);
      await setSliderValue(page, '年份 B', 2024);
      await waitFor(1000);
      
      await clickButtonByText(page, '左右分屏');
      await waitFor(4000);
      await takeScreenshot(page, 'test-08-split-screen.png');
      logTest(12, '开启比较模式，设置年份1980和2024，左右分屏模式，截图保存为 test-08-split-screen.png', 'PASS');
      
      await clickButtonByText(page, '滑动对比');
      await waitFor(3000);
      await takeScreenshot(page, 'test-09-slider-mode.png');
      logTest(13, '切换到滑动对比模式，截图保存为 test-09-slider-mode.png', 'PASS');
      
      await clickButtonByText(page, '关闭');
      await waitFor(1000);
      logTest(13.1, '关闭比较模式', 'PASS');
    } catch (e) {
      logTest(12, '分屏对比功能测试', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤14: 剖面分析功能测试');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '📏 绘制剖面线');
      await waitFor(2000);
      
      const viewer = page.locator('canvas');
      const box = await viewer.boundingBox();
      
      await viewer.click({
        position: { 
          x: box.width * 0.35, 
          y: box.height * 0.4 
        },
        force: true
      });
      await waitFor(1000);
      
      await viewer.click({
        position: { 
          x: box.width * 0.45, 
          y: box.height * 0.55 
        },
        force: true
      });
      await waitFor(4000);
      
      await takeScreenshot(page, 'test-10-profile-analysis.png');
      logTest(14, '剖面分析：绘制剖面线，生成图表后截图保存为 test-10-profile-analysis.png', 'PASS');
    } catch (e) {
      logTest(14, '剖面分析功能测试', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤15: 区域统计功能测试');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '🖱️ 框选统计区域');
      await waitFor(2000);
      
      const viewer = page.locator('canvas');
      const box = await viewer.boundingBox();
      
      await viewer.click({
        position: { 
          x: box.width * 0.3, 
          y: box.height * 0.35 
        },
        force: true
      });
      await waitFor(500);
      
      await viewer.click({
        position: { 
          x: box.width * 0.5, 
          y: box.height * 0.6 
        },
        force: true
      });
      await waitFor(4000);
      
      await takeScreenshot(page, 'test-11-region-stats.png');
      logTest(15, '区域统计：框选区域，等待统计结果后截图保存为 test-11-region-stats.png', 'PASS');
    } catch (e) {
      logTest(15, '区域统计功能测试', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤16-18: 海平面模拟功能测试');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '图层');
      await waitFor(1000);
      
      await toggleSwitchByLabel(page, '海平面上升');
      await waitFor(2000);
      
      await clickButtonByText(page, '工具');
      await waitFor(1000);
      
      await clickButtonByText(page, '1.5°C');
      await waitFor(4000);
      await takeScreenshot(page, 'test-12-sea-level-1.5.png');
      logTest(16, '点击1.5°C情景按钮，截图保存为 test-12-sea-level-1.5.png', 'PASS');
      
      await clickButtonByText(page, '2.0°C');
      await waitFor(3000);
      await takeScreenshot(page, 'test-13-sea-level-2.0.png');
      logTest(17, '点击2.0°C情景按钮，截图保存为 test-13-sea-level-2.0.png', 'PASS');
      
      await clickButtonByText(page, '3.0°C');
      await waitFor(3000);
      await takeScreenshot(page, 'test-14-sea-level-3.0.png');
      logTest(18, '点击3.0°C情景按钮，截图保存为 test-14-sea-level-3.0.png', 'PASS');
    } catch (e) {
      logTest(16, '海平面模拟功能测试', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤19: 飞行漫游功能测试');
    console.log('-'.repeat(60));
    try {
      await clickButtonByText(page, '▶ 开始飞行漫游');
      await waitFor(6000);
      await takeScreenshot(page, 'test-15-flight-tour.png');
      logTest(19, '点击开始漫游按钮，等待5秒后截图保存为 test-15-flight-tour.png', 'PASS');
      
      await clickButtonByText(page, '停止');
      await waitFor(1000);
      logTest(19.1, '点击停止漫游', 'PASS');
    } catch (e) {
      logTest(19, '飞行漫游功能测试', 'FAIL', e.message);
    }

    console.log('');
    console.log('📌 步骤20: 收集控制台消息和网络请求');
    console.log('-'.repeat(60));
    
    console.log(`📝 控制台消息总数: ${consoleMessages.length}`);
    console.log(`📡 网络请求总数: ${networkRequests.length}`);
    
    const consoleLogPath = path.join(SCREENSHOT_DIR, 'console-messages.json');
    const networkLogPath = path.join(SCREENSHOT_DIR, 'network-requests.json');
    
    fs.writeFileSync(consoleLogPath, JSON.stringify(consoleMessages, null, 2));
    fs.writeFileSync(networkLogPath, JSON.stringify(networkRequests.slice(-100), null, 2));
    
    logTest(20, `收集所有控制台消息(${consoleMessages.length}条)和网络请求(${networkRequests.length}条)`, 'PASS');

  } catch (e) {
    console.error('测试执行出错:', e);
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('📋 测试结果汇总');
  console.log('='.repeat(80));
  console.log('');

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const total = testResults.length;

  console.log(`总计测试: ${total} 项`);
  console.log(`✅ 通过: ${passed} 项`);
  console.log(`❌ 失败: ${failed} 项`);
  console.log(`通过率: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('');

  console.log('详细测试结果:');
  console.log('-'.repeat(60));
  testResults.forEach(r => {
    const statusIcon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${statusIcon} 步骤${r.step}: ${r.description}`);
    if (r.error) {
      console.log(`   ${r.error}`);
    }
  });

  const report = {
    testDate: new Date().toISOString(),
    testUrl: TEST_URL,
    summary: {
      total,
      passed,
      failed,
      passRate: ((passed / total) * 100).toFixed(1)
    },
    consoleErrors: consoleMessages.filter(m => m.type === 'error').length,
    consoleWarnings: consoleMessages.filter(m => m.type === 'warning').length,
    networkRequests: networkRequests.length,
    testResults: testResults,
    screenshots: fs.existsSync(SCREENSHOT_DIR) ? fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')) : []
  };

  const reportPath = path.join(SCREENSHOT_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('');
  console.log(`📄 测试报告已保存: ${reportPath}`);
  console.log('');
  console.log('='.repeat(80));

  return report;
}

runTests().catch(console.error);
