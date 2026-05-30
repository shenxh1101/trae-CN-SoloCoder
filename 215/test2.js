const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'test-results');

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
    console.log('🚀 补充测试开始...\n');
    
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
    await sleep(2000);
    
    // ========== 背景切换测试 ==========
    console.log('=== 测试6：背景颜色切换 ===');
    const bgResults = [];
    const testColors = [
        ['#1a0a0a', '深红'],
        ['#0a1a0a', '深绿'],
        ['#000000', '纯黑'],
        ['#0a0a1a', '默认深蓝']
    ];
    
    for (const [color, name] of testColors) {
        await page.evaluate((c) => {
            const btn = document.querySelector(`.color-btn[data-color="${c}"]`);
            if (btn) btn.click();
        }, color);
        await sleep(500);
        
        const actualBg = await page.evaluate(() => '#' + window._vis.scene.background.getHexString());
        const match = actualBg === color;
        bgResults.push({ name, expected: color, actual: actualBg, match });
        console.log(`  切换${name}: 期望=${color}, 实际=${actualBg}, 匹配=${match}`);
    }
    
    const bgAllPass = bgResults.every(r => r.match);
    console.log(`  ✅ 背景切换: ${bgAllPass ? 'PASS' : 'FAIL'}`);
    
    // ========== 相机环绕测试 ==========
    console.log('\n=== 测试7：相机自动环绕 ===');
    await page.evaluate(() => document.getElementById('autoRotate').click());
    await sleep(2000);
    
    const cam1 = await page.evaluate(() => ({
        x: parseFloat(window._vis.camera.position.x.toFixed(3)),
        z: parseFloat(window._vis.camera.position.z.toFixed(3))
    }));
    console.log(`  2秒后相机位置: x=${cam1.x}, z=${cam1.z}`);
    
    await sleep(3000);
    
    const cam2 = await page.evaluate(() => ({
        x: parseFloat(window._vis.camera.position.x.toFixed(3)),
        z: parseFloat(window._vis.camera.position.z.toFixed(3))
    }));
    console.log(`  5秒后相机位置: x=${cam2.x}, z=${cam2.z}`);
    
    const rotateChanged = Math.abs(cam1.x - cam2.x) > 0.01 || Math.abs(cam1.z - cam2.z) > 0.01;
    const autoRotateChecked = await page.evaluate(() => document.getElementById('autoRotate').checked);
    console.log(`  环绕开关状态: ${autoRotateChecked}, 位置变化: ${rotateChanged}`);
    console.log(`  ✅ 相机自动环绕: ${rotateChanged ? 'PASS' : 'FAIL'}`);
    
    await page.evaluate(() => document.getElementById('autoRotate').click());
    
    // ========== 中性情感测试 ==========
    console.log('\n=== 测试8：中性情感检测改进 ===');
    await page.evaluate(() => {
        document.getElementById('textInput').value = '会议定于下午三点在会议室举行';
        document.getElementById('analyzeBtn').click();
    });
    await sleep(2000);
    
    const neutralResult = await page.evaluate(() => ({
        positiveVal: document.getElementById('positiveVal').textContent,
        neutralVal: document.getElementById('neutralVal').textContent,
        negativeVal: document.getElementById('negativeVal').textContent,
        emotionText: document.getElementById('emotionText').textContent
    }));
    console.log('  中性文本结果:', JSON.stringify(neutralResult));
    
    // ========== 情感历史UI测试 ==========
    console.log('\n=== 测试9：情感历史UI显示 ===');
    const historyHtml = await page.evaluate(() => {
        return document.getElementById('historyList').innerHTML;
    });
    const historyItems = historyHtml.split('history-item').length - 1;
    console.log(`  历史列表项数: ${historyItems}`);
    console.log(`  历史UI有内容: ${historyItems > 0}`);
    
    // ========== 粒子运动速度测试 ==========
    console.log('\n=== 测试10：粒子运动速度滑块 ===');
    await page.evaluate(() => {
        const slider = document.getElementById('motionSpeed');
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(slider, '2.5');
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(500);
    
    const speedResult = await page.evaluate(() => ({
        speedVal: document.getElementById('speedVal').textContent,
        manualOverride: window._vis.manualOverride,
        motionSpeed: window._vis.manualParams.motionSpeed
    }));
    console.log('  速度设置结果:', JSON.stringify(speedResult));
    const speedPassed = speedResult.speedVal === '2.5' && speedResult.motionSpeed === 2.5;
    console.log(`  ✅ 运动速度滑块: ${speedPassed ? 'PASS' : 'FAIL'}`);
    
    // ========== 旋转速度测试 ==========
    console.log('\n=== 测试11：旋转速度滑块 ===');
    await page.evaluate(() => {
        const slider = document.getElementById('rotationSpeed');
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(slider, '3.0');
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(500);
    
    const rotResult = await page.evaluate(() => ({
        rotationVal: document.getElementById('rotationVal').textContent,
        rotationSpeed: window._vis.manualParams.rotationSpeed
    }));
    console.log('  旋转速度结果:', JSON.stringify(rotResult));
    const rotPassed = rotResult.rotationVal === '3' && rotResult.rotationSpeed === 3;
    console.log(`  ✅ 旋转速度滑块: ${rotPassed ? 'PASS' : 'FAIL'}`);
    
    // ========== 粒子数量测试 ==========
    console.log('\n=== 测试12：粒子数量滑块 ===');
    await page.evaluate(() => {
        const slider = document.getElementById('particleCount');
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(slider, '10000');
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(1500);
    
    const countResult = await page.evaluate(() => ({
        countVal: document.getElementById('countVal').textContent,
        particleCountDisplay: document.getElementById('particleCountDisplay').textContent,
        particleCount: window._vis.manualParams.particleCount
    }));
    console.log('  粒子数量结果:', JSON.stringify(countResult));
    const countPassed = countResult.countVal === '10000' && countResult.particleCount === 10000;
    console.log(`  ✅ 粒子数量滑块: ${countPassed ? 'PASS' : 'FAIL'}`);
    
    // ========== 重置按钮测试 ==========
    console.log('\n=== 测试13：重置为AI驱动按钮 ===');
    await page.evaluate(() => document.getElementById('resetManual').click());
    await sleep(1000);
    
    const resetResult = await page.evaluate(() => ({
        manualOverride: window._vis.manualOverride,
        countVal: document.getElementById('countVal').textContent,
        sizeVal: document.getElementById('sizeVal').textContent,
        speedVal: document.getElementById('speedVal').textContent,
        rotationVal: document.getElementById('rotationVal').textContent
    }));
    console.log('  重置结果:', JSON.stringify(resetResult));
    const resetPassed = !resetResult.manualOverride;
    console.log(`  ✅ 重置按钮: ${resetPassed ? 'PASS' : 'FAIL'}`);
    
    await page.screenshot({ path: path.join(RESULTS_DIR, '13-supplemental-tests.png') });
    
    await browser.close();
    
    // ========== 总结 ==========
    console.log('\n' + '='.repeat(60));
    console.log('📊 补充测试总结');
    console.log('='.repeat(60));
    const results = [
        { name: '背景颜色切换', passed: bgAllPass },
        { name: '相机自动环绕', passed: rotateChanged },
        { name: '中性情感检测', passed: parseInt(neutralResult.neutralVal) > 30 },
        { name: '情感历史UI', passed: historyItems > 0 },
        { name: '运动速度滑块', passed: speedPassed },
        { name: '旋转速度滑块', passed: rotPassed },
        { name: '粒子数量滑块', passed: countPassed },
        { name: '重置按钮', passed: resetPassed }
    ];
    
    let passCount = 0, failCount = 0;
    results.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        console.log(`  ${icon} ${r.name}: ${r.passed ? 'PASS' : 'FAIL'}`);
        r.passed ? passCount++ : failCount++;
    });
    console.log(`\n总计: ${results.length} 项 | ✅ ${passCount} 通过 | ❌ ${failCount} 失败`);
}

runTests().catch(console.error);
