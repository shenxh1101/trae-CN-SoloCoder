const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

console.log('🧪 开始运行俄罗斯方块游戏功能测试\n');

const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
let gameJsContent = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
let testsJsContent = fs.readFileSync(path.join(__dirname, 'tests.js'), 'utf8');

gameJsContent = gameJsContent.replace(/^const /gm, 'var ');
gameJsContent = gameJsContent.replace(/^class (\w+)/gm, 'var $1 = class $1');
gameJsContent = gameJsContent.replace(/^window\.addEventListener[\s\S]*$/m, '');

testsJsContent = testsJsContent.replace(/^class (\w+)/gm, 'var $1 = class $1');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost:8000'
});

const { window } = dom;
const { document } = window;

window.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16);
};

window.cancelAnimationFrame = (id) => {
    clearTimeout(id);
};

window.TouchEvent = class TouchEvent extends window.Event {
    constructor(type, options = {}) {
        super(type, options);
        this.touches = options.touches || [];
    }
};

window.AudioContext = class AudioContext {
    constructor() { this.state = 'running'; }
    createOscillator() {
        return {
            connect: () => {},
            frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
            start: () => {}, stop: () => {}, type: 'sine'
        };
    }
    createGain() {
        return {
            connect: () => {},
            gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }
        };
    }
    resume() {}
};
window.webkitAudioContext = window.AudioContext;

let mockCanvasInstance = null;

function createMockCanvasContext(canvas) {
    return {
        canvas: canvas,
        fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '',
        globalAlpha: 1, shadowColor: '', shadowBlur: 0,
        fillRect: () => {}, clearRect: () => {}, strokeRect: () => {},
        beginPath: () => {}, arc: () => {}, fill: () => {}, stroke: () => {},
        moveTo: () => {}, lineTo: () => {}, closePath: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        fillText: () => {}
    };
}

window.HTMLCanvasElement.prototype.getContext = function() {
    return createMockCanvasContext(this);
};

window.localStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; }
};

const testHtml = `
<div class="game-container">
    <div class="start-menu" id="startMenu">
        <button class="start-btn" id="startBtn"></button>
        <input type="range" id="winLinesSlider" value="20">
        <span id="winLinesDisplay">20</span>
        <div id="recordP1">0</div>
        <div id="recordP2">0</div>
        <div id="recordAI">0</div>
        <button class="mode-btn active" data-mode="single"></button>
        <button class="mode-btn" data-mode="dual"></button>
        <button class="diff-btn" data-difficulty="easy"></button>
        <button class="diff-btn active" data-difficulty="normal"></button>
        <button class="diff-btn" data-difficulty="hard"></button>
        <button class="speed-btn active" data-speed="classic"></button>
        <button class="speed-btn" data-speed="fast"></button>
    </div>
    <div class="game-screen" id="gameScreen" style="display:none">
        <button id="pauseBtn"></button>
        <button id="resetBtn"></button>
        <button id="menuBtn"></button>
        <span id="targetLines">20</span>
        <span id="speedMode">经典</span>
        <div class="player-panel player-1" id="player1Panel">
            <button class="sound-toggle" id="soundToggle1"></button>
            <div class="info-grid">
                <div class="info-card"><span class="info-value" id="score1">0</span></div>
                <div class="info-card"><span class="info-value" id="lines1">0</span></div>
            </div>
            <div class="streak-display"><span id="streak1">0</span></div>
            <div id="overlay1"></div>
        </div>
        <div class="player-panel player-2" id="player2Panel">
            <h2 class="player-name p2-name" id="player2Name">玩家 2</h2>
            <button class="sound-toggle" id="soundToggle2"></button>
            <div class="info-grid">
                <div class="info-card"><span class="info-value" id="score2">0</span></div>
                <div class="info-card"><span class="info-value" id="lines2">0</span></div>
            </div>
            <div class="streak-display"><span id="streak2">0</span></div>
            <div id="overlay2"></div>
        </div>
    </div>
    <div class="virtual-controls" id="virtualControls">
        <div class="v-controls v-controls-left">
            <button class="v-btn" data-player="1" data-action="rotate"></button>
            <button class="v-btn" data-player="1" data-action="left"></button>
            <button class="v-btn" data-player="1" data-action="down"></button>
            <button class="v-btn" data-player="1" data-action="right"></button>
            <button class="v-btn v-btn-wide" data-player="1" data-action="drop"></button>
        </div>
        <div class="v-controls v-controls-right">
            <button class="v-btn" data-player="2" data-action="rotate"></button>
            <button class="v-btn" data-player="2" data-action="left"></button>
            <button class="v-btn" data-player="2" data-action="down"></button>
            <button class="v-btn" data-player="2" data-action="right"></button>
            <button class="v-btn v-btn-wide" data-player="2" data-action="drop"></button>
        </div>
    </div>
    <canvas id="board1" width="250" height="500"></canvas>
    <canvas id="board2" width="250" height="500"></canvas>
    <canvas id="next1" width="100" height="100"></canvas>
    <canvas id="next2" width="100" height="100"></canvas>
    <canvas id="particleCanvas" class="particle-canvas"></canvas>
    <div class="victory-modal" id="victoryModal">
        <div class="victory-content">
            <div class="confetti-container" id="confettiContainer"></div>
            <span id="winnerName"></span>
            <span id="finalScore"></span>
            <span id="finalLines"></span>
            <span id="finalStreak"></span>
            <button id="playAgainBtn"></button>
            <button id="backToMenuBtn"></button>
        </div>
    </div>
    <div class="pause-modal" id="pauseModal">
        <div class="pause-content">
            <button id="resumeBtn"></button>
            <button id="pauseMenuBtn"></button>
        </div>
    </div>
    <div class="test-panel" id="testPanel">
        <button id="testToggleBtn"></button>
        <div class="test-panel-content" id="testPanelContent">
            <div class="test-summary" id="testSummary"></div>
            <div class="test-console" id="testConsole"></div>
            <button id="runAllTests"></button>
            <button id="runAudioTest"></button>
            <button id="runAITest"></button>
            <button id="runTouchTest"></button>
            <button id="runPenaltyTest"></button>
            <button id="runDifficultyTest"></button>
        </div>
    </div>
</div>
`;

document.body.innerHTML = testHtml;

const styleElement = document.createElement('style');
styleElement.textContent = cssContent;
document.head.appendChild(styleElement);

window.eval(gameJsContent);
window.eval(testsJsContent);

const GameState = window.GameState;
const BOARD_WIDTH = window.BOARD_WIDTH;
const BOARD_HEIGHT = window.BOARD_HEIGHT;
const SPEED_CONFIG = window.SPEED_CONFIG;
const DIFFICULTY_CONFIG = window.DIFFICULTY_CONFIG;
const TETROMINOES = window.TETROMINOES;

setTimeout(async () => {
    console.log('✅ 游戏环境初始化完成\n');
    
    const TetrisGame = window.TetrisGame;
    const TetrisTests = window.TetrisTests;
    
    console.log('📋 测试清单:');
    console.log('  1. 音效系统测试 (Web Audio API 合成)');
    console.log('  2. AI对战模式自动放置测试');
    console.log('  3. 移动端触摸控制测试');
    console.log('  4. 双人对战惩罚行机制测试');
    console.log('  5. 难度调节功能测试');
    console.log('');
    
    try {
        const game = new TetrisGame();
        const tests = new TetrisTests(game);
        
        const results = await tests.runAllTests();
        
        const passed = results.filter(r => r.type === 'success').length;
        const failed = results.filter(r => r.type === 'error').length;
        const total = passed + failed;
        
        console.log('');
        console.log('='.repeat(60));
        console.log('📊 测试结果汇总');
        console.log('='.repeat(60));
        console.log(`✅ 通过: ${passed}`);
        console.log(`❌ 失败: ${failed}`);
        console.log(`📋 总计: ${total}`);
        console.log(`📈 通过率: ${total > 0 ? Math.round(passed / total * 100) : 0}%`);
        console.log('='.repeat(60));
        
        if (failed > 0) {
            console.log('\n❌ 失败的测试:');
            results.filter(r => r.type === 'error').forEach(r => {
                console.log(`  ✗ ${r.message}`);
            });
            process.exit(1);
        } else {
            console.log('\n🎉 所有测试通过!');
            console.log('\n📝 测试详情:');
            console.log('  1. 音效系统: 所有6种音效均使用 Web Audio API OscillatorNode 合成');
            console.log('  2. AI自动放置: 成功计算目标位置、自动移动旋转、锁定方块');
            console.log('  3. 触摸控制: 虚拟按钮响应触摸事件,正确触发游戏操作');
            console.log('  4. 惩罚行机制: 消除1行给对方+1惩罚行,消除4行给对方+4惩罚行');
            console.log('  5. 难度调节: 简单/普通/困难三档正确影响AI速度和决策质量');
            process.exit(0);
        }
    } catch (error) {
        console.error('❌ 测试运行出错:', error);
        console.error(error.stack);
        process.exit(1);
    }
}, 1000);
