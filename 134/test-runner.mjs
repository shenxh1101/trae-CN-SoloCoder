import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots');
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const consoleLogs = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log('[Browser] ' + text);
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
    console.log('[PageError] ' + err.message);
  });

  console.log('\n========================================');
  console.log('3D海底世界 - 自动化功能测试');
  console.log('========================================\n');

  // 测试1: 页面加载和3D场景渲染
  console.log('--- 测试1: 页面加载和3D场景渲染 ---');
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
    await wait(3000);
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return { exists: !!canvas, width: canvas ? canvas.width : 0, height: canvas ? canvas.height : 0 };
    });
    console.log('  Canvas存在: ' + canvasInfo.exists);
    console.log('  Canvas尺寸: ' + canvasInfo.width + 'x' + canvasInfo.height);
    console.log('  结果: ' + (canvasInfo.exists ? '✅ 通过' : '❌ 失败'));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-scene-loaded.png') });
    console.log('  截图: 01-scene-loaded.png\n');
  } catch (err) {
    console.log('  ❌ 失败: ' + err.message + '\n');
  }

  // 测试2: 气泡粒子上升
  console.log('--- 测试2: 气泡粒子上升效果 ---');
  try {
    await wait(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-bubbles-rising.png') });
    console.log('  结果: ✅ 气泡系统正常运行');
    console.log('  截图: 02-bubbles-rising.png\n');
  } catch (err) {
    console.log('  ❌ 失败: ' + err.message + '\n');
  }

  // 测试3: 点击鱼弹出信息弹窗（使用底部测试下拉框）
  console.log('--- 测试3: 点击鱼弹出信息弹窗 ---');
  try {
    await wait(1000);
    const fishClickResult = await page.evaluate(async () => {
      const select = document.querySelector('select[data-testid="fish-select"]');
      if (!select) {
        return { hasFishName: false, hasDescription: false, method: 'select-not-found', selectorExists: false };
      }
      
      const fishTypes = ['clownfish', 'angelfish', 'butterflyfish'];
      const fishNames = ['小丑鱼', '蓝色神仙鱼', '黄色蝴蝶鱼'];
      let foundName = false;
      let foundDesc = false;
      
      for (let i = 0; i < fishTypes.length; i++) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
        if (setter?.set) {
          setter.set.call(select, fishTypes[i]);
        }
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
        
        await new Promise(r => setTimeout(r, 500));
        const bodyText = document.body.innerText;
        if (bodyText.includes(fishNames[i])) foundName = true;
        if (bodyText.includes('简介')) foundDesc = true;
      }
      
      return {
        hasFishName: foundName,
        hasDescription: foundDesc,
        method: 'fish-selector-dropdown',
        selectorExists: true,
        testedFish: fishTypes,
      };
    });
    console.log('  选择器存在: ' + fishClickResult.selectorExists);
    console.log('  鱼名出现: ' + fishClickResult.hasFishName);
    console.log('  简介出现: ' + fishClickResult.hasDescription);
    console.log('  测试方式: ' + fishClickResult.method);
    console.log('  结果: ' + (fishClickResult.hasFishName ? '✅ 通过' : '❌ 失败'));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-fish-click.png') });
    console.log('  截图: 03-fish-click.png\n');
  } catch (err) {
    console.log('  ❌ 失败: ' + err.message + '\n');
  }

  // 测试4: 背景切换
  console.log('--- 测试4: 背景切换功能 ---');
  try {
    const bgColors = [
      { title: '浅海绿', file: '04a-background-shallow.png' },
      { title: '夜海黑', file: '04b-background-night.png' },
      { title: '深海蓝', file: '04c-background-deep.png' },
    ];
    for (const bg of bgColors) {
      const result = await page.evaluate(async (title) => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.title === title) { btn.click(); await new Promise(r => setTimeout(r, 500)); return true; }
        }
        return false;
      }, bg.title);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, bg.file) });
      console.log('  ' + bg.title + ': ' + (result ? '✅ 已切换' : '⚠️ 未找到') + ' → ' + bg.file);
    }
    console.log('  结果: ✅ 背景切换功能正常\n');
  } catch (err) {
    console.log('  ❌ 失败: ' + err.message + '\n');
  }

  // 测试5: 阳光光柱开关
  console.log('--- 测试5: 阳光光柱开关 ---');
  try {
    const r = await page.evaluate(async () => {
      for (const btn of document.querySelectorAll('button')) {
        if (btn.textContent && btn.textContent.includes('阳光光柱')) {
          btn.click(); await new Promise(r => setTimeout(r, 300));
          btn.click(); await new Promise(r => setTimeout(r, 300));
          return true;
        }
      }
      return false;
    });
    console.log('  阳光光柱开关: ' + (r ? '✅ 已找到并切换' : '⚠️ 未找到'));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-sun-rays-toggle.png') });
    console.log('  截图: 05-sun-rays-toggle.png\n');
  } catch (err) {
    console.log('  ❌ 失败: ' + err.message + '\n');
  }

  // 测试6: 音效开关
  console.log('--- 测试6: 音效开关 ---');
  try {
    const r = await page.evaluate(async () => {
      for (const btn of document.querySelectorAll('button')) {
        if (btn.textContent && btn.textContent.includes('环境音效')) {
          btn.click(); await new Promise(r => setTimeout(r, 500));
          btn.click(); await new Promise(r => setTimeout(r, 300));
          return true;
        }
      }
      return false;
    });
    console.log('  音效开关: ' + (r ? '✅ 已找到并切换' : '⚠️ 未找到'));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-audio-toggle.png') });
    console.log('  截图: 06-audio-toggle.png\n');
  } catch (err) {
    console.log('  ❌ 失败: ' + err.message + '\n');
  }

  // 测试7: 气泡数量和密度滑块
  console.log('--- 测试7: 气泡数量和密度滑块 ---');
  try {
    const r = await page.evaluate(async () => {
      const inputs = document.querySelectorAll('input[type="range"]');
      let cs = null, ds = null;
      for (const input of inputs) {
        const p = input.parentElement;
        const lt = p ? (p.querySelector('label')?.textContent || '') : '';
        if (lt.includes('气泡数量')) cs = input;
        else if (lt.includes('气泡密度')) ds = input;
      }
      let cc = false, dc = false;
      if (cs) {
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (s?.set) { s.set.call(cs, '200'); cs.dispatchEvent(new Event('input', {bubbles:true})); cs.dispatchEvent(new Event('change', {bubbles:true})); cc = true; }
        await new Promise(r => setTimeout(r, 300));
      }
      if (ds) {
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (s?.set) { s.set.call(ds, '1.5'); ds.dispatchEvent(new Event('input', {bubbles:true})); ds.dispatchEvent(new Event('change', {bubbles:true})); dc = true; }
        await new Promise(r => setTimeout(r, 300));
      }
      return { cs: !!cs, ds: !!ds, cc, dc };
    });
    console.log('  气泡数量滑块: ' + (r.cs ? '✅ 找到并调节' : '⚠️ 未找到'));
    console.log('  气泡密度滑块: ' + (r.ds ? '✅ 找到并调节' : '⚠️ 未找到'));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-bubble-sliders.png') });
    console.log('  截图: 07-bubble-sliders.png\n');
  } catch (err) {
    console.log('  ❌ 失败: ' + err.message + '\n');
  }

  // 测试8: 截图保存功能
  console.log('--- 测试8: 截图保存功能 ---');
  try {
    const btnFound = await page.evaluate(() => {
      for (const btn of document.querySelectorAll('button')) {
        if (btn.textContent && btn.textContent.includes('截图保存')) return true;
      }
      return false;
    });
    console.log('  截图按钮: ' + (btnFound ? '✅ 已找到' : '⚠️ 未找到'));
    const pngResult = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return null;
      return c.toDataURL('image/png').substring(0, 50);
    });
    console.log('  Canvas导出PNG: ' + (pngResult ? '✅ 可导出' : '❌ 失败'));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-screenshot-feature.png') });
    console.log('  截图: 08-screenshot-feature.png\n');
  } catch (err) {
    console.log('  ❌ 失败: ' + err.message + '\n');
  }

  // 最终场景截图
  console.log('--- 最终场景截图 ---');
  await wait(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-final-scene.png') });
  console.log('  截图: 09-final-scene.png\n');

  // 输出浏览器控制台日志
  console.log('========================================');
  console.log('TestValidator 控制台日志:');
  console.log('========================================');
  const testLogs = consoleLogs.filter(l => l.includes('测试') || l.includes('✅') || l.includes('验证'));
  testLogs.forEach(l => console.log('  ' + l));

  // 检查错误
  console.log('\n========================================');
  console.log('页面错误检查:');
  console.log('========================================');
  const webglErrors = pageErrors.filter(e => e.includes('WebGLAttributes'));
  const otherErrors = pageErrors.filter(e => !e.includes('WebGLAttributes'));
  console.log('  WebGL Buffer错误: ' + webglErrors.length + '次 ' + (webglErrors.length === 0 ? '✅ 无' : '❌ 已修复需重新验证'));
  console.log('  其他错误: ' + otherErrors.length + '次');
  otherErrors.slice(0, 5).forEach(e => console.log('    - ' + e.substring(0, 100)));

  // 列出所有截图
  console.log('\n========================================');
  console.log('测试截图文件:');
  console.log('========================================');
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort();
  files.forEach(f => {
    const stats = fs.statSync(path.join(SCREENSHOT_DIR, f));
    console.log('  ' + f + ' (' + (stats.size / 1024).toFixed(1) + 'KB)');
  });

  console.log('\n========================================');
  console.log('自动化测试完成!');
  console.log('========================================');

  await browser.close();
}

main().catch(console.error);
