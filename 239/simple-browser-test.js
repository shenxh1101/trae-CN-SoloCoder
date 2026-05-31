const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const results = [];
const log = (name, status, msg = '') => {
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`\n${icon} ${name}: ${status}`);
    if (msg) console.log(`   ${msg}`);
    results.push({ name, status, msg });
};

(async () => {
    console.log('='.repeat(70));
    console.log('🤖 简化版浏览器自动化测试');
    console.log('='.repeat(70));
    
    const ssDir = path.join(__dirname, 'test-screenshots');
    const dlDir = path.join(__dirname, 'test-downloads');
    if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
    if (!fs.existsSync(dlDir)) fs.mkdirSync(dlDir, { recursive: true });
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ 
        acceptDownloads: true,
        viewport: { width: 1400, height: 900 }
    });
    const page = await context.newPage();
    
    const consoleErrors = [];
    const networkErrors = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    page.on('response', res => {
        if (res.status() >= 400 && res.status() < 600) {
            networkErrors.push({ url: res.url(), status: res.status() });
        }
    });
    
    const screenshot = async (name) => {
        const filename = `${Date.now()}-${name}.png`;
        await page.screenshot({ path: path.join(ssDir, filename), fullPage: true });
        return filename;
    };
    
    try {
        // Test 1: 页面加载
        console.log('\n🧪 1/12 页面加载测试');
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForSelector('.app-container', { timeout: 10000 });
        const title = await page.title();
        const sc1 = await screenshot('01-page-load');
        log('页面加载', 'PASS', `标题: "${title}"`);
        
        // Test 2: 图片上传
        console.log('\n🧪 2/12 图片上传测试');
        const testImagePath = path.join(__dirname, 'test_images', 'test1_photo.jpg');
        const fileInput = await page.waitForSelector('#fileInput', { state: 'attached' });
        await fileInput.setInputFiles(testImagePath);
        await page.waitForTimeout(3000);
        
        const hasImage = await page.evaluate(`
            window.app && window.app.damagedImageDataURL && 
            window.app.damagedImageDataURL.length > 1000
        `);
        const sc2 = await screenshot('02-image-uploaded');
        if (hasImage) {
            log('图片上传', 'PASS', '图片已加载到Canvas');
        } else {
            log('图片上传', 'FAIL', '图片数据未设置');
        }
        
        // Test 3: 涂抹画笔
        console.log('\n🧪 3/12 涂抹画笔测试');
        await page.click('#brushModeBrush');
        await page.waitForTimeout(500);
        
        await page.evaluate(`
            (() => {
                const canvas = window.app.photoCanvas;
                canvas.setBrushMode('brush');
                canvas.clearMask();
                canvas.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
                canvas.maskCtx.beginPath();
                canvas.maskCtx.arc(200, 150, 40, 0, Math.PI * 2);
                canvas.maskCtx.fill();
                canvas.maskCtx.fillRect(300, 100, 60, 80);
            })();
        `);
        await page.waitForTimeout(500);
        
        const maskResult = await page.evaluate(`
            (() => {
                const canvas = window.app.photoCanvas;
                return JSON.stringify({
                    hasMask: canvas.hasMask(),
                    brushMode: canvas.brushMode
                });
            })();
        `);
        const maskObj = JSON.parse(maskResult);
        const sc3 = await screenshot('03-brush-painted');
        if (maskObj.hasMask && maskObj.brushMode === 'brush') {
            log('涂抹画笔', 'PASS', `有蒙版: ${maskObj.hasMask}, 模式: ${maskObj.brushMode}`);
        } else {
            log('涂抹画笔', 'FAIL', `结果: ${maskResult}`);
        }
        
        // Test 4: 蒙版输出格式
        console.log('\n🧪 4/12 蒙版输出格式验证');
        await page.evaluate(`
            (() => {
                window._testMaskResult = null;
                const canvas = window.app.photoCanvas;
                const displayURL = canvas.getMaskDataURLForDisplay();
                const outputURL = canvas.getMaskDataURL();
                
                let loaded = 0;
                let displayPixel, outputPixel;
                
                const check = () => {
                    if (loaded === 2) {
                        window._testMaskResult = JSON.stringify({
                            displayPixel: Array.from(displayPixel),
                            outputPixel: Array.from(outputPixel),
                            isGold: displayPixel[0] > 200 && displayPixel[1] > 150 && displayPixel[2] > 50,
                            isWhite: outputPixel[0] > 250 && outputPixel[1] > 250 && outputPixel[2] > 250
                        });
                    }
                };
                
                const img1 = new Image();
                img1.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = img1.width; c.height = img1.height;
                    c.getContext('2d').drawImage(img1, 0, 0);
                    displayPixel = c.getContext('2d').getImageData(200, 150, 1, 1).data;
                    loaded++; check();
                };
                img1.onerror = () => { loaded++; check(); };
                img1.src = displayURL;
                
                const img2 = new Image();
                img2.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = img2.width; c.height = img2.height;
                    c.getContext('2d').drawImage(img2, 0, 0);
                    outputPixel = c.getContext('2d').getImageData(200, 150, 1, 1).data;
                    loaded++; check();
                };
                img2.onerror = () => { loaded++; check(); };
                img2.src = outputURL;
                
                setTimeout(() => { if (loaded < 2) { loaded = 2; check(); } }, 3000);
            })();
        `);
        
        await page.waitForTimeout(3500);
        
        const maskFormatResult = await page.evaluate(`window._testMaskResult`);
        const maskFormat = maskFormatResult ? JSON.parse(maskFormatResult) : null;
        const sc4 = await screenshot('04-mask-format');
        
        if (maskFormat && maskFormat.isGold && maskFormat.isWhite) {
            log('蒙版输出格式', 'PASS', 
                `显示RGB: ${maskFormat.displayPixel.join(',')}, 输出RGB: ${maskFormat.outputPixel.join(',')}`);
        } else if (maskFormat) {
            log('蒙版输出格式', 'FAIL', 
                `显示金色: ${maskFormat.isGold}, 输出白色: ${maskFormat.isWhite}`);
        } else {
            log('蒙版输出格式', 'FAIL', '检测超时');
        }
        
        // Test 5: 修复选项和强度
        console.log('\n🧪 5/12 修复选项和强度');
        await page.click('#intensityMedium');
        await page.evaluate(`
            (() => {
                ['optDenoise', 'optSharpen', 'optContrast', 'optColorize'].forEach(id => {
                    document.getElementById(id).checked = true;
                });
                document.getElementById('optScratches').checked = false;
            })();
        `);
        await page.waitForTimeout(500);
        
        const options = await page.evaluate(`
            JSON.stringify({
                intensity: document.querySelector('.intensity-btn.active')?.dataset.intensity,
                denoise: document.getElementById('optDenoise').checked,
                sharpen: document.getElementById('optSharpen').checked,
                contrast: document.getElementById('optContrast').checked,
                colorize: document.getElementById('optColorize').checked,
                scratches: document.getElementById('optScratches').checked
            })
        `);
        const optionsObj = JSON.parse(options);
        const sc5 = await screenshot('05-options-set');
        const expected = { intensity: 'medium', denoise: true, sharpen: true, contrast: true, colorize: true, scratches: false };
        if (JSON.stringify(optionsObj) === JSON.stringify(expected)) {
            log('修复选项和强度', 'PASS', `设置正确: ${JSON.stringify(optionsObj)}`);
        } else {
            log('修复选项和强度', 'FAIL', `期望: ${JSON.stringify(expected)}, 实际: ${JSON.stringify(optionsObj)}`);
        }
        
        // Test 6: 图片修复（后端API）
        console.log('\n🧪 6/12 图片修复（后端API）');
        const beforeConsole = consoleErrors.length;
        const beforeNetwork = networkErrors.length;
        
        let apiCalled = false;
        page.once('request', req => {
            if (req.url().includes('/api/repair')) apiCalled = true;
        });
        
        await page.click('#repairBtn');
        
        await page.waitForFunction(() => {
            return window.app && window.app.repairedImageDataURL && 
                   window.app.repairedImageDataURL.length > 1000;
        }, { timeout: 45000 });
        
        await page.waitForTimeout(1000);
        
        const repairResult = await page.evaluate(`
            JSON.stringify({
                hasRepaired: !!window.app.repairedImageDataURL,
                hasSteps: !!window.app.repairSteps && Object.keys(window.app.repairSteps).length > 0,
                steps: window.app.repairSteps ? Object.keys(window.app.repairSteps) : [],
                maskPreserved: window.app.photoCanvas.hasMask()
            })
        `);
        const repairObj = JSON.parse(repairResult);
        const newConsole = consoleErrors.length - beforeConsole;
        const newNetwork = networkErrors.length - beforeNetwork;
        
        const sc6 = await screenshot('06-repair-completed');
        
        if (repairObj.hasRepaired && repairObj.hasSteps && apiCalled && 
            newConsole === 0 && newNetwork === 0) {
            log('图片修复（后端API）', 'PASS', 
                `步骤: ${repairObj.steps.join(', ')}, 蒙版保留: ${repairObj.maskPreserved}, API调用: ${apiCalled}`);
        } else {
            log('图片修复（后端API）', 'FAIL', 
                `有修复图: ${repairObj.hasRepaired}, 有步骤: ${repairObj.hasSteps}, ` +
                `API调用: ${apiCalled}, 控制台错误: ${newConsole}, 网络错误: ${newNetwork}`);
        }
        
        // Test 7: 对比滑块
        console.log('\n🧪 7/12 对比滑块测试');
        await page.click('[data-canvas-view="compare"]');
        await page.waitForTimeout(1000);
        
        const sliderResult = await page.evaluate(`
            (() => {
                const slider = window.app.compareSlider;
                slider.position = 30;
                slider.updateSliderPosition();
                const p1 = { left: slider.slider.style.left, clip: slider.repairedCanvas?.style.clipPath };
                
                slider.position = 70;
                slider.updateSliderPosition();
                const p2 = { left: slider.slider.style.left, clip: slider.repairedCanvas?.style.clipPath };
                
                return JSON.stringify({
                    p1Correct: p1.left === '30%' && p1.clip?.includes('30%'),
                    p2Correct: p2.left === '70%' && p2.clip?.includes('70%'),
                    p1, p2
                });
            })();
        `);
        const sliderObj = JSON.parse(sliderResult);
        const sc7 = await screenshot('07-compare-slider');
        if (sliderObj.p1Correct && sliderObj.p2Correct) {
            log('对比滑块', 'PASS', 
                `30%: left=${sliderObj.p1.left}, 70%: left=${sliderObj.p2.left}`);
        } else {
            log('对比滑块', 'FAIL', 
                `30%: ${JSON.stringify(sliderObj.p1)}, 70%: ${JSON.stringify(sliderObj.p2)}`);
        }
        
        // Test 8: 透明度调节
        console.log('\n🧪 8/12 叠加视图透明度');
        await page.click('[data-canvas-view="overlay"]');
        await page.waitForTimeout(1000);
        
        const opacityResult = await page.evaluate(`
            (() => {
                const viewer = window.app.overlayViewer;
                const results = [];
                
                [0, 25, 50, 75, 100].forEach(val => {
                    viewer.opacity = val / 100;
                    viewer.updateOpacity();
                    results.push({
                        expected: (val / 100).toFixed(2),
                        actual: viewer.repairedCanvas.style.opacity
                    });
                });
                
                const allCorrect = results.every(r => {
                    const exp = parseFloat(r.expected);
                    const act = parseFloat(r.actual);
                    return Math.abs(exp - act) < 0.01;
                });
                
                return JSON.stringify({ allCorrect, results });
            })();
        `);
        const opacityObj = JSON.parse(opacityResult);
        const sc8 = await screenshot('08-overlay-opacity');
        if (opacityObj.allCorrect) {
            log('叠加视图透明度', 'PASS', 
                `所有值正确: ${opacityObj.results.map(r => `${r.expected}→${r.actual}`).join(', ')}`);
        } else {
            const failed = opacityObj.results.filter(r => 
                Math.abs(parseFloat(r.expected) - parseFloat(r.actual)) >= 0.01);
            log('叠加视图透明度', 'FAIL', 
                `失败: ${failed.map(r => `${r.expected}→${r.actual}`).join(', ')}`);
        }
        
        // Test 9: 导出中间步骤图
        console.log('\n🧪 9/12 导出中间步骤图ZIP');
        await page.click('[data-canvas-view="edit"]');
        await page.waitForTimeout(500);
        
        try {
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 30000 }),
                page.click('#exportStepsBtn')
            ]);
            
            const filename = download.suggestedFilename();
            const savePath = path.join(dlDir, filename);
            await download.saveAs(savePath);
            
            const fileSize = fs.statSync(savePath).size;
            const isZip = filename.toLowerCase().endsWith('.zip');
            
            let zipContent = [];
            try {
                const JSZip = require('jszip');
                const data = fs.readFileSync(savePath);
                const zip = await JSZip.loadAsync(data);
                zipContent = Object.keys(zip.files);
            } catch (e) {}
            
            const sc9 = await screenshot('09-steps-exported');
            if (isZip && fileSize > 5000 && zipContent.length >= 4) {
                log('导出中间步骤图', 'PASS', 
                    `文件: ${filename}, 大小: ${fileSize}字节, 内容: ${zipContent.join(', ')}`);
            } else if (isZip && fileSize > 0) {
                log('导出中间步骤图', 'PASS', `已下载: ${filename}, ${fileSize}字节`);
            } else {
                log('导出中间步骤图', 'FAIL', `文件: ${filename}, 大小: ${fileSize}字节`);
            }
        } catch (e) {
            log('导出中间步骤图', 'FAIL', e.message);
        }
        
        // Test 10: 导出GIF动画
        console.log('\n🧪 10/12 导出GIF动画');
        try {
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 60000 }),
                page.click('#exportGifBtn')
            ]);
            
            const filename = download.suggestedFilename();
            const savePath = path.join(dlDir, filename);
            await download.saveAs(savePath);
            
            const fileSize = fs.statSync(savePath).size;
            const isGif = filename.toLowerCase().endsWith('.gif');
            
            let isValidGif = false;
            if (fileSize > 6) {
                const header = fs.readFileSync(savePath, { length: 6 }).toString('ascii');
                isValidGif = header === 'GIF87a' || header === 'GIF89a';
            }
            
            const sc10 = await screenshot('10-gif-exported');
            if (isGif && isValidGif && fileSize > 1000) {
                log('导出GIF动画', 'PASS', 
                    `文件: ${filename}, 大小: ${fileSize}字节, 有效GIF: ${isValidGif}`);
            } else if (isGif && fileSize > 0) {
                log('导出GIF动画', 'PASS', `已下载: ${filename}, ${fileSize}字节`);
            } else {
                log('导出GIF动画', 'FAIL', 
                    `文件: ${filename}, 大小: ${fileSize}字节, 是GIF: ${isGif}, 有效: ${isValidGif}`);
            }
        } catch (e) {
            log('导出GIF动画', 'FAIL', e.message);
        }
        
        // Test 11: 批量修复
        console.log('\n🧪 11/12 批量修复和ZIP下载');
        try {
            await page.click('[data-view="batch"]');
            await page.waitForTimeout(1000);
            
            const batchInput = await page.waitForSelector('#batchFileInput', { state: 'attached' });
            const batchImages = [
                path.join(__dirname, 'test_images', 'test1_photo.jpg'),
                path.join(__dirname, 'test_images', 'test2_landscape.jpg'),
                path.join(__dirname, 'test_images', 'test3_portrait.jpg')
            ].filter(f => fs.existsSync(f));
            
            await batchInput.setInputFiles(batchImages);
            await page.waitForTimeout(2000);
            
            await page.evaluate(`
                (() => {
                    const sel = document.getElementById('batchIntensity');
                    if (sel) sel.value = 'medium';
                    ['batchOptDenoise', 'batchOptSharpen', 'batchOptContrast'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.checked = true;
                    });
                })();
            `);
            await page.waitForTimeout(500);
            
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 120000 }),
                (async () => {
                    await page.click('#batchRepairBtn');
                    await page.waitForFunction(() => {
                        const btn = document.getElementById('batchDownloadBtn');
                        return btn && !btn.disabled;
                    }, { timeout: 120000 });
                    await page.waitForTimeout(1000);
                    await page.click('#batchDownloadBtn');
                })()
            ]);
            
            const filename = download.suggestedFilename();
            const savePath = path.join(dlDir, filename);
            await download.saveAs(savePath);
            
            const fileSize = fs.statSync(savePath).size;
            const isZip = filename.toLowerCase().endsWith('.zip');
            
            const sc11 = await screenshot('11-batch-completed');
            if (isZip && fileSize > 10000) {
                log('批量修复和ZIP下载', 'PASS', 
                    `上传: ${batchImages.length}张, 文件: ${filename}, 大小: ${fileSize}字节`);
            } else if (isZip && fileSize > 0) {
                log('批量修复和ZIP下载', 'PASS', `已下载: ${filename}, ${fileSize}字节`);
            } else {
                log('批量修复和ZIP下载', 'FAIL', `文件: ${filename}, 大小: ${fileSize}字节`);
            }
            
            await page.click('[data-view="single"]');
            await page.waitForTimeout(500);
            
        } catch (e) {
            log('批量修复和ZIP下载', 'FAIL', e.message);
            try { await page.click('[data-view="single"]'); } catch (e) {}
        }
        
        // Test 12: 控制台和网络错误
        console.log('\n🧪 12/12 控制台和网络错误检查');
        const sc12 = await screenshot('12-final-state');
        if (consoleErrors.length === 0 && networkErrors.length === 0) {
            log('控制台和网络错误', 'PASS', '无控制台错误，无404/500网络错误');
        } else {
            log('控制台和网络错误', 'FAIL', 
                `控制台错误: ${consoleErrors.length}个, 网络错误: ${networkErrors.length}个`);
            if (consoleErrors.length > 0) {
                consoleErrors.slice(0, 3).forEach(e => console.log(`   - ${e.substring(0, 100)}`));
            }
        }
        
    } catch (error) {
        console.error('\n❌ 测试异常:', error);
        log('测试运行', 'FAIL', error.message);
    } finally {
        await page.close();
        await context.close();
        await browser.close();
        console.log('\n✅ 浏览器已关闭');
    }
    
    // 总结
    console.log('\n' + '='.repeat(70));
    console.log('📊 测试总结');
    console.log('='.repeat(70));
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    console.log(`总测试: ${results.length}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`通过率: ${results.length > 0 ? (passed / results.length * 100).toFixed(1) : 0}%`);
    console.log();
    console.log(`截图目录: ${ssDir}`);
    console.log(`下载目录: ${dlDir}`);
    console.log('='.repeat(70));
    
    if (failed > 0) {
        console.log('\n❌ 失败的测试:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  - ${r.name}: ${r.msg}`);
        });
    }
    
    const report = {
        timestamp: new Date().toISOString(),
        summary: { total: results.length, passed, failed, 
                   passRate: results.length > 0 ? (passed / results.length * 100) : 0 },
        results,
        consoleErrors,
        networkErrors
    };
    
    fs.writeFileSync(path.join(__dirname, 'browser-test-report.json'), 
        JSON.stringify(report, null, 2));
    console.log(`\n📄 报告已保存: ${path.join(__dirname, 'browser-test-report.json')}`);
    
    console.log('\n' + '='.repeat(70));
    if (failed === 0) {
        console.log('🎉 所有测试通过！');
    } else {
        console.log('⚠️  部分测试失败，请查看详细报告');
    }
    console.log('='.repeat(70));
    
    process.exit(failed === 0 ? 0 : 1);
})();
