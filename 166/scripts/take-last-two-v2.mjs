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
  console.log('🎄 获取剩余截图 (使用全局API)...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  console.log('🌐 加载页面...');
  await page.goto('http://localhost:5173/', { waitUntil: 'commit', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(4000);

  const hasStore = await page.evaluate(() => {
    return typeof window.__SNOW_VILLAGE_STORE__ !== 'undefined';
  });
  console.log(`✅ 全局 Store 可用: ${hasStore}\n`);

  console.log('📸 4. 自动环绕模式运行中:');
  await page.evaluate(() => {
    window.__SNOW_VILLAGE_STORE__.getState().setIsAutoOrbit(true);
    window.__SNOW_VILLAGE_STORE__.getState().setIsNight(true);
  });
  await page.waitForTimeout(3500);
  await takeScreenshot(page, '04-auto-orbit-mode');

  console.log('\n📸 6. 雾浓度调节 (风雪感):');
  await page.evaluate(() => {
    window.__SNOW_VILLAGE_STORE__.getState().setFogDensity(0.08);
    window.__SNOW_VILLAGE_STORE__.getState().setIsNight(false);
  });
  await page.waitForTimeout(2500);
  await takeScreenshot(page, '06-fog-effect');

  console.log('\n✅ 重置状态...');
  await page.evaluate(() => {
    window.__SNOW_VILLAGE_STORE__.getState().setIsAutoOrbit(false);
    window.__SNOW_VILLAGE_STORE__.getState().setFogDensity(0.02);
  });

  console.log('\n🎉 所有截图完成！');
  await browser.close();
}

main().catch((err) => {
  console.error('❌ 错误:', err.message);
  console.error(err.stack);
  process.exit(1);
});
