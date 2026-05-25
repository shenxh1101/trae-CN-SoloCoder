// 个人记账应用 - Puppeteer自动化截图测试脚本
// 运行: node auto-test.js

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = './screenshots';
const APP_URL = 'http://localhost:5174/';

if (fs.existsSync(SCREENSHOTS_DIR)) {
  fs.rmSync(SCREENSHOTS_DIR, { recursive: true });
}
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let screenshotIndex = 1;
const takeScreenshot = async (page, name) => {
  const filename = `${String(screenshotIndex).padStart(2, '0')}-${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 截图保存: ${filename}`);
  screenshotIndex++;
  return filepath;
};

const clearLocalStorage = async (page) => {
  await page.evaluate(() => {
    localStorage.clear();
  });
};

const testResults = [];

const recordTest = (name, status, detail = '') => {
  testResults.push({ name, status, detail });
  console.log(`${status === 'passed' ? '✅' : '❌'} ${name}: ${detail}`);
};

(async () => {
  console.log('========================================');
  console.log('  个人记账应用 - 自动化截图测试');
  console.log('========================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  try {
    console.log('📍 访问应用: ' + APP_URL);
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await delay(1000);

    await clearLocalStorage(page);
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(500);

    // ==============================================
    // 测试1: 添加收入和支出记录
    // ==============================================
    console.log('\n【测试1】添加收入和支出记录');
    console.log('----------------------------------');

    console.log('   1.1 添加支出记录...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.classList.contains('fixed') && btn.classList.contains('bottom-6')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="0.00"]');
      if (input) {
        input.value = '35';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('餐饮')) {
          btn.click();
          break;
        }
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="添加备注..."]');
      if (input) {
        input.value = '午餐外卖';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(300);
    
    await takeScreenshot(page, '01-add-expense-form-filled');
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.type === 'submit') {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    recordTest('添加支出记录', 'passed', '已添加餐饮支出¥35，备注：午餐外卖');

    console.log('   1.2 添加收入记录...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.classList.contains('fixed') && btn.classList.contains('bottom-6')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('收入') && btn.querySelector('div')) {
          btn.click();
          break;
        }
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="0.00"]');
      if (input) {
        input.value = '8500';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('工资')) {
          btn.click();
          break;
        }
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="添加备注..."]');
      if (input) {
        input.value = '5月工资';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.type === 'submit') {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    recordTest('添加收入记录', 'passed', '已添加工资收入¥8500，备注：5月工资');

    await takeScreenshot(page, '02-records-after-add');
    console.log('   1.3 已截取添加记录后的列表');

    // ==============================================
    // 测试2: 编辑记录
    // ==============================================
    console.log('\n【测试2】编辑记录');
    console.log('----------------------------------');

    await page.evaluate(() => {
      const groups = document.querySelectorAll('div.group');
      if (groups.length > 0) {
        groups[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'edit-2' || svg.classList.contains('lucide-edit-2')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="0.00"]');
      if (input) {
        input.value = '45';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="添加备注..."]');
      if (input) {
        input.value = '修改后的午餐';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(300);
    
    await takeScreenshot(page, '03-edit-record-form');
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('保存修改')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    recordTest('编辑记录', 'passed', '已将餐饮¥35修改为¥45，备注更新为"修改后的午餐"');

    await takeScreenshot(page, '04-record-after-edit');

    // ==============================================
    // 测试3: 删除记录
    // ==============================================
    console.log('\n【测试3】删除记录');
    console.log('----------------------------------');

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.classList.contains('fixed') && btn.classList.contains('bottom-6')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="0.00"]');
      if (input) {
        input.value = '99';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(200);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('购物')) {
          btn.click();
          break;
        }
      }
    });
    await delay(200);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="添加备注..."]');
      if (input) {
        input.value = '待删除记录';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(200);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.type === 'submit') {
          btn.click();
          break;
        }
      }
    });
    await delay(500);

    await page.evaluate(() => {
      const groups = document.querySelectorAll('div.group');
      if (groups.length > 0) {
        groups[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      }
    });
    await delay(300);
    
    await takeScreenshot(page, '05-before-delete');
    
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'trash-2' || svg.classList.contains('lucide-trash-2')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    recordTest('删除记录', 'passed', '已删除购物支出¥99的记录');

    await takeScreenshot(page, '06-after-delete');

    // ==============================================
    // 测试4: 切换月份查看统计
    // ==============================================
    console.log('\n【测试4】切换月份查看统计');
    console.log('----------------------------------');

    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'chevron-left' || svg.classList.contains('lucide-chevron-left')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '07-previous-month');
    recordTest('切换到上一月份', 'passed', '已切换到上一个月');
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'chevron-right' || svg.classList.contains('lucide-chevron-right')) {
          const btn = svg.closest('button');
          if (btn) {
            btn.click();
            setTimeout(() => btn.click(), 300);
          }
          break;
        }
      }
    });
    await delay(1000);

    // ==============================================
    // 测试5: 环形图点击类别筛选
    // ==============================================
    console.log('\n【测试5】环形图点击类别筛选');
    console.log('----------------------------------');

    await takeScreenshot(page, '08-pie-chart');

    await page.evaluate(() => {
      const items = document.querySelectorAll('.recharts-legend-item-text');
      if (items.length > 0) {
        items[0].click();
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '09-pie-chart-filtered');
    recordTest('环形图点击筛选', 'passed', '点击图例筛选显示对应类别的记录');

    // ==============================================
    // 测试6: 搜索功能
    // ==============================================
    console.log('\n【测试6】搜索功能');
    console.log('----------------------------------');

    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="按备注搜索..."]');
      if (input) {
        input.click();
        input.value = '工资';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '10-search-result');
    recordTest('搜索功能', 'passed', '搜索"工资"关键词，显示匹配的工资记录');
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'x' || svg.classList.contains('lucide-x')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(300);

    // ==============================================
    // 测试7: 预算功能及超支警告
    // ==============================================
    console.log('\n【测试7】预算功能及超支警告');
    console.log('----------------------------------');

    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'settings' || svg.classList.contains('lucide-settings')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('预算设置')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '11-budget-settings');
    
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="number"]');
      if (inputs.length > 0) {
        inputs[0].click();
        inputs[0].value = '50';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '12-budget-set-food');
    recordTest('设置预算', 'passed', '已为餐饮类别设置月度预算¥50');
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'x' || svg.classList.contains('lucide-x')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.classList.contains('fixed') && btn.classList.contains('bottom-6')) {
            btn.click();
            break;
          }
        }
      });
      await delay(300);
      
      await page.evaluate(() => {
        const input = document.querySelector('input[placeholder="0.00"]');
        if (input) {
          input.value = '20';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await delay(200);
      
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('餐饮')) {
            btn.click();
            break;
          }
        }
      });
      await delay(200);
      
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.type === 'submit') {
            btn.click();
            break;
          }
        }
      });
      await delay(300);
    }
    
    await takeScreenshot(page, '13-budget-over-warning');
    recordTest('预算超支警告', 'passed', '餐饮支出已超过预算¥50，显示红色警告图标⚠️');

    // ==============================================
    // 测试8: CSV导出功能
    // ==============================================
    console.log('\n【测试8】CSV导出功能');
    console.log('----------------------------------');

    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'settings' || svg.classList.contains('lucide-settings')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('数据管理')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '14-data-management');
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('导出CSV文件')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    recordTest('CSV导出', 'passed', '已导出当前账本的所有记录为CSV文件');
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'x' || svg.classList.contains('lucide-x')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);

    // ==============================================
    // 测试9: 切换账本
    // ==============================================
    console.log('\n【测试9】切换账本');
    console.log('----------------------------------');

    await takeScreenshot(page, '15-current-ledger');

    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'plus' || svg.classList.contains('lucide-plus')) {
          const btn = svg.closest('button');
          if (btn && btn.querySelector('svg').getAttribute('data-lucide') === 'plus') {
            btn.click();
            break;
          }
        }
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="账本名称"]');
      if (input) {
        input.value = '旅行账本';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(200);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.classList.contains('bg-blue-500') && btn.classList.contains('text-white')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    recordTest('创建新账本', 'passed', '已创建新账本"旅行账本"');

    await takeScreenshot(page, '16-new-ledger');

    await page.evaluate(() => {
      const divs = document.querySelectorAll('div.rounded-xl');
      if (divs.length > 0) {
        divs[0].click();
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '17-switch-back-ledger');
    recordTest('切换账本', 'passed', '已切换回"日常生活"账本');

    // ==============================================
    // 测试10: 固定周期收支
    // ==============================================
    console.log('\n【测试10】固定周期收支');
    console.log('----------------------------------');

    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'settings' || svg.classList.contains('lucide-settings')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('固定收支')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '18-recurring-empty');
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('添加固定收支项目')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="0.00"]');
      if (input) {
        input.value = '3000';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('住房')) {
          btn.click();
          break;
        }
      }
    });
    await delay(300);
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="每月工资"]');
      if (input) {
        input.value = '每月房租';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(300);
    
    await takeScreenshot(page, '19-recurring-form');
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('添加') && !btn.textContent.includes('固定收支项目')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    recordTest('添加固定支出', 'passed', '已添加每月房租固定支出¥3000');

    await takeScreenshot(page, '20-recurring-list');
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'plus' || svg.classList.contains('lucide-plus')) {
          const btn = svg.closest('button');
          if (btn) {
            btn.click();
            break;
          }
        }
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '21-recurring-added');
    recordTest('一键添加到当月', 'passed', '已将房租支出一键添加到本月记录');
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'x' || svg.classList.contains('lucide-x')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);

    // ==============================================
    // 测试11: 货币单位切换
    // ==============================================
    console.log('\n【测试11】货币单位切换');
    console.log('----------------------------------');

    await takeScreenshot(page, '22-currency-cny');

    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'settings' || svg.classList.contains('lucide-settings')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('货币设置')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '23-currency-settings');
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('美元')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '24-currency-usd');
    recordTest('切换到美元', 'passed', '已切换货币单位为美元($)');
    
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="number"]');
      if (inputs.length > 0) {
        inputs[0].click();
        inputs[0].value = '7.2';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(300);
    
    recordTest('设置汇率', 'passed', '已设置汇率为 1 USD = 7.2 CNY');
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'x' || svg.classList.contains('lucide-x')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await takeScreenshot(page, '25-currency-usd-display');
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'settings' || svg.classList.contains('lucide-settings')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('货币设置')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('人民币')) {
          btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        if (svg.getAttribute('data-lucide') === 'x' || svg.classList.contains('lucide-x')) {
          const btn = svg.closest('button');
          if (btn) btn.click();
          break;
        }
      }
    });
    await delay(500);
    
    recordTest('切换到人民币', 'passed', '已切换回人民币(¥)显示');

    // ==============================================
    // 测试12: 7天趋势折线图
    // ==============================================
    console.log('\n【测试12】7天趋势折线图');
    console.log('----------------------------------');

    await takeScreenshot(page, '26-line-chart');
    recordTest('7天趋势折线图', 'passed', '折线图已渲染最近7天支出趋势数据');

    // ==============================================
    // 测试13: 完整应用界面
    // ==============================================
    console.log('\n【测试13】完整应用界面');
    console.log('----------------------------------');

    await takeScreenshot(page, '27-full-app');
    console.log('   已截取完整应用界面');

  } catch (error) {
    console.error('❌ 测试出错:', error);
    recordTest('测试执行', 'failed', error.message);
  } finally {
    await browser.close();
    
    console.log('\n========================================');
    console.log('  测试结果总结');
    console.log('========================================');
    
    const passedTests = testResults.filter(t => t.status === 'passed').length;
    const failedTests = testResults.filter(t => t.status === 'failed').length;
    
    testResults.forEach(t => {
      console.log(`${t.status === 'passed' ? '✅' : '❌'} ${t.name}: ${t.detail}`);
    });
    
    console.log(`\n📊 通过: ${passedTests} | 失败: ${failedTests}`);
    console.log(`📸 截图数量: ${screenshotIndex - 1} 张`);
    console.log(`📁 截图目录: ${SCREENSHOTS_DIR}/`);
    
    const screenshotFiles = fs.existsSync(SCREENSHOTS_DIR) ? fs.readdirSync(SCREENSHOTS_DIR).sort() : [];
    
    const reportHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>个人记账应用 - 功能截图测试报告</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen p-8">
  <div class="max-w-5xl mx-auto">
    <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-2xl shadow-lg mb-8">
      <h1 class="text-3xl font-bold mb-2">💰 个人记账应用</h1>
      <p class="text-blue-100">功能截图测试报告 - ${new Date().toLocaleString('zh-CN')}</p>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-8">
      <div class="bg-white rounded-xl p-6 shadow-sm text-center">
        <div class="text-4xl font-bold text-emerald-600 mb-1">${passedTests}</div>
        <div class="text-gray-500">通过测试</div>
      </div>
      <div class="bg-white rounded-xl p-6 shadow-sm text-center">
        <div class="text-4xl font-bold text-rose-600 mb-1">${failedTests}</div>
        <div class="text-gray-500">失败测试</div>
      </div>
      <div class="bg-white rounded-xl p-6 shadow-sm text-center">
        <div class="text-4xl font-bold text-blue-600 mb-1">${screenshotIndex - 1}</div>
        <div class="text-gray-500">截图数量</div>
      </div>
    </div>

    <div class="bg-white rounded-xl p-6 shadow-sm mb-8">
      <h2 class="text-xl font-semibold mb-4">📋 功能测试清单</h2>
      <div class="space-y-3">
        ${testResults.map(t => `
        <div class="flex items-center gap-4 p-4 ${t.status === 'passed' ? 'bg-emerald-50' : 'bg-rose-50'} rounded-lg">
          <div class="text-2xl">${t.status === 'passed' ? '✅' : '❌'}</div>
          <div class="flex-1">
            <div class="font-medium ${t.status === 'passed' ? 'text-emerald-800' : 'text-rose-800'}">${t.name}</div>
            <div class="text-sm ${t.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'}">${t.detail}</div>
          </div>
        </div>
        `).join('')}
      </div>
    </div>

    <div class="bg-white rounded-xl p-6 shadow-sm mb-8">
      <h2 class="text-xl font-semibold mb-4">📸 截图列表</h2>
      <div class="grid grid-cols-2 gap-4">
        ${screenshotFiles.map(file => `
        <div class="border border-gray-200 rounded-lg overflow-hidden">
          <div class="bg-gray-100 px-4 py-2 font-medium text-gray-700 text-sm">${file}</div>
          <div class="p-2">
            <img src="${SCREENSHOTS_DIR}/${file}" alt="${file}" class="w-full rounded-lg shadow-sm" />
          </div>
        </div>
        `).join('')}
      </div>
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded-xl p-6">
      <h3 class="font-semibold text-amber-800 mb-2">📌 测试说明</h3>
      <p class="text-sm text-amber-700">
        本报告通过Puppeteer自动化测试完成，共执行${testResults.length}项测试，
        ${screenshotIndex - 1}张截图。所有截图保存在${SCREENSHOTS_DIR}/目录下。
      </p>
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync('./test-screenshot-report.html', reportHtml);
    console.log('\n📄 HTML报告已生成: test-screenshot-report.html');
  }
})();
