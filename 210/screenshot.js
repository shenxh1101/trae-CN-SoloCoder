const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1200']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 1200 });

        console.log('Step 1: Opening page...');
        await page.goto('http://localhost:8000/', { waitUntil: 'networkidle2', timeout: 60000 });
        await delay(2000);
        await page.screenshot({ path: path.join(screenshotDir, '01_page_loaded.png') });
        console.log('OK: 01_page_loaded.png');

        console.log('Step 2: Waiting for model to load...');
        try {
            await page.waitForFunction(() => {
                const el = document.getElementById('loading');
                return el && el.classList.contains('hidden');
            }, { timeout: 180000 });
            console.log('Model loaded successfully');
        } catch (e) {
            console.log('Model load timeout, checking page state...');
            const loadingVisible = await page.evaluate(() => {
                const el = document.getElementById('loading');
                return el ? !el.classList.contains('hidden') : false;
            });
            console.log('Loading overlay visible:', loadingVisible);
        }

        await delay(1000);
        await page.screenshot({ path: path.join(screenshotDir, '02_model_loaded.png') });
        console.log('OK: 02_model_loaded.png');

        const modelInfo = await page.evaluate(() => document.getElementById('current-model').textContent);
        console.log('Current model:', modelInfo);

        console.log('Step 3: Loading sample image...');
        await page.click('#btn-sample');
        console.log('Clicked sample button');

        try {
            await page.waitForFunction(() => {
                const el = document.getElementById('placeholder');
                return el && el.classList.contains('hidden');
            }, { timeout: 30000 });
            console.log('Image loaded');
        } catch (e) {
            console.log('Image load timeout, continuing...');
        }

        console.log('Waiting for detection...');
        try {
            await page.waitForFunction(() => {
                const el = document.getElementById('detection-count');
                return el && parseInt(el.textContent) > 0;
            }, { timeout: 60000 });
            console.log('Detection completed');
        } catch (e) {
            console.log('Detection timeout, continuing...');
        }

        await delay(3000);
        await page.screenshot({ path: path.join(screenshotDir, '03_detection_result.png') });
        console.log('OK: 03_detection_result.png');

        const info = await page.evaluate(() => {
            return {
                count: document.getElementById('detection-count').textContent,
                time: document.getElementById('detection-time').textContent,
                model: document.getElementById('current-model').textContent,
                items: Array.from(document.querySelectorAll('.detection-item')).map(el => ({
                    name: el.querySelector('.class-name')?.textContent || '',
                    confidence: el.querySelector('.confidence')?.textContent || ''
                }))
            };
        });
        console.log('Detection count:', info.count);
        console.log('Detection time:', info.time);
        console.log('Model:', info.model);
        if (info.items.length > 0) {
            console.log('Detected objects:');
            info.items.forEach(item => console.log(`  - ${item.name}: ${item.confidence}`));
        }

        console.log('Step 4: Testing screenshot download...');
        const cdp = await page.createCDPSession();
        await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: screenshotDir });
        await page.click('#btn-screenshot');
        await delay(3000);
        console.log('Screenshot download triggered');

        console.log('Step 5: Testing JSON export...');
        await page.click('#btn-export');
        await delay(3000);
        console.log('JSON export triggered');

        console.log('Step 6: Full page screenshot...');
        await page.screenshot({ path: path.join(screenshotDir, '04_full_ui.png'), fullPage: true });
        console.log('OK: 04_full_ui.png');

        console.log('Step 7: Testing threshold adjustment (0.8)...');
        await page.evaluate(() => {
            const slider = document.getElementById('threshold');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(slider, '0.8');
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await delay(2000);
        await page.screenshot({ path: path.join(screenshotDir, '05_high_threshold.png') });
        const hc = await page.evaluate(() => document.getElementById('detection-count').textContent);
        console.log('High threshold count:', hc);

        console.log('Step 8: Testing threshold adjustment (0.2)...');
        await page.evaluate(() => {
            const slider = document.getElementById('threshold');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(slider, '0.2');
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await delay(2000);
        await page.screenshot({ path: path.join(screenshotDir, '06_low_threshold.png') });
        const lc = await page.evaluate(() => document.getElementById('detection-count').textContent);
        console.log('Low threshold count:', lc);

        console.log('\nAll screenshots saved to screenshots/');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (browser) await browser.close();
    }
})();
