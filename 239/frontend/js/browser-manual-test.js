/**
 * ================================================
 * AI老照片修复模拟器 - 浏览器手动测试脚本
 * ================================================
 * 
 * 使用方法：
 * 1. 打开 http://localhost:8080/index.html
 * 2. 按F12打开开发者工具
 * 3. 在Console中输入：runBrowserTests()
 * 4. 按照提示完成所有测试步骤
 * 
 * ================================================
 */

class BrowserManualTest {
    constructor() {
        this.currentTest = 0;
        this.testResults = [];
        this.consoleErrors = [];
        this.consoleWarnings = [];
        this.networkErrors = [];
        
        this.tests = [
            {
                id: 1,
                name: '页面加载测试',
                description: '验证页面正常加载，无控制台错误',
                auto: true,
                run: this.testPageLoad.bind(this)
            },
            {
                id: 2,
                name: 'UI控件存在性检查',
                description: '验证所有UI控件存在',
                auto: true,
                run: this.testUIControls.bind(this)
            },
            {
                id: 3,
                name: '图片上传功能',
                description: '上传一张测试图片',
                auto: false,
                instructions: [
                    '1. 点击左侧上传区域或拖拽图片到上传区',
                    '2. 选择 test_images/test1_photo.jpg',
                    '3. 确认图片显示在主画布上',
                    '完成后输入：continue'
                ]
            },
            {
                id: 4,
                name: '涂抹画笔功能测试',
                description: '测试画笔涂抹选择修复区域',
                auto: true,
                run: this.testBrushFunction.bind(this)
            },
            {
                id: 5,
                name: '蒙版反选功能测试',
                description: '测试蒙版反选功能',
                auto: true,
                run: this.testInvertMask.bind(this)
            },
            {
                id: 6,
                name: '清除蒙版功能测试',
                description: '测试清除蒙版功能',
                auto: true,
                run: this.testClearMask.bind(this)
            },
            {
                id: 7,
                name: '强度选择测试',
                description: '测试不同修复强度选择',
                auto: true,
                run: this.testIntensitySelection.bind(this)
            },
            {
                id: 8,
                name: '修复选项测试',
                description: '测试各个修复选项勾选',
                auto: true,
                run: this.testRepairOptions.bind(this)
            },
            {
                id: 9,
                name: '图片修复功能测试',
                description: '点击修复按钮，验证后端通信',
                auto: false,
                instructions: [
                    '1. 确认已上传图片并选择了修复区域',
                    '2. 选择"中等"强度',
                    '3. 勾选：去噪、锐化、对比度、上色',
                    '4. 点击"开始修复"按钮',
                    '5. 等待修复完成，确认修复后图片显示',
                    '6. 检查控制台无错误',
                    '完成后输入：continue'
                ]
            },
            {
                id: 10,
                name: '蒙版自动保留测试',
                description: '修复后验证蒙版是否保留',
                auto: true,
                run: this.testMaskPreservedAfterRepair.bind(this)
            },
            {
                id: 11,
                name: '对比滑块功能测试',
                description: '测试对比滑块功能',
                auto: true,
                run: this.testCompareSlider.bind(this)
            },
            {
                id: 12,
                name: '透明度调节功能测试',
                description: '测试叠加视图透明度调节',
                auto: true,
                run: this.testOverlayOpacity.bind(this)
            },
            {
                id: 13,
                name: '中间步骤图导出测试',
                description: '测试导出中间步骤图ZIP',
                auto: false,
                instructions: [
                    '1. 点击"导出修复步骤图"按钮',
                    '2. 确认下载 repair-steps.zip 文件',
                    '3. 解压后检查包含以下文件：',
                    '   - 01-original.jpg',
                    '   - 02-denoised.jpg',
                    '   - 03-sharpened.jpg',
                    '   - 04-contrast.jpg',
                    '   - 05-colorized.jpg',
                    '   - 06-final.jpg',
                    '完成后输入：continue'
                ]
            },
            {
                id: 14,
                name: 'GIF导出功能测试',
                description: '测试导出GIF对比动画',
                auto: false,
                instructions: [
                    '1. 点击"导出GIF对比动画"按钮',
                    '2. 确认下载 repair-comparison.gif 文件',
                    '3. 双击打开GIF，确认能正常播放',
                    '4. GIF应显示修复前后的扫动对比动画',
                    '完成后输入：continue'
                ]
            },
            {
                id: 15,
                name: '批量修复功能测试',
                description: '测试批量修复和ZIP下载',
                auto: false,
                instructions: [
                    '1. 点击顶部导航"批量处理"',
                    '2. 点击上传区域，选择多张图片（test_images/ 下的所有图片）',
                    '3. 确认文件列表显示所有图片',
                    '4. 选择中等强度，勾选所有修复选项',
                    '5. 点击"开始批量修复"按钮',
                    '6. 观察进度条和每个文件的状态变化',
                    '7. 处理完成后点击"打包下载ZIP"',
                    '8. 确认下载 batch-repaired-photos.zip',
                    '完成后输入：continue'
                ]
            },
            {
                id: 16,
                name: '历史记录功能测试',
                description: '测试历史记录保存和加载',
                auto: false,
                instructions: [
                    '1. 点击顶部导航"历史记录"',
                    '2. 确认历史记录中显示刚才的修复记录',
                    '3. 点击一条记录的"查看"按钮',
                    '4. 确认跳转到单张修复并加载图片',
                    '完成后输入：continue'
                ]
            },
            {
                id: 17,
                name: '网络请求检查',
                description: '检查所有网络请求无404/500错误',
                auto: true,
                run: this.testNetworkRequests.bind(this)
            },
            {
                id: 18,
                name: '前端自检模块运行',
                description: '运行前端自动化自检',
                auto: true,
                run: this.testFrontendSelfTest.bind(this)
            }
        ];
        
        this.setupConsoleCapture();
        this.setupNetworkCapture();
    }
    
    setupConsoleCapture() {
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.error = (...args) => {
            this.consoleErrors.push(args.join(' '));
            originalError.apply(console, args);
        };
        
        console.warn = (...args) => {
            this.consoleWarnings.push(args.join(' '));
            originalWarn.apply(console, args);
        };
    }
    
    setupNetworkCapture() {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            const response = await originalFetch.apply(window, args);
            
            if (response.status >= 400) {
                this.networkErrors.push({
                    url: args[0],
                    status: response.status,
                    statusText: response.statusText
                });
            }
            
            return response;
        };
    }
    
    log(testName, status, message = '') {
        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
        console.log(`\n${icon} ${testName}: ${status}`);
        if (message) {
            console.log(`   ${message}`);
        }
        
        this.testResults.push({
            name: testName,
            status,
            message
        });
        
        return status === 'PASS';
    }
    
    async testPageLoad() {
        console.log('\n🧪 测试1: 页面加载测试');
        
        const requiredElements = [
            'app-container', 'single-view', 'batch-view', 'history-view',
            'mainCanvas', 'maskCanvas', 'fileInput', 'repairBtn'
        ];
        
        let allFound = true;
        const missing = [];
        
        for (const id of requiredElements) {
            if (!document.getElementById(id)) {
                allFound = false;
                missing.push(id);
            }
        }
        
        if (allFound) {
            return this.log('页面加载测试', 'PASS', `所有${requiredElements.length}个核心元素已加载`);
        } else {
            return this.log('页面加载测试', 'FAIL', `缺失元素: ${missing.join(', ')}`);
        }
    }
    
    async testUIControls() {
        console.log('\n🧪 测试2: UI控件存在性检查');
        
        const controls = [
            'fileInput', 'repairBtn', 'simulateDamageBtn',
            'intensityWeak', 'intensityMedium', 'intensityStrong',
            'optDenoise', 'optSharpen', 'optContrast', 'optColorize', 'optScratches',
            'brushModeAll', 'brushModeBrush', 'brushSize',
            'clearMaskBtn', 'invertMaskBtn',
            'exportRepairedBtn', 'exportStepsBtn', 'exportGifBtn',
            'damageLevel', 'scratchCount'
        ];
        
        let allFound = true;
        const missing = [];
        
        for (const id of controls) {
            if (!document.getElementById(id)) {
                allFound = false;
                missing.push(id);
            }
        }
        
        if (allFound) {
            return this.log('UI控件存在性检查', 'PASS', `${controls.length}个控件全部存在`);
        } else {
            return this.log('UI控件存在性检查', 'FAIL', `缺失: ${missing.join(', ')}`);
        }
    }
    
    async testBrushFunction() {
        console.log('\n🧪 测试4: 涂抹画笔功能测试');
        
        try {
            if (!window.app || !window.app.photoCanvas) {
                return this.log('涂抹画笔功能测试', 'FAIL', 'App未初始化');
            }
            
            const canvas = window.app.photoCanvas;
            
            canvas.setBrushMode('brush');
            canvas.setBrushSize(30);
            canvas.clearMask();
            
            canvas.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
            canvas.maskCtx.fillRect(50, 50, 100, 100);
            
            const hasMask = canvas.hasMask();
            const maskDataURL = canvas.getMaskDataURL();
            const maskDisplayURL = canvas.getMaskDataURLForDisplay();
            
            if (hasMask && maskDataURL && maskDisplayURL) {
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = maskDataURL;
                });
                
                const testCanvas = document.createElement('canvas');
                testCanvas.width = img.width;
                testCanvas.height = img.height;
                const ctx = testCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const pixel = ctx.getImageData(70, 70, 1, 1).data;
                const isWhite = pixel[0] > 250 && pixel[1] > 250 && pixel[2] > 250;
                
                if (isWhite) {
                    return this.log('涂抹画笔功能测试', 'PASS', 
                        `蒙版生成正确，蒙版区域为白色: RGB(${pixel[0]},${pixel[1]},${pixel[2]})`);
                } else {
                    return this.log('涂抹画笔功能测试', 'FAIL', 
                        `蒙版区域不是白色: RGB(${pixel[0]},${pixel[1]},${pixel[2]})`);
                }
            } else {
                return this.log('涂抹画笔功能测试', 'FAIL', `有蒙版: ${hasMask}`);
            }
        } catch (e) {
            return this.log('涂抹画笔功能测试', 'FAIL', e.message);
        }
    }
    
    async testInvertMask() {
        console.log('\n🧪 测试5: 蒙版反选功能测试');
        
        try {
            const canvas = window.app.photoCanvas;
            canvas.clearMask();
            
            canvas.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
            canvas.maskCtx.fillRect(0, 0, canvas.maskCanvas.width / 2, canvas.maskCanvas.height);
            
            const before = canvas.hasMask();
            canvas.invertMask();
            const after = canvas.hasMask();
            
            if (before && after) {
                return this.log('蒙版反选功能测试', 'PASS', '反选前后都有蒙版');
            } else {
                return this.log('蒙版反选功能测试', 'FAIL', `反选前: ${before}, 反选后: ${after}`);
            }
        } catch (e) {
            return this.log('蒙版反选功能测试', 'FAIL', e.message);
        }
    }
    
    async testClearMask() {
        console.log('\n🧪 测试6: 清除蒙版功能测试');
        
        try {
            const canvas = window.app.photoCanvas;
            
            canvas.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
            canvas.maskCtx.fillRect(0, 0, 100, 100);
            
            canvas.clearMask();
            
            if (!canvas.hasMask()) {
                return this.log('清除蒙版功能测试', 'PASS', '蒙版已清除');
            } else {
                return this.log('清除蒙版功能测试', 'FAIL', '蒙版未清除');
            }
        } catch (e) {
            return this.log('清除蒙版功能测试', 'FAIL', e.message);
        }
    }
    
    async testIntensitySelection() {
        console.log('\n🧪 测试7: 强度选择测试');
        
        try {
            const intensities = ['weak', 'medium', 'strong'];
            
            for (const intensity of intensities) {
                const btn = document.getElementById(`intensity${intensity.charAt(0).toUpperCase() + intensity.slice(1)}`);
                if (!btn) {
                    return this.log('强度选择测试', 'FAIL', `找不到${intensity}按钮`);
                }
                btn.click();
                
                if (!btn.classList.contains('active')) {
                    return this.log('强度选择测试', 'FAIL', `${intensity}按钮未激活`);
                }
            }
            
            return this.log('强度选择测试', 'PASS', '弱/中/强三档切换正常');
        } catch (e) {
            return this.log('强度选择测试', 'FAIL', e.message);
        }
    }
    
    async testRepairOptions() {
        console.log('\n🧪 测试8: 修复选项测试');
        
        try {
            const options = [
                { id: 'optDenoise', name: '去噪' },
                { id: 'optSharpen', name: '锐化' },
                { id: 'optContrast', name: '对比度' },
                { id: 'optColorize', name: '上色' },
                { id: 'optScratches', name: '去划痕' }
            ];
            
            for (const opt of options) {
                const checkbox = document.getElementById(opt.id);
                if (!checkbox) {
                    return this.log('修复选项测试', 'FAIL', `找不到${opt.name}选项`);
                }
                
                checkbox.checked = true;
                if (!checkbox.checked) {
                    return this.log('修复选项测试', 'FAIL', `${opt.name}无法勾选`);
                }
                
                checkbox.checked = false;
                if (checkbox.checked) {
                    return this.log('修复选项测试', 'FAIL', `${opt.name}无法取消勾选`);
                }
                
                checkbox.checked = true;
            }
            
            return this.log('修复选项测试', 'PASS', '所有修复选项可正常勾选');
        } catch (e) {
            return this.log('修复选项测试', 'FAIL', e.message);
        }
    }
    
    async testMaskPreservedAfterRepair() {
        console.log('\n🧪 测试10: 蒙版自动保留测试');
        
        try {
            const canvas = window.app.photoCanvas;
            
            if (canvas.hasMask() && canvas.brushMode === 'brush') {
                return this.log('蒙版自动保留测试', 'PASS', '修复后蒙版已正确保留');
            } else if (!window.app.repairedImageDataURL) {
                return this.log('蒙版自动保留测试', 'SKIP', '尚未进行修复操作');
            } else {
                return this.log('蒙版自动保留测试', 'FAIL', 
                    `有蒙版: ${canvas.hasMask()}, 画笔模式: ${canvas.brushMode}`);
            }
        } catch (e) {
            return this.log('蒙版自动保留测试', 'FAIL', e.message);
        }
    }
    
    async testCompareSlider() {
        console.log('\n🧪 测试11: 对比滑块功能测试');
        
        try {
            if (!window.app || !window.app.compareSlider) {
                return this.log('对比滑块功能测试', 'FAIL', 'CompareSlider未初始化');
            }
            
            if (!window.app.repairedImageDataURL) {
                return this.log('对比滑块功能测试', 'SKIP', '尚未进行修复操作');
            }
            
            const slider = window.app.compareSlider;
            
            const viewTab = document.querySelector('[data-canvas-view="compare"]');
            if (viewTab) viewTab.click();
            
            await new Promise(r => setTimeout(r, 100));
            
            slider.position = 25;
            slider.updateSliderPosition();
            
            const leftVal = slider.slider.style.left;
            const clipPath = slider.repairedCanvas ? slider.repairedCanvas.style.clipPath : '';
            
            if (leftVal === '25%' && clipPath.includes('inset(0 0 0 25%)')) {
                return this.log('对比滑块功能测试', 'PASS', 
                    `位置: ${leftVal}, clipPath: ${clipPath}`);
            } else {
                return this.log('对比滑块功能测试', 'FAIL', 
                    `left: ${leftVal}, clipPath: ${clipPath}`);
            }
        } catch (e) {
            return this.log('对比滑块功能测试', 'FAIL', e.message);
        }
    }
    
    async testOverlayOpacity() {
        console.log('\n🧪 测试12: 透明度调节功能测试');
        
        try {
            if (!window.app || !window.app.overlayViewer) {
                return this.log('透明度调节功能测试', 'FAIL', 'OverlayViewer未初始化');
            }
            
            if (!window.app.repairedImageDataURL) {
                return this.log('透明度调节功能测试', 'SKIP', '尚未进行修复操作');
            }
            
            const viewer = window.app.overlayViewer;
            
            const viewTab = document.querySelector('[data-canvas-view="overlay"]');
            if (viewTab) viewTab.click();
            
            await new Promise(r => setTimeout(r, 100));
            
            viewer.opacity = 0.8;
            viewer.updateOpacity();
            
            const opacity = viewer.repairedCanvas.style.opacity;
            
            const editTab = document.querySelector('[data-canvas-view="edit"]');
            if (editTab) editTab.click();
            
            if (opacity === '0.8') {
                return this.log('透明度调节功能测试', 'PASS', `透明度: ${opacity}`);
            } else {
                return this.log('透明度调节功能测试', 'FAIL', `透明度: ${opacity}`);
            }
        } catch (e) {
            return this.log('透明度调节功能测试', 'FAIL', e.message);
        }
    }
    
    async testNetworkRequests() {
        console.log('\n🧪 测试17: 网络请求检查');
        
        if (this.networkErrors.length === 0 && this.consoleErrors.length === 0) {
            return this.log('网络请求检查', 'PASS', '无404/500错误，无控制台错误');
        } else {
            let messages = [];
            if (this.networkErrors.length > 0) {
                messages.push(`网络错误: ${this.networkErrors.length}个`);
                this.networkErrors.forEach(e => {
                    messages.push(`  - ${e.url} (${e.status})`);
                });
            }
            if (this.consoleErrors.length > 0) {
                messages.push(`控制台错误: ${this.consoleErrors.length}个`);
            }
            return this.log('网络请求检查', 'FAIL', messages.join('\n'));
        }
    }
    
    async testFrontendSelfTest() {
        console.log('\n🧪 测试18: 前端自检模块运行');
        
        try {
            if (typeof runFrontendTests === 'function') {
                console.log('   正在运行前端自动化自检...');
                const result = await runFrontendTests();
                
                if (result.failed === 0) {
                    return this.log('前端自检模块运行', 'PASS', 
                        `${result.passed}/${result.total} 通过 (100%)`);
                } else {
                    return this.log('前端自检模块运行', 'FAIL', 
                        `${result.passed}/${result.total} 通过，${result.failed} 失败`);
                }
            } else {
                return this.log('前端自检模块运行', 'FAIL', 'runFrontendTests函数未定义');
            }
        } catch (e) {
            return this.log('前端自检模块运行', 'FAIL', e.message);
        }
    }
    
    showTestResult(test) {
        console.log('\n' + '='.repeat(70));
        console.log(`测试 ${test.id}: ${test.name}`);
        console.log('='.repeat(70));
        console.log(`描述: ${test.description}`);
        console.log();
        
        if (test.instructions) {
            console.log('📝 操作步骤:');
            test.instructions.forEach((step, i) => {
                console.log(`   ${step}`);
            });
            console.log();
        }
    }
    
    async runAutoTests() {
        console.log('\n🚀 开始运行自动化测试...\n');
        
        for (const test of this.tests) {
            if (test.auto) {
                try {
                    await test.run();
                } catch (e) {
                    this.log(test.name, 'FAIL', e.message);
                }
            }
        }
    }
    
    async runAllTests() {
        console.log('%c' + '='.repeat(70), 'font-size: 14px; font-weight: bold;');
        console.log('%cAI老照片修复模拟器 - 浏览器手动测试向导', 'font-size: 16px; font-weight: bold; color: #5D4037;');
        console.log('%c' + '='.repeat(70), 'font-size: 14px; font-weight: bold;');
        console.log('%c按提示完成所有测试，每项测试后输入 continue 继续', 'color: #666; font-style: italic;');
        console.log('%c输入 skip 跳过当前测试，输入 exit 退出测试', 'color: #666; font-style: italic;');
        console.log();
        
        await this.runAutoTests();
        
        for (let i = 0; i < this.tests.length; i++) {
            const test = this.tests[i];
            
            if (test.auto) continue;
            
            this.showTestResult(test);
            
            const answer = await this.prompt('输入命令 (continue/skip/exit): ');
            
            if (answer === 'exit') {
                console.log('\n⚠️  测试已终止');
                break;
            } else if (answer === 'skip') {
                this.log(test.name, 'SKIP', '用户跳过');
                continue;
            } else if (answer === 'continue') {
                const result = await this.prompt('测试是否通过？(y/n): ');
                if (result === 'y') {
                    this.log(test.name, 'PASS', '用户确认通过');
                } else {
                    const issue = await this.prompt('请描述问题: ');
                    this.log(test.name, 'FAIL', issue || '用户标记为失败');
                }
            }
        }
        
        this.showSummary();
    }
    
    prompt(question) {
        return new Promise((resolve) => {
            const input = prompt(question);
            resolve(input ? input.trim().toLowerCase() : '');
        });
    }
    
    showSummary() {
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const skipped = this.testResults.filter(r => r.status === 'SKIP').length;
        const total = this.testResults.length;
        
        console.log('\n' + '='.repeat(70));
        console.log('%c📊 测试总结报告', 'font-size: 18px; font-weight: bold;');
        console.log('='.repeat(70));
        console.log(`总测试数: ${total}`);
        console.log(`%c✅ 通过: ${passed}`, 'color: green; font-weight: bold;');
        console.log(`%c❌ 失败: ${failed}`, 'color: red; font-weight: bold;');
        console.log(`⏭️  跳过: ${skipped}`);
        console.log(`通过率: ${total > 0 ? (passed / total * 100).toFixed(1) : 0}%`);
        console.log('='.repeat(70));
        
        if (failed > 0) {
            console.log('\n%c❌ 失败的测试:', 'color: red; font-weight: bold;');
            this.testResults.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`  - ${r.name}: ${r.message}`);
            });
        }
        
        if (this.consoleErrors.length > 0) {
            console.log(`\n%c⚠️  控制台错误 (${this.consoleErrors.length}个):`, 'color: orange;');
            this.consoleErrors.slice(0, 5).forEach(e => {
                console.log(`  - ${e.substring(0, 100)}...`);
            });
        }
        
        if (this.networkErrors.length > 0) {
            console.log(`\n%c⚠️  网络错误 (${this.networkErrors.length}个):`, 'color: orange;');
            this.networkErrors.forEach(e => {
                console.log(`  - ${e.url} (${e.status})`);
            });
        }
        
        console.log('\n%c测试完成！请将此报告发送给开发者。', 'font-weight: bold; color: #5D4037;');
        console.log('='.repeat(70));
        
        return {
            passed,
            failed,
            skipped,
            total,
            results: this.testResults,
            consoleErrors: this.consoleErrors,
            networkErrors: this.networkErrors
        };
    }
}

window.runBrowserTests = async function() {
    const tester = new BrowserManualTest();
    return await tester.runAllTests();
};

window.runAutoTestsOnly = async function() {
    const tester = new BrowserManualTest();
    await tester.runAutoTests();
    return tester.showSummary();
};

console.log('%c📋 浏览器测试向导已加载', 'font-weight: bold; color: #5D4037;');
console.log('%c运行 runBrowserTests() 开始完整交互测试', 'color: #666;');
console.log('%c运行 runAutoTestsOnly() 仅运行自动化测试', 'color: #666;');
