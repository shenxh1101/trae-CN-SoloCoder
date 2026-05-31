const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('🤖 AI语音控制机器人 - 功能测试套件');
console.log('='.repeat(60) + '\n');

const mockLocalStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = String(value); },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
};

const mockWindow = {
    SpeechRecognition: null,
    webkitSpeechRecognition: null,
    speechSynthesis: {
        getVoices: () => [],
        speak: () => {},
        cancel: () => {},
        onvoiceschanged: null
    },
    SpeechSynthesisUtterance: function(text) {
        this.text = text;
        this.lang = 'zh-CN';
        this.rate = 1;
        this.pitch = 1;
        this.volume = 1;
    }
};

const mockDocument = {
    getElementById: () => ({
        getContext: () => ({
            clearRect: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            scale: () => {},
            rotate: () => {},
            beginPath: () => {},
            roundRect: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            moveTo: () => {},
            lineTo: () => {},
            ellipse: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            lineCap: ''
        }),
        width: 300,
        height: 400,
        style: {}
    }),
    querySelectorAll: () => [],
    addEventListener: () => {}
};

const context = {
    localStorage: mockLocalStorage,
    window: mockWindow,
    document: mockDocument,
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    setTimeout,
    clearTimeout,
    console,
    process
};

Object.assign(global, context);

let passed = 0;
let failed = 0;
let errors = [];

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ❌ ${name}`);
        console.log(`     错误: ${e.message}`);
        errors.push({ test: name, error: e.message });
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || '断言失败');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `期望 ${expected}, 实际 ${actual}`);
    }
}

console.log('📦 解析模块代码...\n');

function loadModule(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    
    const modifiedCode = code
        .replace(/const storageManager = new StorageManager\(\)/, 'global.storageManager = new StorageManager()')
        .replace(/const speechManager = new SpeechManager\(\)/, 'global.speechManager = new SpeechManager()')
        .replace(/const commandManager = new CommandManager\(\)/, 'global.commandManager = new CommandManager()');
    
    eval(modifiedCode);
}

loadModule(path.join(__dirname, '../js/storage.js'));
loadModule(path.join(__dirname, '../js/commands.js'));

console.log('--- 测试 1: StorageManager (localStorage) ---');
test('初始化存储管理器', () => {
    assert(global.storageManager !== undefined, 'storageManager 未定义');
    assertEqual(typeof global.storageManager.save, 'function', 'save 方法不存在');
    assertEqual(typeof global.storageManager.load, 'function', 'load 方法不存在');
});

test('保存和加载配置', () => {
    const testConfig = {
        customCommands: [{ id: 'test', name: '测试' }],
        voiceEnabled: false,
        language: 'zh-CN',
        continuousMode: true
    };
    const result = global.storageManager.save(testConfig);
    assertEqual(result, true, '保存失败');
    
    const loaded = global.storageManager.load();
    assertEqual(loaded.voiceEnabled, false, 'voiceEnabled 不匹配');
    assertEqual(loaded.customCommands[0].name, '测试', '自定义指令不匹配');
});

test('重置配置', () => {
    global.storageManager.save({ customCommands: [{ id: 'temp' }] });
    const result = global.storageManager.reset();
    assertEqual(result, true, '重置失败');
    
    const loaded = global.storageManager.load();
    assertEqual(loaded.customCommands.length, 0, '配置未重置');
});

console.log('\n--- 测试 2: CommandManager 指令解析 ---');

test('初始化指令管理器', () => {
    assert(global.commandManager !== undefined, 'commandManager 未定义');
    assert(global.commandManager.builtinCommands.length > 0, '没有内置指令');
});

test('内置指令数量正确', () => {
    assertEqual(global.commandManager.builtinCommands.length, 15, '内置指令数量应为15个');
});

test('单指令解析 - 向左转', () => {
    const result = global.commandManager.parseInput('向左转');
    assertEqual(result.length, 1, '应解析出1条指令');
    assertEqual(result[0].command.animation, 'turnLeft', '动画不匹配');
});

test('单指令解析 - 跳舞', () => {
    const result = global.commandManager.parseInput('跳舞');
    assertEqual(result.length, 1, '应解析出1条指令');
    assertEqual(result[0].command.animation, 'dance', '动画不匹配');
    assertEqual(result[0].command.emotion, 'happy', '情绪不匹配');
});

test('单指令解析 - 变大', () => {
    const result = global.commandManager.parseInput('变大');
    assertEqual(result.length, 1, '应解析出1条指令');
    assertEqual(result[0].command.animation, 'grow', '动画不匹配');
});

test('模糊匹配 - 转一下左边', () => {
    const result = global.commandManager.parseInput('转一下左边');
    assert(result.length > 0, '应能模糊匹配');
    assertEqual(result[0].command.animation, 'turnLeft', '模糊匹配失败');
});

test('模糊匹配 - 跳一下', () => {
    const result = global.commandManager.parseInput('跳一下');
    assert(result.length > 0, '应能模糊匹配');
    assertEqual(result[0].command.animation, 'jump', '模糊匹配失败');
});

console.log('\n--- 测试 3: 多指令解析 ---');

test('连续指令 - 然后分隔', () => {
    const result = global.commandManager.parseInput('向左转然后跳舞');
    assertEqual(result.length, 2, '应解析出2条指令');
    assertEqual(result[0].command.animation, 'turnLeft', '第一条指令错误');
    assertEqual(result[1].command.animation, 'dance', '第二条指令错误');
});

test('连续指令 - 再分隔', () => {
    const result = global.commandManager.parseInput('旋转再挥手');
    assertEqual(result.length, 2, '应解析出2条指令');
    assertEqual(result[0].command.animation, 'rotate', '第一条指令错误');
    assertEqual(result[1].command.animation, 'wave', '第二条指令错误');
});

test('连续指令 - 三条指令', () => {
    const result = global.commandManager.parseInput('向左转然后跳舞再挥手');
    assertEqual(result.length, 3, '应解析出3条指令');
    assertEqual(result[0].command.animation, 'turnLeft');
    assertEqual(result[1].command.animation, 'dance');
    assertEqual(result[2].command.animation, 'wave');
});

test('连续指令 - 接着分隔', () => {
    const result = global.commandManager.parseInput('变大接着变小');
    assertEqual(result.length, 2, '应解析出2条指令');
    assertEqual(result[0].command.animation, 'grow');
    assertEqual(result[1].command.animation, 'shrink');
});

console.log('\n--- 测试 4: 参数提取 ---');

test('时间参数 - 旋转5秒', () => {
    const result = global.commandManager.parseInput('旋转5秒');
    assertEqual(result.length, 1, '应解析出1条指令');
    assertEqual(result[0].parameters.duration, 5000, '5秒应转换为5000ms');
});

test('时间参数 - 旋转3分钟', () => {
    const result = global.commandManager.parseInput('旋转3分钟');
    assertEqual(result[0].parameters.duration, 180000, '3分钟应转换为180000ms');
});

test('时间参数 - 500ms', () => {
    const result = global.commandManager.parseInput('眨眼500ms');
    assertEqual(result[0].parameters.duration, 500, '500ms应保持500');
});

test('次数参数 - 跳跃3次', () => {
    const result = global.commandManager.parseInput('跳跃3次');
    assertEqual(result[0].parameters.count, 3, '次数应为3');
});

test('方向参数 - 向左', () => {
    const result = global.commandManager.parseInput('向左转');
    assertEqual(result[0].parameters.direction, '左', '方向应为左');
});

test('速度参数 - 快速旋转', () => {
    const result = global.commandManager.parseInput('快速旋转');
    assertEqual(result[0].parameters.speed, 'fast', '速度应为fast');
});

test('组合参数 - 旋转5秒3次', () => {
    const result = global.commandManager.parseInput('旋转5秒3次');
    assertEqual(result[0].parameters.duration, 5000, '时间参数错误');
    assertEqual(result[0].parameters.count, 3, '次数参数错误');
});

console.log('\n--- 测试 5: 情绪指令解析 ---');

test('情绪指令 - 开心', () => {
    const result = global.commandManager.parseInput('开心');
    assertEqual(result[0].command.animation, 'emotion', '应为情绪动画');
    assertEqual(result[0].command.targetEmotion, 'happy', '目标情绪错误');
});

test('情绪指令 - 生气', () => {
    const result = global.commandManager.parseInput('生气');
    assertEqual(result[0].command.targetEmotion, 'angry', '目标情绪错误');
});

test('情绪指令 - 恢复平静', () => {
    const result = global.commandManager.parseInput('恢复平静');
    assertEqual(result[0].command.targetEmotion, 'neutral', '目标情绪错误');
});

test('重置指令', () => {
    const result = global.commandManager.parseInput('重置');
    assertEqual(result[0].command.animation, 'reset', '应为重置动画');
});

console.log('\n--- 测试 6: 自定义指令 ---');

test('添加自定义指令', () => {
    const initialCount = global.commandManager.customCommands.length;
    const cmd = global.commandManager.addCustomCommand({
        name: '测试指令',
        keywords: ['测试1', '测试2'],
        animation: 'wave',
        response: '好的测试'
    });
    assertEqual(global.commandManager.customCommands.length, initialCount + 1, '添加失败');
    assert(cmd.id !== undefined, '应生成ID');
    assertEqual(cmd.custom, true, '应标记为自定义');
});

test('自定义指令触发', () => {
    const result = global.commandManager.parseInput('测试1');
    assert(result.length > 0, '自定义指令应能触发');
    assertEqual(result[0].command.name, '测试指令', '指令名称不匹配');
});

test('删除自定义指令', () => {
    const cmd = global.commandManager.customCommands[0];
    const initialCount = global.commandManager.customCommands.length;
    const result = global.commandManager.removeCustomCommand(cmd.id);
    assertEqual(result, true, '删除失败');
    assertEqual(global.commandManager.customCommands.length, initialCount - 1, '数量未减少');
});

test('获取所有指令（内置+自定义）', () => {
    global.commandManager.addCustomCommand({
        name: '临时指令',
        keywords: ['临时'],
        animation: 'jump'
    });
    const all = global.commandManager.getAllCommands();
    assert(all.length > global.commandManager.builtinCommands.length, '应包含自定义指令');
    global.commandManager.removeCustomCommand(global.commandManager.customCommands[0].id);
});

console.log('\n--- 测试 7: 指令队列处理 ---');

test('队列处理状态跟踪', async () => {
    let executed = [];
    global.commandManager.onCommandParsed(async (parsed) => {
        executed.push(parsed.command.animation);
        await new Promise(r => setTimeout(r, 10));
    });
    
    const result = await global.commandManager.processText('向左转然后跳舞');
    assertEqual(result.success, true, '处理失败');
    assertEqual(result.commands.length, 2, '应返回2条指令');
    
    await new Promise(r => setTimeout(r, 100));
    assertEqual(global.commandManager.getIsProcessing(), false, '处理完成后应为false');
    assertEqual(executed.length, 2, '应执行2条指令');
});

test('清空队列', () => {
    global.commandManager.commandQueue = [1, 2, 3];
    global.commandManager.isProcessing = true;
    global.commandManager.clearQueue();
    assertEqual(global.commandManager.commandQueue.length, 0, '队列未清空');
    assertEqual(global.commandManager.getIsProcessing(), false, '状态未重置');
});

console.log('\n--- 测试 8: 动画名称列表 ---');

test('获取所有动画名称', () => {
    const animations = global.commandManager.getAllAnimationNames();
    assert(Array.isArray(animations), '应返回数组');
    assert(animations.length >= 11, '至少应有11种动画');
    
    const hasWave = animations.some(a => a.value === 'wave');
    const hasDance = animations.some(a => a.value === 'dance');
    assert(hasWave && hasDance, '应包含wave和dance动画');
});

console.log('\n--- 测试 9: 未知指令处理 ---');

test('无法识别的指令', () => {
    const result = global.commandManager.parseInput('这是一个无法识别的指令测试');
    assertEqual(result.length, 0, '未知指令应返回空数组');
});

test('空字符串', () => {
    const result = global.commandManager.parseInput('');
    assertEqual(result.length, 0, '空字符串应返回空数组');
});

test('单字指令', () => {
    const result = global.commandManager.parseInput('转');
    assert(result.length === 0 || result[0].matchScore < 100, '单字匹配分数应较低');
});

console.log('\n--- 测试 10: 语法和文件结构检查 ---');

test('所有JS文件语法正确', () => {
    const files = ['storage.js', 'robot.js', 'speech.js', 'commands.js', 'animations.js', 'app.js'];
    files.forEach(file => {
        const code = fs.readFileSync(path.join(__dirname, '../js', file), 'utf8');
        try {
            new Function(code);
        } catch (e) {
            throw new Error(`${file} 语法错误: ${e.message}`);
        }
    });
});

test('CSS文件存在且有效', () => {
    const css = fs.readFileSync(path.join(__dirname, '../css/style.css'), 'utf8');
    assert(css.length > 1000, 'CSS文件内容过短');
    assert(css.includes('@keyframes'), 'CSS应包含动画定义');
    assert(css.includes('.robot-wrapper'), 'CSS应包含机器人样式');
});

test('HTML文件存在且结构完整', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    assert(html.includes('<title>AI语音控制机器人</title>'), 'HTML应包含标题');
    assert(html.includes('robotCanvas'), 'HTML应包含canvas元素');
    assert(html.includes('micButton'), 'HTML应包含麦克风按钮');
    const scriptCount = (html.match(/<script[^>]*src="[^"]*\.js"/g) || []).length;
    assert(scriptCount >= 6, 'HTML应引入至少6个JS文件');
});

test('CSS动画定义完整', () => {
    const css = fs.readFileSync(path.join(__dirname, '../css/style.css'), 'utf8');
    const requiredAnimations = ['turnLeft', 'turnRight', 'grow', 'shrink', 'rotate360', 'jump', 'dance', 'wave'];
    requiredAnimations.forEach(anim => {
        assert(css.includes(`@keyframes ${anim}`), `CSS缺少动画: ${anim}`);
    });
});

console.log('\n' + '='.repeat(60));
console.log('📊 测试结果汇总');
console.log('='.repeat(60));
console.log(`  ✅ 通过: ${passed}`);
console.log(`  ❌ 失败: ${failed}`);
console.log(`  📊 通过率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (errors.length > 0) {
    console.log('\n❌ 错误详情:');
    errors.forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.test}`);
        console.log(`     ${e.error}`);
    });
    process.exit(1);
} else {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
}
