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

async function waitForCanvasReady(page) {
  await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });
  await page.waitForTimeout(4000);
}

async function takeScreenshot(page, name) {
  await page.waitForTimeout(1000);
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const stats = fs.statSync(screenshotPath);
  console.log(`✅ 已保存: ${name}.png (${(stats.size / 1024).toFixed(1)} KB)`);
  return screenshotPath;
}

async function main() {
  console.log('🎄 开始生成下雪村庄功能验证截图...\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('🖥️ 浏览器错误:', msg.text());
    }
  });

  console.log('🌐 正在访问 http://localhost:5173/ ...');
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (e) {
    console.log('❌ 页面加载超时，继续尝试...');
  }

  await waitForCanvasReady(page);
  console.log('✅ 页面加载完成，3D场景已渲染\n');
  console.log('='.repeat(60));

  console.log('\n📸 [1/7] 3D场景正常渲染（房子、圣诞树、雪人、雪花粒子）');
  await takeScreenshot(page, '01-3d-scene-day');

  console.log('\n📸 [2/7] 打开控制面板展示所有控制选项');
  await page.click('[data-testid="open-panel"]');
  await page.waitForTimeout(800);
  await takeScreenshot(page, '02-control-panel-open');

  console.log('\n📸 [3/7] 切换到夜晚模式展示窗户灯光效果');
  await page.click('[data-testid="night-toggle"]');
  await page.waitForTimeout(2500);
  await takeScreenshot(page, '03-night-mode-with-lights');

  console.log('\n📸 [4/7] 自动环绕模式运行中的状态');
  await page.click('[data-testid="auto-orbit-toggle"]');
  await page.waitForTimeout(2500);
  await takeScreenshot(page, '04-auto-orbit-mode');

  console.log('\n📸 [5/7] 点击雪人触发挥手动画');
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2 + 30;

        canvas.dispatchEvent(new PointerEvent('pointerdown', {
          clientX: centerX,
          clientY: centerY,
          bubbles: true,
          cancelable: true,
        }));
        canvas.dispatchEvent(new PointerEvent('pointerup', {
          clientX: centerX,
          clientY: centerY,
          bubbles: true,
          cancelable: true,
        }));
        canvas.dispatchEvent(new MouseEvent('click', {
          clientX: centerX,
          clientY: centerY,
          bubbles: true,
          cancelable: true,
        }));
      }
      setTimeout(resolve, 100);
    });
  });
  await page.waitForTimeout(1000);
  await takeScreenshot(page, '05-snowman-waving');

  console.log('\n📸 [6/7] 调节雾浓度模拟风雪感');
  await page.locator('[data-testid="fog-slider"]').fill('0.08');
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '06-fog-effect');

  console.log('\n📸 [7/7] 白天模式最终效果（控制面板关闭）');
  await page.click('[data-testid="night-toggle"]');
  await page.click('[data-testid="auto-orbit-toggle"]');
  await page.locator('[data-testid="fog-slider"]').fill('0.02');
  await page.click('[data-testid="close-panel"]');
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '07-final-day-scene');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 所有截图生成完成！');
  console.log(`📁 截图目录: ${SCREENSHOT_DIR}`);
  console.log('\n生成的文件:');
  const files = fs.readdirSync(SCREENSHOT_DIR).sort();
  files.forEach((f, i) => {
    const stats = fs.statSync(path.join(SCREENSHOT_DIR, f));
    console.log(`  ${i + 1}. ${f}  (${(stats.size / 1024).toFixed(1)} KB)`);
  });
  console.log('='.repeat(60));

  await browser.close();
}

main().catch((err) => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
