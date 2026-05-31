const { chromium } = require('playwright');

(async () => {
    console.log('🚀 启动浏览器...');
    const browser = await chromium.launch({ headless: true });
    console.log('✅ 浏览器已启动');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🌐 访问页面...');
    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
    console.log('✅ 页面已加载');
    
    const title = await page.title();
    console.log(`📄 页面标题: ${title}`);
    
    await page.screenshot({ path: 'test-screenshot.png', fullPage: true });
    console.log('📸 截图已保存');
    
    const hasApp = await page.evaluate(() => !!document.getElementById('app-container'));
    console.log(`🔍 应用容器存在: ${hasApp}`);
    
    await browser.close();
    console.log('✅ 浏览器已关闭');
})();
