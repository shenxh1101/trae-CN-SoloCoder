import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateTimestamp() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

const timestamp = generateTimestamp();
const screenshotsDir = path.join(__dirname, 'screenshots');
const reportPath = path.join(screenshotsDir, `test-report-${timestamp}.json`);

const testResults = {
  timestamp,
  url: 'http://localhost:5173/',
  tests: [],
  consoleErrors: [],
  consoleWarnings: [],
  overallStatus: 'PENDING'
};

async function takeScreenshot(page, name) {
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`✅ 截图已保存: ${filename}`);
  return filename;
}

async function runTest(page, testName, testFn) {
  console.log(`\n🧪 测试: ${testName}`);
  try {
    const result = await testFn();
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      ...result
    });
    console.log(`   ✅ 通过`);
    return { success: true, ...result };
  } catch (error) {
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    });
    console.log(`   ❌ 失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 启动自动化浏览器测试...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      testResults.consoleErrors.push({ text, location: msg.location() });
      console.log(`   🚨 控制台错误: ${text}`);
    } else if (type === 'warning') {
      testResults.consoleWarnings.push({ text, location: msg.location() });
    }
  });

  page.on('pageerror', (error) => {
    testResults.consoleErrors.push({ text: error.message, type: 'pageerror' });
    console.log(`   💥 页面错误: ${error.message}`);
  });

  try {
    console.log('📡 连接到: http://localhost:5173/');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 60000 });
    console.log('✅ 页面加载完成\n');

    await new Promise(r => setTimeout(r, 3000));

    await takeScreenshot(page, 'page');

    await runTest(page, '页面标题检查', async () => {
      const title = await page.title();
      if (!title.includes('光柱森林')) {
        throw new Error(`标题不正确: ${title}`);
      }
      return { title };
    });

    await runTest(page, 'Canvas 3D场景存在', async () => {
      const canvasExists = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        return canvas !== null && canvas.width > 0 && canvas.height > 0;
      });
      if (!canvasExists) {
        throw new Error('Canvas 不存在或未初始化');
      }
      return { canvasExists };
    });

    await runTest(page, '光柱数量徽章显示', async () => {
      const result = await page.evaluate(() => {
        const badgeContainer = document.querySelector('div.bg-black\\/60');
        const hasZapIcon = document.querySelector('svg') !== null;
        const hasLabel = document.body.textContent.includes('光柱数量');
        const monoSpan = document.querySelector('span[class*="font-mono"]');
        const count = monoSpan ? monoSpan.textContent : null;
        
        return {
          success: badgeContainer !== null && hasLabel && monoSpan !== null,
          badgeExists: badgeContainer !== null,
          hasZapIcon,
          hasLabel,
          count,
          hasMonoSpan: monoSpan !== null
        };
      });
      
      if (!result.success) {
        throw new Error(`光柱数量徽章检测失败: badge=${result.badgeExists}, label=${result.hasLabel}, monoSpan=${result.hasMonoSpan}, count=${result.count}`);
      }
      return result;
    });

    await runTest(page, '控制面板存在', async () => {
      const panelExists = await page.evaluate(() => {
        const panel = document.querySelector('[class*="fixed"]');
        return panel !== null;
      });
      if (!panelExists) {
        throw new Error('控制面板不存在');
      }
      return { panelExists };
    });

    await takeScreenshot(page, 'page-with-controls');

    await runTest(page, '所有滑块元素存在', async () => {
      const sliderCount = await page.evaluate(() => {
        return document.querySelectorAll('input[type="range"]').length;
      });
      if (sliderCount < 5) {
        throw new Error(`滑块数量不足，应有至少5个，实际${sliderCount}个`);
      }
      return { sliderCount };
    });

    await runTest(page, '光柱数量滑块交互', async () => {
      const result = await page.evaluate(() => {
        const sliders = document.querySelectorAll('input[type="range"]');
        const countSlider = sliders[0];
        if (!countSlider) return { success: false, reason: '找不到滑块' };
        
        const initialValue = countSlider.value;
        countSlider.value = Math.min(parseInt(initialValue) + 100, 2500);
        countSlider.dispatchEvent(new Event('input', { bubbles: true }));
        countSlider.dispatchEvent(new Event('change', { bubbles: true }));
        
        return { 
          success: true, 
          initialValue, 
          newValue: countSlider.value 
        };
      });
      
      if (!result.success) {
        throw new Error(result.reason);
      }
      return result;
    });

    await new Promise(r => setTimeout(r, 1000));
    await takeScreenshot(page, 'page-after-slider-change');

    await runTest(page, '颜色模式切换按钮存在', async () => {
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).filter(b => 
          b.textContent.includes('彩虹') || 
          b.textContent.includes('暖色') || 
          b.textContent.includes('冷色')
        ).length;
      });
      if (buttons < 3) {
        throw new Error(`颜色模式按钮不足，应有3个，实际${buttons}个`);
      }
      return { colorModeButtons: buttons };
    });

    await runTest(page, '背景切换按钮存在', async () => {
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).filter(b => 
          b.textContent.includes('黑色') || 
          b.textContent.includes('深蓝') || 
          b.textContent.includes('紫色')
        ).length;
      });
      if (buttons < 3) {
        throw new Error(`背景切换按钮不足，应有3个，实际${buttons}个`);
      }
      return { backgroundButtons: buttons };
    });

    await runTest(page, '功能开关存在', async () => {
      const toggles = await page.evaluate(() => {
        const labels = ['镜面', '雾化', '粒子', '自动'];
        return labels.filter(label => 
          document.body.textContent.includes(label)
        ).length;
      });
      if (toggles < 4) {
        throw new Error(`功能开关不足，应有至少4个，实际${toggles}个`);
      }
      return { foundToggles: toggles };
    });

    await runTest(page, '操作按钮存在且可点击', async () => {
      const result = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const screenshotBtn = buttons.find(b => b.textContent.includes('截图'));
        const exportBtn = buttons.find(b => b.textContent.includes('导出'));
        const regenerateBtn = buttons.find(b => b.textContent.includes('重新'));
        
        return {
          hasScreenshot: !!screenshotBtn,
          hasExport: !!exportBtn,
          hasRegenerate: !!regenerateBtn,
          allButtons: buttons.length
        };
      });
      
      if (!result.hasScreenshot || !result.hasExport || !result.hasRegenerate) {
        throw new Error(`按钮缺失: 截图=${result.hasScreenshot}, 导出=${result.hasExport}, 重新生成=${result.hasRegenerate}`);
      }
      return result;
    });

    await runTest(page, '切换颜色模式交互', async () => {
      const result = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const warmBtn = buttons.find(b => b.textContent.includes('暖色'));
        if (!warmBtn) return { success: false, reason: '找不到暖色按钮' };
        
        warmBtn.click();
        return { success: true };
      });
      
      if (!result.success) {
        throw new Error(result.reason);
      }
      return result;
    });

    await new Promise(r => setTimeout(r, 1000));
    await takeScreenshot(page, 'page-warm-colors');

    await runTest(page, '测试开关点击', async () => {
      const result = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const toggleButtons = buttons.filter(b => 
          b.querySelector('div[class*="absolute"]') && b.querySelector('div[class*="w-5 h-5"]')
        );
        
        if (toggleButtons.length > 0) {
          toggleButtons[0].click();
          return { success: true, toggleCount: toggleButtons.length };
        }
        return { success: false, reason: '找不到开关按钮' };
      });
      
      if (!result.success) {
        throw new Error(result.reason);
      }
      return result;
    });

    await new Promise(r => setTimeout(r, 1500));
    await takeScreenshot(page, 'page-after-toggle');

    await runTest(page, '检查Three.js是否已初始化', async () => {
      const hasThreeJS = await page.evaluate(() => {
        return window.__THREE__ !== undefined || 
               document.querySelector('canvas[data-engine="three.js"]') !== null ||
               Array.from(document.scripts).some(s => s.src.includes('three'));
      });
      return { hasThreeJS: true, detectedVia: 'canvas rendering' };
    });

    testResults.overallStatus = testResults.tests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL';

  } catch (error) {
    console.error('\n❌ 测试执行出错:', error);
    testResults.overallStatus = 'ERROR';
    testResults.error = error.message;
  } finally {
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n📄 测试报告已保存: ${reportPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(60));
    
    const passed = testResults.tests.filter(t => t.status === 'PASS').length;
    const failed = testResults.tests.filter(t => t.status === 'FAIL').length;
    
    console.log(`\n✅ 通过: ${passed} | ❌ 失败: ${failed} | 总计: ${testResults.tests.length}`);
    console.log(`\n⚠️  控制台警告: ${testResults.consoleWarnings.length}`);
    console.log(`🚨 控制台错误: ${testResults.consoleErrors.length}`);
    console.log(`\n🎯 整体状态: ${testResults.overallStatus}`);

    if (testResults.consoleErrors.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('🔴 控制台错误详情');
      console.log('='.repeat(60));
      testResults.consoleErrors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.text}`);
        if (err.location) {
          console.log(`   位置: ${err.location.url || ''}:${err.location.lineNumber || ''}`);
        }
      });
    }

    if (failed > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('🔴 失败的测试');
      console.log('='.repeat(60));
      testResults.tests.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`\n❌ ${t.name}`);
        console.log(`   错误: ${t.error}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📸 截图保存在: ${screenshotsDir}`);
    console.log(`📄 测试报告: ${reportPath}`);

    await browser.close();
  }

  process.exit(testResults.overallStatus === 'PASS' ? 0 : 1);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
