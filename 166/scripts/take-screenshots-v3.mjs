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
  await page.waitForTimeout(4000);
  console.log('✅ 3D场景已渲染\n');

  console.log('📸 1. 3D场景白天模式:');
  await takeScreenshot(page, '01-3d-scene-day');

  console.log('\n📸 2. 打开控制面板:');
  await page.click('[data-testid="open-panel"]', { timeout: 5000 });
  await page.waitForTimeout(1500);

  const html = await page.content();
  console.log('🔍 检查 night-toggle 是否存在:', html.includes('night-toggle'));
  console.log('🔍 检查 data-testid:', html.match(/data-testid="[^"]+"/g));

  await takeScreenshot(page, '02-control-panel-open');

  console.log('\n📸 3. 夜晚模式 (窗户灯光):');
  const toggles = await page.locator('button[class*="rounded-full"]').all();
  console.log(`找到 ${toggles.length} 个开关按钮`);
  await toggles[0].click({ force: true });
  await page.waitForTimeout(3000);
  await takeScreenshot(page, '03-night-mode-with-lights');

  console.log('\n📸 4. 自动环绕模式:');
  await toggles[1].click({ force: true });
  await page.waitForTimeout(3000);
  await takeScreenshot(page, '04-auto-orbit-mode');

  console.log('\n📸 5. 雪人挥手动画:');
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const evt = new MouseEvent('click', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2 + 30,
        bubbles: true,
      });
      canvas.dispatchEvent(evt);
    }
  });
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '05-snowman-waving');

  console.log('\n📸 6. 雾浓度效果:');
  const sliders = await page.locator('input[type="range"]').all();
  console.log(`找到 ${sliders.length} 个滑块`);
  await sliders[3].fill('0.08', { force: true });
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '06-fog-effect');

  console.log('\n📸 7. 白天模式最终效果:');
  await toggles[0].click({ force: true });
  await toggles[1].click({ force: true });
  await sliders[3].fill('0.02', { force: true });
  await page.click('button[class*="text-gray-400 hover:text-white"]', { timeout: 5000 });
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '07-final-day-scene');

  console.log('\n🎉 全部完成！截图保存在 screenshots/ 目录');

  await browser.close();
}

main().catch((err) => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
