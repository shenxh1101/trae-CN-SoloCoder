const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== 3D分子结构可视化 - 功能测试与截图 ===\n');
  
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  console.log('🌐 打开页面: http://localhost:5173/');
  await page.goto('http://localhost:5173/');
  await sleep(3000);

  // 1. 首页截图
  console.log('\n📸 1. 首页加载 - 水分子默认显示');
  await page.screenshot({ 
    path: path.join(SCREENSHOT_DIR, '01-home-water-molecule.png'),
    fullPage: true 
  });
  console.log('   ✓ 截图保存: 01-home-water-molecule.png');

  // 2. 切换到二氧化碳
  console.log('\n📸 2. 切换分子 - 二氧化碳 CO₂');
  try {
    await page.selectOption('select', 'CO₂');
    await sleep(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '02-co2-molecule.png'),
      fullPage: true 
    });
    console.log('   ✓ 截图保存: 02-co2-molecule.png');
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 3. 切换到甲烷
  console.log('\n📸 3. 切换分子 - 甲烷 CH₄');
  try {
    await page.selectOption('select', 'CH₄');
    await sleep(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '03-ch4-molecule.png'),
      fullPage: true 
    });
    console.log('   ✓ 截图保存: 03-ch4-molecule.png');
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 4. 电子云效果
  console.log('\n📸 4. 电子云 Shader 效果');
  try {
    await page.selectOption('select', 'H₂O');
    await sleep(1500);
    
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    for (let i = 0; i < checkboxes.length; i++) {
      const label = await page.locator('label').nth(i).textContent();
      if (label && label.includes('电子云')) {
        await checkboxes[i].check();
        break;
      }
    }
    await sleep(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '04-electron-cloud-effect.png'),
      fullPage: true 
    });
    console.log('   ✓ 截图保存: 04-electron-cloud-effect.png');
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 5. 范德华半径
  console.log('\n📸 5. 范德华半径显示');
  try {
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    for (let i = 0; i < checkboxes.length; i++) {
      const label = await page.locator('label').nth(i).textContent();
      if (label && label.includes('范德华')) {
        await checkboxes[i].check();
        break;
      }
    }
    await sleep(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '05-van-der-waals.png'),
      fullPage: true 
    });
    console.log('   ✓ 截图保存: 05-van-der-waals.png');
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 6. 偶极矩箭头
  console.log('\n📸 6. 偶极矩方向箭头');
  try {
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    for (let i = 0; i < checkboxes.length; i++) {
      const label = await page.locator('label').nth(i).textContent();
      if (label && label.includes('偶极矩')) {
        await checkboxes[i].check();
        break;
      }
    }
    await sleep(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '06-dipole-moment.png'),
      fullPage: true 
    });
    console.log('   ✓ 截图保存: 06-dipole-moment.png');
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 7. 多重效果组合
  console.log('\n📸 7. 多重效果组合显示');
  try {
    await sleep(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '07-combined-effects.png'),
      fullPage: true 
    });
    console.log('   ✓ 截图保存: 07-combined-effects.png');
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 8. 白色背景
  console.log('\n📸 8. 白色背景');
  try {
    await page.getByText('白').click();
    await sleep(1500);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '08-white-background.png'),
      fullPage: true 
    });
    console.log('   ✓ 截图保存: 08-white-background.png');
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 9. 黑色背景
  console.log('\n📸 9. 黑色背景');
  try {
    await page.getByText('黑').click();
    await sleep(1500);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '09-black-background.png'),
      fullPage: true 
    });
    console.log('   ✓ 截图保存: 09-black-background.png');
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 10. 渐变背景
  console.log('\n📸 10. 渐变背景');
  try {
    await page.getByText('渐').click();
    await sleep(1500);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '10-gradient-background.png'),
      fullPage: true 
    });
    console.log('   ✓ 截图保存: 10-gradient-background.png');
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 11. PNG导出测试
  console.log('\n💾 11. PNG导出功能测试');
  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    
    const exportButton = page.getByRole('button', { name: /导出图片|PNG|export/i });
    await exportButton.click();
    
    const download = await downloadPromise;
    const exportPath = path.join(SCREENSHOT_DIR, '11-exported.png');
    await download.saveAs(exportPath);
    
    const stats = fs.statSync(exportPath);
    console.log(`   ✓ 导出成功: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   ✓ 文件: 11-exported.png`);
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 12. JSON保存测试
  console.log('\n💾 12. JSON保存功能测试');
  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    
    const saveButton = page.getByRole('button', { name: /保存配置|JSON|save/i });
    await saveButton.click();
    
    const download = await downloadPromise;
    const jsonPath = path.join(SCREENSHOT_DIR, '12-saved-molecule.json');
    await download.saveAs(jsonPath);
    
    const content = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    console.log(`   ✓ 保存成功: ${data.name}`);
    console.log(`   ✓ 分子式: ${data.formula}`);
    console.log(`   ✓ 原子数量: ${data.atoms?.length}`);
    console.log(`   ✓ 化学键数量: ${data.bonds?.length}`);
    console.log(`   ✓ 文件: 12-saved-molecule.json`);
    
    if (data.atoms?.length > 0 && data.bonds?.length > 0) {
      console.log('   ✓ 数据完整性验证通过');
    }
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  // 13. JSON加载测试
  console.log('\n💾 13. JSON加载功能测试');
  try {
    const testJson = {
      name: "自定义测试分子",
      formula: "Custom",
      description: "测试用自定义分子",
      atoms: [
        { id: "test1", element: "O", position: [0, 0, 0] },
        { id: "test2", element: "H", position: [1.0, 0, 0] },
        { id: "test3", element: "H", position: [-0.33, 0.94, 0] }
      ],
      bonds: [
        { id: "bond1", atom1: "test1", atom2: "test2", order: 1 },
        { id: "bond2", atom1: "test1", atom2: "test3", order: 1 }
      ]
    };
    
    const testJsonPath = path.join(SCREENSHOT_DIR, '13-test-input.json');
    fs.writeFileSync(testJsonPath, JSON.stringify(testJson, null, 2));
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testJsonPath);
    
    await sleep(2500);
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '13-json-loaded.png'),
      fullPage: true 
    });
    
    console.log('   ✓ 加载成功');
    console.log('   ✓ 截图保存: 13-json-loaded.png');
  } catch (e) {
    console.log('   ✗ 失败:', e.message);
  }

  await browser.close();

  console.log('\n=== 测试完成 ===');
  console.log(`\n📁 截图目录: ${SCREENSHOT_DIR}`);
  const files = fs.readdirSync(SCREENSHOT_DIR);
  console.log(`📊 生成文件数量: ${files.length}`);
  files.forEach((f, i) => {
    const filePath = path.join(SCREENSHOT_DIR, f);
    const size = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log(`   ${i + 1}. ${f} (${size} KB)`);
  });
  
  console.log('\n🌐 开发服务器: http://localhost:5173/');
  console.log('\n✅ 所有功能测试完成！');
}

runTests().catch(console.error);
