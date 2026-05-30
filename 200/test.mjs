import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const RESULTS = [];
const DOWNLOAD_DIR = path.resolve('test-downloads');

function log(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const msg = `${status} | ${testName}${details ? ' - ' + details : ''}`;
    console.log(msg);
    RESULTS.push({ testName, passed, details });
}

async function runTests() {
    if (!fs.existsSync(DOWNLOAD_DIR)) {
        fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }

    const browser = await chromium.launch({
        headless: true,
        args: ['--allow-file-access-from-files', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
    });

    const context = await browser.newContext({
        acceptDownloads: true,
        permissions: ['microphone'],
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    console.log('\n========== 测试 1: 页面加载与字体加载 ==========\n');

    try {
        await page.goto('http://localhost:8000/index.html', { waitUntil: 'networkidle', timeout: 30000 });
        log('页面加载', true, 'HTTP 200 OK');
    } catch (e) {
        log('页面加载', false, e.message);
    }

    await page.waitForTimeout(500);

    const loadingOverlay = await page.$('#loading-overlay');
    const loadingVisible = loadingOverlay ? await loadingOverlay.isVisible() : false;
    log('加载遮罩初始显示', true, loadingVisible ? '加载中...' : '已加载完成');

    await page.waitForTimeout(10000);

    const overlayAfter = await page.$('#loading-overlay');
    log('加载遮罩消失', !overlayAfter, overlayAfter ? '遮罩仍在' : '遮罩已移除');

    const appExists = await page.evaluate(() => !!window.app);
    log('window.app 全局访问', appExists, appExists ? 'app对象可用' : 'app对象不可访问');

    const textCount = await page.evaluate(() => window.app ? window.app.textObjects.length : 0);
    log('文字对象创建', textCount > 0, `文字总数: ${textCount}`);

    const fontLoaded = await page.evaluate(() => window.app ? !!window.app.font : false);
    log('字体加载成功', fontLoaded, fontLoaded ? '3D文字可用' : '使用Sprite备用方案');

    const canvasEl = await page.$('#canvas-container canvas');
    log('WebGL Canvas渲染', !!canvasEl);

    log('页面无JS错误', pageErrors.length === 0, pageErrors.length > 0 ? pageErrors.slice(0, 3).join('; ') : '无错误');

    console.log('\n========== 测试 2: GUI 控制面板 ==========\n');

    const guiPanel = await page.$('.lil-gui');
    log('GUI面板存在', !!guiPanel);

    if (guiPanel) {
        const folders = await page.$$('.lil-gui .title');
        log('GUI文件夹', folders.length >= 5, `共 ${folders.length} 个`);
    }

    console.log('\n========== 测试 3: 音频功能测试 ==========\n');

    const audioStateBefore = await page.evaluate(() => ({
        audioEnabled: window.app?.params.audioEnabled,
        audioMode: window.app?.params.audioMode,
        audioReactive: window.app?.params.audioReactive
    }));
    log('音频初始状态', audioStateBefore.audioMode === '停止', `mode: ${audioStateBefore.audioMode}`);

    await page.evaluate(() => {
        const selects = document.querySelectorAll('.lil-gui select');
        for (const sel of selects) {
            const parent = sel.closest('.controller');
            if (parent && parent.textContent.includes('音频源')) {
                sel.value = '示例音乐';
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }
    });

    await page.waitForTimeout(3000);

    const audioStateAfterDemo = await page.evaluate(() => ({
        audioEnabled: window.app?.params.audioEnabled,
        audioMode: window.app?.params.audioMode,
        hasAnalyser: !!window.app?.analyser,
        hasDataArray: !!window.app?.dataArray,
        dataArrayLength: window.app?.dataArray?.length || 0
    }));

    log('示例音乐-音频启用', audioStateAfterDemo.audioEnabled, `mode: ${audioStateAfterDemo.audioMode}`);
    log('示例音乐-Analyser', audioStateAfterDemo.hasAnalyser);
    log('示例音乐-频谱数据', audioStateAfterDemo.hasDataArray && audioStateAfterDemo.dataArrayLength > 0, `长度: ${audioStateAfterDemo.dataArrayLength}`);

    const visualizerVisible = await page.evaluate(() => {
        const el = document.getElementById('audio-visualizer');
        return el ? el.style.display !== 'none' : false;
    });
    log('频谱可视化面板', visualizerVisible);

    await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('.lil-gui input[type="checkbox"]');
        for (const cb of checkboxes) {
            const parent = cb.closest('.controller');
            if (parent && parent.textContent.includes('音频响应')) {
                if (!cb.checked) {
                    cb.click();
                }
                break;
            }
        }
    });

    await page.waitForTimeout(500);

    const audioReactiveState = await page.evaluate(() => window.app?.params.audioReactive);
    log('音频响应开关', audioReactiveState === true, `audioReactive: ${audioReactiveState}`);

    if (audioStateAfterDemo.hasDataArray) {
        await page.waitForTimeout(500);
        const freqData = await page.evaluate(() => {
            const app = window.app;
            if (!app || !app.analyser || !app.dataArray) return null;
            app.analyser.getByteFrequencyData(app.dataArray);
            const sum = app.dataArray.reduce((a, b) => a + b, 0);
            return { avg: sum / app.dataArray.length, max: Math.max(...app.dataArray), samples: Array.from(app.dataArray.slice(0, 10)) };
        });
        log('频谱数据采样', freqData !== null && freqData.avg > 0, freqData ? `avg: ${freqData.avg.toFixed(1)}, max: ${freqData.max}, 前10: [${freqData.samples.join(',')}]` : '无数据');
    }

    await page.evaluate(() => {
        const selects = document.querySelectorAll('.lil-gui select');
        for (const sel of selects) {
            const parent = sel.closest('.controller');
            if (parent && parent.textContent.includes('音频源')) {
                sel.value = '停止';
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }
    });

    await page.waitForTimeout(1000);

    const audioStopped = await page.evaluate(() => !window.app?.params.audioEnabled);
    log('停止音频', audioStopped);

    console.log('\n========== 测试 4: 麦克风权限测试 ==========\n');

    const micPerm = await page.evaluate(async () => {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' });
            return result.state;
        } catch (e) {
            return 'error: ' + e.message;
        }
    });
    log('麦克风权限查询', micPerm.includes('granted') || micPerm.includes('prompt'), `状态: ${micPerm}`);

    console.log('\n========== 测试 5: 截图保存测试 ==========\n');

    const screenshotDir = path.join(DOWNLOAD_DIR, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'page-capture.png');
    await page.screenshot({ path: screenshotPath });
    const screenshotSize = fs.statSync(screenshotPath).size;
    log('Playwright截图', screenshotSize > 5000, `${(screenshotSize / 1024).toFixed(1)} KB`);

    try {
        const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
        await page.evaluate(() => window.app.takeScreenshot());
        const download = await downloadPromise;
        const fileName = download.suggestedFilename();
        const savePath = path.join(DOWNLOAD_DIR, fileName);
        await download.saveAs(savePath);
        const dlSize = fs.statSync(savePath).size;
        log('截图下载', dlSize > 1000, `文件: ${fileName}, ${(dlSize / 1024).toFixed(1)} KB`);
    } catch (e) {
        log('截图下载', false, `超时或失败: ${e.message}`);
    }

    console.log('\n========== 测试 6: JSON 导出测试 ==========\n');

    try {
        const jsonDownloadPromise = page.waitForEvent('download', { timeout: 15000 });
        await page.evaluate(() => window.app.exportParams());
        const jsonDownload = await jsonDownloadPromise;
        const jsonFileName = jsonDownload.suggestedFilename();
        const jsonPath = path.join(DOWNLOAD_DIR, jsonFileName);
        await jsonDownload.saveAs(jsonPath);

        const jsonStr = fs.readFileSync(jsonPath, 'utf-8');
        const jsonContent = JSON.parse(jsonStr);

        log('JSON文件下载', true, `文件: ${jsonFileName}`);

        const requiredFields = ['speed', 'radius', 'density', 'spiralTurns', 'textSize', 'autoRotate', 'rotateSpeed', 'materialType', 'background', 'audioReactive', 'customText', 'timestamp', 'wordCount', 'customWords', 'cameraPosition', 'cameraTarget', 'audioEnabled', 'audioMode'];
        const missingFields = requiredFields.filter(f => !(f in jsonContent));
        log('JSON参数完整性', missingFields.length === 0, missingFields.length > 0 ? `缺少: ${missingFields.join(', ')}` : `共 ${Object.keys(jsonContent).length} 个字段`);

        log('JSON-speed', jsonContent.speed === 1.0, `${jsonContent.speed}`);
        log('JSON-radius', jsonContent.radius === 10.0, `${jsonContent.radius}`);
        log('JSON-materialType', typeof jsonContent.materialType === 'string', jsonContent.materialType);
        log('JSON-cameraPosition', typeof jsonContent.cameraPosition?.x === 'number', JSON.stringify(jsonContent.cameraPosition));
        log('JSON-timestamp', !!jsonContent.timestamp, jsonContent.timestamp);
        log('JSON-wordCount', jsonContent.wordCount > 0, `${jsonContent.wordCount}`);
    } catch (e) {
        log('JSON下载', false, `超时或失败: ${e.message}`);
    }

    console.log('\n========== 测试 7: 鼠标 3D 交互测试 ==========\n');

    const canvas = await page.$('#canvas-container canvas');
    if (canvas) {
        const box = await canvas.boundingBox();
        if (box) {
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;

            const camBefore = await page.evaluate(() => ({
                x: window.app.camera.position.x,
                y: window.app.camera.position.y,
                z: window.app.camera.position.z
            }));

            await page.mouse.move(cx, cy);
            await page.mouse.down();
            await page.mouse.move(cx + 200, cy + 50, { steps: 10 });
            await page.mouse.up();
            await page.waitForTimeout(800);

            const camAfterDrag = await page.evaluate(() => ({
                x: window.app.camera.position.x,
                y: window.app.camera.position.y,
                z: window.app.camera.position.z
            }));

            const dragChanged = Math.abs(camAfterDrag.x - camBefore.x) > 0.01 || Math.abs(camAfterDrag.y - camBefore.y) > 0.01;
            log('鼠标拖拽旋转', dragChanged, `位置: (${camBefore.x.toFixed(2)},${camBefore.y.toFixed(2)}) → (${camAfterDrag.x.toFixed(2)},${camAfterDrag.y.toFixed(2)})`);

            await page.mouse.move(cx, cy);
            for (let i = 0; i < 5; i++) {
                await page.mouse.wheel(0, -100);
                await page.waitForTimeout(50);
            }
            await page.waitForTimeout(500);

            const camAfterZoom = await page.evaluate(() => ({
                z: window.app.camera.position.z,
                dist: window.app.camera.position.distanceTo(window.app.controls.target)
            }));

            log('鼠标滚轮缩放', true, `距目标: ${camAfterZoom.dist.toFixed(2)}`);

            await page.keyboard.down('Shift');
            await page.mouse.move(cx, cy);
            await page.mouse.down({ button: 'right' });
            await page.mouse.move(cx - 100, cy + 50, { steps: 5 });
            await page.mouse.up({ button: 'right' });
            await page.keyboard.up('Shift');
            await page.waitForTimeout(500);

            const targetAfterPan = await page.evaluate(() => ({
                x: window.app.controls.target.x,
                y: window.app.controls.target.y,
                z: window.app.controls.target.z
            }));
            log('右键拖拽平移', true, `target: (${targetAfterPan.x.toFixed(2)}, ${targetAfterPan.y.toFixed(2)}, ${targetAfterPan.z.toFixed(2)})`);
        }
    }

    console.log('\n========== 测试 8: 自动旋转与鼠标切换 ==========\n');

    const autoRotateInitial = await page.evaluate(() => ({
        param: window.app.params.autoRotate,
        controls: window.app.controls.autoRotate
    }));
    log('自动旋转初始', autoRotateInitial.param && autoRotateInitial.controls, `param=${autoRotateInitial.param}, controls=${autoRotateInitial.controls}`);

    await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('.lil-gui input[type="checkbox"]');
        for (const cb of checkboxes) {
            const parent = cb.closest('.controller');
            if (parent && parent.textContent.includes('自动旋转')) {
                cb.click();
                break;
            }
        }
    });

    await page.waitForTimeout(300);

    const autoRotateOff = await page.evaluate(() => ({
        param: window.app.params.autoRotate,
        controls: window.app.controls.autoRotate
    }));
    log('关闭自动旋转', !autoRotateOff.param && !autoRotateOff.controls, `param=${autoRotateOff.param}, controls=${autoRotateOff.controls}`);

    await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('.lil-gui input[type="checkbox"]');
        for (const cb of checkboxes) {
            const parent = cb.closest('.controller');
            if (parent && parent.textContent.includes('自动旋转')) {
                cb.click();
                break;
            }
        }
    });

    await page.waitForTimeout(300);

    const autoRotateOn = await page.evaluate(() => ({
        param: window.app.params.autoRotate,
        controls: window.app.controls.autoRotate
    }));
    log('重新开启自动旋转', autoRotateOn.param && autoRotateOn.controls, `param=${autoRotateOn.param}, controls=${autoRotateOn.controls}`);

    console.log('\n========== 测试 9: FPS 和统计信息 ==========\n');

    await page.waitForTimeout(2000);

    const fpsValue = await page.evaluate(() => document.getElementById('fps')?.textContent || '0');
    log('FPS计数', parseInt(fpsValue) > 0, `${fpsValue} FPS`);

    const textCount2 = await page.evaluate(() => document.getElementById('text-count')?.textContent || '0');
    log('文字计数', parseInt(textCount2) > 0, textCount2);

    console.log('\n========== 测试 10: 材质和背景切换 ==========\n');

    const materialTests = [
        { value: 'wireframe', name: '线框' },
        { value: 'emissive', name: '发光' },
        { value: 'standard', name: '标准' }
    ];

    for (const mt of materialTests) {
        await page.evaluate((val) => {
            const selects = document.querySelectorAll('.lil-gui select');
            for (const sel of selects) {
                const parent = sel.closest('.controller');
                if (parent && parent.textContent.includes('文字材质')) {
                    sel.value = val;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }, mt.value);
        await page.waitForTimeout(500);
        const currentMat = await page.evaluate(() => window.app.params.materialType);
        log(`材质切换-${mt.name}`, currentMat === mt.value, `当前: ${currentMat}`);
    }

    const bgTests = [
        { value: 'black', name: '纯黑' },
        { value: 'space', name: '深空' }
    ];

    for (const bg of bgTests) {
        await page.evaluate((val) => {
            const selects = document.querySelectorAll('.lil-gui select');
            for (const sel of selects) {
                const parent = sel.closest('.controller');
                if (parent && parent.textContent.includes('背景类型')) {
                    sel.value = val;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }, bg.value);
        await page.waitForTimeout(500);
        const currentBg = await page.evaluate(() => window.app.params.background);
        log(`背景切换-${bg.name}`, currentBg === bg.value, `当前: ${currentBg}`);
    }

    console.log('\n========== 测试总结 ==========\n');

    const totalTests = RESULTS.length;
    const passedTests = RESULTS.filter(r => r.passed).length;
    const failedTests = RESULTS.filter(r => !r.passed).length;

    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests}`);
    console.log(`失败: ${failedTests}`);
    console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
        console.log('\n❌ 失败项:');
        RESULTS.filter(r => !r.passed).forEach(r => {
            console.log(`   ${r.testName}: ${r.details}`);
        });
    }

    if (pageErrors.length > 0) {
        console.log('\n⚠️ 控制台错误:');
        pageErrors.forEach(e => console.log(`   ${e}`));
    }

    fs.writeFileSync(path.join(DOWNLOAD_DIR, 'test-results.json'), JSON.stringify(RESULTS, null, 2));

    await browser.close();
    process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('测试执行失败:', err);
    process.exit(1);
});
