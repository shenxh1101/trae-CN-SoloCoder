const GRID_SIZE = 32;
const MAX_HISTORY = 20;

function createEmptyFrame() {
    const frame = [];
    for (let y = 0; y < GRID_SIZE; y++) {
        frame[y] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            frame[y][x] = '#FFFFFF';
        }
    }
    return frame;
}

function deepCloneFrames(frames) {
    return frames.map(frame => 
        frame.map(row => [...row])
    );
}

function framesEqual(framesA, framesB) {
    if (framesA.length !== framesB.length) return false;
    for (let f = 0; f < framesA.length; f++) {
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                if (framesA[f][y][x] !== framesB[f][y][x]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function setPixel(gridData, x, y, color) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
        return false;
    }
    if (gridData[y][x] === color) {
        return false;
    }
    gridData[y][x] = color;
    return true;
}

function getPixel(gridData, x, y) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
        return null;
    }
    return gridData[y][x];
}

function floodFill(gridData, startX, startY, fillColor) {
    const targetColor = getPixel(gridData, startX, startY);
    
    if (targetColor === null || targetColor === fillColor) {
        return false;
    }
    
    const queue = [{ x: startX, y: startY }];
    const visited = new Set();
    const key = (x, y) => `${x},${y}`;
    
    while (queue.length > 0) {
        const { x, y } = queue.shift();
        const k = key(x, y);
        
        if (visited.has(k)) continue;
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
        if (gridData[y][x] !== targetColor) continue;
        
        visited.add(k);
        gridData[y][x] = fillColor;
        
        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
    }
    
    return true;
}

function drawLine(gridData, x0, y0, x1, y1, color) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let hasChanged = false;
    
    let x = x0;
    let y = y0;
    
    while (true) {
        if (setPixel(gridData, x, y, color)) {
            hasChanged = true;
        }
        
        if (x === x1 && y === y1) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
    
    return hasChanged;
}

class HistoryManager {
    constructor() {
        this.stack = [];
        this.index = -1;
        this.maxSize = MAX_HISTORY;
    }

    saveState(frames, currentFrame) {
        const newFrames = deepCloneFrames(frames);
        
        if (this.index >= 0 && this.index < this.stack.length) {
            const currentState = this.stack[this.index];
            if (currentState.currentFrame === currentFrame && 
                framesEqual(currentState.frames, newFrames)) {
                console.log('  [优化] 状态未变化，跳过保存');
                return;
            }
        }

        const state = {
            frames: newFrames,
            currentFrame: currentFrame
        };

        if (this.index < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.index + 1);
        }

        this.stack.push(state);

        if (this.stack.length > this.maxSize) {
            this.stack.shift();
            this.index = this.maxSize - 1;
        } else {
            this.index++;
        }
    }

    canUndo() {
        return this.index > 0;
    }

    canRedo() {
        return this.index < this.stack.length - 1;
    }

    undo() {
        if (!this.canUndo()) return null;
        
        this.index--;
        const state = this.stack[this.index];
        
        return {
            frames: deepCloneFrames(state.frames),
            currentFrame: state.currentFrame
        };
    }

    redo() {
        if (!this.canRedo()) return null;
        
        this.index++;
        const state = this.stack[this.index];
        
        return {
            frames: deepCloneFrames(state.frames),
            currentFrame: state.currentFrame
        };
    }

    reset(initialFrames, currentFrame) {
        this.stack = [];
        this.index = -1;
        this.saveState(initialFrames, currentFrame);
    }
}

console.log('========================================');
console.log('  像素画绘制工具 - 核心功能测试');
console.log('========================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        testsPassed++;
    } catch (e) {
        console.log(`❌ ${name}`);
        console.log(`   错误: ${e.message}`);
        testsFailed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || '断言失败');
    }
}

console.log('--- 测试 1: 画布绘制功能 ---');

test('创建空画布，所有像素为白色', () => {
    const grid = createEmptyFrame();
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            assert(grid[y][x] === '#FFFFFF', `像素(${x},${y})不是白色`);
        }
    }
});

test('设置单个像素', () => {
    const grid = createEmptyFrame();
    const changed = setPixel(grid, 5, 5, '#FF0000');
    assert(changed === true, '应该返回true表示有变化');
    assert(grid[5][5] === '#FF0000', '像素颜色不正确');
});

test('设置相同颜色不产生变化', () => {
    const grid = createEmptyFrame();
    const changed = setPixel(grid, 5, 5, '#FFFFFF');
    assert(changed === false, '应该返回false表示无变化');
});

test('越界像素设置返回false', () => {
    const grid = createEmptyFrame();
    const changed1 = setPixel(grid, -1, 5, '#FF0000');
    const changed2 = setPixel(grid, 32, 5, '#FF0000');
    const changed3 = setPixel(grid, 5, -1, '#FF0000');
    const changed4 = setPixel(grid, 5, 32, '#FF0000');
    assert(changed1 === false && changed2 === false && changed3 === false && changed4 === false, '越界应该返回false');
});

test('Bresenham直线绘制 - 水平线', () => {
    const grid = createEmptyFrame();
    const changed = drawLine(grid, 0, 5, 10, 5, '#FF0000');
    assert(changed === true, '应该有变化');
    for (let x = 0; x <= 10; x++) {
        assert(grid[5][x] === '#FF0000', `像素(${x},5)应该是红色`);
    }
});

test('Bresenham直线绘制 - 垂直线', () => {
    const grid = createEmptyFrame();
    const changed = drawLine(grid, 5, 0, 5, 10, '#00FF00');
    assert(changed === true, '应该有变化');
    for (let y = 0; y <= 10; y++) {
        assert(grid[5] ? (grid[y][5] === '#00FF00') : true, `像素(5,${y})应该是绿色`);
    }
});

test('Bresenham直线绘制 - 对角线', () => {
    const grid = createEmptyFrame();
    const changed = drawLine(grid, 0, 0, 5, 5, '#0000FF');
    assert(changed === true, '应该有变化');
    for (let i = 0; i <= 5; i++) {
        assert(grid[i][i] === '#0000FF', `像素(${i},${i})应该是蓝色`);
    }
});

console.log('\n--- 测试 2: 洪水填充算法 ---');

test('填充白色区域为红色', () => {
    const grid = createEmptyFrame();
    const changed = floodFill(grid, 16, 16, '#FF0000');
    assert(changed === true, '应该有变化');
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            assert(grid[y][x] === '#FF0000', `像素(${x},${y})应该是红色`);
        }
    }
});

test('填充相同颜色不产生变化', () => {
    const grid = createEmptyFrame();
    const changed = floodFill(grid, 16, 16, '#FFFFFF');
    assert(changed === false, '应该无变化');
});

test('填充边界区域', () => {
    const grid = createEmptyFrame();
    for (let x = 0; x < 32; x++) {
        grid[10][x] = '#000000';
        grid[20][x] = '#000000';
    }
    for (let y = 10; y <= 20; y++) {
        grid[y][10] = '#000000';
        grid[y][20] = '#000000';
    }
    
    const changed = floodFill(grid, 15, 15, '#FF0000');
    assert(changed === true, '应该有变化');
    
    for (let y = 11; y < 20; y++) {
        for (let x = 11; x < 20; x++) {
            assert(grid[y][x] === '#FF0000', `边界内像素(${x},${y})应该是红色`);
        }
    }
    
    assert(grid[5][16] === '#FFFFFF', '边界外像素应该保持白色');
    assert(grid[25][16] === '#FFFFFF', '边界外像素应该保持白色');
});

test('填充起始点越界', () => {
    const grid = createEmptyFrame();
    const changed = floodFill(grid, -1, 16, '#FF0000');
    assert(changed === false, '越界应该返回false');
});

console.log('\n--- 测试 3: 历史记录管理 ---');

test('初始状态可以保存', () => {
    const history = new HistoryManager();
    const frames = [createEmptyFrame()];
    history.reset(frames, 0);
    assert(history.index === 0, '索引应该为0');
    assert(history.canUndo() === false, '初始状态不能撤销');
    assert(history.canRedo() === false, '初始状态不能重做');
});

test('修改后保存状态，可以撤销', () => {
    const history = new HistoryManager();
    let frames = [createEmptyFrame()];
    history.reset(frames, 0);
    
    setPixel(frames[0], 5, 5, '#FF0000');
    history.saveState(frames, 0);
    
    assert(history.index === 1, '索引应该为1');
    assert(history.canUndo() === true, '应该可以撤销');
    assert(history.canRedo() === false, '不可以重做');
});

test('撤销操作恢复之前状态', () => {
    const history = new HistoryManager();
    let frames = [createEmptyFrame()];
    history.reset(frames, 0);
    
    setPixel(frames[0], 5, 5, '#FF0000');
    history.saveState(frames, 0);
    
    const state = history.undo();
    assert(state !== null, '撤销应该返回状态');
    assert(state.frames[0][5][5] === '#FFFFFF', '撤销后像素应该恢复白色');
    assert(history.canUndo() === false, '撤销后不能再撤销');
    assert(history.canRedo() === true, '撤销后可以重做');
});

test('重做操作恢复撤销的状态', () => {
    const history = new HistoryManager();
    let frames = [createEmptyFrame()];
    history.reset(frames, 0);
    
    setPixel(frames[0], 5, 5, '#FF0000');
    history.saveState(frames, 0);
    
    history.undo();
    const state = history.redo();
    
    assert(state !== null, '重做应该返回状态');
    assert(state.frames[0][5][5] === '#FF0000', '重做后像素应该是红色');
    assert(history.canUndo() === true, '重做后可以撤销');
    assert(history.canRedo() === false, '重做后不能再重做');
});

test('相同状态不重复入栈', () => {
    const history = new HistoryManager();
    let frames = [createEmptyFrame()];
    history.reset(frames, 0);
    
    const indexBefore = history.index;
    history.saveState(frames, 0);
    history.saveState(frames, 0);
    history.saveState(frames, 0);
    
    assert(history.index === indexBefore, '相同状态不应该增加索引');
});

test('超过20步历史，旧记录被丢弃', () => {
    const history = new HistoryManager();
    let frames = [createEmptyFrame()];
    history.reset(frames, 0);
    
    for (let i = 1; i <= 25; i++) {
        setPixel(frames[0], i, 0, '#FF0000');
        history.saveState(frames, 0);
    }
    
    assert(history.stack.length === 20, `历史记录最多20条，实际${history.stack.length}条`);
    assert(history.index === 19, `索引应该为19，实际${history.index}`);
    
    const firstState = history.stack[0];
    assert(firstState.frames[0][0][6] === '#FF0000', '最早的记录应该是第6步');
});

test('撤销后再修改，重做历史被清除', () => {
    const history = new HistoryManager();
    let frames = [createEmptyFrame()];
    history.reset(frames, 0);
    
    setPixel(frames[0], 1, 0, '#FF0000');
    history.saveState(frames, 0);
    setPixel(frames[0], 2, 0, '#00FF00');
    history.saveState(frames, 0);
    
    history.undo();
    history.undo();
    
    setPixel(frames[0], 3, 0, '#0000FF');
    history.saveState(frames, 0);
    
    assert(history.canRedo() === false, '修改后重做历史应该被清除');
    assert(history.stack.length === 2, '应该只有2条记录');
});

console.log('\n--- 测试 4: 帧数据比较 ---');

test('相同帧数据比较返回true', () => {
    const frames1 = [createEmptyFrame()];
    const frames2 = [createEmptyFrame()];
    assert(framesEqual(frames1, frames2) === true, '相同数据应该相等');
});

test('不同帧数据比较返回false', () => {
    const frames1 = [createEmptyFrame()];
    const frames2 = [createEmptyFrame()];
    setPixel(frames2[0], 5, 5, '#FF0000');
    assert(framesEqual(frames1, frames2) === false, '不同数据应该不相等');
});

test('不同帧数比较返回false', () => {
    const frames1 = [createEmptyFrame()];
    const frames2 = [createEmptyFrame(), createEmptyFrame()];
    assert(framesEqual(frames1, frames2) === false, '不同帧数应该不相等');
});

console.log('\n--- 测试 5: 数据深拷贝 ---');

test('深拷贝后修改原数据不影响副本', () => {
    const original = [createEmptyFrame()];
    setPixel(original[0], 5, 5, '#FF0000');
    
    const copy = deepCloneFrames(original);
    setPixel(original[0], 5, 5, '#00FF00');
    
    assert(copy[0][5][5] === '#FF0000', '副本应该保持原值');
    assert(original[0][5][5] === '#00FF00', '原数据被修改');
});

console.log('\n========================================');
console.log(`  测试结果: ${testsPassed} 通过, ${testsFailed} 失败`);
console.log('========================================');

if (testsFailed > 0) {
    process.exit(1);
}

console.log('\n🎉 所有核心功能测试通过！');
console.log('请在浏览器中打开 http://localhost:8080 进行完整功能测试。\n');
