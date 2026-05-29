import { chromium, expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function waitForCanvasReady(page: any) {
  await page.waitForSelector('canvas', { state: 'attached', timeout: 10000 });
  await page.waitForTimeout(3000);
}

async function takeScreenshot(page: any, name: string) {
  await page.waitForTimeout(1000);
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`✅ 已保存截图: ${name}.png`);
  return screenshotPath;
}

test.describe('下雪村庄 - 功能验证', () => {
  let browser: any;
  let page: any;

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
    });
    page = await context.newPage();
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await waitForCanvasReady(page);
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('1) 3D场景正常渲染（房子、圣诞树、雪人、雪花粒子）', async () => {
    console.log('\n📸 测试1: 3D场景渲染...');
    await takeScreenshot(page, '01-3d-scene-day');
  });

  test('2) 打开控制面板展示所有控制选项', async () => {
    console.log('\n📸 测试2: 控制面板...');
    await page.click('button[class*="fixed top-4 left-4"]');
    await page.waitForTimeout(500);
    await takeScreenshot(page, '02-control-panel-open');
  });

  test('3) 切换到夜晚模式展示窗户灯光效果', async () => {
    console.log('\n📸 测试3: 夜晚模式...');
    await page.getByText('白天/夜晚').locator('..').getByRole('button').click();
    await page.waitForTimeout(1500);
    await takeScreenshot(page, '03-night-mode-with-lights');
  });

  test('4) 自动环绕模式运行中的状态', async () => {
    console.log('\n📸 测试4: 自动环绕模式...');
    await page.getByText('自动环绕').locator('..').getByRole('button').click();
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '04-auto-orbit-mode');
  });

  test('5) 点击雪人触发挥手动画', async () => {
    console.log('\n📸 测试5: 雪人挥手动画...');
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2 + 50;
        const clickEvent = new MouseEvent('click', {
          clientX: centerX,
          clientY: centerY,
          bubbles: true,
        });
        canvas.dispatchEvent(clickEvent);
      }
    });
    await page.waitForTimeout(500);
    await takeScreenshot(page, '05-snowman-waving');
  });

  test('6) 调节雾浓度', async () => {
    console.log('\n📸 测试6: 雾浓度调节...');
    const fogSlider = page.locator('input[type="range"]').nth(3);
    await fogSlider.fill('0.08');
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '06-fog-effect');
  });

  test('7) 白天模式 + 控制面板关闭', async () => {
    console.log('\n📸 测试7: 白天模式最终效果...');
    await page.getByText('白天/夜晚').locator('..').getByRole('button').click();
    await page.getByText('自动环绕').locator('..').getByRole('button').click();
    const fogSlider = page.locator('input[type="range"]').nth(3);
    await fogSlider.fill('0.02');
    await page.locator('button[class*="text-gray-400 hover:text-white"]').click();
    await page.waitForTimeout(1500);
    await takeScreenshot(page, '07-final-day-scene');
  });
});
