const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('\n' + '='.repeat(60));
console.log('🌐 浏览器环境综合测试');
console.log('='.repeat(60) + '\n');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../css/style.css'), 'utf8');

const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    url: 'http://localhost:8080/'
});

const { window } = dom;
const { document } = window;

global.window = window;
global.document = document;
global.navigator = window.navigator;
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

window.SpeechRecognition = null;
window.webkitSpeechRecognition = null;
window.speechSynthesis = {
    getVoices: () => [],
    speak: () => {},
    cancel: () => {},
    onvoiceschanged: null
};
window.SpeechSynthesisUtterance = function(text) {
    this.text = text;
    this.lang = 'zh-CN';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
};

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

console.log('📋 测试1: DOM结构完整性\n');

test('页面标题正确', () => {
    assertEqual(document.title, 'AI语音控制机器人', '标题不匹配');
});

test('麦克风按钮存在', () => {
    const micBtn = document.getElementById('micButton');
    assert(micBtn !== null, '麦克风按钮不存在');
    assertEqual(micBtn.tagName, 'BUTTON', '应为BUTTON元素');
});

test('机器人Canvas存在', () => {
    const canvas = document.getElementById('robotCanvas');
    assert(canvas !== null, 'Canvas不存在');
    assertEqual(canvas.width, 300, 'Canvas宽度应为300');
    assertEqual(canvas.height, 400, 'Canvas高度应为400');
});

test('状态指示器存在', () => {
    assert(document.getElementById('statusIndicator') !== null, '状态指示器不存在');
    assert(document.getElementById('statusText') !== null, '状态文本不存在');
});

test('识别文本区域存在', () => {
    assert(document.getElementById('recognizedText') !== null, '识别文本区域不存在');
});

test('快捷按钮数量正确', () => {
    const buttons = document.querySelectorAll('.action-btn');
    assertEqual(buttons.length, 8, '应有8个快捷按钮');
});

test('情绪按钮数量正确', () => {
    const buttons = document.querySelectorAll('.emotion-btn');
    assertEqual(buttons.length, 5, '应有5个情绪按钮');
});

test('自定义指令表单完整', () => {
    assert(document.getElementById('addCommandForm') !== null, '表单不存在');
    assert(document.getElementById('cmdName') !== null, '名称输入框不存在');
    assert(document.getElementById('cmdKeywords') !== null, '关键词输入框不存在');
    assert(document.getElementById('cmdAnimation') !== null, '动画选择框不存在');
    assert(document.getElementById('cmdResponse') !== null, '回应输入框不存在');
});

test('存储控制按钮存在', () => {
    assert(document.getElementById('saveConfigBtn') !== null, '保存按钮不存在');
    assert(document.getElementById('loadConfigBtn') !== null, '加载按钮不存在');
    assert(document.getElementById('resetConfigBtn') !== null, '重置按钮不存在');
});

test('机器人状态显示存在', () => {
    assert(document.getElementById('robotStatus') !== null, '机器人状态不存在');
    assert(document.getElementById('robotEmotion') !== null, '机器人情绪不存在');
});

test('历史记录区域存在', () => {
    assert(document.getElementById('historyList') !== null, '历史记录区域不存在');
});

test('自定义指令列表存在', () => {
    assert(document.getElementById('commandsList') !== null, '指令列表不存在');
});

test('切换开关存在', () => {
    assert(document.getElementById('voiceFeedbackToggle') !== null, '语音反馈开关不存在');
    assert(document.getElementById('continuousModeToggle') !== null, '连续模式开关不存在');
});

console.log('\n📋 测试2: 加载JS模块并初始化\n');

function loadScript(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    code = code
        .replace(/^class (\w+)/gm, 'window.$1 = class $1')
        .replace(/^const (\w+)/gm, 'window.$1')
        .replace(/^let (\w+)/gm, 'window.$1');
    
    window.eval(code);
    
    const classMatches = code.match(/window\.(\w+)\s*=\s*class/g) || [];
    classMatches.forEach(m => {
        const className = m.match(/window\.(\w+)/)[1];
        global[className] = window[className];
    });
    
    const constMatches = code.match(/window\.(\w+)\s*=\s*new/g) || [];
    constMatches.forEach(m => {
        const varName = m.match(/window\.(\w+)/)[1];
        global[varName] = window[varName];
    });
}

loadScript(path.join(__dirname, '../js/storage.js'));
loadScript(path.join(__dirname, '../js/robot.js'));
loadScript(path.join(__dirname, '../js/speech.js'));
loadScript(path.join(__dirname, '../js/commands.js'));
loadScript(path.join(__dirname, '../js/animations.js'));

test('StorageManager初始化', () => {
    assert(window.storageManager !== undefined, 'storageManager未定义');
    assertEqual(typeof window.storageManager.save, 'function', 'save方法不存在');
});

test('CommandManager初始化', () => {
    assert(window.commandManager !== undefined, 'commandManager未定义');
    assertEqual(window.commandManager.builtinCommands.length, 15, '应有15个内置指令');
});

test('SpeechManager初始化', () => {
    assert(window.speechManager !== undefined, 'speechManager未定义');
    assertEqual(window.speechManager.manualStop, false, 'manualStop应初始化为false');
});

console.log('\n📋 测试3: Robot类功能\n');

test('Robot实例创建', () => {
    const robot = new window.Robot('robotCanvas');
    assert(robot !== null, 'Robot实例创建失败');
    assertEqual(robot.getEmotion(), 'neutral', '初始情绪应为neutral');
});

test('Robot情绪切换', () => {
    const robot = new window.Robot('robotCanvas');
    assert(robot.setEmotion('happy') === true, '设置happy情绪失败');
    assertEqual(robot.getEmotion(), 'happy', '情绪应为happy');
    
    assert(robot.setEmotion('sad') === true, '设置sad情绪失败');
    assertEqual(robot.getEmotion(), 'sad', '情绪应为sad');
    
    assert(robot.setEmotion('surprised') === true, '设置surprised情绪失败');
    assertEqual(robot.getEmotion(), 'surprised', '情绪应为surprised');
    
    assert(robot.setEmotion('angry') === true, '设置angry情绪失败');
    assertEqual(robot.getEmotion(), 'angry', '情绪应为angry');
    
    assert(robot.setEmotion('neutral') === true, '设置neutral情绪失败');
    assertEqual(robot.getEmotion(), 'neutral', '情绪应为neutral');
});

test('Robot重置功能', () => {
    const robot = new window.Robot('robotCanvas');
    robot.setEmotion('happy');
    robot.reset();
    assertEqual(robot.getEmotion(), 'neutral', '重置后情绪应为neutral');
    assertEqual(robot.state.scale, 1, '重置后缩放应为1');
    assertEqual(robot.state.rotation, 0, '重置后旋转应为0');
});

test('Robot无效情绪设置', () => {
    const robot = new window.Robot('robotCanvas');
    assert(robot.setEmotion('invalid') === false, '无效情绪应返回false');
    assertEqual(robot.getEmotion(), 'neutral', '情绪应保持不变');
});

console.log('\n📋 测试4: AnimationController功能\n');

test('AnimationController创建', () => {
    const robot = new window.Robot('robotCanvas');
    const wrapper = document.getElementById('robotWrapper');
    const canvas = document.getElementById('robotCanvas');
    const ac = new window.AnimationController(robot, wrapper, canvas);
    
    assert(ac !== null, 'AnimationController创建失败');
    assertEqual(ac.getCurrentAnimation(), null, '初始动画应为null');
    assertEqual(ac.isPlaying(), false, '初始状态不应在播放');
    assertEqual(ac.currentScale, 1, '初始缩放应为1');
    assertEqual(ac.currentRotation, 0, '初始旋转应为0');
});

test('AnimationController动画持续时间', () => {
    const robot = new window.Robot('robotCanvas');
    const wrapper = document.getElementById('robotWrapper');
    const canvas = document.getElementById('robotCanvas');
    const ac = new window.AnimationController(robot, wrapper, canvas);
    
    assertEqual(ac.getDuration('dance'), 3000, 'dance动画应为3000ms');
    assertEqual(ac.getDuration('turnLeft'), 1000, 'turnLeft动画应为1000ms');
    assertEqual(ac.getDuration('grow'), 800, 'grow动画应为800ms');
    assertEqual(ac.getDuration('unknown'), 1000, '未知动画默认应为1000ms');
});

console.log('\n📋 测试5: 指令解析核心功能\n');

test('单指令解析 - 向左转', () => {
    const result = window.commandManager.parseInput('向左转');
    assertEqual(result.length, 1, '应解析1条指令');
    assertEqual(result[0].command.animation, 'turnLeft', '动画应为turnLeft');
    assertEqual(result[0].command.emotion, 'happy', '情绪应为happy');
});

test('单指令解析 - 跳舞', () => {
    const result = window.commandManager.parseInput('跳舞');
    assertEqual(result.length, 1, '应解析1条指令');
    assertEqual(result[0].command.animation, 'dance', '动画应为dance');
    assertEqual(result[0].parameters.direction, undefined, '不应有方向参数');
});

test('单指令解析 - 变大', () => {
    const result = window.commandManager.parseInput('变大');
    assertEqual(result.length, 1, '应解析1条指令');
    assertEqual(result[0].command.animation, 'grow', '动画应为grow');
});

test('多指令拆分 - 向左转然后跳舞', () => {
    const result = window.commandManager.parseInput('向左转然后跳舞');
    assertEqual(result.length, 2, '应解析2条指令');
    assertEqual(result[0].command.animation, 'turnLeft', '第一条应为turnLeft');
    assertEqual(result[1].command.animation, 'dance', '第二条应为dance');
});

test('多指令拆分 - 三条指令', () => {
    const result = window.commandManager.parseInput('向左转然后跳舞再挥手');
    assertEqual(result.length, 3, '应解析3条指令');
    assertEqual(result[0].command.animation, 'turnLeft');
    assertEqual(result[1].command.animation, 'dance');
    assertEqual(result[2].command.animation, 'wave');
});

test('时间参数解析 - 旋转5秒', () => {
    const result = window.commandManager.parseInput('旋转5秒');
    assertEqual(result.length, 1, '应解析1条指令');
    assertEqual(result[0].command.animation, 'rotate', '动画应为rotate');
    assertEqual(result[0].parameters.duration, 5000, '5秒应为5000ms');
});

test('时间参数解析 - 旋转3分钟', () => {
    const result = window.commandManager.parseInput('旋转3分钟');
    assertEqual(result[0].parameters.duration, 180000, '3分钟应为180000ms');
});

test('恢复平静指令修复验证', () => {
    const result = window.commandManager.parseInput('恢复平静');
    assertEqual(result.length, 1, '应解析1条指令');
    assertEqual(result[0].command.animation, 'emotion', '动画应为emotion');
    assertEqual(result[0].command.targetEmotion, 'neutral', '目标情绪应为neutral');
    assert(result[0].matchScore > 60, '匹配分数应足够高');
});

test('重置指令独立验证', () => {
    const result = window.commandManager.parseInput('重置');
    assertEqual(result.length, 1, '应解析1条指令');
    assertEqual(result[0].command.animation, 'reset', '动画应为reset');
});

test('模糊匹配验证', () => {
    const result1 = window.commandManager.parseInput('转一下左边');
    assert(result1.length > 0, '应能模糊匹配左转');
    assertEqual(result1[0].command.animation, 'turnLeft');
    
    const result2 = window.commandManager.parseInput('跳起来');
    assert(result2.length > 0, '应能模糊匹配跳跃');
    assertEqual(result2[0].command.animation, 'jump');
});

test('情绪指令解析', () => {
    const emotions = ['开心', '难过', '惊讶', '生气', '平静'];
    const targets = ['happy', 'sad', 'surprised', 'angry', 'neutral'];
    
    emotions.forEach((emotion, i) => {
        const result = window.commandManager.parseInput(emotion);
        assertEqual(result.length, 1, `${emotion}应解析1条指令`);
        assertEqual(result[0].command.targetEmotion, targets[i], `${emotion}目标情绪应为${targets[i]}`);
    });
});

console.log('\n📋 测试6: 自定义指令功能\n');

test('添加自定义指令', () => {
    const initialCount = window.commandManager.customCommands.length;
    const cmd = window.commandManager.addCustomCommand({
        name: '测试动作',
        keywords: ['测试1', '测试2'],
        animation: 'wave',
        response: '好的测试'
    });
    
    assertEqual(window.commandManager.customCommands.length, initialCount + 1, '添加后数量应增加');
    assert(cmd.custom === true, '应标记为自定义');
    assert(cmd.id !== undefined, '应生成ID');
});

test('自定义指令触发', () => {
    const result = window.commandManager.parseInput('测试1');
    assert(result.length > 0, '自定义指令应能触发');
    assertEqual(result[0].command.name, '测试动作', '指令名称应匹配');
});

test('删除自定义指令', () => {
    const cmd = window.commandManager.customCommands[0];
    const initialCount = window.commandManager.customCommands.length;
    const result = window.commandManager.removeCustomCommand(cmd.id);
    
    assertEqual(result, true, '删除应返回true');
    assertEqual(window.commandManager.customCommands.length, initialCount - 1, '删除后数量应减少');
});

test('获取所有指令（内置+自定义）', () => {
    const beforeCount = window.commandManager.getAllCommands().length;
    window.commandManager.addCustomCommand({
        name: '临时指令',
        keywords: ['临时'],
        animation: 'jump'
    });
    const afterCount = window.commandManager.getAllCommands().length;
    
    assert(afterCount > beforeCount, '应包含自定义指令');
    
    const cmd = window.commandManager.customCommands[0];
    window.commandManager.removeCustomCommand(cmd.id);
});

console.log('\n📋 测试7: localStorage功能\n');

test('保存配置到localStorage', () => {
    const testConfig = {
        customCommands: [{ id: 'test', name: '测试' }],
        voiceEnabled: false,
        continuousMode: false
    };
    
    const result = window.storageManager.save(testConfig);
    assertEqual(result, true, '保存应成功');
    
    const stored = window.localStorage.getItem('ai_robot_config');
    assert(stored !== null, 'localStorage中应有数据');
});

test('从localStorage加载配置', () => {
    const loaded = window.storageManager.load();
    assertEqual(loaded.voiceEnabled, false, 'voiceEnabled应匹配');
    assertEqual(loaded.continuousMode, false, 'continuousMode应匹配');
    assert(loaded.customCommands.length > 0, '应包含自定义指令');
});

test('重置localStorage', () => {
    const result = window.storageManager.reset();
    assertEqual(result, true, '重置应成功');
    
    const loaded = window.storageManager.load();
    assertEqual(loaded.customCommands.length, 0, '重置后自定义指令应为空');
    assertEqual(loaded.voiceEnabled, true, '重置后voiceEnabled应为默认值');
});

test('默认配置正确', () => {
    window.storageManager.reset();
    const config = window.storageManager.load();
    
    assertEqual(config.voiceEnabled, true, '默认voiceEnabled应为true');
    assertEqual(config.continuousMode, true, '默认continuousMode应为true');
    assertEqual(config.language, 'zh-CN', '默认语言应为zh-CN');
    assertEqual(config.autoSave, true, '默认autoSave应为true');
    assert(Array.isArray(config.customCommands), 'customCommands应为数组');
});

console.log('\n📋 测试8: 事件绑定和UI交互\n');

test('快捷按钮点击触发指令', (done) => {
    loadScript(path.join(__dirname, '../js/app.js'));
    
    setTimeout(() => {
        const btn = document.querySelector('.action-btn[data-command="跳舞"]');
        assert(btn !== null, '跳舞按钮不存在');
        
        let triggered = false;
        const originalProcess = window.commandManager.processText;
        window.commandManager.processText = function(text) {
            if (text === '跳舞') triggered = true;
            return originalProcess.call(this, text);
        };
        
        btn.click();
        assert(triggered === true, '点击按钮应触发processText');
        
        window.commandManager.processText = originalProcess;
        done();
    }, 100);
});

test('情绪按钮点击切换情绪', (done) => {
    setTimeout(() => {
        const btn = document.querySelector('.emotion-btn[data-emotion="happy"]');
        assert(btn !== null, 'happy情绪按钮不存在');
        
        let emotionSet = false;
        const originalSetEmotion = window.app.robot.setEmotion;
        window.app.robot.setEmotion = function(emotion) {
            if (emotion === 'happy') emotionSet = true;
            return originalSetEmotion.call(this, emotion);
        };
        
        btn.click();
        assert(emotionSet === true, '点击情绪按钮应设置情绪');
        assert(btn.classList.contains('active'), '点击后按钮应有active类');
        
        window.app.robot.setEmotion = originalSetEmotion;
        done();
    }, 100);
});

console.log('\n📋 测试9: 队列处理状态\n');

test('队列初始状态', () => {
    assertEqual(window.commandManager.getIsProcessing(), false, '初始不应在处理');
    assertEqual(window.commandManager.commandQueue.length, 0, '初始队列应为空');
});

test('队列清空功能', () => {
    window.commandManager.commandQueue = [1, 2, 3];
    window.commandManager.isProcessing = true;
    window.commandManager.clearQueue();
    
    assertEqual(window.commandManager.commandQueue.length, 0, '队列应清空');
    assertEqual(window.commandManager.getIsProcessing(), false, '处理状态应重置');
});

console.log('\n📋 测试10: CSS动画完整性\n');

test('必需的CSS动画定义', () => {
    const requiredAnimations = [
        'turnLeft', 'turnRight', 'grow', 'shrink', 
        'rotate360', 'jump', 'dance', 'wave',
        'fadeInDown', 'fadeInUp', 'bounce', 'pulse'
    ];
    
    requiredAnimations.forEach(anim => {
        assert(css.includes(`@keyframes ${anim}`), `缺少CSS动画: ${anim}`);
    });
});

test('Canvas元素样式', () => {
    assert(css.includes('#robotCanvas'), '缺少robotCanvas样式');
    assert(css.includes('.robot-wrapper'), '缺少robot-wrapper样式');
});

console.log('\n' + '='.repeat(60));
console.log('📊 浏览器环境测试结果汇总');
console.log('='.repeat(60));
console.log(`  ✅ 通过: ${passed}`);
console.log(`  ❌ 失败: ${failed}`);
const total = passed + failed;
console.log(`  📊 通过率: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);

if (errors.length > 0) {
    console.log('\n❌ 错误详情:');
    errors.forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.test}`);
        console.log(`     ${e.error}`);
    });
    process.exit(1);
} else {
    console.log('\n🎉 所有浏览器环境测试通过！');
    process.exit(0);
}
