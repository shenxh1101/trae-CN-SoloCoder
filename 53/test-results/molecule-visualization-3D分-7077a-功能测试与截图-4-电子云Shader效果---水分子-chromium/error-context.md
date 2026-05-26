# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: molecule-visualization.spec.ts >> 3D分子结构可视化 - 功能测试与截图 >> 4. 电子云Shader效果 - 水分子
- Location: test/molecule-visualization.spec.ts:50:3

# Error details

```
Error: page.selectOption: Test ended.
Call log:
  - waiting for locator('select')
    - locator resolved to <select trae-inspector-end-line="61" trae-inspector-start-line="48" trae-inspector-end-column="21" trae-inspector-start-column="12" trae-inspector-file-path="src/components/Toolbar.tsx" trae-inspector-static-props="%7B%22cwd%22%3A%22%2FUsers%2Fmac%2Fcode%2Fsolo%20coder%2F53%22%7D" class="bg-white/10 text-white px-3 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:border-blue-400 text-sm">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    23 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import * as fs from 'fs';
  3   | import * as path from 'path';
  4   | import { fileURLToPath } from 'url';
  5   | 
  6   | const __filename = fileURLToPath(import.meta.url);
  7   | const __dirname = path.dirname(__filename);
  8   | const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
  9   | 
  10  | test.describe('3D分子结构可视化 - 功能测试与截图', () => {
  11  |   test.beforeAll(() => {
  12  |     if (!fs.existsSync(SCREENSHOT_DIR)) {
  13  |       fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  14  |     }
  15  |   });
  16  | 
  17  |   test.beforeEach(async ({ page }) => {
  18  |     await page.goto('http://localhost:5173/');
  19  |     await page.waitForTimeout(2000);
  20  |   });
  21  | 
  22  |   test('1. 首页加载 - 水分子默认显示', async ({ page }) => {
  23  |     await page.screenshot({ 
  24  |       path: path.join(SCREENSHOT_DIR, '01-home-page.png'),
  25  |       fullPage: true 
  26  |     });
  27  |     console.log('✓ 截图: 首页加载完成');
  28  |   });
  29  | 
  30  |   test('2. 分子切换 - 二氧化碳CO₂', async ({ page }) => {
  31  |     await page.selectOption('select', 'CO₂');
  32  |     await page.waitForTimeout(1500);
  33  |     await page.screenshot({ 
  34  |       path: path.join(SCREENSHOT_DIR, '02-co2-molecule.png'),
  35  |       fullPage: true 
  36  |     });
  37  |     console.log('✓ 截图: 二氧化碳分子');
  38  |   });
  39  | 
  40  |   test('3. 分子切换 - 甲烷CH₄', async ({ page }) => {
  41  |     await page.selectOption('select', 'CH₄');
  42  |     await page.waitForTimeout(1500);
  43  |     await page.screenshot({ 
  44  |       path: path.join(SCREENSHOT_DIR, '03-ch4-molecule.png'),
  45  |       fullPage: true 
  46  |     });
  47  |     console.log('✓ 截图: 甲烷分子');
  48  |   });
  49  | 
  50  |   test('4. 电子云Shader效果 - 水分子', async ({ page }) => {
> 51  |     await page.selectOption('select', 'H₂O');
      |                ^ Error: page.selectOption: Test ended.
  52  |     await page.waitForTimeout(1000);
  53  |     
  54  |     const electronCloudLabel = page.getByText('电子云');
  55  |     await electronCloudLabel.click();
  56  |     await page.waitForTimeout(1500);
  57  |     
  58  |     await page.screenshot({ 
  59  |       path: path.join(SCREENSHOT_DIR, '04-electron-cloud.png'),
  60  |       fullPage: true 
  61  |     });
  62  |     console.log('✓ 截图: 电子云Shader效果');
  63  |   });
  64  | 
  65  |   test('5. 范德华半径显示', async ({ page }) => {
  66  |     await page.selectOption('select', 'H₂O');
  67  |     await page.waitForTimeout(1000);
  68  |     
  69  |     const vanDerWaalsLabel = page.getByText('范德华半径');
  70  |     await vanDerWaalsLabel.click();
  71  |     await page.waitForTimeout(1500);
  72  |     
  73  |     await page.screenshot({ 
  74  |       path: path.join(SCREENSHOT_DIR, '05-van-der-waals.png'),
  75  |       fullPage: true 
  76  |     });
  77  |     console.log('✓ 截图: 范德华半径显示');
  78  |   });
  79  | 
  80  |   test('6. 偶极矩方向箭头', async ({ page }) => {
  81  |     await page.selectOption('select', 'H₂O');
  82  |     await page.waitForTimeout(1000);
  83  |     
  84  |     const dipoleLabel = page.getByText('偶极矩');
  85  |     await dipoleLabel.click();
  86  |     await page.waitForTimeout(1500);
  87  |     
  88  |     await page.screenshot({ 
  89  |       path: path.join(SCREENSHOT_DIR, '06-dipole-moment.png'),
  90  |       fullPage: true 
  91  |     });
  92  |     console.log('✓ 截图: 偶极矩方向箭头');
  93  |   });
  94  | 
  95  |   test('7. 自动旋转模式', async ({ page }) => {
  96  |     const autoRotateLabel = page.getByText('自动旋转');
  97  |     await autoRotateLabel.click();
  98  |     await page.waitForTimeout(2000);
  99  |     
  100 |     await page.screenshot({ 
  101 |       path: path.join(SCREENSHOT_DIR, '07-auto-rotate.png'),
  102 |       fullPage: true 
  103 |     });
  104 |     console.log('✓ 截图: 自动旋转模式');
  105 |   });
  106 | 
  107 |   test('8. 白色背景切换', async ({ page }) => {
  108 |     await page.getByText('白').click();
  109 |     await page.waitForTimeout(1000);
  110 |     
  111 |     await page.screenshot({ 
  112 |       path: path.join(SCREENSHOT_DIR, '08-white-background.png'),
  113 |       fullPage: true 
  114 |     });
  115 |     console.log('✓ 截图: 白色背景');
  116 |   });
  117 | 
  118 |   test('9. 黑色背景切换', async ({ page }) => {
  119 |     await page.getByText('黑').click();
  120 |     await page.waitForTimeout(1000);
  121 |     
  122 |     await page.screenshot({ 
  123 |       path: path.join(SCREENSHOT_DIR, '09-black-background.png'),
  124 |       fullPage: true 
  125 |     });
  126 |     console.log('✓ 截图: 黑色背景');
  127 |   });
  128 | 
  129 |   test('10. 键长测量交互', async ({ page }) => {
  130 |     await page.selectOption('select', 'H₂O');
  131 |     await page.waitForTimeout(1500);
  132 |     
  133 |     await page.getByRole('button', { name: /开始测量/i }).click();
  134 |     await page.waitForTimeout(500);
  135 |     console.log('✓ 进入测量模式');
  136 |     
  137 |     const canvas = page.locator('canvas');
  138 |     const box = await canvas.boundingBox();
  139 |     
  140 |     if (box) {
  141 |       await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  142 |       await page.waitForTimeout(500);
  143 |       console.log('✓ 点击第一个原子');
  144 |       
  145 |       await page.mouse.click(box.x + box.width / 2 - 80, box.y + box.height / 2 + 50);
  146 |       await page.waitForTimeout(1000);
  147 |       console.log('✓ 点击第二个原子');
  148 |       
  149 |       await page.screenshot({ 
  150 |         path: path.join(SCREENSHOT_DIR, '10-bond-measurement.png'),
  151 |         fullPage: true 
```