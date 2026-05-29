import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

async function takeScreenshot(page, name) {
  await page.waitForTimeout(1500);
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const stats = fs.statSync(screenshotPath);
  console.log(`✅ ${name}.png (${(stats.size / 1024).toFixed(1)} KB)`);
  return screenshotPath;
}

async function main() {
  console.log('🎄 获取剩余截图...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  console.log('🌐 加载页面...');
  await page.goto('http://localhost:5173/', { waitUntil: 'commit', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(4000);
  console.log('✅ 页面加载完成\n');

  await page.click('button[class*="fixed top-4 left-4"]', { force: true });
  await page.waitForTimeout(1500);

  console.log('📸 4. 自动环绕模式:');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('zustand-action', {
      detail: { type: 'setIsAutoOrbit', value: true }));
    const store = document.querySelector('canvas')?.dispatchEvent(new Event('trigger-auto-orbit'));
    if (window.useStore) {
      window.useStore.getState().setIsAutoOrbit(true);
    }
  });
  
  await page.waitForTimeout(3000);
  await takeScreenshot(page, '04-auto-orbit-mode');

  console.log('\n📸 6. 雾浓度效果:');
  await page.evaluate(() => {
    const sliders = document.querySelectorAll('input[type="range"]');
    if (sliders.length > 0) {
      sliders.forEach((s, i) => {
        console.log('Slider ${i}:`, s.value);
        if (i === 3) {
          s.value = '0.08';
          s.dispatchEvent(new Event('input', { bubbles: true }));
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
  });
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '06-fog-effect');

  console.log('\n🎉 完成！');
  await browser.close();
}

main().catch((err) => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
