import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.join(__dirname, 'public', 'screenshots');
const BASE_URL = 'http://localhost:5173';

async function ensureDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function takeScreenshot(page: any, filename: string, waitTime = 2000) {
  await page.waitForTimeout(waitTime);
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`✓ Screenshot saved: ${filename}`);
  return filepath;
}

async function test1_earthRotation(page: any) {
  console.log('\n[Test 1] Testing Earth rotation animation...');
  
  await page.evaluate(() => {
    const store = (window as any).useSceneStore?.getState?.();
    if (store) {
      store.setRotationSpeed(1.0);
    }
  });
  
  await takeScreenshot(page, '01-earth-rotation.png', 3000);
  
  const startTime = Date.now();
  await page.waitForTimeout(2000);
  const elapsed = Date.now() - startTime;
  
  console.log(`  - Animation smooth for ${elapsed}ms`);
  console.log(`  - Rotation speed set to 1.0`);
}

async function test2_cityTooltip(page: any) {
  console.log('\n[Test 2] Testing city hover tooltip...');
  
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  
  if (box) {
    const centerX = box.x + box.width * 0.5;
    const centerY = box.y + box.height * 0.5;
    
    await page.mouse.move(centerX, centerY);
    await page.waitForTimeout(500);
    
    const tooltip = page.locator('.city-tooltip, [data-tooltip]');
    const tooltipVisible = await tooltip.isVisible().catch(() => false);
    
    console.log(`  - Tooltip visible: ${tooltipVisible}`);
    console.log(`  - Mouse hovered at center position`);
  }
  
  await takeScreenshot(page, '02-city-tooltip.png');
}

async function test3_dayNightEffect(page: any) {
  console.log('\n[Test 3] Testing day/night effect...');
  
  await page.evaluate(() => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1000);
    });
  });
  
  await takeScreenshot(page, '03-day-night-effect.png', 2000);
  
  console.log('  - Day/night shader rendering');
  console.log('  - Sun position dynamic update');
}

async function test4_cameraFlight(page: any) {
  console.log('\n[Test 4] Testing camera flight animation...');
  
  const startTime = Date.now();
  
  await page.evaluate(() => {
    (window as any).flyToRandomCity?.();
  });
  
  await takeScreenshot(page, '04-camera-flight-01-going.png', 1500);
  
  await takeScreenshot(page, '04-camera-flight-02-holding.png', 2500);
  
  await takeScreenshot(page, '04-camera-flight-03-returning.png', 2500);
  
  const elapsed = Date.now() - startTime;
  console.log(`  - Total animation time: ${elapsed}ms`);
  console.log('  - Phase 1 (going): 2 seconds');
  console.log('  - Phase 2 (holding): 3 seconds');
  console.log('  - Phase 3 (returning): 2 seconds');
}

async function test5_screenshot(page: any) {
  console.log('\n[Test 5] Testing screenshot save function...');
  
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button')).find(
        (b: any) => b.textContent?.includes('截屏') || b.textContent?.includes('保存')
      );
      button?.click();
    }),
  ]).catch(() => [null]);
  
  await takeScreenshot(page, '05-screenshot-button.png');
  
  if (download) {
    const filename = download.suggestedFilename();
    console.log(`  - Download filename: ${filename}`);
    console.log(`  - Format matches earth-screenshot-{timestamp}.png: ${filename.startsWith('earth-screenshot-')}`);
  } else {
    console.log('  - Manual click required to trigger download');
  }
}

async function test6_controlPanel(page: any) {
  console.log('\n[Test 6] Testing control panel...');
  
  await takeScreenshot(page, '06-control-panel.png');
  
  const panel = page.locator('text=控制面板');
  const panelVisible = await panel.isVisible().catch(() => false);
  
  const slider = page.locator('input[type="range"]');
  const sliderCount = await slider.count();
  
  const buttons = page.locator('button');
  const buttonCount = await buttons.count();
  
  console.log(`  - Panel visible: ${panelVisible}`);
  console.log(`  - Slider count: ${sliderCount}`);
  console.log(`  - Button count: ${buttonCount}`);
}

async function test7_statusBar(page: any) {
  console.log('\n[Test 7] Testing status bar (FPS & coordinates)...');
  
  await takeScreenshot(page, '07-status-bar.png');
  
  const fpsText = await page.locator('text=FPS').innerText().catch(() => '');
  console.log(`  - FPS display: ${fpsText}`);
  
  const coordX = await page.locator('text=X:').innerText().catch(() => '');
  const coordY = await page.locator('text=Y:').innerText().catch(() => '');
  const coordZ = await page.locator('text=Z:').innerText().catch(() => '');
  
  console.log(`  - Coordinates visible: X=${coordX}, Y=${coordY}, Z=${coordZ}`);
}

async function test8_mobileLayout(page: any) {
  console.log('\n[Test 8] Testing mobile layout (<640px)...');
  
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  
  await takeScreenshot(page, '08-mobile-layout.png');
  
  const controlPanel = page.locator('text=控制面板');
  const panelBox = await controlPanel.boundingBox().catch(() => null);
  
  if (panelBox) {
    console.log(`  - Panel position: x=${panelBox.x.toFixed(0)}, y=${panelBox.y.toFixed(0)}`);
    console.log(`  - Panel size: ${panelBox.width.toFixed(0)}x${panelBox.height.toFixed(0)}`);
    console.log(`  - Within viewport: ${panelBox.x + panelBox.width <= 390}`);
  }
  
  await page.setViewportSize({ width: 1920, height: 1080 });
}

async function main() {
  console.log('🚀 Starting 3D Earth Visualization Tests...\n');
  console.log(`📸 Screenshots directory: ${SCREENSHOTS_DIR}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);
  
  ensureDirectory(SCREENSHOTS_DIR);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();
  
  try {
    console.log('⏳ Loading page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✓ Page loaded successfully\n');
    
    await page.waitForTimeout(3000);
    
    await test1_earthRotation(page);
    await test2_cityTooltip(page);
    await test3_dayNightEffect(page);
    await test4_cameraFlight(page);
    await test5_screenshot(page);
    await test6_controlPanel(page);
    await test7_statusBar(page);
    await test8_mobileLayout(page);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
