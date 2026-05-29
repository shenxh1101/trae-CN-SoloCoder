import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(page, name) {
  await page.waitForTimeout(1500);
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const stats = fs.statSync(screenshotPath);
  console.log(`✅ ${name}.png (${(stats.size / 1024).toFixed(1)} KB)`);
  return screenshotPath;
}

async function main() {
  console.log('🎄 开始生成功能验证截图...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  console.log('🌐 加载页面...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(5000);
  console.log('✅ 3D场景已渲染\n');

  console.log('📸 1. 3D场景白天模式 (房子、圣诞树、雪人、雪花粒子):');
  await takeScreenshot(page, '01-3d-scene-day');

  console.log('\n📸 2. 打开控制面板展示所有控制选项:');
  const panelButtons = await page.locator('button[class*="fixed top-4 left-4"]').all();
  if (panelButtons.length > 0) {
    await panelButtons[0].click({ force: true });
  } else {
    await page.click('button:has(svg.lucide-settings)', { force: true });
  }
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '02-control-panel-open');

  console.log('\n📸 3. 切换到夜晚模式展示窗户灯光效果:');
  const allButtons = await page.locator('div[class*="bg-gray-900"] button[class*="rounded-full"]').all();
  console.log(`找到 ${allButtons.length} 个开关按钮`);
  await allButtons[0].click({ force: true });
  await page.waitForTimeout(3500);
  await takeScreenshot(page, '03-night-mode-with-lights');

  console.log('\n📸 4. 自动环绕模式运行中的状态:');
  await allButtons[1].click({ force: true });
  await page.waitForTimeout(3000);
  await takeScreenshot(page, '04-auto-orbit-mode');

  console.log('\n📸 5. 点击雪人触发挥手动画:');
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2 + 30;
        const events = ['pointerdown', 'pointerup', 'click'];
        events.forEach((type) => {
          canvas.dispatchEvent(new MouseEvent(type, {
            clientX: centerX,
            clientY: centerY,
            bubbles: true,
            cancelable: true,
            view: window,
          }));
        });
      }
      setTimeout(resolve, 500);
    });
  });
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '05-snowman-waving');

  console.log('\n📸 6. 调节雾浓度模拟风雪感:');
  const sliders = await page.locator('input[type="range"]').all();
  console.log(`找到 ${sliders.length} 个滑块`);
  await sliders[3].fill('0.08', { force: true });
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '06-fog-effect');

  console.log('\n📸 7. 白天模式最终效果 (控制面板关闭):');
  await allButtons[0].click({ force: true });
  await allButtons[1].click({ force: true });
  await sliders[3].fill('0.02', { force: true });
  const closeButtons = await page.locator('div[class*="bg-gray-900"] button[class*="text-gray-400"]').all();
  if (closeButtons.length > 0) {
    await closeButtons[0].click({ force: true });
  }
  await page.waitForTimeout(2500);
  await takeScreenshot(page, '07-final-day-scene');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 全部完成！截图保存在 screenshots/ 目录');
  console.log('='.repeat(60));
  console.log('\n生成的文件:');
  const files = fs.readdirSync(SCREENSHOT_DIR).sort();
  files.forEach((f, i) => {
    const stats = fs.statSync(path.join(SCREENSHOT_DIR, f));
    console.log(`  ${i + 1}. ${f}  (${(stats.size / 1024).toFixed(1)} KB)`);
  });

  await browser.close();
}

main().catch((err) => {
  console.error('❌ 错误:', err.message);
  console.error(err.stack);
  process.exit(1);
});
