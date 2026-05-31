class PhotoRepairSelfTest {
    constructor() {
        this.testResults = [];
        this.passed = 0;
        this.failed = 0;
        this.testImageDataURL = null;
    }

    log(testName, status, message = '') {
        const icon = status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${testName}: ${status}`);
        if (message) {
            console.log(`   ${message}`);
        }
        
        if (status === 'PASS') {
            this.passed++;
        } else {
            this.failed++;
        }
        
        this.testResults.push({
            name: testName,
            status,
            message
        });
    }

    async createTestImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 400, 300);
        gradient.addColorStop(0, '#8B4513');
        gradient.addColorStop(0.5, '#CD853F');
        gradient.addColorStop(1, '#DEB887');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 300);
        
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(50, 50, 120, 80);
        
        ctx.fillStyle = '#FFB74D';
        ctx.beginPath();
        ctx.arc(250, 100, 60, 0, Math.PI * 2);
        ctx.fill();
        
        const imageData = ctx.getImageData(0, 0, 400, 300);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 40;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
        
        return canvas.toDataURL('image/jpeg', 0.9);
    }

    async test_1_tools_dataURL_conversion() {
        try {
            const dataURL = await this.createTestImage();
            const file = Tools.dataURLToFile(dataURL, 'test.jpg');
            
            if (file && file.name === 'test.jpg' && file.type === 'image/jpeg' && file.size > 0) {
                const convertedBack = await Tools.fileToDataURL(file);
                if (convertedBack && convertedBack.startsWith('data:image')) {
                    this.log('Tools: DataURL转换', 'PASS', `原始大小: ${dataURL.length}, 转换后大小: ${convertedBack.length}`);
                    return true;
                }
            }
            this.log('Tools: DataURL转换', 'FAIL', '转换失败');
        } catch (e) {
            this.log('Tools: DataURL转换', 'FAIL', e.message);
        }
        return false;
    }

    async test_2_photo_canvas_load_image() {
        try {
            const dataURL = await this.createTestImage();
            const canvas = new PhotoCanvas('mainCanvas', 'maskCanvas');
            await canvas.loadImage(dataURL);
            
            if (canvas.canvas.width > 0 && canvas.canvas.height > 0 && canvas.imageDataURL === dataURL) {
                this.log('PhotoCanvas: 加载图片', 'PASS', `尺寸: ${canvas.canvas.width}x${canvas.canvas.height}`);
                return true;
            }
            this.log('PhotoCanvas: 加载图片', 'FAIL', '图片未正确加载');
        } catch (e) {
            this.log('PhotoCanvas: 加载图片', 'FAIL', e.message);
        }
        return false;
    }

    async test_3_photo_canvas_brush_drawing() {
        try {
            const dataURL = await this.createTestImage();
            const canvas = new PhotoCanvas('mainCanvas', 'maskCanvas');
            await canvas.loadImage(dataURL);
            
            canvas.setBrushMode('brush');
            canvas.setBrushSize(20);
            
            canvas.maskCtx.beginPath();
            canvas.maskCtx.arc(100, 100, 10, 0, Math.PI * 2);
            canvas.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
            canvas.maskCtx.fill();
            
            const hasMask = canvas.hasMask();
            const maskDataURL = canvas.getMaskDataURL();
            const maskDisplayURL = canvas.getMaskDataURLForDisplay();
            
            if (hasMask && maskDataURL && maskDisplayURL) {
                this.log('PhotoCanvas: 画笔涂抹', 'PASS', `有蒙版: ${hasMask}, 蒙版数据长度: ${maskDataURL.length}`);
                return true;
            }
            this.log('PhotoCanvas: 画笔涂抹', 'FAIL', `有蒙版: ${hasMask}`);
        } catch (e) {
            this.log('PhotoCanvas: 画笔涂抹', 'FAIL', e.message);
        }
        return false;
    }

    async test_4_photo_canvas_mask_output() {
        try {
            const dataURL = await this.createTestImage();
            const canvas = new PhotoCanvas('mainCanvas', 'maskCanvas');
            await canvas.loadImage(dataURL);
            
            canvas.setBrushMode('brush');
            canvas.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
            canvas.maskCtx.fillRect(0, 0, 100, 100);
            
            const maskDataURL = canvas.getMaskDataURL();
            
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
            
            const imageData = ctx.getImageData(50, 50, 1, 1).data;
            const isWhite = imageData[0] > 250 && imageData[1] > 250 && imageData[2] > 250;
            
            if (isWhite) {
                this.log('PhotoCanvas: 蒙版输出（黑白）', 'PASS', `蒙版区域为白色: RGB(${imageData[0]},${imageData[1]},${imageData[2]})`);
                return true;
            }
            this.log('PhotoCanvas: 蒙版输出（黑白）', 'FAIL', `蒙版区域不是白色: RGB(${imageData[0]},${imageData[1]},${imageData[2]})`);
        } catch (e) {
            this.log('PhotoCanvas: 蒙版输出（黑白）', 'FAIL', e.message);
        }
        return false;
    }

    async test_5_photo_canvas_invert_mask() {
        try {
            const dataURL = await this.createTestImage();
            const canvas = new PhotoCanvas('mainCanvas', 'maskCanvas');
            await canvas.loadImage(dataURL);
            
            canvas.setBrushMode('brush');
            canvas.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
            canvas.maskCtx.fillRect(0, 0, 100, 100);
            
            const hasMaskBefore = canvas.hasMask();
            canvas.invertMask();
            const hasMaskAfter = canvas.hasMask();
            
            if (hasMaskBefore && hasMaskAfter) {
                this.log('PhotoCanvas: 蒙版反选', 'PASS', `反选前后都有蒙版`);
                return true;
            }
            this.log('PhotoCanvas: 蒙版反选', 'FAIL', `反选前: ${hasMaskBefore}, 反选后: ${hasMaskAfter}`);
        } catch (e) {
            this.log('PhotoCanvas: 蒙版反选', 'FAIL', e.message);
        }
        return false;
    }

    async test_6_photo_canvas_clear_mask() {
        try {
            const dataURL = await this.createTestImage();
            const canvas = new PhotoCanvas('mainCanvas', 'maskCanvas');
            await canvas.loadImage(dataURL);
            
            canvas.setBrushMode('brush');
            canvas.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
            canvas.maskCtx.fillRect(0, 0, 100, 100);
            
            canvas.clearMask();
            
            if (!canvas.hasMask()) {
                this.log('PhotoCanvas: 清除蒙版', 'PASS', '蒙版已清除');
                return true;
            }
            this.log('PhotoCanvas: 清除蒙版', 'FAIL', '蒙版未清除');
        } catch (e) {
            this.log('PhotoCanvas: 清除蒙版', 'FAIL', e.message);
        }
        return false;
    }

    async test_7_photo_canvas_restore_mask() {
        try {
            const dataURL = await this.createTestImage();
            const canvas = new PhotoCanvas('mainCanvas', 'maskCanvas');
            await canvas.loadImage(dataURL);
            
            canvas.setBrushMode('brush');
            canvas.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
            canvas.maskCtx.fillRect(0, 0, 100, 100);
            
            const savedMask = canvas.getMaskDataURLForDisplay();
            canvas.clearMask();
            
            await canvas.restoreMaskFromDataURL(savedMask);
            
            if (canvas.hasMask()) {
                this.log('PhotoCanvas: 恢复蒙版', 'PASS', '蒙版成功恢复');
                return true;
            }
            this.log('PhotoCanvas: 恢复蒙版', 'FAIL', '蒙版未恢复');
        } catch (e) {
            this.log('PhotoCanvas: 恢复蒙版', 'FAIL', e.message);
        }
        return false;
    }

    async test_8_compare_slider_load_images() {
        try {
            const originalDataURL = await this.createTestImage();
            const repairedDataURL = await this.createTestImage();
            
            const slider = new CompareSlider('compareOriginalCanvas', 'compareContainer', 'compareSlider');
            await slider.loadImages(originalDataURL, repairedDataURL);
            
            if (slider.repairedCanvas && 
                slider.originalCanvas.width > 0 && 
                slider.repairedCanvas.width > 0) {
                this.log('CompareSlider: 加载图片', 'PASS', 
                    `原图尺寸: ${slider.originalCanvas.width}x${slider.originalCanvas.height}, ` +
                    `修复后尺寸: ${slider.repairedCanvas.width}x${slider.repairedCanvas.height}`);
                return true;
            }
            this.log('CompareSlider: 加载图片', 'FAIL', 'Canvas未正确初始化');
        } catch (e) {
            this.log('CompareSlider: 加载图片', 'FAIL', e.message);
        }
        return false;
    }

    async test_9_compare_slider_position() {
        try {
            const originalDataURL = await this.createTestImage();
            const repairedDataURL = await this.createTestImage();
            
            const slider = new CompareSlider('compareOriginalCanvas', 'compareContainer', 'compareSlider');
            await slider.loadImages(originalDataURL, repairedDataURL);
            
            slider.position = 30;
            slider.updateSliderPosition();
            
            const leftVal = slider.slider.style.left;
            const clipPath = slider.repairedCanvas.style.clipPath;
            
            if (leftVal === '30%' && clipPath.includes('inset(0 0 0 30%)')) {
                this.log('CompareSlider: 位置更新', 'PASS', 
                    `位置: ${leftVal}, clipPath: ${clipPath}`);
                return true;
            }
            this.log('CompareSlider: 位置更新', 'FAIL', 
                `left: ${leftVal}, clipPath: ${clipPath}`);
        } catch (e) {
            this.log('CompareSlider: 位置更新', 'FAIL', e.message);
        }
        return false;
    }

    async test_10_overlay_viewer() {
        try {
            const originalDataURL = await this.createTestImage();
            const repairedDataURL = await this.createTestImage();
            
            const viewer = new OverlayViewer('overlayOriginalCanvas', 'overlayRepairedCanvas', 'overlayOpacity');
            await viewer.loadImages(originalDataURL, repairedDataURL);
            
            viewer.opacity = 0.75;
            viewer.updateOpacity();
            
            const opacity = viewer.repairedCanvas.style.opacity;
            
            if (viewer.originalCanvas.width > 0 && 
                viewer.repairedCanvas.width > 0 && 
                opacity === '0.75') {
                this.log('OverlayViewer: 透明度调节', 'PASS', 
                    `透明度: ${opacity}, 尺寸: ${viewer.repairedCanvas.width}x${viewer.repairedCanvas.height}`);
                return true;
            }
            this.log('OverlayViewer: 透明度调节', 'FAIL', `透明度: ${opacity}`);
        } catch (e) {
            this.log('OverlayViewer: 透明度调节', 'FAIL', e.message);
        }
        return false;
    }

    async test_11_gif_generator() {
        try {
            const originalDataURL = await this.createTestImage();
            const repairedDataURL = await this.createTestImage();
            
            const generator = new GifGenerator();
            const blob = await generator.generate(originalDataURL, repairedDataURL);
            
            if (blob && blob.type === 'image/gif' && blob.size > 0) {
                this.log('GifGenerator: GIF生成', 'PASS', 
                    `GIF大小: ${blob.size} 字节, 类型: ${blob.type}`);
                return true;
            }
            this.log('GifGenerator: GIF生成', 'FAIL', `Blob无效: size=${blob?.size}, type=${blob?.type}`);
        } catch (e) {
            this.log('GifGenerator: GIF生成', 'FAIL', e.message);
        }
        return false;
    }

    async test_12_steps_preview() {
        try {
            const originalDataURL = await this.createTestImage();
            const steps = {
                denoised: await this.createTestImage(),
                sharpened: await this.createTestImage(),
                contrast: await this.createTestImage(),
                colorized: await this.createTestImage()
            };
            const finalDataURL = await this.createTestImage();
            
            const preview = new StepsPreview();
            await preview.showSteps(originalDataURL, steps, finalDataURL);
            
            const denoisedImg = document.getElementById('stepDenoisedImg');
            const sharpenedImg = document.getElementById('stepSharpenedImg');
            const contrastImg = document.getElementById('stepContrastImg');
            const colorizedImg = document.getElementById('stepColorizedImg');
            
            if (denoisedImg && sharpenedImg && contrastImg && colorizedImg &&
                denoisedImg.src && sharpenedImg.src && contrastImg.src && colorizedImg.src) {
                this.log('StepsPreview: 步骤图显示', 'PASS', '所有步骤图已加载');
                preview.hide();
                return true;
            }
            this.log('StepsPreview: 步骤图显示', 'FAIL', '部分步骤图未加载');
            preview.hide();
        } catch (e) {
            this.log('StepsPreview: 步骤图显示', 'FAIL', e.message);
        }
        return false;
    }

    async test_13_api_fetch_repair() {
        try {
            const dataURL = await this.createTestImage();
            
            const result = await Tools.fetchRepair(dataURL, {
                intensity: 'medium',
                operations: {
                    denoise: true,
                    sharpen: true,
                    contrast: true,
                    colorize: false,
                    removeScratches: false
                }
            });
            
            if (result && result.success && result.repaired && result.steps) {
                const steps = Object.keys(result.steps);
                this.log('API: 单张修复', 'PASS', 
                    `成功: ${result.success}, 步骤: ${steps}, 耗时: ${result.time}ms`);
                return result;
            }
            this.log('API: 单张修复', 'FAIL', `成功: ${result?.success}`);
        } catch (e) {
            this.log('API: 单张修复', 'FAIL', e.message + ' (将使用降级算法测试)');
            
            const dataURL = await this.createTestImage();
            const result = await Tools.simulateRepair(dataURL, {
                intensity: 'medium',
                operations: {
                    denoise: true,
                    sharpen: true,
                    contrast: true,
                    colorize: false,
                    removeScratches: false
                }
            });
            
            if (result && result.success && result.repaired) {
                this.log('降级算法: 单张修复', 'PASS', '前端降级算法正常工作');
                return result;
            }
        }
        return null;
    }

    async test_14_simulate_damage() {
        try {
            const dataURL = await this.createTestImage();
            const damaged = await Tools.applyDamageEffect(dataURL, 50, 10);
            
            if (damaged && damaged.startsWith('data:image')) {
                this.log('Tools: 破损效果模拟', 'PASS', `破损后大小: ${damaged.length}`);
                return true;
            }
            this.log('Tools: 破损效果模拟', 'FAIL', '破损效果生成失败');
        } catch (e) {
            this.log('Tools: 破损效果模拟', 'FAIL', e.message);
        }
        return false;
    }

    async test_15_jszip_available() {
        try {
            if (typeof JSZip !== 'undefined') {
                const zip = new JSZip();
                zip.file('test.txt', 'test content');
                const content = await zip.generateAsync({ type: 'blob' });
                
                if (content && content.size > 0) {
                    this.log('JSZip: ZIP打包', 'PASS', `ZIP大小: ${content.size} 字节`);
                    return true;
                }
            }
            this.log('JSZip: ZIP打包', 'FAIL', 'JSZip不可用');
        } catch (e) {
            this.log('JSZip: ZIP打包', 'FAIL', e.message);
        }
        return false;
    }

    async test_16_ui_controls_exist() {
        const controls = [
            'fileInput', 'repairBtn', 'intensityWeak', 'intensityMedium', 'intensityStrong',
            'optDenoise', 'optSharpen', 'optContrast', 'optColorize', 'optScratches',
            'brushModeAll', 'brushModeBrush', 'clearMaskBtn', 'invertMaskBtn',
            'exportRepairedBtn', 'exportStepsBtn', 'exportGifBtn'
        ];
        
        let allExist = true;
        const missing = [];
        
        for (const id of controls) {
            const el = document.getElementById(id);
            if (!el) {
                allExist = false;
                missing.push(id);
            }
        }
        
        if (allExist) {
            this.log('UI控件: 存在性检查', 'PASS', `${controls.length} 个控件全部存在`);
        } else {
            this.log('UI控件: 存在性检查', 'FAIL', `缺失控件: ${missing.join(', ')}`);
        }
        
        return allExist;
    }

    async runAllTests() {
        console.log('='.repeat(70));
        console.log('AI老照片修复模拟器 - 前端功能自检测试');
        console.log('='.repeat(70));
        console.log();
        
        const startTime = Date.now();
        
        const tests = [
            () => this.test_1_tools_dataURL_conversion(),
            () => this.test_2_photo_canvas_load_image(),
            () => this.test_3_photo_canvas_brush_drawing(),
            () => this.test_4_photo_canvas_mask_output(),
            () => this.test_5_photo_canvas_invert_mask(),
            () => this.test_6_photo_canvas_clear_mask(),
            () => this.test_7_photo_canvas_restore_mask(),
            () => this.test_8_compare_slider_load_images(),
            () => this.test_9_compare_slider_position(),
            () => this.test_10_overlay_viewer(),
            () => this.test_11_gif_generator(),
            () => this.test_12_steps_preview(),
            () => this.test_13_api_fetch_repair(),
            () => this.test_14_simulate_damage(),
            () => this.test_15_jszip_available(),
            () => this.test_16_ui_controls_exist(),
        ];
        
        for (const test of tests) {
            try {
                await test();
            } catch (e) {
                this.log('未处理的异常', 'FAIL', e.message);
            }
            console.log();
        }
        
        const elapsed = Date.now() - startTime;
        
        console.log('='.repeat(70));
        console.log('测试总结');
        console.log('='.repeat(70));
        console.log(`总测试数: ${this.testResults.length}`);
        console.log(`通过: ${this.passed}  |  失败: ${this.failed}`);
        console.log(`总耗时: ${elapsed} 毫秒`);
        console.log(`通过率: ${(this.passed / this.testResults.length * 100).toFixed(1)}%`);
        console.log('='.repeat(70));
        
        if (this.failed > 0) {
            console.log('\n失败的测试:');
            for (const r of this.testResults) {
                if (r.status === 'FAIL') {
                    console.log(`  ❌ ${r.name}: ${r.message}`);
                }
            }
        }
        
        return {
            passed: this.passed,
            failed: this.failed,
            total: this.testResults.length,
            results: this.testResults
        };
    }
}

window.runFrontendTests = async function() {
    const tester = new PhotoRepairSelfTest();
    return await tester.runAllTests();
};

console.log('📋 前端自检模块已加载。在控制台运行 runFrontendTests() 开始测试。');
