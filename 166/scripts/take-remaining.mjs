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
  console.log('🎄 继续生成剩余截图...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  console.log('🌐 加载页面 (简化模式)...');
  try {
    await page.goto('http://localhost:5173/', { 
      waitUntil: 'commit', 
      timeout: 60000 
    });
  } catch (e) {
    console.log('⚠️  页面加载超时，继续...');
  }
  
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(4000);
  console.log('✅ 3D场景已渲染\n');

  console.log('📸 4. 自动环绕模式运行中的状态:');
  await page.click('button[class*="fixed top-4 left-4"]', { timeout: 10000, force: true });
  await page.waitForTimeout(1500);
  
  const toggles = await page.locator('div[class*="bg-gray-900"] button[class*="rounded-full"]').all();
  console.log(`找到 ${toggles.length} 个开关按钮`);
  
  if (toggles.length >= 2) {
    await toggles[1].click({ force: true });
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '04-auto-orbit-mode');
  }

  console.log('\n📸 5. 雪人挥手动画:');
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2 + 30;
      ['pointerdown', 'pointerup', 'click'].forEach(type => {
        canvas.dispatchEvent(new MouseEvent(type, {
          clientX: cx, clientY: cy, bubbles: true, cancelable: true
        }));
      });
    }
  });
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '05-snowman-waving');

  console.log('\n📸 6. 雾浓度效果:');
  const sliders = await page.locator('input[type="range"]').all();
  console.log(`找到 ${sliders.length} 个滑块`);
  if (sliders.length >= 4) {
    await sliders[3].fill('0.08', { force: true });
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '06-fog-effect');
  }

  console.log('\n📸 7. 白天模式最终效果:');
  if (toggles.length >= 2) {
    await toggles[0].click({ force: true });
    await toggles[1].click({ force: true });
  }
  if (sliders.length >= 4) {
    await sliders[3].fill('0.02', { force: true });
  }
  const closeBtn = await page.locator('div[class*="bg-gray-900"] button[class*="text-gray-400"]').all();
  if (closeBtn.length > 0) {
    await closeBtn[0].click({ force: true });
  }
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '07-final-day-scene');

  console.log('\n🎉 全部完成！');
  await browser.close();
}

main().catch((err) => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
