const { chromium } = require('playwright');
const fs = require('fs');

const TEST_RESULTS = [];
let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, detail = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const msg = `${status} - ${name}${detail ? ' | ' + detail : ''}`;
    console.log(msg);
    TEST_RESULTS.push({ name, passed, detail });
    if (passed) testsPassed++;
    else testsFailed++;
}

async function resetAppState(page) {
    await page.evaluate(() => {
        window.pixelArtApp.canvasEngine.clear();
        window.pixelArtApp.paletteManager.selectColor('#000000');
        window.pixelArtApp.toolManager.setTool('pencil');
        window.pixelArtApp.historyManager.reset(
            [window.pixelArtApp.canvasEngine.createEmptyFrame()], 0
        );
    });
    await page.waitForTimeout(50);
}

async function runTests() {
    console.log('========================================');
    console.log('  像素画绘制工具 - Playwright 真实浏览器测试');
    console.log('========================================\n');

    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    let consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    page.on('pageerror', error => {
        consoleErrors.push('PAGE ERROR: ' + error.message);
    });

    try {
        // ===== 测试 1: 页面加载 =====
        console.log('--- 测试 1: 页面加载 ---');
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        
        const title = await page.title();
        logTest('页面标题正确', title === '像素画绘制工具', `标题: "${title}"`);
        
        const canvasExists = await page.evaluate(() => document.getElementById('pixel-canvas') !== null);
        logTest('像素画布存在', canvasExists);
        
        const gridCanvasExists = await page.evaluate(() => document.getElementById('grid-canvas') !== null);
        logTest('网格画布存在', gridCanvasExists);
        
        const appExists = await page.evaluate(() => window.pixelArtApp !== undefined);
        logTest('应用对象已初始化', appExists);

        // ===== 测试 2: 画笔工具绘制像素 =====
        console.log('\n--- 测试 2: 画笔工具绘制像素 ---');
        await resetAppState(page);

        const canvas = page.locator('#pixel-canvas');
        const box = await canvas.boundingBox();
        const pixelSize = box.width / 32;

        const toolBeforeDraw = await page.evaluate(() => 
            window.pixelArtApp.toolManager.getCurrentTool()
        );
        logTest('当前工具是铅笔', toolBeforeDraw === 'pencil', `工具: ${toolBeforeDraw}`);

        await canvas.hover({ position: { x: pixelSize * 10 + pixelSize/2, y: pixelSize * 10 + pixelSize/2 } });
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(200);

        const pixelColor = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(10, 10)
        );
        logTest('点击绘制单个像素', pixelColor === '#000000', `颜色: ${pixelColor}`);

        await page.evaluate(() => window.pixelArtApp.canvasEngine.clear());
        await page.waitForTimeout(50);

        await canvas.hover({ position: { x: pixelSize * 0 + pixelSize/2, y: pixelSize * 15 + pixelSize/2 } });
        await page.mouse.down();
        for (let x = 1; x <= 15; x++) {
            await canvas.hover({ position: { x: pixelSize * x + pixelSize/2, y: pixelSize * 15 + pixelSize/2 } });
            await page.waitForTimeout(10);
        }
        await page.mouse.up();
        await page.waitForTimeout(200);

        const allBlack = await page.evaluate(() => {
            const result = [];
            for (let x = 0; x <= 15; x++) {
                const c = window.pixelArtApp.canvasEngine.getPixel(x, 15);
                result.push({ x, color: c });
                if (c !== '#000000') {
                    return { ok: false, x, color: c, all: result };
                }
            }
            return { ok: true };
        });
        logTest('拖拽绘制水平线', allBlack.ok, allBlack.ok ? '' : `x=${allBlack.x} 颜色=${allBlack.color}`);

        await page.evaluate(() => window.pixelArtApp.toolManager.setTool('eraser'));
        await page.waitForTimeout(50);

        await canvas.hover({ position: { x: pixelSize * 10 + pixelSize/2, y: pixelSize * 15 + pixelSize/2 } });
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(200);

        const erasedColor = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(10, 15)
        );
        logTest('橡皮擦功能', erasedColor === '#FFFFFF', `擦除后颜色: ${erasedColor}`);

        await page.evaluate(() => window.pixelArtApp.toolManager.setTool('pencil'));
        await page.waitForTimeout(50);

        // ===== 测试 3: 24色调色板 =====
        console.log('\n--- 测试 3: 24色调色板 ---');
        await resetAppState(page);
        
        const presetColors = await page.evaluate(() => 
            document.querySelectorAll('.preset-color').length
        );
        logTest('24个预设颜色显示', presetColors === 24, `实际: ${presetColors}个`);

        await page.evaluate(() => {
            const colors = document.querySelectorAll('.preset-color');
            for (const c of colors) {
                if (c.dataset.color.toUpperCase() === '#ED1C24') {
                    c.click();
                    break;
                }
            }
        });
        await page.waitForTimeout(100);

        const currentColor = await page.evaluate(() => 
            window.pixelArtApp.paletteManager.getCurrentColor()
        );
        logTest('点击红色预设 - 当前颜色更新', currentColor === '#ED1C24', `颜色: ${currentColor}`);

        const hasActive = await page.evaluate(() => {
            const colors = document.querySelectorAll('.preset-color');
            for (const c of colors) {
                if (c.dataset.color.toUpperCase() === '#ED1C24') {
                    return c.classList.contains('active');
                }
            }
            return false;
        });
        logTest('红色预设标记为active', hasActive);

        await canvas.hover({ position: { x: pixelSize * 20 + pixelSize/2, y: pixelSize * 20 + pixelSize/2 } });
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(200);

        const newPixelColor = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(20, 20)
        );
        logTest('用红色绘制像素', newPixelColor === '#ED1C24', `颜色: ${newPixelColor}`);

        // ===== 测试 4: 取色器 =====
        console.log('\n--- 测试 4: 取色器功能 ---');
        await resetAppState(page);

        await page.evaluate(() => {
            window.pixelArtApp.canvasEngine.setPixel(20, 20, '#3F48CC');
        });
        await page.waitForTimeout(50);

        await page.evaluate(() => window.pixelArtApp.toolManager.setTool('eyedropper'));
        await page.waitForTimeout(50);

        const historyBefore = await page.evaluate(() => 
            window.pixelArtApp.historyManager.stack.length
        );

        await canvas.hover({ position: { x: pixelSize * 20 + pixelSize/2, y: pixelSize * 20 + pixelSize/2 } });
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(200);

        const eyedropperColor = await page.evaluate(() => 
            window.pixelArtApp.paletteManager.getCurrentColor()
        );
        logTest('取色器获取颜色', eyedropperColor === '#3F48CC', `获取颜色: ${eyedropperColor}`);

        const historyAfter = await page.evaluate(() => 
            window.pixelArtApp.historyManager.stack.length
        );
        logTest('取色操作不保存历史', historyBefore === historyAfter, `之前: ${historyBefore}, 之后: ${historyAfter}`);

        await page.evaluate(() => window.pixelArtApp.toolManager.setTool('pencil'));
        await page.waitForTimeout(50);

        // ===== 测试 5: 填充桶 =====
        console.log('\n--- 测试 5: 填充桶功能 ---');
        await resetAppState(page);

        await page.evaluate(() => {
            for (let x = 0; x < 32; x++) {
                window.pixelArtApp.canvasEngine.setPixel(x, 8, '#000000');
                window.pixelArtApp.canvasEngine.setPixel(x, 24, '#000000');
            }
            for (let y = 8; y <= 24; y++) {
                window.pixelArtApp.canvasEngine.setPixel(0, y, '#000000');
                window.pixelArtApp.canvasEngine.setPixel(31, y, '#000000');
            }
        });
        await page.waitForTimeout(100);

        await page.evaluate(() => {
            window.pixelArtApp.paletteManager.selectColor('#ED1C24');
            window.pixelArtApp.toolManager.setTool('fillbucket');
        });
        await page.waitForTimeout(50);

        const historyBeforeFill = await page.evaluate(() => 
            window.pixelArtApp.historyManager.stack.length
        );

        await canvas.hover({ position: { x: pixelSize * 16 + pixelSize/2, y: pixelSize * 16 + pixelSize/2 } });
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(300);

        const fillResult = await page.evaluate(() => {
            for (let y = 9; y < 24; y++) {
                for (let x = 1; x < 31; x++) {
                    const c = window.pixelArtApp.canvasEngine.getPixel(x, y);
                    if (c !== '#ED1C24') {
                        return { ok: false, x, y, color: c };
                    }
                }
            }
            const outside = window.pixelArtApp.canvasEngine.getPixel(16, 4);
            if (outside !== '#FFFFFF') {
                return { ok: false, msg: '边界外被填充', color: outside };
            }
            return { ok: true };
        });
        logTest('填充桶填充边界内区域', fillResult.ok, fillResult.ok ? '' : JSON.stringify(fillResult));

        const historyAfterFill = await page.evaluate(() => 
            window.pixelArtApp.historyManager.stack.length
        );
        logTest('填充后保存历史记录', historyAfterFill > historyBeforeFill, 
            `之前: ${historyBeforeFill}, 之后: ${historyAfterFill}`);

        await page.evaluate(() => window.pixelArtApp.toolManager.setTool('pencil'));
        await page.waitForTimeout(50);

        // ===== 测试 6: 撤销/重做 =====
        console.log('\n--- 测试 6: 撤销/重做功能 ---');
        await resetAppState(page);

        await canvas.hover({ position: { x: pixelSize * 5 + pixelSize/2, y: pixelSize * 5 + pixelSize/2 } });
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(200);

        const colorBeforeUndo = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(5, 5)
        );
        logTest('绘制后像素为黑色', colorBeforeUndo === '#000000', `颜色: ${colorBeforeUndo}`);

        await page.evaluate(() => window.pixelArtApp.undo());
        await page.waitForTimeout(200);

        const colorAfterUndo = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(5, 5)
        );
        logTest('撤销恢复白色(Ctrl+Z)', colorAfterUndo === '#FFFFFF', `颜色: ${colorAfterUndo}`);

        const canRedo = await page.evaluate(() => 
            window.pixelArtApp.historyManager.canRedo()
        );
        logTest('撤销后可以重做', canRedo);

        await page.evaluate(() => window.pixelArtApp.redo());
        await page.waitForTimeout(200);

        const colorAfterRedo = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(5, 5)
        );
        logTest('重做恢复黑色(Ctrl+Y)', colorAfterRedo === '#000000', `颜色: ${colorAfterRedo}`);

        const canUndoAfterRedo = await page.evaluate(() => 
            window.pixelArtApp.historyManager.canUndo()
        );
        logTest('重做后可以撤销', canUndoAfterRedo);

        await resetAppState(page);

        for (let i = 1; i <= 25; i++) {
            await canvas.hover({ position: { x: pixelSize * i + pixelSize/2, y: pixelSize * 0 + pixelSize/2 } });
            await page.mouse.down();
            await page.mouse.up();
            await page.waitForTimeout(30);
        }
        await page.waitForTimeout(500);

        const historyLimit = await page.evaluate(() => {
            return {
                length: window.pixelArtApp.historyManager.stack.length,
                index: window.pixelArtApp.historyManager.index
            };
        });
        logTest('20步历史限制', historyLimit.length === 20, 
            `历史: ${historyLimit.length}条, 索引: ${historyLimit.index}`);

        // ===== 测试 7: PNG导出 =====
        console.log('\n--- 测试 7: PNG导出功能 ---');
        await resetAppState(page);

        await page.evaluate(() => {
            window.pixelArtApp.paletteManager.selectColor('#ED1C24');
        });
        await page.waitForTimeout(50);

        await canvas.hover({ position: { x: pixelSize * 0 + pixelSize/2, y: pixelSize * 0 + pixelSize/2 } });
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(200);

        const exportInfo = await page.evaluate(() => {
            const exportCanvas = window.pixelArtApp.canvasEngine.exportScaled(10);
            const ctx = exportCanvas.getContext('2d');
            const pixelData = ctx.getImageData(0, 0, 10, 10).data;
            const r = pixelData[0], g = pixelData[1], b = pixelData[2];
            const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
            
            const pixelData2 = ctx.getImageData(10, 0, 10, 10).data;
            const r2 = pixelData2[0], g2 = pixelData2[1], b2 = pixelData2[2];
            const hex2 = '#' + [r2, g2, b2].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();

            return {
                width: exportCanvas.width,
                height: exportCanvas.height,
                firstPixel: hex,
                secondPixel: hex2
            };
        });

        logTest('导出尺寸320x320', exportInfo.width === 320 && exportInfo.height === 320, 
            `尺寸: ${exportInfo.width}x${exportInfo.height}`);
        logTest('导出像素颜色正确', exportInfo.firstPixel === '#ED1C24', 
            `第一个像素(0,0): ${exportInfo.firstPixel}`);
        logTest('导出第二像素为白色', exportInfo.secondPixel === '#FFFFFF', 
            `第二个像素(1,0): ${exportInfo.secondPixel}`);

        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await page.click('#btn-export');
        const download = await downloadPromise;
        
        if (download) {
            const filename = download.suggestedFilename();
            logTest('导出PNG文件名', filename.includes('.png'), `文件名: ${filename}`);
            await download.delete();
        } else {
            logTest('导出PNG下载触发', false, '没有检测到下载');
        }

        // ===== 测试 8: localStorage恢复 =====
        console.log('\n--- 测试 8: localStorage恢复功能 ---');
        await resetAppState(page);

        await page.evaluate(() => {
            localStorage.removeItem('pixelArtData');
            window.pixelArtApp.canvasEngine.clear();
            window.pixelArtApp.paletteManager.selectColor('#00FF00');
            window.pixelArtApp.canvasEngine.setPixel(12, 12, '#00FF00');
            window.pixelArtApp.saveToStorage();
        });
        await page.waitForTimeout(500);

        const storageData = await page.evaluate(() => {
            const stored = localStorage.getItem('pixelArtData');
            if (!stored) return null;
            return JSON.parse(stored);
        });
        logTest('数据保存到localStorage', storageData !== null, 
            storageData ? `像素颜色: ${storageData.frames[0][12][12]}` : '无数据');

        if (storageData) {
            logTest('保存的像素颜色正确', storageData.frames[0][12][12] === '#00FF00',
                `颜色: ${storageData.frames[0][12][12]}`);
            logTest('保存当前颜色', storageData.currentColor === '#00FF00',
                `当前颜色: ${storageData.currentColor}`);
            logTest('保存当前工具', storageData.currentTool === 'pencil',
                `当前工具: ${storageData.currentTool}`);
        }

        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        const restoredPixel = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(12, 12)
        );
        logTest('刷新后像素恢复', restoredPixel === '#00FF00', `颜色: ${restoredPixel}`);

        const restoredColor = await page.evaluate(() => 
            window.pixelArtApp.paletteManager.getCurrentColor()
        );
        logTest('刷新后当前颜色恢复', restoredColor === '#00FF00', `颜色: ${restoredColor}`);

        const restoredTool = await page.evaluate(() => 
            window.pixelArtApp.toolManager.getCurrentTool()
        );
        logTest('刷新后工具恢复', restoredTool === 'pencil', `工具: ${restoredTool}`);

        // ===== 测试 9: 动画模式 =====
        console.log('\n--- 测试 9: 动画模式功能 ---');
        await resetAppState(page);

        await page.evaluate(() => {
            const toggle = document.getElementById('toggle-animation');
            toggle.checked = true;
            toggle.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.waitForTimeout(200);

        const controlsVisible = await page.evaluate(() => {
            const controls = document.getElementById('animation-controls');
            return controls.style.display !== 'none';
        });
        logTest('动画控制面板显示', controlsVisible);

        const animationEnabled = await page.evaluate(() => 
            window.pixelArtApp.animationEnabled
        );
        logTest('animationEnabled=true', animationEnabled);

        const initialFrames = await page.evaluate(() => 
            window.pixelArtApp.animationController.getFrameCount()
        );

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.pixelArtApp.addFrame());
            await page.waitForTimeout(100);
        }

        const frameCount = await page.evaluate(() => 
            window.pixelArtApp.animationController.getFrameCount()
        );
        logTest('添加帧到5帧', frameCount === 5, `帧数: ${frameCount}`);

        await page.evaluate(() => {
            window.pixelArtApp.animationController.setCurrentFrame(0);
            window.pixelArtApp.canvasEngine.clear();
            window.pixelArtApp.paletteManager.selectColor('#FF0000');
            window.pixelArtApp.canvasEngine.setPixel(0, 0, '#FF0000');
        });
        await page.waitForTimeout(100);

        await page.evaluate(() => {
            window.pixelArtApp.animationController.setCurrentFrame(1);
            window.pixelArtApp.canvasEngine.clear();
            window.pixelArtApp.paletteManager.selectColor('#0000FF');
            window.pixelArtApp.canvasEngine.setPixel(31, 31, '#0000FF');
        });
        await page.waitForTimeout(100);

        await page.evaluate(() => 
            window.pixelArtApp.animationController.setCurrentFrame(0)
        );
        await page.waitForTimeout(100);

        const frame0Pixel = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(0, 0)
        );
        logTest('第1帧独立像素 - 红色', frame0Pixel === '#FF0000', `颜色: ${frame0Pixel}`);

        const frame0Other = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(31, 31)
        );
        logTest('第1帧其他位置 - 白色', frame0Other === '#FFFFFF', `颜色: ${frame0Other}`);

        await page.evaluate(() => 
            window.pixelArtApp.animationController.setCurrentFrame(1)
        );
        await page.waitForTimeout(100);

        const frame1Pixel = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(31, 31)
        );
        logTest('第2帧独立像素 - 蓝色', frame1Pixel === '#0000FF', `颜色: ${frame1Pixel}`);

        const frame1Other = await page.evaluate(() => 
            window.pixelArtApp.canvasEngine.getPixel(0, 0)
        );
        logTest('第2帧不影响第1帧', frame1Other === '#FFFFFF', `颜色: ${frame1Other}`);

        await page.evaluate(() => window.pixelArtApp.playAnimation());
        await page.waitForTimeout(500);

        const isPlaying = await page.evaluate(() => 
            window.pixelArtApp.animationController.isPlaying
        );
        logTest('动画正在播放', isPlaying);

        const playingThumbs = await page.evaluate(() => 
            document.querySelectorAll('.frame-thumb.playing').length
        );
        logTest('播放帧高亮显示', playingThumbs === 1, `高亮数: ${playingThumbs}`);

        await page.evaluate(() => window.pixelArtApp.stopAnimation());
        await page.waitForTimeout(200);

        const stopped = await page.evaluate(() => 
            !window.pixelArtApp.animationController.isPlaying
        );
        logTest('动画停止播放', stopped);

        await page.evaluate(() => {
            const slider = document.getElementById('fps-slider');
            slider.value = 20;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await page.waitForTimeout(100);

        const fpsValue = await page.evaluate(() => 
            window.pixelArtApp.animationController.fps
        );
        logTest('帧率调节到20FPS', fpsValue === 20, `FPS: ${fpsValue}`);

        const fpsDisplay = await page.evaluate(() => 
            document.getElementById('fps-value').textContent
        );
        logTest('FPS显示正确', fpsDisplay === '20', `显示: ${fpsDisplay}`);

        // ===== 控制台错误检查 =====
        console.log('\n--- 控制台错误检查 ---');
        if (consoleErrors.length === 0) {
            logTest('无控制台错误', true);
        } else {
            logTest('控制台错误', false, `发现 ${consoleErrors.length} 个错误`);
            consoleErrors.forEach((err, i) => {
                console.log(`  错误 ${i + 1}: ${err.substring(0, 150)}`);
            });
        }

    } catch (error) {
        console.error('测试执行出错:', error);
        logTest('测试执行', false, error.message);
    }

    await browser.close();

    // ===== 最终报告 =====
    console.log('\n' + '='.repeat(50));
    console.log('  测试报告');
    console.log('='.repeat(50));
    console.log(`  总计: ${testsPassed + testsFailed} 项测试`);
    console.log(`  通过: ${testsPassed} ✅`);
    console.log(`  失败: ${testsFailed} ❌`);
    console.log('='.repeat(50));

    if (testsFailed > 0) {
        console.log('\n失败的测试:');
        TEST_RESULTS.filter(t => !t.passed).forEach((t, i) => {
            console.log(`  ${i + 1}. ${t.name}`);
            if (t.detail) console.log(`     ${t.detail}`);
        });
    } else {
        console.log('\n🎉 所有测试通过！所有功能正常工作！');
    }

    const report = {
        summary: { total: testsPassed + testsFailed, passed: testsPassed, failed: testsFailed },
        results: TEST_RESULTS
    };
    fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
    console.log('\n测试报告已保存到 test-report.json');

    return testsFailed === 0;
}

runTests().then(passed => {
    process.exit(passed ? 0 : 1);
}).catch(err => {
    console.error('致命错误:', err);
    process.exit(1);
});
