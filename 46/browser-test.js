/**
 * 像素画绘制工具 - 浏览器端自动化测试脚本
 * 
 * 使用方法：
 * 1. 打开 http://localhost:8080
 * 2. 按 F12 打开开发者工具
 * 3. 切换到 Console（控制台）标签
 * 4. 将此文件的全部内容复制粘贴到控制台，按回车运行
 * 5. 等待测试完成，查看测试结果
 */

console.log('%c========================================', 'color: #4cc9f0; font-weight: bold;');
console.log('%c  像素画绘制工具 - 自动化测试', 'color: #4cc9f0; font-weight: bold;');
console.log('%c========================================\n', 'color: #4cc9f0; font-weight: bold;');

const app = window.pixelArtApp;
if (!app) {
    console.error('❌ 错误：未找到 pixelArtApp，请确保页面已完全加载');
    throw new Error('App not found');
}

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function test(name, fn) {
    try {
        await fn();
        console.log(`%c✅ ${name}`, 'color: #4ade80;');
        testsPassed++;
        testResults.push({ name, passed: true });
    } catch (e) {
        console.log(`%c❌ ${name}`, 'color: #f72585;');
        console.log(`   %c错误: ${e.message}`, 'color: #fca5a5;');
        testsFailed++;
        testResults.push({ name, passed: false, error: e.message });
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || '断言失败');
    }
}

function simulateMouseEvent(type, element, clientX, clientY) {
    const rect = element.getBoundingClientRect();
    const event = new MouseEvent(type, {
        clientX: rect.left + clientX,
        clientY: rect.top + clientY,
        bubbles: true,
        cancelable: true,
        view: window
    });
    element.dispatchEvent(event);
}

async function runAllTests() {
    console.log('%c--- 测试准备 ---', 'color: #4361ee; font-weight: bold;');
    
    app.historyManager.reset([app.canvasEngine.createEmptyFrame()], 0);
    app.canvasEngine.clear();
    await sleep(100);
    
    console.log('\n%c--- 测试 1: 画布绘制功能 ---', 'color: #4361ee; font-weight: bold;');
    
    await test('当前工具是铅笔', () => {
        assert(app.toolManager.currentTool === 'pencil', `当前工具是 ${app.toolManager.currentTool}，应该是 pencil`);
    });
    
    await test('当前颜色是黑色', () => {
        assert(app.paletteManager.currentColor === '#000000', `当前颜色是 ${app.paletteManager.currentColor}，应该是 #000000`);
    });
    
    await test('绘制单个像素（点击）', () => {
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 5 + pixelSize/2, pixelSize * 5 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 5 + pixelSize/2, pixelSize * 5 + pixelSize/2);
        
        const color = app.canvasEngine.getPixel(5, 5);
        assert(color === '#000000', `像素(5,5)颜色是 ${color}，应该是 #000000`);
    });
    
    await test('拖拽绘制水平线', async () => {
        app.canvasEngine.clear();
        await sleep(50);
        
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 0 + pixelSize/2, pixelSize * 10 + pixelSize/2);
        
        for (let x = 1; x <= 10; x++) {
            simulateMouseEvent('mousemove', canvas, pixelSize * x + pixelSize/2, pixelSize * 10 + pixelSize/2);
        }
        
        simulateMouseEvent('mouseup', canvas, pixelSize * 10 + pixelSize/2, pixelSize * 10 + pixelSize/2);
        
        for (let x = 0; x <= 10; x++) {
            const color = app.canvasEngine.getPixel(x, 10);
            assert(color === '#000000', `像素(${x},10)颜色是 ${color}，应该是 #000000`);
        }
    });
    
    await test('橡皮擦工具擦除像素', () => {
        app.toolManager.setTool('eraser');
        
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 5 + pixelSize/2, pixelSize * 10 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 5 + pixelSize/2, pixelSize * 10 + pixelSize/2);
        
        const color = app.canvasEngine.getPixel(5, 10);
        assert(color === '#FFFFFF', `像素(5,10)颜色是 ${color}，应该是白色 #FFFFFF`);
        
        app.toolManager.setTool('pencil');
    });
    
    console.log('\n%c--- 测试 2: 调色板功能 ---', 'color: #4361ee; font-weight: bold;');
    
    await test('切换预设颜色', () => {
        const presetColors = document.querySelectorAll('.preset-color');
        const redColor = Array.from(presetColors).find(el => el.dataset.color.toUpperCase() === '#ED1C24');
        assert(redColor, '未找到红色预设颜色');
        
        redColor.click();
        
        assert(app.paletteManager.currentColor === '#ED1C24', `当前颜色是 ${app.paletteManager.currentColor}，应该是 #ED1C24`);
        assert(redColor.classList.contains('active'), '红色预设应该有active类');
    });
    
    await test('用新颜色绘制像素', () => {
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 15 + pixelSize/2, pixelSize * 15 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 15 + pixelSize/2, pixelSize * 15 + pixelSize/2);
        
        const color = app.canvasEngine.getPixel(15, 15);
        assert(color === '#ED1C24', `像素(15,15)颜色是 ${color}，应该是 #ED1C24`);
    });
    
    console.log('\n%c--- 测试 3: 取色器功能 ---', 'color: #4361ee; font-weight: bold;');
    
    await test('取色器获取像素颜色', () => {
        app.toolManager.setTool('eyedropper');
        
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 15 + pixelSize/2, pixelSize * 15 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 15 + pixelSize/2, pixelSize * 15 + pixelSize/2);
        
        assert(app.paletteManager.currentColor === '#ED1C24', `取色后颜色是 ${app.paletteManager.currentColor}，应该是 #ED1C24`);
        
        app.toolManager.setTool('pencil');
    });
    
    await test('取色操作不保存历史', () => {
        const historyLength = app.historyManager.stack.length;
        
        app.toolManager.setTool('eyedropper');
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 5 + pixelSize/2, pixelSize * 5 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 5 + pixelSize/2, pixelSize * 5 + pixelSize/2);
        
        assert(app.historyManager.stack.length === historyLength, `历史记录从 ${historyLength} 变为 ${app.historyManager.stack.length}，取色不应该保存历史`);
        
        app.toolManager.setTool('pencil');
    });
    
    console.log('\n%c--- 测试 4: 填充桶功能 ---', 'color: #4361ee; font-weight: bold;');
    
    await test('填充桶填充区域', () => {
        app.canvasEngine.clear();
        app.paletteManager.selectColor('#000000');
        app.toolManager.setTool('pencil');
        
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        for (let x = 0; x < 32; x++) {
            simulateMouseEvent('mousedown', canvas, pixelSize * x + pixelSize/2, pixelSize * 10 + pixelSize/2);
            simulateMouseEvent('mouseup', canvas, pixelSize * x + pixelSize/2, pixelSize * 10 + pixelSize/2);
            simulateMouseEvent('mousedown', canvas, pixelSize * x + pixelSize/2, pixelSize * 20 + pixelSize/2);
            simulateMouseEvent('mouseup', canvas, pixelSize * x + pixelSize/2, pixelSize * 20 + pixelSize/2);
        }
        for (let y = 10; y <= 20; y++) {
            simulateMouseEvent('mousedown', canvas, pixelSize * 0 + pixelSize/2, pixelSize * y + pixelSize/2);
            simulateMouseEvent('mouseup', canvas, pixelSize * 0 + pixelSize/2, pixelSize * y + pixelSize/2);
            simulateMouseEvent('mousedown', canvas, pixelSize * 31 + pixelSize/2, pixelSize * y + pixelSize/2);
            simulateMouseEvent('mouseup', canvas, pixelSize * 31 + pixelSize/2, pixelSize * y + pixelSize/2);
        }
        
        app.paletteManager.selectColor('#ED1C24');
        app.toolManager.setTool('fillbucket');
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 15 + pixelSize/2, pixelSize * 15 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 15 + pixelSize/2, pixelSize * 15 + pixelSize/2);
        
        for (let y = 11; y < 20; y++) {
            for (let x = 1; x < 31; x++) {
                const color = app.canvasEngine.getPixel(x, y);
                assert(color === '#ED1C24', `边界内像素(${x},${y})颜色是 ${color}，应该是 #ED1C24`);
            }
        }
        
        const outsideColor = app.canvasEngine.getPixel(15, 5);
        assert(outsideColor === '#FFFFFF', `边界外像素(15,5)颜色是 ${outsideColor}，应该是白色`);
        
        app.toolManager.setTool('pencil');
    });
    
    await test('填充相同颜色不变化', () => {
        const historyLength = app.historyManager.stack.length;
        
        app.toolManager.setTool('fillbucket');
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 15 + pixelSize/2, pixelSize * 15 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 15 + pixelSize/2, pixelSize * 15 + pixelSize/2);
        
        assert(app.historyManager.stack.length === historyLength, `填充相同颜色不应该保存历史`);
        
        app.toolManager.setTool('pencil');
    });
    
    console.log('\n%c--- 测试 5: 撤销/重做功能 ---', 'color: #4361ee; font-weight: bold;');
    
    await test('撤销操作恢复状态', () => {
        app.canvasEngine.clear();
        app.paletteManager.selectColor('#000000');
        app.historyManager.reset([app.canvasEngine.createEmptyFrame()], 0);
        
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 5 + pixelSize/2, pixelSize * 5 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 5 + pixelSize/2, pixelSize * 5 + pixelSize/2);
        
        assert(app.canvasEngine.getPixel(5, 5) === '#000000', '绘制后像素应该是黑色');
        
        app.undo();
        
        assert(app.canvasEngine.getPixel(5, 5) === '#FFFFFF', '撤销后像素应该恢复白色');
        assert(app.historyManager.canUndo() === false, '撤销后应该不能再撤销');
        assert(app.historyManager.canRedo() === true, '撤销后应该可以重做');
    });
    
    await test('重做操作恢复撤销', () => {
        app.redo();
        
        assert(app.canvasEngine.getPixel(5, 5) === '#000000', '重做后像素应该是黑色');
        assert(app.historyManager.canUndo() === true, '重做后应该可以撤销');
        assert(app.historyManager.canRedo() === false, '重做后应该不能再重做');
    });
    
    await test('20步历史限制', () => {
        app.canvasEngine.clear();
        app.historyManager.reset([app.canvasEngine.createEmptyFrame()], 0);
        app.paletteManager.selectColor('#000000');
        
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        for (let i = 1; i <= 25; i++) {
            simulateMouseEvent('mousedown', canvas, pixelSize * i + pixelSize/2, pixelSize * 0 + pixelSize/2);
            simulateMouseEvent('mouseup', canvas, pixelSize * i + pixelSize/2, pixelSize * 0 + pixelSize/2);
        }
        
        assert(app.historyManager.stack.length === 20, `历史记录应该是20条，实际 ${app.historyManager.stack.length} 条`);
        assert(app.historyManager.index === 19, `索引应该是19，实际 ${app.historyManager.index}`);
    });
    
    await test('撤销后修改清除重做历史', () => {
        app.canvasEngine.clear();
        app.historyManager.reset([app.canvasEngine.createEmptyFrame()], 0);
        app.paletteManager.selectColor('#000000');
        
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 1 + pixelSize/2, pixelSize * 0 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 1 + pixelSize/2, pixelSize * 0 + pixelSize/2);
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 2 + pixelSize/2, pixelSize * 0 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 2 + pixelSize/2, pixelSize * 0 + pixelSize/2);
        
        app.undo();
        app.undo();
        
        assert(app.historyManager.canRedo() === true, '撤销后应该可以重做');
        
        simulateMouseEvent('mousedown', canvas, pixelSize * 3 + pixelSize/2, pixelSize * 0 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 3 + pixelSize/2, pixelSize * 0 + pixelSize/2);
        
        assert(app.historyManager.canRedo() === false, '修改后重做历史应该被清除');
    });
    
    console.log('\n%c--- 测试 6: PNG导出功能 ---', 'color: #4361ee; font-weight: bold;');
    
    await test('导出图片尺寸为320x320', async () => {
        app.canvasEngine.clear();
        app.paletteManager.selectColor('#ED1C24');
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        simulateMouseEvent('mousedown', canvas, pixelSize * 0 + pixelSize/2, pixelSize * 0 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 0 + pixelSize/2, pixelSize * 0 + pixelSize/2);
        
        const exportCanvas = app.canvasEngine.exportScaled(10);
        
        assert(exportCanvas.width === 320, `导出宽度是 ${exportCanvas.width}，应该是 320`);
        assert(exportCanvas.height === 320, `导出高度是 ${exportCanvas.height}，应该是 320`);
        
        const ctx = exportCanvas.getContext('2d');
        const pixelData = ctx.getImageData(0, 0, 10, 10).data;
        
        const r = pixelData[0], g = pixelData[1], b = pixelData[2];
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        assert(hex === '#ED1C24', `导出的像素颜色是 ${hex}，应该是 #ED1C24`);
        
        const pixelData2 = ctx.getImageData(10, 0, 10, 10).data;
        const r2 = pixelData2[0], g2 = pixelData2[1], b2 = pixelData2[2];
        const hex2 = '#' + [r2, g2, b2].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        assert(hex2 === '#FFFFFF', `第二个像素颜色是 ${hex2}，应该是 #FFFFFF`);
    });
    
    await test('导出图片像素边缘清晰（无模糊）', () => {
        const exportCanvas = app.canvasEngine.exportScaled(10);
        const ctx = exportCanvas.getContext('2d');
        
        const pixelData = ctx.getImageData(9, 0, 2, 1).data;
        const r1 = pixelData[0], g1 = pixelData[1], b1 = pixelData[2];
        const r2 = pixelData[4], g2 = pixelData[5], b2 = pixelData[6];
        
        const hex1 = '#' + [r1, g1, b1].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        const hex2 = '#' + [r2, g2, b2].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        
        assert(hex1 === '#ED1C24', `像素边界左侧应该是红色，实际 ${hex1}`);
        assert(hex2 === '#FFFFFF', `像素边界右侧应该是白色，实际 ${hex2}`);
    });
    
    console.log('\n%c--- 测试 7: localStorage保存功能 ---', 'color: #4361ee; font-weight: bold;');
    
    await test('保存到localStorage', () => {
        app.canvasEngine.clear();
        app.paletteManager.selectColor('#00FF00');
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        simulateMouseEvent('mousedown', canvas, pixelSize * 10 + pixelSize/2, pixelSize * 10 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 10 + pixelSize/2, pixelSize * 10 + pixelSize/2);
        
        app.saveToStorage();
        
        const stored = localStorage.getItem('pixelArtData');
        assert(stored !== null, 'localStorage应该有数据');
        
        const data = JSON.parse(stored);
        assert(data.frames[0][10][10] === '#00FF00', `存储的像素颜色是 ${data.frames[0][10][10]}，应该是 #00FF00`);
        assert(data.currentColor === '#00FF00', `存储的当前颜色是 ${data.currentColor}，应该是 #00FF00`);
        assert(data.currentTool === 'pencil', `存储的当前工具是 ${data.currentTool}，应该是 pencil`);
    });
    
    await test('从localStorage恢复', () => {
        const testData = {
            version: '1.0',
            frames: [[...Array(32)].map(() => Array(32).fill('#FFFFFF'))],
            currentFrame: 0,
            currentColor: '#FF00FF',
            currentTool: 'eraser',
            showGrid: false,
            fps: 15,
            animationEnabled: false,
            savedAt: Date.now()
        };
        testData.frames[0][5][5] = '#FF00FF';
        
        localStorage.setItem('pixelArtData', JSON.stringify(testData));
        
        app.isLoading = true;
        const result = app.loadFromStorage();
        app.isLoading = false;
        
        assert(result === true, '应该返回true表示有数据');
        assert(app.canvasEngine.getPixel(5, 5) === '#FF00FF', `恢复的像素颜色应该是 #FF00FF`);
        assert(app.paletteManager.currentColor === '#FF00FF', `恢复的当前颜色应该是 #FF00FF`);
        assert(app.toolManager.currentTool === 'eraser', `恢复的当前工具应该是 eraser`);
        assert(app.showGrid === false, `恢复的网格显示应该是 false`);
        assert(app.animationController.fps === 15, `恢复的FPS应该是 15`);
        
        app.toolManager.setTool('pencil');
        app.paletteManager.selectColor('#000000');
        app.canvasEngine.toggleGrid(true);
        document.getElementById('toggle-grid').checked = true;
    });
    
    console.log('\n%c--- 测试 8: 动画模式功能 ---', 'color: #4361ee; font-weight: bold;');
    
    await test('开启动画模式', () => {
        const toggle = document.getElementById('toggle-animation');
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
        
        const controls = document.getElementById('animation-controls');
        assert(controls.style.display !== 'none', '动画控制面板应该显示');
        assert(app.animationEnabled === true, 'animationEnabled应该是true');
    });
    
    await test('添加多帧（最多8帧）', () => {
        for (let i = 0; i < 7; i++) {
            const result = app.animationController.addFrame();
            if (i < 7) {
                assert(result === true, `第${i+2}帧应该添加成功`);
            }
        }
        
        assert(app.animationController.frames.length === 8, `应该有8帧，实际 ${app.animationController.frames.length} 帧`);
        
        const result = app.animationController.addFrame();
        assert(result === false, '第9帧应该添加失败');
        
        for (let i = 0; i < 6; i++) {
            app.animationController.removeFrame();
        }
        assert(app.animationController.frames.length === 2, `应该剩余2帧`);
    });
    
    await test('每帧独立绘制', () => {
        app.animationController.setCurrentFrame(0);
        app.canvasEngine.clear();
        app.paletteManager.selectColor('#FF0000');
        const canvas = app.canvasEngine.pixelCanvas;
        const pixelSize = app.canvasEngine.pixelCanvas.width / 32;
        simulateMouseEvent('mousedown', canvas, pixelSize * 0 + pixelSize/2, pixelSize * 0 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 0 + pixelSize/2, pixelSize * 0 + pixelSize/2);
        
        app.animationController.setCurrentFrame(1);
        app.canvasEngine.clear();
        app.paletteManager.selectColor('#0000FF');
        simulateMouseEvent('mousedown', canvas, pixelSize * 31 + pixelSize/2, pixelSize * 31 + pixelSize/2);
        simulateMouseEvent('mouseup', canvas, pixelSize * 31 + pixelSize/2, pixelSize * 31 + pixelSize/2);
        
        app.animationController.setCurrentFrame(0);
        let color = app.canvasEngine.getPixel(0, 0);
        assert(color === '#FF0000', `第1帧像素(0,0)应该是红色，实际 ${color}`);
        color = app.canvasEngine.getPixel(31, 31);
        assert(color === '#FFFFFF', `第1帧像素(31,31)应该是白色，实际 ${color}`);
        
        app.animationController.setCurrentFrame(1);
        color = app.canvasEngine.getPixel(31, 31);
        assert(color === '#0000FF', `第2帧像素(31,31)应该是蓝色，实际 ${color}`);
        color = app.canvasEngine.getPixel(0, 0);
        assert(color === '#FFFFFF', `第2帧像素(0,0)应该是白色，实际 ${color}`);
    });
    
    await test('动画播放和停止', async () => {
        app.animationController.setFPS(10);
        app.playAnimation();
        
        assert(app.animationController.isPlaying === true, '应该正在播放');
        assert(app.toolManager.isAnimationPlaying === true, 'toolManager应该标记播放中');
        
        await sleep(300);
        
        const playingThumbs = document.querySelectorAll('.frame-thumb.playing');
        assert(playingThumbs.length === 1, '应该有且只有一个帧在播放状态');
        
        app.stopAnimation();
        
        assert(app.animationController.isPlaying === false, '应该已停止');
        assert(app.toolManager.isAnimationPlaying === false, 'toolManager应该标记已停止');
    });
    
    await test('帧率调节', () => {
        const fpsSlider = document.getElementById('fps-slider');
        fpsSlider.value = 20;
        fpsSlider.dispatchEvent(new Event('input'));
        
        assert(app.animationController.fps === 20, `FPS应该是20，实际 ${app.animationController.fps}`);
        
        const fpsValue = document.getElementById('fps-value');
        assert(fpsValue.textContent === '20', `FPS显示应该是20，实际 ${fpsValue.textContent}`);
        
        fpsSlider.value = 1;
        fpsSlider.dispatchEvent(new Event('input'));
        assert(app.animationController.fps === 1, `FPS应该是1，实际 ${app.animationController.fps}`);
        
        fpsSlider.value = 30;
        fpsSlider.dispatchEvent(new Event('input'));
        assert(app.animationController.fps === 30, `FPS应该是30，实际 ${app.animationController.fps}`);
        
        fpsSlider.value = 8;
        fpsSlider.dispatchEvent(new Event('input'));
    });
    
    await test('关闭动画模式', () => {
        const toggle = document.getElementById('toggle-animation');
        toggle.checked = false;
        
        window.confirm = () => true;
        toggle.dispatchEvent(new Event('change'));
        window.confirm = null;
        
        const controls = document.getElementById('animation-controls');
        assert(controls.style.display === 'none', '动画控制面板应该隐藏');
        assert(app.animationController.frames.length === 1, `应该只剩1帧，实际 ${app.animationController.frames.length} 帧`);
    });
    
    console.log('\n%c--- 测试 9: 放大镜功能 ---', 'color: #4361ee; font-weight: bold;');
    
    await test('鼠标悬停显示放大镜', () => {
        const canvas = app.canvasEngine.pixelCanvas;
        const magnifier = document.getElementById('magnifier');
        
        const enterEvent = new MouseEvent('mouseenter', { bubbles: true });
        canvas.dispatchEvent(enterEvent);
        
        assert(magnifier.classList.contains('visible'), '放大镜应该显示');
        
        const leaveEvent = new MouseEvent('mouseleave', { bubbles: true });
        canvas.dispatchEvent(leaveEvent);
        
        assert(!magnifier.classList.contains('visible'), '放大镜应该隐藏');
    });
    
    console.log('\n%c--- 测试 10: 网格线开关 ---', 'color: #4361ee; font-weight: bold;');
    
    await test('切换网格线显示', () => {
        const toggle = document.getElementById('toggle-grid');
        
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
        assert(app.showGrid === false, 'showGrid应该是false');
        
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
        assert(app.showGrid === true, 'showGrid应该是true');
    });
    
    console.log('\n' + '%c'.repeat(40), 'background: #4cc9f0;');
    console.log('%c========================================', 'color: #4cc9f0; font-weight: bold; font-size: 14px;');
    console.log(`%c  测试结果: ${testsPassed} 通过, ${testsFailed} 失败`, 
        testsFailed === 0 ? 'color: #4ade80; font-weight: bold; font-size: 14px;' : 'color: #f72585; font-weight: bold; font-size: 14px;');
    console.log('%c========================================', 'color: #4cc9f0; font-weight: bold; font-size: 14px;');
    
    if (testsFailed > 0) {
        console.log('\n%c--- 失败的测试 ---', 'color: #f72585; font-weight: bold;');
        testResults.filter(t => !t.passed).forEach((t, i) => {
            console.log(`${i + 1}. ❌ ${t.name}`);
            console.log(`   错误: ${t.error}`);
        });
    } else {
        console.log('\n%c🎉 所有测试通过！所有功能正常工作。', 'color: #4ade80; font-weight: bold; font-size: 14px;');
    }
    
    return { passed: testsPassed, failed: testsFailed, results: testResults };
}

runAllTests().catch(e => {
    console.error('测试执行出错:', e);
});
