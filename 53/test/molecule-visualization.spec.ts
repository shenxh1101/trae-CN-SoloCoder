import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

test.describe('3D分子结构可视化 - 功能测试与截图', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2000);
  });

  test('1. 首页加载 - 水分子默认显示', async ({ page }) => {
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '01-home-page.png'),
      fullPage: true 
    });
    console.log('✓ 截图: 首页加载完成');
  });

  test('2. 分子切换 - 二氧化碳CO₂', async ({ page }) => {
    await page.selectOption('select', 'CO₂');
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '02-co2-molecule.png'),
      fullPage: true 
    });
    console.log('✓ 截图: 二氧化碳分子');
  });

  test('3. 分子切换 - 甲烷CH₄', async ({ page }) => {
    await page.selectOption('select', 'CH₄');
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '03-ch4-molecule.png'),
      fullPage: true 
    });
    console.log('✓ 截图: 甲烷分子');
  });

  test('4. 电子云Shader效果 - 水分子', async ({ page }) => {
    await page.selectOption('select', 'H₂O');
    await page.waitForTimeout(1000);
    
    const electronCloudLabel = page.getByText('电子云');
    await electronCloudLabel.click();
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '04-electron-cloud.png'),
      fullPage: true 
    });
    console.log('✓ 截图: 电子云Shader效果');
  });

  test('5. 范德华半径显示', async ({ page }) => {
    await page.selectOption('select', 'H₂O');
    await page.waitForTimeout(1000);
    
    const vanDerWaalsLabel = page.getByText('范德华半径');
    await vanDerWaalsLabel.click();
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '05-van-der-waals.png'),
      fullPage: true 
    });
    console.log('✓ 截图: 范德华半径显示');
  });

  test('6. 偶极矩方向箭头', async ({ page }) => {
    await page.selectOption('select', 'H₂O');
    await page.waitForTimeout(1000);
    
    const dipoleLabel = page.getByText('偶极矩');
    await dipoleLabel.click();
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '06-dipole-moment.png'),
      fullPage: true 
    });
    console.log('✓ 截图: 偶极矩方向箭头');
  });

  test('7. 自动旋转模式', async ({ page }) => {
    const autoRotateLabel = page.getByText('自动旋转');
    await autoRotateLabel.click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '07-auto-rotate.png'),
      fullPage: true 
    });
    console.log('✓ 截图: 自动旋转模式');
  });

  test('8. 白色背景切换', async ({ page }) => {
    await page.getByText('白').click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '08-white-background.png'),
      fullPage: true 
    });
    console.log('✓ 截图: 白色背景');
  });

  test('9. 黑色背景切换', async ({ page }) => {
    await page.getByText('黑').click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '09-black-background.png'),
      fullPage: true 
    });
    console.log('✓ 截图: 黑色背景');
  });

  test('10. 键长测量交互', async ({ page }) => {
    await page.selectOption('select', 'H₂O');
    await page.waitForTimeout(1500);
    
    await page.getByRole('button', { name: /开始测量/i }).click();
    await page.waitForTimeout(500);
    console.log('✓ 进入测量模式');
    
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
      console.log('✓ 点击第一个原子');
      
      await page.mouse.click(box.x + box.width / 2 - 80, box.y + box.height / 2 + 50);
      await page.waitForTimeout(1000);
      console.log('✓ 点击第二个原子');
      
      await page.screenshot({ 
        path: path.join(SCREENSHOT_DIR, '10-bond-measurement.png'),
        fullPage: true 
      });
      console.log('✓ 截图: 键长测量交互');
    }
  });

  test('11. 多重显示效果组合', async ({ page }) => {
    await page.selectOption('select', 'H₂O');
    await page.waitForTimeout(1000);
    
    await page.getByText('渐').click();
    
    const electronCloudLabel = page.getByText('电子云');
    await electronCloudLabel.click();
    
    const dipoleLabel = page.getByText('偶极矩');
    await dipoleLabel.click();
    
    const labelsLabel = page.getByText('原子标签');
    await labelsLabel.click();
    
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '11-combined-effects.png'),
      fullPage: true 
    });
    console.log('✓ 截图: 多重效果组合');
  });

  test('12. PNG导出功能', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /导出图片/i }).click();
    const download = await downloadPromise;
    
    const downloadPath = path.join(SCREENSHOT_DIR, '12-exported-image.png');
    await download.saveAs(downloadPath);
    
    const stats = fs.statSync(downloadPath);
    console.log(`✓ PNG导出成功: ${(stats.size / 1024).toFixed(2)} KB`);
    
    expect(stats.size).toBeGreaterThan(10000);
  });

  test('13. JSON保存功能', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /保存配置/i }).click();
    const download = await downloadPromise;
    
    const jsonPath = path.join(SCREENSHOT_DIR, '13-saved-molecule.json');
    await download.saveAs(jsonPath);
    
    const content = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    console.log(`✓ JSON保存成功:`);
    console.log(`  - 分子名称: ${data.name}`);
    console.log(`  - 分子式: ${data.formula}`);
    console.log(`  - 原子数量: ${data.atoms?.length}`);
    console.log(`  - 化学键数量: ${data.bonds?.length}`);
    
    expect(data.name).toBeDefined();
    expect(data.atoms.length).toBeGreaterThan(0);
    expect(data.bonds.length).toBeGreaterThan(0);
  });

  test('14. JSON加载功能验证', async ({ page }) => {
    const jsonData = {
      name: "测试分子",
      formula: "Test",
      atoms: [
        { id: "a1", element: "O", position: [0, 0, 0] },
        { id: "a2", element: "H", position: [0.96, 0, 0] },
        { id: "a3", element: "H", position: [-0.32, 0.9, 0] }
      ],
      bonds: [
        { id: "b1", atom1: "a1", atom2: "a2", order: 1 },
        { id: "b2", atom1: "a1", atom2: "a3", order: 1 }
      ]
    };
    
    const testJsonPath = path.join(SCREENSHOT_DIR, '14-test-molecule.json');
    fs.writeFileSync(testJsonPath, JSON.stringify(jsonData, null, 2));
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testJsonPath);
    
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '14-json-loaded.png'),
      fullPage: true 
    });
    console.log('✓ 截图: JSON加载后的分子');
  });
});
