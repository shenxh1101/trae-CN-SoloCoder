const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('🚀 启动浏览器...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900'],
    defaultViewport: { width: 1600, height: 900 }
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  try {
    console.log('📱 打开应用: http://localhost:5175/');
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle2' });
    await delay(5000);

    console.log('📸 [1/6] 截取3D模型正常渲染的截图...');
    await page.screenshot({
      path: path.join(screenshotsDir, '1-model-rendering.png'),
      fullPage: false
    });
    console.log('✅ 已保存: 1-model-rendering.png');

    console.log('📸 [2/6] 截取颜色选择器切换部件颜色的截图...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const colorButton = buttons.find(b => b.textContent?.includes('鞋面主体') || b.title?.includes('#FF0000'));
      if (colorButton) colorButton.click();
    });
    await delay(1500);
    
    await page.evaluate(() => {
      const colorButtons = Array.from(document.querySelectorAll('button'));
      const redButton = colorButtons.find(b => {
        const style = window.getComputedStyle(b);
        return style.backgroundColor === 'rgb(255, 0, 0)';
      });
      if (redButton) redButton.click();
    });
    await delay(2000);

    await page.screenshot({
      path: path.join(screenshotsDir, '2-color-picker.png'),
      fullPage: false
    });
    console.log('✅ 已保存: 2-color-picker.png');

    console.log('📸 [3/6] 截取材质切换按钮的截图...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const meshButton = buttons.find(b => b.textContent?.includes('网眼布') || b.textContent?.includes('mesh'));
      if (meshButton) meshButton.click();
    });
    await delay(2000);

    await page.screenshot({
      path: path.join(screenshotsDir, '3-material-selector.png'),
      fullPage: false
    });
    console.log('✅ 已保存: 3-material-selector.png');

    console.log('📸 [4/6] 截取贴花编辑器输入8字符文字的截图...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const decalTab = buttons.find(b => b.textContent?.includes('贴花'));
      if (decalTab) decalTab.click();
    });
    await delay(1500);

    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="输入文字..."]');
      if (input) {
        input.value = 'SOLESTUDIO';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const addButton = Array.from(document.querySelectorAll('button')).find(
          b => b.querySelector('svg') && window.getComputedStyle(b).backgroundColor.includes('cyan')
        );
        if (addButton) addButton.click();
      }
    });
    await delay(2500);

    await page.screenshot({
      path: path.join(screenshotsDir, '4-decal-text.png'),
      fullPage: false
    });
    console.log('✅ 已保存: 4-decal-text.png');

    console.log('📸 [5/6] 截取上传图片徽章的截图...');
    await page.evaluate(() => {
      const badgeButton = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.includes('上传图片')
      );
      if (badgeButton) badgeButton.click();
    });
    await delay(2000);

    await page.screenshot({
      path: path.join(screenshotsDir, '5-badge-upload.png'),
      fullPage: false
    });
    console.log('✅ 已保存: 5-badge-upload.png');

    console.log('📸 [6/6] 截取点击分享按钮生成分享卡片的截图...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const shareTab = buttons.find(b => b.textContent?.includes('分享'));
      if (shareTab) shareTab.click();
    });
    await delay(1500);

    await page.evaluate(() => {
      const genCardButton = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.includes('生成分享卡片')
      );
      if (genCardButton) genCardButton.click();
    });
    await delay(3000);

    await page.screenshot({
      path: path.join(screenshotsDir, '6-share-card.png'),
      fullPage: false
    });
    console.log('✅ 已保存: 6-share-card.png');

    console.log('\n🎉 所有截图完成!');
    console.log('📂 截图保存位置:', screenshotsDir);

  } catch (error) {
    console.error('❌ 截图过程出错:', error);
  } finally {
    await browser.close();
    console.log('👋 浏览器已关闭');
  }
})();
