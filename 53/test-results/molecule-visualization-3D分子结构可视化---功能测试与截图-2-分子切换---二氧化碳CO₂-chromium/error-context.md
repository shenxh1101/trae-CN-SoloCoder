# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: molecule-visualization.spec.ts >> 3D分子结构可视化 - 功能测试与截图 >> 2. 分子切换 - 二氧化碳CO₂
- Location: test/molecule-visualization.spec.ts:30:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.selectOption: Test timeout of 30000ms exceeded.
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
    48 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic:
      - generic: 氧(O)
      - generic: 氢(H)
      - generic: 氢(H)
      - generic: μ (偶极矩)
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e10]: M
      - generic [ref=e11]:
        - heading "分子结构可视化" [level=1] [ref=e12]
        - paragraph [ref=e13]: 3D Molecular Viewer
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: "分子模型:"
        - combobox [ref=e17]:
          - option "水分子 (H₂O)" [selected]
          - option "二氧化碳 (CO₂)"
          - option "甲烷 (CH₄)"
      - generic [ref=e18]:
        - button "白色背景" [ref=e19] [cursor=pointer]
        - button "黑色背景" [ref=e20] [cursor=pointer]
        - button "渐变背景" [ref=e21] [cursor=pointer]
        - img [ref=e22]
      - generic [ref=e29]:
        - button "导出图片" [ref=e30] [cursor=pointer]:
          - img [ref=e31]
          - generic [ref=e35]: 导出图片
        - button "保存配置" [ref=e36] [cursor=pointer]:
          - img [ref=e37]
          - generic [ref=e42]: 保存配置
        - generic [ref=e43] [cursor=pointer]:
          - img [ref=e44]
          - generic [ref=e47]: 加载配置
  - generic [ref=e48]:
    - heading "显示选项" [level=2] [ref=e50]:
      - img [ref=e51]
      - text: 显示选项
    - generic [ref=e54]:
      - button "原子标签 显示原子名称标签" [ref=e55] [cursor=pointer]:
        - generic [ref=e56]:
          - img [ref=e58]
          - generic [ref=e61]:
            - paragraph [ref=e62]: 原子标签
            - paragraph [ref=e63]: 显示原子名称标签
      - button "范德华半径 显示原子范德华半径范围" [ref=e66] [cursor=pointer]:
        - generic [ref=e67]:
          - img [ref=e69]
          - generic [ref=e73]:
            - paragraph [ref=e74]: 范德华半径
            - paragraph [ref=e75]: 显示原子范德华半径范围
      - button "电子云 显示分子轨道电子云效果" [ref=e78] [cursor=pointer]:
        - generic [ref=e79]:
          - img [ref=e81]
          - generic [ref=e83]:
            - paragraph [ref=e84]: 电子云
            - paragraph [ref=e85]: 显示分子轨道电子云效果
      - button "偶极矩 显示分子偶极矩方向" [ref=e88] [cursor=pointer]:
        - generic [ref=e89]:
          - img [ref=e91]
          - generic [ref=e95]:
            - paragraph [ref=e96]: 偶极矩
            - paragraph [ref=e97]: 显示分子偶极矩方向
      - button "自动旋转 场景自动缓慢旋转" [ref=e100] [cursor=pointer]:
        - generic [ref=e101]:
          - img [ref=e103]
          - generic [ref=e106]:
            - paragraph [ref=e107]: 自动旋转
            - paragraph [ref=e108]: 场景自动缓慢旋转
    - generic [ref=e111]:
      - heading "键长测量" [level=2] [ref=e112]:
        - img [ref=e113]
        - text: 键长测量
      - generic [ref=e119]:
        - button "开始测量" [ref=e120] [cursor=pointer]:
          - img [ref=e121]
          - text: 开始测量
        - button "清除测量" [ref=e127] [cursor=pointer]:
          - img [ref=e128]
  - generic [ref=e131]:
    - heading "分子信息" [level=2] [ref=e133]:
      - img [ref=e134]
      - text: 分子信息
    - generic [ref=e136]:
      - generic [ref=e137]:
        - heading "分子名称" [level=3] [ref=e138]
        - paragraph [ref=e139]:
          - text: 水分子
          - generic [ref=e140]: (H₂O)
      - generic [ref=e141]:
        - heading "分子尺寸 (Å)" [level=3] [ref=e142]:
          - img [ref=e143]
          - text: 分子尺寸 (Å)
        - generic [ref=e146]:
          - generic [ref=e147]:
            - paragraph [ref=e148]: 宽度
            - paragraph [ref=e149]: "1.200"
          - generic [ref=e150]:
            - paragraph [ref=e151]: 高度
            - paragraph [ref=e152]: "0.929"
          - generic [ref=e153]:
            - paragraph [ref=e154]: 深度
            - paragraph [ref=e155]: "0.000"
      - generic [ref=e156]:
        - heading "原子组成" [level=3] [ref=e157]
        - generic [ref=e158]:
          - generic [ref=e159]: 氧
          - generic [ref=e160]: 氢
          - generic [ref=e161]: 氢
      - paragraph [ref=e163]: 使用鼠标拖动旋转 · 滚轮缩放
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
> 31  |     await page.selectOption('select', 'CO₂');
      |                ^ Error: page.selectOption: Test timeout of 30000ms exceeded.
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
  51  |     await page.selectOption('select', 'H₂O');
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
```