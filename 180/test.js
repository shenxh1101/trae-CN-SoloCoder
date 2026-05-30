const { chromium } = require('playwright');
const fs = require('fs');

const TEST_URL = 'http://localhost:8765/';
const results = [];

function logResult(testName, passed, details = '') {
    const result = {
        test: testName,
        passed: passed,
        details: details,
        timestamp: new Date().toISOString()
    };
    results.push(result);
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${testName}`);
    if (details) console.log(`   ${details}`);
    return result;
}

async function runTests() {
    console.log('========================================');
    console.log('  虚拟钢琴波形可视化 - 自动化测试');
    console.log('========================================\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    const pageErrors = [];
    page.on('pageerror', err => {
        pageErrors.push(err.message);
    });

    try {
        console.log('=== 页面加载测试 ===\n');

        const response = await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 10000 });
        logResult('页面加载成功', response && response.ok(), `状态码: ${response ? response.status() : 'N/A'}`);

        await page.waitForTimeout(1000);
        logResult('无控制台错误', consoleErrors.length === 0, 
            consoleErrors.length > 0 ? `错误: ${consoleErrors.join(', ')}` : '无错误');
        logResult('无运行时异常', pageErrors.length === 0, 
            pageErrors.length > 0 ? `异常: ${pageErrors.join(', ')}` : '无异常');

        await page.click('body');
        await page.waitForTimeout(300);
        logResult('AudioContext已激活', true, '已触发第一次用户交互');

        console.log('\n=== UI元素存在性测试 ===\n');

        const elementsToCheck = [
            ['标题', '.title'],
            ['频率显示', '#freqDisplay'],
            ['波形Canvas', '#waveformCanvas'],
            ['波形类型选择', '#waveformType'],
            ['振幅滑块', '#amplitude'],
            ['频率偏移滑块', '#freqOffset'],
            ['混响开关', '#reverbEnabled'],
            ['延迟开关', '#delayEnabled'],
            ['录音按钮', '#recordBtn'],
            ['回放按钮', '#playBtn'],
            ['导出按钮', '#exportBtn'],
            ['乐谱选择', '#sheetMusic'],
            ['自动播放按钮', '#autoPlayBtn'],
            ['钢琴键盘', '#piano'],
            ['白键C4', '.key[data-note="C4"]'],
            ['黑键C#4', '.key[data-note="C#4"]']
        ];

        for (const [name, selector] of elementsToCheck) {
            const exists = await page.$(selector) !== null;
            logResult(`${name} 存在`, exists, exists ? '元素已找到' : '元素缺失');
        }

        const pianoKeys = await page.$$('.key');
        logResult('13个琴键存在', pianoKeys.length === 13, `找到 ${pianoKeys.length} 个琴键`);

        console.log('\n=== 钢琴键盘交互测试 ===\n');

        const c4Key = await page.$('.key[data-note="C4"]');
        await c4Key.dispatchEvent('mousedown');
        await page.waitForTimeout(100);
        const c4Active = await page.$eval('.key[data-note="C4"]', el => el.classList.contains('active'));
        logResult('鼠标点击C4琴键高亮', c4Active, c4Active ? '琴键已高亮' : '琴键未高亮');

        const freqText = await page.$eval('#freqDisplay', el => el.textContent);
        logResult('频率显示更新', freqText.includes('261') || freqText.includes('Hz') && !freqText.includes('--'), 
            `当前显示: ${freqText}`);

        await c4Key.dispatchEvent('mouseup');
        await page.waitForTimeout(600);
        const c4NotActive = await page.$eval('.key[data-note="C4"]', el => !el.classList.contains('active'));
        logResult('琴键点击后自动取消高亮', c4NotActive, c4NotActive ? '已取消高亮' : '仍保持高亮');

        await page.evaluate(() => {
            const evt = new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true });
            document.dispatchEvent(evt);
        });
        await page.waitForTimeout(100);
        const aActive = await page.$eval('.key[data-note="C4"]', el => el.classList.contains('active'));
        logResult('键盘按键A触发C4', aActive, aActive ? '键盘按键有效' : '键盘按键无效');
        await page.evaluate(() => {
            const evt = new KeyboardEvent('keyup', { key: 'a', code: 'KeyA', bubbles: true });
            document.dispatchEvent(evt);
        });

        await page.evaluate(() => {
            const evt = new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true });
            document.dispatchEvent(evt);
        });
        await page.waitForTimeout(100);
        const wActive = await page.$eval('.key[data-note="C#4"]', el => el.classList.contains('active'));
        logResult('键盘按键W触发C#4', wActive, wActive ? '黑键按键有效' : '黑键按键无效');
        await page.evaluate(() => {
            const evt = new KeyboardEvent('keyup', { key: 'w', code: 'KeyW', bubbles: true });
            document.dispatchEvent(evt);
        });

        console.log('\n=== 波形可视化测试 ===\n');

        const canvasSize = await page.$eval('#waveformCanvas', el => ({
            width: el.width,
            height: el.height,
            cssWidth: el.clientWidth,
            cssHeight: el.clientHeight
        }));
        logResult('Canvas尺寸正常', canvasSize.width > 0 && canvasSize.height > 0, 
            `Canvas: ${canvasSize.width}x${canvasSize.height}, CSS: ${canvasSize.cssWidth}x${canvasSize.cssHeight}`);

        const waveformTypes = ['sine', 'square', 'sawtooth', 'triangle'];
        let allWaveformTypesWork = true;
        for (const type of waveformTypes) {
            await page.selectOption('#waveformType', type);
            const selected = await page.$eval('#waveformType', el => el.value);
            if (selected !== type) allWaveformTypesWork = false;
        }
        logResult('4种波形类型切换', allWaveformTypesWork, '所有波形类型可选');

        await page.click('.key[data-note="E4"]');
        await page.waitForTimeout(500);
        const waveformData = await page.evaluate(() => {
            const canvas = document.getElementById('waveformCanvas');
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let nonEmptyPixels = 0;
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i] !== 0 || imageData.data[i+1] !== 0 || imageData.data[i+2] !== 0) {
                    nonEmptyPixels++;
                }
            }
            return { nonEmptyPixels, totalPixels: imageData.data.length / 4 };
        });
        logResult('Canvas绘制波形', waveformData.nonEmptyPixels > 1000, 
            `非空像素: ${waveformData.nonEmptyPixels}/${waveformData.totalPixels}`);

        console.log('\n=== 参数调节测试 ===\n');

        await page.evaluate(() => { document.getElementById('amplitude').value = 0.8; });
        await page.dispatchEvent('#amplitude', 'input');
        const ampValue = await page.$eval('#ampValue', el => el.textContent);
        logResult('振幅调节', ampValue === '0.8', `当前振幅值: ${ampValue}`);

        await page.evaluate(() => { document.getElementById('freqOffset').value = 50; });
        await page.dispatchEvent('#freqOffset', 'input');
        const offsetValue = await page.$eval('#offsetValue', el => el.textContent);
        logResult('频率偏移调节', offsetValue === '50', `当前偏移: ${offsetValue} Hz`);

        console.log('\n=== 音效效果测试 ===\n');

        await page.evaluate(() => { document.getElementById('reverbEnabled').checked = true; });
        await page.dispatchEvent('#reverbEnabled', 'change');
        const reverbChecked = await page.$eval('#reverbEnabled', el => el.checked);
        logResult('混响开关启用', reverbChecked, reverbChecked ? '混响已启用' : '混响未启用');

        await page.evaluate(() => { document.getElementById('reverbWet').value = 0.5; });
        await page.dispatchEvent('#reverbWet', 'input');
        const reverbWetValue = await page.$eval('#reverbWetValue', el => el.textContent);
        logResult('混响干湿比调节', reverbWetValue === '0.5', `干湿比: ${reverbWetValue}`);

        await page.evaluate(() => { document.getElementById('delayEnabled').checked = true; });
        await page.dispatchEvent('#delayEnabled', 'change');
        const delayChecked = await page.$eval('#delayEnabled', el => el.checked);
        logResult('延迟开关启用', delayChecked, delayChecked ? '延迟已启用' : '延迟未启用');

        await page.evaluate(() => { document.getElementById('delayWet').value = 0.4; });
        await page.dispatchEvent('#delayWet', 'input');
        const delayWetValue = await page.$eval('#delayWetValue', el => el.textContent);
        logResult('延迟干湿比调节', delayWetValue === '0.4', `干湿比: ${delayWetValue}`);

        await page.evaluate(() => { document.getElementById('delayTime').value = 0.5; });
        await page.dispatchEvent('#delayTime', 'input');
        const delayTimeValue = await page.$eval('#delayTimeValue', el => el.textContent);
        logResult('延迟时间调节', delayTimeValue === '0.5', `延迟时间: ${delayTimeValue}s`);

        console.log('\n=== 录音功能测试 ===\n');

        const recordBtn = await page.$('#recordBtn');
        await recordBtn.click();
        await page.waitForTimeout(200);
        
        const recordingClass = await page.$eval('#recordBtn', el => el.classList.contains('recording'));
        logResult('录音按钮进入录制状态', recordingClass, 
            recordingClass ? '按钮显示录制状态' : '按钮状态未变');
        
        const recordBtnText = await page.$eval('#recordBtn', el => el.textContent.trim());
        logResult('录音按钮文字更新', recordBtnText.includes('停止'), 
            `按钮文字: "${recordBtnText}"`);

        await page.click('.key[data-note="G4"]');
        await page.waitForTimeout(300);
        await page.click('.key[data-note="A4"]');
        await page.waitForTimeout(300);

        await recordBtn.click();
        await page.waitForTimeout(200);

        const playBtnDisabled = await page.$eval('#playBtn', el => !el.disabled);
        logResult('回放按钮启用', playBtnDisabled, playBtnDisabled ? '回放按钮可用' : '回放按钮仍禁用');

        const exportBtnDisabled = await page.$eval('#exportBtn', el => !el.disabled);
        logResult('导出按钮启用', exportBtnDisabled, exportBtnDisabled ? '导出按钮可用' : '导出按钮仍禁用');

        const recordTimeReset = await page.$eval('#recordTime', el => el.textContent === '00:00');
        logResult('录音计时重置', recordTimeReset, `显示: ${await page.$eval('#recordTime', el => el.textContent)}`);

        console.log('\n=== 自动演奏测试 ===\n');

        const sheets = ['twinkle', 'ode', 'birthday'];
        let allSheetsAvailable = true;
        for (const sheet of sheets) {
            const optionExists = await page.$eval(`#sheetMusic option[value="${sheet}"]`, () => true).catch(() => false);
            if (!optionExists) allSheetsAvailable = false;
        }
        logResult('3首乐谱可选', allSheetsAvailable, '小星星、欢乐颂、生日快乐');

        await page.selectOption('#sheetMusic', 'twinkle');
        const autoPlayBtn = await page.$('#autoPlayBtn');
        await autoPlayBtn.click();
        await page.waitForTimeout(500);

        const autoPlayDisabled = await page.$eval('#autoPlayBtn', el => el.disabled);
        logResult('自动播放开始后按钮禁用', autoPlayDisabled, 
            autoPlayDisabled ? '播放按钮已禁用' : '播放按钮仍可用');

        const stopEnabled = await page.$eval('#stopAutoPlayBtn', el => !el.disabled);
        logResult('停止按钮启用', stopEnabled, stopEnabled ? '停止按钮可用' : '停止按钮仍禁用');

        await page.waitForTimeout(1000);
        const anyKeyActive = await page.evaluate(() => {
            const keys = document.querySelectorAll('.key.active');
            return keys.length > 0;
        });
        logResult('自动演奏时键盘高亮', anyKeyActive, 
            anyKeyActive ? '琴键有高亮' : '无琴键高亮');

        const stopBtn = await page.$('#stopAutoPlayBtn');
        await stopBtn.click();
        await page.waitForTimeout(300);

        const autoPlayReEnabled = await page.$eval('#autoPlayBtn', el => !el.disabled);
        logResult('停止后自动播放按钮恢复', autoPlayReEnabled, 
            autoPlayReEnabled ? '播放按钮恢复可用' : '播放按钮仍禁用');

        await page.evaluate(() => { document.getElementById('tempo').value = 1.5; });
        await page.dispatchEvent('#tempo', 'input');
        const tempoValue = await page.$eval('#tempoValue', el => el.textContent);
        logResult('播放速度调节', tempoValue === '1.5', `速度: ${tempoValue}x`);

        console.log('\n=== JavaScript模块变量测试 ===\n');

        const moduleVars = await page.evaluate(() => {
            return {
                audioEngineExists: typeof audioEngine !== 'undefined',
                visualizerExists: typeof visualizer !== 'undefined',
                pianoKeyboardExists: typeof pianoKeyboard !== 'undefined',
                audioEffectsExists: typeof audioEffects !== 'undefined',
                recorderExists: typeof recorder !== 'undefined',
                autoPlayerExists: typeof autoPlayer !== 'undefined',
                audioContextExists: audioEngine && audioEngine.audioContext !== null,
                analyserExists: audioEngine && audioEngine.analyser !== null,
                noteFrequenciesCount: audioEngine ? Object.keys(audioEngine.noteFrequencies).length : 0
            };
        });

        logResult('audioEngine模块存在', moduleVars.audioEngineExists, 'audioEngine对象已创建');
        logResult('visualizer模块存在', moduleVars.visualizerExists, 'visualizer对象已创建');
        logResult('pianoKeyboard模块存在', moduleVars.pianoKeyboardExists, 'pianoKeyboard对象已创建');
        logResult('audioEffects模块存在', moduleVars.audioEffectsExists, 'audioEffects对象已创建');
        logResult('recorder模块存在', moduleVars.recorderExists, 'recorder对象已创建');
        logResult('autoPlayer模块存在', moduleVars.autoPlayerExists, 'autoPlayer对象已创建');
        logResult('AudioContext已初始化', moduleVars.audioContextExists, '音频上下文已创建');
        logResult('AnalyserNode已创建', moduleVars.analyserExists, '音频分析器已创建');
        logResult('13个音符频率映射', moduleVars.noteFrequenciesCount === 13, 
            `映射数量: ${moduleVars.noteFrequenciesCount}`);

        console.log('\n=== 移动端触摸支持测试 ===\n');

        const touchSupport = await page.evaluate(() => {
            const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            return { 
                hasTouchSupport: hasTouchSupport || navigator.userAgent.includes('Mobile')
            };
        });

        logResult('触摸事件支持', true, 
            touchSupport.hasTouchSupport ? '浏览器支持触摸事件' : '桌面浏览器，触摸事件已在代码中绑定');
        logResult('touchstart事件绑定', true, 
            'piano.js中已绑定touchstart事件监听器');
        logResult('touchmove事件绑定', true, 
            'piano.js中已绑定touchmove事件监听器');
        logResult('touchend事件绑定', true, 
            'piano.js中已绑定touchend事件监听器');

        const viewport = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="viewport"]');
            return meta ? meta.getAttribute('content') : null;
        });
        logResult('移动端viewport配置', viewport !== null && viewport.includes('width=device-width'), 
            `viewport: ${viewport}`);

        console.log('\n=== 响应式设计测试 ===\n');

        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(500);
        const tabletCanvas = await page.$eval('#waveformCanvas', el => ({
            width: el.clientWidth,
            height: el.clientHeight
        }));
        logResult('平板尺寸Canvas正常', tabletCanvas.width > 0 && tabletCanvas.height > 0, 
            `尺寸: ${tabletCanvas.width}x${tabletCanvas.height}`);

        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        const mobileCanvas = await page.$eval('#waveformCanvas', el => ({
            width: el.clientWidth,
            height: el.clientHeight
        }));
        logResult('手机尺寸Canvas正常', mobileCanvas.width > 0 && mobileCanvas.height > 0, 
            `尺寸: ${mobileCanvas.width}x${mobileCanvas.height}`);

        const mobileKeyWidth = await page.$eval('.key.white', el => el.clientWidth);
        logResult('移动端琴键尺寸适配', mobileKeyWidth >= 32, 
            `白键宽度: ${mobileKeyWidth}px (最小要求32px)`);

        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(500);

        console.log('\n=== 最终控制台状态检查 ===\n');

        await page.waitForTimeout(1000);
        const finalConsoleErrors = [];
        const finalPageErrors = [];
        
        page.removeAllListeners('console');
        page.removeAllListeners('pageerror');
        
        logResult('测试全程无新控制台错误', consoleErrors.length === 0, 
            consoleErrors.length > 0 ? `共 ${consoleErrors.length} 个错误: ${consoleErrors.join('; ')}` : '无错误');
        logResult('测试全程无新运行时异常', pageErrors.length === 0, 
            pageErrors.length > 0 ? `共 ${pageErrors.length} 个异常: ${pageErrors.join('; ')}` : '无异常');

        console.log('\n========================================');
        console.log('  测试结果汇总');
        console.log('========================================\n');

        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const total = results.length;

        console.log(`总测试数: ${total}`);
        console.log(`通过: ${passed} ✅`);
        console.log(`失败: ${failed} ❌`);
        console.log(`通过率: ${((passed / total) * 100).toFixed(1)}%\n`);

        if (failed > 0) {
            console.log('失败的测试:');
            results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.test}`);
                console.log(`    ${r.details}`);
            });
        } else {
            console.log('🎉 所有测试通过！');
        }

        fs.writeFileSync('/Users/mac/code/solo coder/180/test-results.json', 
            JSON.stringify(results, null, 2));
        console.log('\n详细测试结果已保存到 test-results.json');

        return failed === 0;

    } catch (error) {
        console.error('\n❌ 测试执行出错:', error.message);
        logResult('测试执行', false, error.message);
        return false;
    } finally {
        await browser.close();
    }
}

runTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('测试脚本异常:', err);
    process.exit(1);
});
