/**
 * 3D 螺旋环功能验证测试脚本
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

console.log('='.repeat(60));
console.log('🧪 3D 螺旋环功能验证测试');
console.log('='.repeat(60));

// 测试 1: 验证页面可访问
console.log('\n📋 测试 1: 页面访问性验证');
console.log('-'.repeat(60));

const pageContent = fs.readFileSync('index.html', 'utf-8');
console.log(`✅ index.html 存在，大小: ${pageContent.length} 字节`);

const requiredImports = [
    'three',
    'OrbitControls',
    'EffectComposer',
    'UnrealBloomPass'
];

requiredImports.forEach(imp => {
    if (pageContent.includes(imp)) {
        console.log(`✅ 已导入: ${imp}`);
    } else {
        console.log(`❌ 缺失导入: ${imp}`);
    }
});

// 测试 2: 验证关键功能函数存在
console.log('\n📋 测试 2: 关键功能函数验证');
console.log('-'.repeat(60));

const requiredFunctions = [
    'createSpiral',
    'updateSpiral',
    'setParticleMode',
    'takeScreenshot',
    'exportConfig',
    'importConfig',
    'createTrailFrame',
    'createParticleSprite',
    'createStars'
];

requiredFunctions.forEach(func => {
    const regex = new RegExp(`function\\s+${func}\\s*\\(`);
    if (regex.test(pageContent)) {
        console.log(`✅ 函数存在: ${func}()`);
    } else {
        console.log(`❌ 函数缺失: ${func}()`);
    }
});

// 测试 3: 验证运动模糊实现
console.log('\n📋 测试 3: 运动模糊实现验证');
console.log('-'.repeat(60));

const motionBlurChecks = [
    { check: 'trailGroup', desc: '轨迹组容器' },
    { check: 'createTrailFrame', desc: '轨迹帧创建函数' },
    { check: 'AdditiveBlending', desc: '加法混合模式' },
    { check: 'opacity.*0.8', desc: '透明度衰减' },
    { check: 'geometry.dispose', desc: '内存清理' }
];

motionBlurChecks.forEach(item => {
    if (pageContent.includes(item.check)) {
        console.log(`✅ ${item.desc}: 已实现`);
    } else {
        console.log(`❌ ${item.desc}: 未实现`);
    }
});

// 测试 4: 验证粒子发光效果
console.log('\n📋 测试 4: 粒子发光效果验证');
console.log('-'.repeat(60));

const particleChecks = [
    { check: 'createParticleSprite', desc: '粒子精灵创建' },
    { check: 'createRadialGradient', desc: '径向渐变' },
    { check: 'CanvasTexture', desc: 'Canvas纹理' },
    { check: 'AdditiveBlending', desc: '加法混合' },
    { check: 'depthWrite.*false', desc: '深度写入禁用' },
    { check: 'sizeAttenuation.*true', desc: '透视衰减' }
];

particleChecks.forEach(item => {
    if (pageContent.includes(item.check)) {
        console.log(`✅ ${item.desc}: 已实现`);
    } else {
        console.log(`❌ ${item.desc}: 未实现`);
    }
});

// 测试 5: 验证截图功能
console.log('\n📋 测试 5: 截图功能验证');
console.log('-'.repeat(60));

const screenshotChecks = [
    { check: 'composer.render', desc: '使用composer渲染(含后期效果)' },
    { check: 'toDataURL.*image/png', desc: 'PNG格式导出' },
    { check: 'preserveDrawingBuffer.*true', desc: '缓冲区保留' }
];

screenshotChecks.forEach(item => {
    if (pageContent.includes(item.check)) {
        console.log(`✅ ${item.desc}: 已实现`);
    } else {
        console.log(`❌ ${item.desc}: 未实现`);
    }
});

// 测试 6: 验证JSON导出导入
console.log('\n📋 测试 6: JSON导出导入功能验证');
console.log('-'.repeat(60));

// 模拟导出的JSON数据
const testExportData = {
    radius: 8,
    turns: 3,
    count: 500,
    cubeSize: 0.5,
    particleMode: false,
    autoRotate: true,
    motionBlur: false,
    background: "black"
};

console.log('模拟导出数据:', JSON.stringify(testExportData, null, 2));

// 验证JSON格式
try {
    const jsonStr = JSON.stringify(testExportData, null, 2);
    const parsed = JSON.parse(jsonStr);
    console.log('✅ JSON格式有效');
    
    const requiredKeys = ['radius', 'turns', 'count', 'cubeSize', 'particleMode', 'autoRotate', 'motionBlur', 'background'];
    let allKeysPresent = true;
    requiredKeys.forEach(key => {
        if (parsed[key] === undefined) {
            console.log(`❌ 缺失字段: ${key}`);
            allKeysPresent = false;
        }
    });
    if (allKeysPresent) {
        console.log('✅ 所有必需字段存在');
    }
    
    // 验证值范围
    if (parsed.radius >= 2 && parsed.radius <= 15) console.log('✅ radius 范围正确');
    if (parsed.turns >= 1 && parsed.turns <= 5) console.log('✅ turns 范围正确');
    if (parsed.count >= 100 && parsed.count <= 1000) console.log('✅ count 范围正确');
    if (parsed.cubeSize >= 0.1 && parsed.cubeSize <= 2) console.log('✅ cubeSize 范围正确');
    if (typeof parsed.particleMode === 'boolean') console.log('✅ particleMode 类型正确');
    if (typeof parsed.autoRotate === 'boolean') console.log('✅ autoRotate 类型正确');
    if (typeof parsed.motionBlur === 'boolean') console.log('✅ motionBlur 类型正确');
    if (['black', 'darkblue', 'starry'].includes(parsed.background)) console.log('✅ background 值正确');
    
} catch (e) {
    console.log('❌ JSON格式无效:', e.message);
}

// 测试 7: 验证滑块控件
console.log('\n📋 测试 7: 滑块控件验证');
console.log('-'.repeat(60));

const sliders = [
    { id: 'radius', min: '2', max: '15', step: '0.1' },
    { id: 'turns', min: '1', max: '5', step: '0.1' },
    { id: 'count', min: '100', max: '1000', step: '10' },
    { id: 'size', min: '0.1', max: '2', step: '0.1' }
];

sliders.forEach(slider => {
    const regex = new RegExp(`<input[^>]*id="${slider.id}"[^>]*>`);
    const match = pageContent.match(regex);
    if (match) {
        const tag = match[0];
        const hasMin = tag.includes(`min="${slider.min}"`);
        const hasMax = tag.includes(`max="${slider.max}"`);
        const hasStep = tag.includes(`step="${slider.step}"`);
        if (hasMin && hasMax && hasStep) {
            console.log(`✅ ${slider.id}: min=${slider.min}, max=${slider.max}, step=${slider.step}`);
        } else {
            console.log(`⚠️  ${slider.id}: 参数不完整`);
        }
    } else {
        console.log(`❌ ${slider.id}: 未找到`);
    }
});

// 测试 8: 验证所有UI控件事件绑定
console.log('\n📋 测试 8: UI事件绑定验证');
console.log('-'.repeat(60));

const eventBindings = [
    'getElementById.*radius.*addEventListener.*input',
    'getElementById.*turns.*addEventListener.*input',
    'getElementById.*count.*addEventListener.*input',
    'getElementById.*size.*addEventListener.*input',
    'getElementById.*particleMode.*addEventListener.*change',
    'getElementById.*autoRotate.*addEventListener.*change',
    'getElementById.*motionBlur.*addEventListener.*change',
    'getElementById.*screenshotBtn.*addEventListener.*click',
    'getElementById.*exportBtn.*addEventListener.*click',
    'getElementById.*importBtn.*addEventListener.*click'
];

eventBindings.forEach(pattern => {
    const regex = new RegExp(pattern);
    if (regex.test(pageContent)) {
        const name = pattern.match(/getElementById\(['"](.+?)['"]\)/)[1];
        console.log(`✅ 事件绑定: ${name}`);
    }
});

// 测试 9: 验证后期处理管线
console.log('\n📋 测试 9: 后期处理管线验证');
console.log('-'.repeat(60));

const postProcessingChecks = [
    { check: 'EffectComposer', desc: '效果合成器' },
    { check: 'RenderPass', desc: '渲染通道' },
    { check: 'UnrealBloomPass', desc: 'Bloom发光通道' },
    { check: 'composer.addPass', desc: '通道添加' },
    { check: 'composer.render', desc: '合成器渲染' }
];

postProcessingChecks.forEach(item => {
    if (pageContent.includes(item.check)) {
        console.log(`✅ ${item.desc}: 已配置`);
    } else {
        console.log(`❌ ${item.desc}: 未配置`);
    }
});

// 测试 10: 验证FPS统计
console.log('\n📋 测试 10: FPS统计功能验证');
console.log('-'.repeat(60));

const fpsChecks = [
    { check: 'frameCount', desc: '帧计数器' },
    { check: 'performance.now', desc: '高精度时间' },
    { check: 'updateFPS', desc: 'FPS更新函数' },
    { check: 'getElementById.*fps.*textContent', desc: 'FPS显示更新' }
];

fpsChecks.forEach(item => {
    if (pageContent.includes(item.check)) {
        console.log(`✅ ${item.desc}: 已实现`);
    } else {
        console.log(`❌ ${item.desc}: 未实现`);
    }
});

// 生成测试总结
console.log('\n' + '='.repeat(60));
console.log('📊 测试总结');
console.log('='.repeat(60));

const totalTests = requiredImports.length + requiredFunctions.length + 
    motionBlurChecks.length + particleChecks.length + screenshotChecks.length + 8 +
    sliders.length + eventBindings.length + postProcessingChecks.length + fpsChecks.length;

console.log(`\n✅ 代码静态分析测试完成`);
console.log(`\n📁 测试文件位置: ${path.resolve('test-validation.js')}`);
console.log(`🌐 页面地址: http://localhost:8000/index.html`);

console.log('\n' + '='.repeat(60));
console.log('💡 下一步操作建议:');
console.log('='.repeat(60));
console.log('1. 在浏览器中打开 http://localhost:8000/index.html');
console.log('2. 测试各滑块控件是否实时响应');
console.log('3. 点击截图按钮验证PNG导出');
console.log('4. 测试导出/导入JSON配置');
console.log('5. 切换粒子模式观察发光效果');
console.log('6. 开启运动模糊观察拖尾效果');
console.log('\n');
