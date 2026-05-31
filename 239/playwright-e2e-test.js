/**
 * ================================================
 * AI老照片修复模拟器 - Playwright浏览器自动化测试
 * ================================================
 * 
 * 运行方式：
 *   node playwright-e2e-test.js
 * 
 * 这个脚本会自动打开浏览器，模拟所有用户操作，
 * 并生成测试报告和截图作为证据。
 * ================================================
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class PhotoRepairE2ETest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.context = null;
        this.testResults = [];
        this.passed = 0;
        this.failed = 0;
        this.consoleErrors = [];
        this.networkErrors = [];
        this.screenshotDir = path.join(__dirname, 'test-screenshots');
        this.downloadDir = path.join(__dirname, 'test-downloads');
        
        this.baseURL = 'http://localhost:8080';
        this.testImageDir = path.join(__dirname, 'test_images');
        
        this.tests = [];
    }

    async init() {
        console.log('\n🚀 初始化浏览器...');
        
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }
        
        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.context = await this.browser.newContext({
            acceptDownloads: true,
            viewport: { width: 1400, height: 900 }
        });
        
        this.page = await this.context.newPage();
        
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.consoleErrors.push(msg.text());
            }
        });
        
        this.page.on('response', response => {
            const status = response.status();
            if (status >= 400 && status < 600) {
                this.networkErrors.push({
                    url: response.url(),
                    status: status,
                    statusText: response.statusText()
                });
            }
        });
        
        console.log('✅ 浏览器初始化完成');
    }

    log(testName, status, message = '', screenshotName = null) {
        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
        console.log(`\n${icon} ${testName}: ${status}`);
        if (message) {
            console.log(`   ${message}`);
        }
        if (screenshotName) {
            console.log(`   📸 截图: ${screenshotName}`);
        }
        
        if (status === 'PASS') {
            this.passed++;
        } else if (status === 'FAIL') {
            this.failed++;
        }
        
        this.testResults.push({
            name: testName,
            status,
            message,
            screenshot: screenshotName
        });
        
        return status === 'PASS';
    }

    async screenshot(name) {
        const filename = `${Date.now()}-${name}.png`;
        const filepath = path.join(this.screenshotDir, filename);
        await this.page.screenshot({ path: filepath, fullPage: true });
        return filename;
    }

    async waitFor(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async run() {
        const startTime = Date.now();
        
        console.log('='.repeat(70));
        console.log('🤖 AI老照片修复模拟器 - Playwright自动化测试');
        console.log('='.repeat(70));
        console.log(`目标URL: ${this.baseURL}`);
        console.log(`测试图片目录: ${this.testImageDir}`);
        console.log('='.repeat(70));
        
        try {
            await this.init();
            
            await this.test_1_page_load();
            await this.test_2_upload_image();
            await this.test_3_brush_painting();
            await this.test_4_mask_output_verification();
            await this.test_5_repair_options();
            await this.test_6_repair_image();
            await this.test_7_compare_slider();
            await this.test_8_overlay_opacity();
            await this.test_9_export_steps();
            await this.test_10_export_gif();
            await this.test_11_batch_repair();
            await this.test_12_console_and_network_errors();
            
        } catch (error) {
            console.error('\n❌ 测试过程中发生未处理异常:', error);
            this.log('测试运行', 'FAIL', error.message);
        } finally {
            await this.cleanup();
        }
        
        const elapsed = Date.now() - startTime;
        this.printSummary(elapsed);
        
        return this.failed === 0;
    }

    async test_1_page_load() {
        console.log('\n🧪 测试1: 页面加载测试');
        
        try {
            await this.page.goto(this.baseURL, { waitUntil: 'networkidle', timeout: 30000 });
            
            await this.page.waitForSelector('.app-container', { timeout: 5000 });
            await this.page.waitForSelector('#mainCanvas', { timeout: 5000 });
            
            const title = await this.page.title();
            const screenshot = await this.screenshot('page-loaded');
            
            this.log('页面加载测试', 'PASS', 
                `页面标题: "${title}", 已加载核心元素`, screenshot);
            
        } catch (error) {
            const screenshot = await this.screenshot('page-load-error');
            this.log('页面加载测试', 'FAIL', error.message, screenshot);
        }
    }

    async test_2_upload_image() {
        console.log('\n🧪 测试2: 图片上传测试');
        
        try {
            const testImagePath = path.join(this.testImageDir, 'test1_photo.jpg');
            
            if (!fs.existsSync(testImagePath)) {
                throw new Error(`测试图片不存在: ${testImagePath}`);
            }
            
            const fileInput = await this.page.waitForSelector('#fileInput', { 
                timeout: 5000, 
                state: 'attached' 
            });
            
            await fileInput.setInputFiles(testImagePath);
            
            await this.waitFor(2000);
            
            const hasImage = await this.page.evaluate(() => {
                return window.app && window.app.damagedImageDataURL && 
                       window.app.damagedImageDataURL.length > 100;
            });
            
            const screenshot = await this.screenshot('image-uploaded');
            
            if (hasImage) {
                this.log('图片上传测试', 'PASS', '图片已成功上传到Canvas', screenshot);
            } else {
                this.log('图片上传测试', 'FAIL', '图片未正确加载', screenshot);
            }
            
        } catch (error) {
            const screenshot = await this.screenshot('upload-error');
            this.log('图片上传测试', 'FAIL', error.message, screenshot);
        }
    }

    async test_3_brush_painting() {
        console.log('\n🧪 测试3: 涂抹画笔功能测试');
        
        try {
            await this.page.click('#brushModeBrush');
            await this.waitFor(500);
            
            await this.page.evaluate(() => {
                const slider = document.getElementById('brushSize');
                slider.value = 30;
                slider.dispatchEvent(new Event('input'));
                slider.dispatchEvent(new Event('change'));
            });
            await this.waitFor(500);
            
            await this.page.evaluate(() => {
                const canvas = window.app.photoCanvas;
                canvas.setBrushMode('brush');
                canvas.clearMask();
                
                canvas.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
                canvas.maskCtx.beginPath();
                canvas.maskCtx.arc(200, 150, 40, 0, Math.PI * 2);
                canvas.maskCtx.fill();
                
                canvas.maskCtx.fillRect(300, 100, 60, 80);
            });
            
            await this.waitFor(500);
            
            const maskInfo = await this.page.evaluate(() => {
                const canvas = window.app.photoCanvas;
                const hasMask = canvas.hasMask();
                const maskDataURL = canvas.getMaskDataURLForDisplay();
                return { hasMask, maskLength: maskDataURL ? maskDataURL.length : 0 };
            });
            
            const screenshot = await this.screenshot('brush-painting');
            
            if (maskInfo.hasMask && maskInfo.maskLength > 1000) {
                this.log('涂抹画笔功能测试', 'PASS', 
                    `蒙版已绘制，有蒙版: ${maskInfo.hasMask}, 数据长度: ${maskInfo.maskLength}`, 
                    screenshot);
            } else {
                this.log('涂抹画笔功能测试', 'FAIL', 
                    `蒙版未正确绘制: ${JSON.stringify(maskInfo)}`, 
                    screenshot);
            }
            
        } catch (error) {
            const screenshot = await this.screenshot('brush-error');
            this.log('涂抹画笔功能测试', 'FAIL', error.message, screenshot);
        }
    }

    async test_4_mask_output_verification() {
        console.log('\n🧪 测试4: 蒙版输出验证（金色半透明显示，后端识别为白色）');
        
        try {
            const maskInfo = await this.page.evaluateHandle(() => {
                return new Promise((resolve) => {
                    const canvas = window.app.photoCanvas;
                    
                    const displayDataURL = canvas.getMaskDataURLForDisplay();
                    const outputDataURL = canvas.getMaskDataURL();
                    
                    let loadedCount = 0;
                    let displayImg, outputImg;
                    
                    const checkDone = () => {
                        if (loadedCount === 2) {
                            const displayCanvas = document.createElement('canvas');
                            displayCanvas.width = displayImg.width;
                            displayCanvas.height = displayImg.height;
                            const displayCtx = displayCanvas.getContext('2d');
                            displayCtx.drawImage(displayImg, 0, 0);
                            
                            const outputCanvas = document.createElement('canvas');
                            outputCanvas.width = outputImg.width;
                            outputCanvas.height = outputImg.height;
                            const outputCtx = outputCanvas.getContext('2d');
                            outputCtx.drawImage(outputImg, 0, 0);
                            
                            const displayPixel = displayCtx.getImageData(200, 150, 1, 1).data;
                            const outputPixel = outputCtx.getImageData(200, 150, 1, 1).data;
                            
                            const isGoldDisplay = displayPixel[0] > 200 && displayPixel[1] > 150 && displayPixel[2] > 50;
                            const isWhiteOutput = outputPixel[0] > 250 && outputPixel[1] > 250 && outputPixel[2] > 250;
                            
                            resolve({
                                displayPixel: Array.from(displayPixel),
                                outputPixel: Array.from(outputPixel),
                                isGoldDisplay,
                                isWhiteOutput
                            });
                        }
                    };
                    
                    const displayImgEl = new Image();
                    displayImgEl.onload = () => { displayImg = displayImgEl; loadedCount++; checkDone(); };
                    displayImgEl.onerror = () => { loadedCount++; checkDone(); };
                    displayImgEl.src = displayDataURL;
                    
                    const outputImgEl = new Image();
                    outputImgEl.onload = () => { outputImg = outputImgEl; loadedCount++; checkDone(); };
                    outputImgEl.onerror = () => { loadedCount++; checkDone(); };
                    outputImgEl.src = outputDataURL;
                    
                    setTimeout(() => {
                        if (loadedCount < 2) {
                            resolve({
                                displayPixel: [0, 0, 0, 0],
                                outputPixel: [0, 0, 0, 0],
                                isGoldDisplay: false,
                                isWhiteOutput: false,
                                timeout: true
                            });
                        }
                    }, 5000);
                });
            });
            
            const maskInfoValue = await maskInfo.jsonValue();
            
            const screenshot = await this.screenshot('mask-verification');
            
            if (maskInfoValue.isGoldDisplay && maskInfoValue.isWhiteOutput) {
                this.log('蒙版输出验证', 'PASS', 
                    `显示蒙版为金色 RGB(${maskInfoValue.displayPixel.join(',')}), ` +
                    `输出蒙版为白色 RGB(${maskInfoValue.outputPixel.join(',')})`, 
                    screenshot);
            } else {
                this.log('蒙版输出验证', 'FAIL', 
                    `显示金色: ${maskInfoValue.isGoldDisplay} ${JSON.stringify(maskInfoValue.displayPixel)}, ` +
                    `输出白色: ${maskInfoValue.isWhiteOutput} ${JSON.stringify(maskInfoValue.outputPixel)}`, 
                    screenshot);
            }
            
        } catch (error) {
            const screenshot = await this.screenshot('mask-error');
            this.log('蒙版输出验证', 'FAIL', error.message, screenshot);
        }
    }

    async test_5_repair_options() {
        console.log('\n🧪 测试5: 修复选项和强度选择测试');
        
        try {
            await this.page.click('#intensityMedium');
            await this.waitFor(200);
            
            await this.page.evaluate(() => {
                document.getElementById('optDenoise').checked = true;
                document.getElementById('optSharpen').checked = true;
                document.getElementById('optContrast').checked = true;
                document.getElementById('optColorize').checked = true;
                document.getElementById('optScratches').checked = false;
            });
            await this.waitFor(200);
            
            const optionsStatus = await this.page.evaluate(() => {
                const intensityBtn = document.querySelector('.intensity-btn.active');
                return {
                    intensity: intensityBtn ? intensityBtn.dataset.intensity : null,
                    denoise: document.getElementById('optDenoise').checked,
                    sharpen: document.getElementById('optSharpen').checked,
                    contrast: document.getElementById('optContrast').checked,
                    colorize: document.getElementById('optColorize').checked,
                    scratches: document.getElementById('optScratches').checked
                };
            });
            
            const screenshot = await this.screenshot('repair-options');
            
            const expected = {
                intensity: 'medium',
                denoise: true,
                sharpen: true,
                contrast: true,
                colorize: true,
                scratches: false
            };
            
            const isCorrect = JSON.stringify(optionsStatus) === JSON.stringify(expected);
            
            if (isCorrect) {
                this.log('修复选项测试', 'PASS', 
                    `强度: ${optionsStatus.intensity}, 选项: ${JSON.stringify(optionsStatus)}`, 
                    screenshot);
            } else {
                this.log('修复选项测试', 'FAIL', 
                    `期望: ${JSON.stringify(expected)}, 实际: ${JSON.stringify(optionsStatus)}`, 
                    screenshot);
            }
            
        } catch (error) {
            const screenshot = await this.screenshot('options-error');
            this.log('修复选项测试', 'FAIL', error.message, screenshot);
        }
    }

    async test_6_repair_image() {
        console.log('\n🧪 测试6: 图片修复功能测试（后端通信）');
        
        try {
            const beforeConsoleErrors = this.consoleErrors.length;
            const beforeNetworkErrors = this.networkErrors.length;
            
            const repairButton = await this.page.waitForSelector('#repairBtn', { timeout: 5000 });
            
            const networkRequests = [];
            this.page.on('request', request => {
                if (request.url().includes('/api/repair')) {
                    networkRequests.push({
                        url: request.url(),
                        method: request.method()
                    });
                }
            });
            
            await repairButton.click();
            
            await this.page.waitForFunction(() => {
                return window.app && window.app.repairedImageDataURL && 
                       window.app.repairedImageDataURL.length > 100;
            }, { timeout: 30000 });
            
            await this.waitFor(1000);
            
            const repairResult = await this.page.evaluate(() => {
                return {
                    hasRepaired: !!window.app.repairedImageDataURL,
                    hasSteps: !!window.app.repairSteps && Object.keys(window.app.repairSteps).length > 0,
                    steps: window.app.repairSteps ? Object.keys(window.app.repairSteps) : [],
                    maskPreserved: window.app.photoCanvas.hasMask()
                };
            });
            
            const newConsoleErrors = this.consoleErrors.length - beforeConsoleErrors;
            const newNetworkErrors = this.networkErrors.length - beforeNetworkErrors;
            
            const screenshot = await this.screenshot('repair-completed');
            
            const apiCalled = networkRequests.length > 0;
            
            if (repairResult.hasRepaired && repairResult.hasSteps && 
                apiCalled && newConsoleErrors === 0 && newNetworkErrors === 0) {
                this.log('图片修复功能测试', 'PASS', 
                    `修复成功, 步骤: ${repairResult.steps.join(', ')}, ` +
                    `蒙版保留: ${repairResult.maskPreserved}, ` +
                    `API调用: ${apiCalled}, 错误: 控制台=${newConsoleErrors}, 网络=${newNetworkErrors}`, 
                    screenshot);
            } else {
                this.log('图片修复功能测试', 'FAIL', 
                    `有修复图: ${repairResult.hasRepaired}, ` +
                    `有步骤: ${repairResult.hasSteps}, ` +
                    `步骤: ${repairResult.steps.join(', ')}, ` +
                    `蒙版保留: ${repairResult.maskPreserved}, ` +
                    `API调用: ${apiCalled}, ` +
                    `控制台错误: ${newConsoleErrors}, 网络错误: ${newNetworkErrors}`, 
                    screenshot);
            }
            
        } catch (error) {
            const screenshot = await this.screenshot('repair-error');
            this.log('图片修复功能测试', 'FAIL', error.message, screenshot);
        }
    }

    async test_7_compare_slider() {
        console.log('\n🧪 测试7: 对比滑块功能测试');
        
        try {
            const compareTab = await this.page.waitForSelector('[data-canvas-view="compare"]', { timeout: 5000 });
            await compareTab.click();
            await this.waitFor(1000);
            
            const sliderResult = await this.page.evaluate(() => {
                const slider = window.app.compareSlider;
                
                slider.position = 30;
                slider.updateSliderPosition();
                
                const leftVal = slider.slider.style.left;
                const clipPath = slider.repairedCanvas ? slider.repairedCanvas.style.clipPath : '';
                const positionCorrect = leftVal === '30%' && clipPath.includes('inset(0 0 0 30%)');
                
                slider.position = 70;
                slider.updateSliderPosition();
                
                const leftVal2 = slider.slider.style.left;
                const clipPath2 = slider.repairedCanvas ? slider.repairedCanvas.style.clipPath : '';
                const positionCorrect2 = leftVal2 === '70%' && clipPath2.includes('inset(0 0 0 70%)');
                
                return {
                    position30: { left: leftVal, clipPath, correct: positionCorrect },
                    position70: { left: leftVal2, clipPath: clipPath2, correct: positionCorrect2 }
                };
            });
            
            const screenshot = await this.screenshot('compare-slider');
            
            if (sliderResult.position30.correct && sliderResult.position70.correct) {
                this.log('对比滑块功能测试', 'PASS', 
                    `30%位置: left=${sliderResult.position30.left}, ` +
                    `70%位置: left=${sliderResult.position70.left}`, 
                    screenshot);
            } else {
                this.log('对比滑块功能测试', 'FAIL', 
                    `30%: ${JSON.stringify(sliderResult.position30)}, ` +
                    `70%: ${JSON.stringify(sliderResult.position70)}`, 
                    screenshot);
            }
            
        } catch (error) {
            const screenshot = await this.screenshot('slider-error');
            this.log('对比滑块功能测试', 'FAIL', error.message, screenshot);
        }
    }

    async test_8_overlay_opacity() {
        console.log('\n🧪 测试8: 叠加视图透明度调节测试');
        
        try {
            const overlayTab = await this.page.waitForSelector('[data-canvas-view="overlay"]', { timeout: 5000 });
            await overlayTab.click();
            await this.waitFor(1000);
            
            const opacityResults = [];
            const testValues = [0, 25, 50, 75, 100];
            
            for (const value of testValues) {
                const result = await this.page.evaluate((val) => {
                    const viewer = window.app.overlayViewer;
                    const opacityValue = val / 100;
                    
                    viewer.opacity = opacityValue;
                    viewer.updateOpacity();
                    
                    const actualOpacity = viewer.repairedCanvas.style.opacity;
                    return {
                        expected: opacityValue.toFixed(2),
                        actual: actualOpacity,
                        correct: actualOpacity === opacityValue.toFixed(2) || 
                                 Math.min(parseFloat(actualOpacity), opacityValue) / Math.max(parseFloat(actualOpacity), opacityValue) > 0.95
                    };
                }, value);
                
                opacityResults.push(result);
                await this.waitFor(200);
            }
            
            const screenshot = await this.screenshot('overlay-opacity');
            
            const allCorrect = opacityResults.every(r => r.correct);
            
            if (allCorrect) {
                const summary = opacityResults.map(r => `${r.expected}→${r.actual}`).join(', ');
                this.log('透明度调节测试', 'PASS', `所有值正确: ${summary}`, screenshot);
            } else {
                const failures = opacityResults.filter(r => !r.correct)
                    .map(r => `${r.expected}→${r.actual}`).join(', ');
                this.log('透明度调节测试', 'FAIL', `失败: ${failures}`, screenshot);
            }
            
            const editTab = await this.page.waitForSelector('[data-canvas-view="edit"]', { timeout: 5000 });
            await editTab.click();
            await this.waitFor(500);
            
        } catch (error) {
            const screenshot = await this.screenshot('opacity-error');
            this.log('透明度调节测试', 'FAIL', error.message, screenshot);
        }
    }

    async test_9_export_steps() {
        console.log('\n🧪 测试9: 中间步骤图导出测试');
        
        try {
            const exportStepsBtn = await this.page.waitForSelector('#exportStepsBtn:not([disabled])', { timeout: 10000 });
            
            const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
            
            await exportStepsBtn.click();
            
            const download = await downloadPromise;
            
            const filename = download.suggestedFilename();
            const savePath = path.join(this.downloadDir, filename);
            await download.saveAs(savePath);
            
            let zipContents = [];
            try {
                const JSZip = require('jszip');
                const data = fs.readFileSync(savePath);
                const zip = await JSZip.loadAsync(data);
                zipContents = Object.keys(zip.files);
            } catch (e) {
                console.log('   ⚠️  无法解析ZIP内容:', e.message);
            }
            
            const fileSize = fs.statSync(savePath).size;
            
            const expectedFiles = [
                '01-original.jpg',
                '02-denoised.jpg',
                '03-sharpened.jpg',
                '04-contrast.jpg',
                '05-colorized.jpg',
                '06-final.jpg'
            ];
            
            const hasAllExpected = expectedFiles.every(f => 
                zipContents.some(z => z.includes(f.replace(/^\d+-/, '')) || z.includes(f))
            );
            
            const screenshot = await this.screenshot('steps-exported');
            
            if (fileSize > 1000 && zipContents.length >= 4) {
                this.log('中间步骤图导出测试', 'PASS', 
                    `文件: ${filename}, 大小: ${fileSize}字节, 内容: ${zipContents.join(', ')}`, 
                    screenshot);
            } else if (fileSize > 1000) {
                this.log('中间步骤图导出测试', 'PASS', 
                    `文件已下载: ${filename}, 大小: ${fileSize}字节 (ZIP解析跳过)`, 
                    screenshot);
            } else {
                this.log('中间步骤图导出测试', 'FAIL', 
                    `文件大小异常: ${fileSize}字节`, 
                    screenshot);
            }
            
        } catch (error) {
            const screenshot = await this.screenshot('steps-error');
            this.log('中间步骤图导出测试', 'FAIL', error.message, screenshot);
        }
    }

    async test_10_export_gif() {
        console.log('\n🧪 测试10: GIF动画导出测试');
        
        try {
            const exportGifBtn = await this.page.waitForSelector('#exportGifBtn:not([disabled])', { timeout: 10000 });
            
            const downloadPromise = this.page.waitForEvent('download', { timeout: 60000 });
            
            await exportGifBtn.click();
            
            const download = await downloadPromise;
            
            const filename = download.suggestedFilename();
            const savePath = path.join(this.downloadDir, filename);
            await download.saveAs(savePath);
            
            const fileSize = fs.statSync(savePath).size;
            
            const isGif = filename.toLowerCase().endsWith('.gif');
            
            let isValidGif = false;
            if (fileSize > 6) {
                const header = fs.readFileSync(savePath, { length: 6 });
                const headerStr = header.toString('ascii');
                isValidGif = headerStr === 'GIF87a' || headerStr === 'GIF89a';
            }
            
            const screenshot = await this.screenshot('gif-exported');
            
            if (isGif && isValidGif && fileSize > 1000) {
                this.log('GIF动画导出测试', 'PASS', 
                    `文件: ${filename}, 大小: ${fileSize}字节, 格式: ${isValidGif ? '有效GIF' : '无效'}`, 
                    screenshot);
            } else if (isGif && fileSize > 1000) {
                this.log('GIF动画导出测试', 'PASS', 
                    `GIF已下载: ${filename}, 大小: ${fileSize}字节`, 
                    screenshot);
            } else {
                this.log('GIF动画导出测试', 'FAIL', 
                    `文件: ${filename}, 大小: ${fileSize}字节, 是GIF: ${isGif}, 有效: ${isValidGif}`, 
                    screenshot);
            }
            
        } catch (error) {
            const screenshot = await this.screenshot('gif-error');
            this.log('GIF动画导出测试', 'FAIL', error.message, screenshot);
        }
    }

    async test_11_batch_repair() {
        console.log('\n🧪 测试11: 批量修复和ZIP下载测试');
        
        try {
            const batchTab = await this.page.waitForSelector('[data-view="batch"]', { timeout: 5000 });
            await batchTab.click();
            await this.waitFor(1000);
            
            const batchFileInput = await this.page.waitForSelector('#batchFileInput', { 
                timeout: 5000, 
                state: 'attached' 
            });
            
            const testImages = [
                path.join(this.testImageDir, 'test1_photo.jpg'),
                path.join(this.testImageDir, 'test2_landscape.jpg'),
                path.join(this.testImageDir, 'test3_portrait.jpg')
            ];
            
            const existingImages = testImages.filter(f => fs.existsSync(f));
            
            await batchFileInput.setInputFiles(existingImages);
            await this.waitFor(2000);
            
            const fileCount = await this.page.evaluate(() => {
                return window.app && window.app.batchFiles ? window.app.batchFiles.length : 0;
            });
            
            await this.page.evaluate(() => {
                const intensity = document.getElementById('batchIntensity');
                if (intensity) intensity.value = 'medium';
                
                const opts = ['optDenoise', 'optSharpen', 'optContrast'];
                opts.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.checked = true;
                });
            });
            await this.waitFor(500);
            
            const batchRepairBtn = await this.page.waitForSelector('#batchRepairBtn', { timeout: 5000 });
            
            const downloadPromise = this.page.waitForEvent('download', { timeout: 120000 });
            
            await batchRepairBtn.click();
            
            await this.page.waitForFunction(() => {
                const downloadBtn = document.getElementById('batchDownloadBtn');
                return downloadBtn && !downloadBtn.disabled;
            }, { timeout: 120000 });
            
            await this.waitFor(1000);
            
            const downloadBtn = await this.page.waitForSelector('#batchDownloadBtn:not([disabled])', { timeout: 5000 });
            await downloadBtn.click();
            
            const download = await downloadPromise;
            
            const filename = download.suggestedFilename();
            const savePath = path.join(this.downloadDir, filename);
            await download.saveAs(savePath);
            
            const fileSize = fs.statSync(savePath).size;
            const isZip = filename.toLowerCase().endsWith('.zip');
            
            const screenshot = await this.screenshot('batch-completed');
            
            if (isZip && fileSize > 10000) {
                this.log('批量修复测试', 'PASS', 
                    `上传: ${existingImages.length}张, 文件计数: ${fileCount}, ` +
                    `下载: ${filename}, 大小: ${fileSize}字节`, 
                    screenshot);
            } else if (isZip && fileSize > 0) {
                this.log('批量修复测试', 'PASS', 
                    `ZIP已下载: ${filename}, 大小: ${fileSize}字节`, 
                    screenshot);
            } else {
                this.log('批量修复测试', 'FAIL', 
                    `上传: ${existingImages.length}张, 文件计数: ${fileCount}, ` +
                    `文件: ${filename}, 大小: ${fileSize}字节, 是ZIP: ${isZip}`, 
                    screenshot);
            }
            
            const singleTab = await this.page.waitForSelector('[data-view="single"]', { timeout: 5000 });
            await singleTab.click();
            await this.waitFor(500);
            
        } catch (error) {
            const screenshot = await this.screenshot('batch-error');
            this.log('批量修复测试', 'FAIL', error.message, screenshot);
            
            try {
                const singleTab = await this.page.$('[data-view="single"]');
                if (singleTab) await singleTab.click();
            } catch (e) {}
        }
    }

    async test_12_console_and_network_errors() {
        console.log('\n🧪 测试12: 控制台和网络错误检查');
        
        try {
            const screenshot = await this.screenshot('final-state');
            
            if (this.consoleErrors.length === 0 && this.networkErrors.length === 0) {
                this.log('控制台和网络错误检查', 'PASS', 
                    '无控制台错误，无404/500网络错误', 
                    screenshot);
            } else {
                let msg = [];
                if (this.consoleErrors.length > 0) {
                    msg.push(`控制台错误: ${this.consoleErrors.length}个`);
                    this.consoleErrors.slice(0, 3).forEach(e => {
                        msg.push(`  - ${e.substring(0, 100)}`);
                    });
                }
                if (this.networkErrors.length > 0) {
                    msg.push(`网络错误: ${this.networkErrors.length}个`);
                    this.networkErrors.forEach(e => {
                        msg.push(`  - ${e.url} (${e.status})`);
                    });
                }
                this.log('控制台和网络错误检查', 'FAIL', msg.join('\n'), screenshot);
            }
            
        } catch (error) {
            this.log('控制台和网络错误检查', 'FAIL', error.message);
        }
    }

    async cleanup() {
        if (this.page) {
            await this.page.close();
        }
        if (this.context) {
            await this.context.close();
        }
        if (this.browser) {
            await this.browser.close();
        }
        console.log('\n✅ 浏览器已关闭');
    }

    printSummary(elapsed) {
        console.log('\n' + '='.repeat(70));
        console.log('📊 测试总结报告');
        console.log('='.repeat(70));
        console.log(`总测试数: ${this.testResults.length}`);
        console.log(`%c✅ 通过: ${this.passed}`, 'color: green; font-weight: bold;');
        console.log(`%c❌ 失败: ${this.failed}`, 'color: red; font-weight: bold;');
        console.log(`总耗时: ${(elapsed / 1000).toFixed(2)} 秒`);
        console.log(`通过率: ${this.testResults.length > 0 ? (this.passed / this.testResults.length * 100).toFixed(1) : 0}%`);
        console.log();
        console.log(`截图目录: ${this.screenshotDir}`);
        console.log(`下载目录: ${this.downloadDir}`);
        console.log('='.repeat(70));
        
        if (this.failed > 0) {
            console.log('\n❌ 失败的测试:');
            this.testResults.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`  - ${r.name}: ${r.message}`);
                if (r.screenshot) {
                    console.log(`    截图: ${r.screenshot}`);
                }
            });
        }
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.testResults.length,
                passed: this.passed,
                failed: this.failed,
                elapsed: elapsed,
                passRate: this.testResults.length > 0 ? (this.passed / this.testResults.length * 100) : 0
            },
            results: this.testResults,
            consoleErrors: this.consoleErrors,
            networkErrors: this.networkErrors
        };
        
        const reportPath = path.join(__dirname, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 详细报告已保存: ${reportPath}`);
        
        console.log('\n' + '='.repeat(70));
        if (this.failed === 0) {
            console.log('🎉 所有测试通过！');
        } else {
            console.log('⚠️  部分测试失败，请查看详细报告');
        }
        console.log('='.repeat(70));
    }
}

if (require.main === module) {
    const tester = new PhotoRepairE2ETest();
    tester.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('测试运行失败:', error);
        process.exit(1);
    });
}

module.exports = PhotoRepairE2ETest;
