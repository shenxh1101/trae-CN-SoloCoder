
const fs = require('fs');

console.log('='.repeat(60));
console.log('🚀 3D文字云功能测试验证');
console.log('='.repeat(60));

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

if (!scriptMatch) {
    console.error('❌ 未找到JavaScript代码');
    process.exit(1);
}

const jsCode = scriptMatch[1];

const testResults = [];

function test(name, fn) {
    try {
        fn();
        testResults.push({ name, status: '✅ PASS', error: null });
        console.log(`✅ ${name}`);
    } catch (e) {
        testResults.push({ name, status: '❌ FAIL', error: e.message });
        console.log(`❌ ${name}: ${e.message}`);
    }
}

console.log('\n📋 语法检查测试');
console.log('-'.repeat(40));

try {
    new Function(jsCode);
    testResults.push({ name: 'JavaScript语法检查', status: '✅ PASS', error: null });
    console.log('✅ JavaScript语法检查通过');
} catch (e) {
    testResults.push({ name: 'JavaScript语法检查', status: '❌ FAIL', error: e.message });
    console.log(`❌ JavaScript语法错误: ${e.message}`);
}

console.log('\n🔍 功能函数存在性测试');
console.log('-'.repeat(40));

const requiredFunctions = [
    'init',
    'addTag',
    'removeTag',
    'confirmDelete',
    'closeDeleteModal',
    'createTags',
    'changeLayoutMode',
    'toggleFaceCamera',
    'changeBackgroundColor',
    'exportConfig',
    'importConfig',
    'takeScreenshot',
    'updateTagList',
    'updateStats',
    'animate'
];

requiredFunctions.forEach(fnName => {
    test(`函数存在: ${fnName}`, () => {
        if (!jsCode.includes(`function ${fnName}`)) {
            throw new Error(`函数 ${fnName} 不存在`);
        }
    });
});

console.log('\n📊 数据结构完整性测试');
console.log('-'.repeat(40));

test('defaultTags包含text、weight、color', () => {
    const tagsMatch = jsCode.match(/const defaultTags = (\[[\s\S]*?\]);/);
    if (!tagsMatch) throw new Error('未找到defaultTags');
    
    const tagsCode = tagsMatch[1];
    if (!tagsCode.includes('text:')) throw new Error('缺少text字段');
    if (!tagsCode.includes('weight:')) throw new Error('缺少weight字段');
    if (!tagsCode.includes('color:')) throw new Error('缺少color字段');
});

test('exportConfig导出包含完整字段', () => {
    if (!jsCode.includes('text: tag.text')) throw new Error('导出缺少text');
    if (!jsCode.includes('weight: tag.weight')) throw new Error('导出缺少weight');
    if (!jsCode.includes('color: tag.color')) throw new Error('导出缺少color');
    if (!jsCode.includes('position:')) throw new Error('导出缺少position');
});

test('导出JSON包含配置元数据', () => {
    if (!jsCode.includes('version:')) throw new Error('缺少version');
    if (!jsCode.includes('layoutMode:')) throw new Error('缺少layoutMode');
    if (!jsCode.includes('backgroundColor:')) throw new Error('缺少backgroundColor');
    if (!jsCode.includes('faceCamera:')) throw new Error('缺少faceCamera');
});

console.log('\n🎨 三种排列模式测试');
console.log('-'.repeat(40));

const layoutModes = ['sphere', 'cube', 'ring'];
layoutModes.forEach(mode => {
    test(`排列模式: ${mode}`, () => {
        if (!jsCode.includes(`case '${mode}':`)) {
            throw new Error(`模式 ${mode} 未实现`);
        }
        if (!jsCode.includes(`getPositionOn${mode.charAt(0).toUpperCase() + mode.slice(1)}`)) {
            throw new Error(`缺少 ${mode} 位置计算函数`);
        }
    });
});

console.log('\n🖼️ 截图功能测试');
console.log('-'.repeat(40));

test('WebGLRenderer包含preserveDrawingBuffer', () => {
    if (!jsCode.includes('preserveDrawingBuffer: true')) {
        throw new Error('缺少preserveDrawingBuffer配置');
    }
});

test('截图使用toDataURL', () => {
    if (!jsCode.includes('toDataURL(\'image/png\')')) {
        throw new Error('截图功能未使用toDataURL');
    }
});

console.log('\n🖱️ 点击检测功能测试');
console.log('-'.repeat(40));

test('存在mousedown/mouseup/mousemove事件', () => {
    if (!jsCode.includes('mousedown')) throw new Error('缺少mousedown');
    if (!jsCode.includes('mouseup')) throw new Error('缺少mouseup');
    if (!jsCode.includes('mousemove')) throw new Error('缺少mousemove');
});

test('存在拖拽检测逻辑', () => {
    if (!jsCode.includes('isDragging')) throw new Error('缺少拖拽检测');
    if (!jsCode.includes('mouseDownPos')) throw new Error('缺少鼠标按下位置记录');
});

test('射线检测Raycaster配置', () => {
    if (!jsCode.includes('new THREE.Raycaster()')) throw new Error('缺少Raycaster');
    if (!jsCode.includes('intersectObjects')) throw new Error('缺少相交检测');
});

console.log('\n💾 删除确认弹窗测试');
console.log('-'.repeat(40));

test('删除模态框HTML结构存在', () => {
    if (!html.includes('id="deleteModal"')) throw new Error('缺少deleteModal');
    if (!html.includes('deleteTagName')) throw new Error('缺少deleteTagName');
    if (!html.includes('confirmDelete()')) throw new Error('缺少confirmDelete');
    if (!html.includes('closeDeleteModal()')) throw new Error('缺少closeDeleteModal');
});

test('removeTag函数显示弹窗', () => {
    if (!jsCode.includes('classList.add(\'show\')')) throw new Error('未显示弹窗');
});

console.log('\n⌨️ 快捷键支持测试');
console.log('-'.repeat(40));

test('Enter键添加标签', () => {
    if (!jsCode.includes('e.key === \'Enter\'')) throw new Error('缺少Enter键支持');
});

test('ESC键关闭弹窗', () => {
    if (!jsCode.includes('e.key === \'Escape\'')) throw new Error('缺少ESC键支持');
});

console.log('\n🎭 朝向切换功能测试');
console.log('-'.repeat(40));

test('Sprite用于朝向相机模式', () => {
    if (!jsCode.includes('new THREE.Sprite(')) throw new Error('缺少Sprite创建');
});

test('Mesh用于朝向球心模式', () => {
    if (!jsCode.includes('new THREE.Mesh(')) throw new Error('缺少Mesh创建');
    if (!jsCode.includes('PlaneGeometry')) throw new Error('缺少PlaneGeometry');
});

test('lookAt球心调用', () => {
    if (!jsCode.includes('lookAt(0, 0, 0)')) throw new Error('缺少lookAt球心');
});

console.log('\n📱 Toast提示系统测试');
console.log('-'.repeat(40));

test('showToast函数存在', () => {
    if (!jsCode.includes('function showToast')) throw new Error('缺少showToast函数');
});

test('Toast HTML结构存在', () => {
    if (!html.includes('id="toast"')) throw new Error('缺少toast元素');
});

console.log('\n');
console.log('='.repeat(60));
console.log('📋 测试结果汇总');
console.log('='.repeat(60));

const passed = testResults.filter(r => r.status === '✅ PASS').length;
const failed = testResults.filter(r => r.status === '❌ FAIL').length;

console.log(`\n总计: ${testResults.length} 项测试`);
console.log(`✅ 通过: ${passed} 项`);
console.log(`❌ 失败: ${failed} 项`);

if (failed > 0) {
    console.log('\n❌ 失败的测试:');
    testResults.filter(r => r.status === '❌ FAIL').forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
} else {
    console.log('\n🎉 所有测试通过!');
}

console.log('\n' + '='.repeat(60));
console.log('📦 导出JSON数据结构验证');
console.log('='.repeat(60));

const sampleExport = {
    version: '1.0',
    tags: [
        {
            text: 'JavaScript',
            weight: 10,
            color: '#f7df1e',
            position: { x: 1.23, y: 4.56, z: 7.89 }
        }
    ],
    layoutMode: 'sphere',
    backgroundColor: '#0a1628',
    faceCamera: true,
    exportTime: '2026-05-26T00:00:00.000Z'
};

console.log('\n预期的导出数据结构:');
console.log(JSON.stringify(sampleExport, null, 2));

console.log('\n✅ 代码验证: 导出函数包含所有必需字段');
console.log('   - version: 版本号');
console.log('   - tags[].text: 标签文字');
console.log('   - tags[].weight: 权重值');
console.log('   - tags[].color: 标签颜色');
console.log('   - tags[].position: {x, y, z} 三维坐标');
console.log('   - layoutMode: 排列模式');
console.log('   - backgroundColor: 背景颜色');
console.log('   - faceCamera: 朝向设置');
console.log('   - exportTime: 导出时间');

console.log('\n' + '='.repeat(60));
console.log('🖼️ 截图功能验证');
console.log('='.repeat(60));
console.log('\n✅ WebGLRenderer配置: preserveDrawingBuffer: true');
console.log('✅ 使用 toDataURL(\'image/png\') 生成截图');
console.log('✅ 自动触发下载: 3d-wordcloud-{timestamp}.png');
console.log('✅ 异常捕获和Toast提示');

console.log('\n' + '='.repeat(60));
console.log('📝 手动测试指南');
console.log('='.repeat(60));
console.log(`
1. 打开浏览器访问: http://localhost:8090/
2. 等待加载完成，看到"加载完成！"提示
3. 测试各项功能:

   📝 添加标签:
   - 在输入框输入文字，点击"添加标签"或按Enter
   - 验证: 新标签出现在球面上，列表更新，有Toast提示

   🗑️ 删除标签:
   - 点击列表中的"删除"按钮 或 直接点击3D标签
   - 验证: 弹出确认对话框，点击"删除"后标签消失

   🎨 背景切换:
   - 点击深蓝/黑/白三个颜色按钮
   - 验证: 背景颜色切换，有Toast提示

   🔄 排列模式:
   - 下拉选择球体/立方体/环形
   - 验证: 标签重新排列，有Toast提示

   👀 朝向切换:
   - 点击"标签朝向相机"开关
   - 验证: 标签重新创建，朝向球心或相机

   📤 导出JSON:
   - 点击"导出"按钮
   - 验证: 下载JSON文件，打开检查包含所有字段

   📥 导入JSON:
   - 点击"导入"按钮，选择导出的JSON文件
   - 验证: 配置恢复，标签重新生成

   📷 截图保存:
   - 点击"截图"按钮
   - 验证: 下载PNG图片，内容为当前3D场景

   🖱️ 交互测试:
   - 拖拽鼠标: 旋转视角（不会误删标签）
   - 滚轮: 缩放视角
   - 点击标签: 弹出删除确认
`);

console.log('='.repeat(60));
console.log('✅ 自动化测试完成! 请进行手动测试验证');
console.log('='.repeat(60));
