const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTest() {
    const output = [];
    const log = (msg) => { output.push(msg); console.log(msg); };
    
    try {
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 900 });
        await page.setCacheEnabled(false);
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });
        await sleep(3000);
        
        log('=== 验证中性情感修复 ===');
        
        const test1 = await page.evaluate(() => {
            const analyzer = new EmotionAnalyzer();
            return analyzer.analyze('会议定于下午三点在会议室举行');
        });
        log('  中性文本分析: neutral=' + Math.round(test1.neutral*100) + '%, dominant=' + test1.dominant);
        const neutralPassed = test1.neutral > 0.5 && test1.dominant === 'neutral';
        log('  ' + (neutralPassed ? 'PASS' : 'FAIL') + ' - 中性情感');
        
        const test2 = await page.evaluate(() => {
            const analyzer = new EmotionAnalyzer();
            return analyzer.analyze('今天非常开心快乐，生活真美好！');
        });
        log('  正面文本分析: positive=' + Math.round(test2.positive*100) + '%, dominant=' + test2.dominant);
        const positivePassed = test2.positive > 0.5 && test2.dominant === 'positive';
        log('  ' + (positivePassed ? 'PASS' : 'FAIL') + ' - 正面情感');
        
        const test3 = await page.evaluate(() => {
            const analyzer = new EmotionAnalyzer();
            return analyzer.analyze('太糟糕了，非常痛苦和悲伤');
        });
        log('  负面文本分析: negative=' + Math.round(test3.negative*100) + '%, dominant=' + test3.dominant);
        const negativePassed = test3.negative > 0.3 && test3.dominant === 'negative';
        log('  ' + (negativePassed ? 'PASS' : 'FAIL') + ' - 负面情感');
        
        await browser.close();
        
        const allPassed = neutralPassed && positivePassed && negativePassed;
        log('\n最终结果: ' + (allPassed ? 'ALL PASS' : 'HAS FAILURES'));
        
        fs.writeFileSync(path.join(__dirname, 'test-results', 'verify-fix.txt'), output.join('\n'), 'utf-8');
    } catch (e) {
        log('ERROR: ' + e.message);
        fs.writeFileSync(path.join(__dirname, 'test-results', 'verify-fix.txt'), output.join('\n'), 'utf-8');
    }
}

runTest();
