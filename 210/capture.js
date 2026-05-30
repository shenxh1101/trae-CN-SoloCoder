const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const dir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 1200 });

        page.on('console', msg => {
            if (msg.type() === 'error') console.log('[PAGE ERR]', msg.text());
        });

        console.log('=== Step 1: Loading page ===');
        await page.goto('http://localhost:8000/', { waitUntil: 'networkidle2', timeout: 60000 });
        await delay(2000);
        await page.screenshot({ path: path.join(dir, '01_initial.png') });
        console.log('-> 01_initial.png');

        console.log('=== Step 2: Waiting for model ===');
        try {
            await page.waitForFunction(() => {
                const el = document.getElementById('loading');
                return el && el.classList.contains('hidden');
            }, { timeout: 180000 });
        } catch (e) {
            console.log('Model load timeout');
        }
        await delay(500);
        await page.screenshot({ path: path.join(dir, '02_model_ready.png') });
        const modelName = await page.evaluate(() => document.getElementById('current-model').textContent);
        console.log('Model:', modelName);
        console.log('-> 02_model_ready.png');

        console.log('=== Step 3: Sample image detection ===');
        for (let attempt = 0; attempt < 5; attempt++) {
            await page.click('#btn-sample');
            try {
                await page.waitForFunction(() => {
                    const el = document.getElementById('detection-count');
                    return el && parseInt(el.textContent) > 0;
                }, { timeout: 60000 });
                
                const count = await page.evaluate(() => document.getElementById('detection-count').textContent);
                console.log(`Attempt ${attempt + 1}: Detected ${count} objects`);
                if (parseInt(count) >= 2) break;
            } catch (e) {
                console.log(`Attempt ${attempt + 1}: timeout`);
            }
            await delay(2000);
        }

        await delay(2000);
        await page.screenshot({ path: path.join(dir, '03_detection.png') });
        
        const info = await page.evaluate(() => ({
            count: document.getElementById('detection-count').textContent,
            time: document.getElementById('detection-time').textContent,
            model: document.getElementById('current-model').textContent,
            threshold: document.getElementById('threshold-value').textContent,
            items: Array.from(document.querySelectorAll('.detection-item')).map(el => ({
                name: el.querySelector('.class-name')?.textContent || '',
                conf: el.querySelector('.confidence')?.textContent || ''
            }))
        }));
        console.log('Detection count:', info.count);
        console.log('Detection time:', info.time);
        console.log('Threshold:', info.threshold);
        info.items.forEach(o => console.log('  ', o.name, o.conf));
        console.log('-> 03_detection.png');

        console.log('=== Step 4: Screenshot download ===');
        const cdp = await page.createCDPSession();
        await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
        await page.click('#btn-screenshot');
        await delay(3000);
        console.log('-> Screenshot downloaded');

        console.log('=== Step 5: JSON export ===');
        await page.click('#btn-export');
        await delay(3000);
        
        const jsonFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        if (jsonFiles.length > 0) {
            const jsonContent = JSON.parse(fs.readFileSync(path.join(dir, jsonFiles[jsonFiles.length - 1]), 'utf-8'));
            console.log('JSON content:');
            console.log(JSON.stringify(jsonContent, null, 2));
        }
        console.log('-> JSON exported');

        console.log('=== Step 6: Full page ===');
        await page.screenshot({ path: path.join(dir, '04_fullpage.png'), fullPage: true });
        console.log('-> 04_fullpage.png');

        console.log('=== Step 7: High threshold (0.8) ===');
        await page.evaluate(() => {
            const s = document.getElementById('threshold');
            const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            set.call(s, '0.8');
            s.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await delay(1500);
        await page.screenshot({ path: path.join(dir, '05_threshold_08.png') });
        const hc = await page.evaluate(() => ({
            count: document.getElementById('detection-count').textContent,
            threshold: document.getElementById('threshold-value').textContent,
            items: Array.from(document.querySelectorAll('.detection-item')).map(el => ({
                name: el.querySelector('.class-name')?.textContent || '',
                conf: el.querySelector('.confidence')?.textContent || ''
            }))
        }));
        console.log('Threshold 0.8 - Count:', hc.count);
        hc.items.forEach(o => console.log('  ', o.name, o.conf));

        console.log('=== Step 8: Low threshold (0.2) ===');
        await page.evaluate(() => {
            const s = document.getElementById('threshold');
            const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            set.call(s, '0.2');
            s.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await delay(1500);
        await page.screenshot({ path: path.join(dir, '06_threshold_02.png') });
        const lc = await page.evaluate(() => ({
            count: document.getElementById('detection-count').textContent,
            threshold: document.getElementById('threshold-value').textContent,
            items: Array.from(document.querySelectorAll('.detection-item')).map(el => ({
                name: el.querySelector('.class-name')?.textContent || '',
                conf: el.querySelector('.confidence')?.textContent || ''
            }))
        }));
        console.log('Threshold 0.2 - Count:', lc.count);
        lc.items.forEach(o => console.log('  ', o.name, o.conf));

        console.log('=== Step 9: Model switch ===');
        await page.select('#model-select', 'ssd_mobilenet_v2');
        try {
            await page.waitForFunction(() => {
                const el = document.getElementById('loading');
                return el && el.classList.contains('hidden');
            }, { timeout: 180000 });
        } catch (e) {
            console.log('Model switch timeout');
        }
        await delay(1000);
        const newModel = await page.evaluate(() => document.getElementById('current-model').textContent);
        console.log('Switched to:', newModel);
        await page.screenshot({ path: path.join(dir, '07_model_switch.png') });

        console.log('\n=== SUMMARY ===');
        console.log('All screenshots saved to screenshots/');
        console.log('Files:', fs.readdirSync(dir).join(', '));

    } catch (e) {
        console.error('FATAL:', e.message);
    } finally {
        if (browser) await browser.close();
    }
})();
