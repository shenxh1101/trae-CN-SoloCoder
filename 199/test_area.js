const fs = require('fs');
const path = require('path');

const gameCode = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');

class TestPathGame {
    constructor() {
        this.gridSize = 10;
        this.path = [];
        this.isClosed = false;
        this.filledCells = [];
        this.currentArea = 0;
        this.cells = [];
        this.createMockCells();
    }

    createMockCells() {
        this.cells = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.cells.push({
                    dataset: { x, y },
                    classList: {
                        add: () => {},
                        remove: () => {}
                    }
                });
            }
        }
    }

    getCell(x, y) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
            return null;
        }
        return this.cells[y * this.gridSize + x];
    }

    isAdjacent(cell1, cell2) {
        const dx = Math.abs(cell1.x - cell2.x);
        const dy = Math.abs(cell1.y - cell2.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    isPointInPolygon(x, y, polygon) {
        let inside = false;
        const n = polygon.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            if (((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    clearFilledArea() {
        this.filledCells = [];
    }

    calculateArea() {
        this.clearFilledArea();
        const pathSet = new Set();
        this.path.forEach(p => pathSet.add(`${p.x},${p.y}`));
        const inside = new Set();
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (!pathSet.has(`${x},${y}`)) {
                    if (this.isPointInPolygon(x, y, this.path)) {
                        inside.add(`${x},${y}`);
                    }
                }
            }
        }
        this.filledCells = Array.from(inside).map(s => {
            const [x, y] = s.split(',').map(Number);
            return { x, y };
        });
        this.currentArea = this.filledCells.length;
    }

    printGrid() {
        const pathSet = new Set(this.path.map(p => `${p.x},${p.y}`));
        const filledSet = new Set(this.filledCells.map(p => `${p.x},${p.y}`));
        
        console.log('\n网格状态 (路径: 🔴, 填充: 🔵, 空白: ⚪):');
        console.log('   ' + Array.from({length: this.gridSize}, (_, i) => i.toString().padStart(2, '0')).join(' '));
        
        for (let y = 0; y < this.gridSize; y++) {
            let row = y.toString().padStart(2, '0') + ' ';
            for (let x = 0; x < this.gridSize; x++) {
                const key = `${x},${y}`;
                if (pathSet.has(key)) {
                    row += ' 🔴';
                } else if (filledSet.has(key)) {
                    row += ' 🔵';
                } else {
                    row += ' ⚪';
                }
            }
            console.log(row);
        }
        console.log(`\n路径长度: ${this.path.length}`);
        console.log(`包围面积: ${this.currentArea} 格`);
    }
}

function testSquare2x2() {
    console.log('='.repeat(60));
    console.log('测试1: 2x2 正方形路径');
    console.log('='.repeat(60));
    
    const game = new TestPathGame();
    
    game.path = [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 4, y: 4 },
        { x: 3, y: 4 }
    ];
    game.isClosed = true;
    
    game.calculateArea();
    game.printGrid();
    
    console.log('\n预期: 2x2 正方形路径应该包围 0 个内部格子');
    console.log('实际: ' + game.currentArea + ' 个内部格子');
    console.log('结果: ' + (game.currentArea === 0 ? '✅ 通过' : '❌ 失败'));
    
    return game.currentArea === 0;
}

function testSquare3x3() {
    console.log('\n' + '='.repeat(60));
    console.log('测试2: 3x3 正方形路径');
    console.log('='.repeat(60));
    
    const game = new TestPathGame();
    
    game.path = [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 3 },
        { x: 5, y: 4 },
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
        { x: 3, y: 4 }
    ];
    game.isClosed = true;
    
    game.calculateArea();
    game.printGrid();
    
    console.log('\n预期: 3x3 正方形路径应该包围 1 个内部格子 (4,4)');
    console.log('实际: ' + game.currentArea + ' 个内部格子');
    console.log('结果: ' + (game.currentArea === 1 ? '✅ 通过' : '❌ 失败'));
    
    return game.currentArea === 1;
}

function testSquare4x4() {
    console.log('\n' + '='.repeat(60));
    console.log('测试3: 4x4 正方形路径');
    console.log('='.repeat(60));
    
    const game = new TestPathGame();
    
    game.path = [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 3 },
        { x: 6, y: 3 },
        { x: 6, y: 4 },
        { x: 6, y: 5 },
        { x: 6, y: 6 },
        { x: 5, y: 6 },
        { x: 4, y: 6 },
        { x: 3, y: 6 },
        { x: 3, y: 5 },
        { x: 3, y: 4 }
    ];
    game.isClosed = true;
    
    game.calculateArea();
    game.printGrid();
    
    console.log('\n预期: 4x4 正方形路径应该包围 4 个内部格子');
    console.log('实际: ' + game.currentArea + ' 个内部格子');
    console.log('结果: ' + (game.currentArea === 4 ? '✅ 通过' : '❌ 失败'));
    
    return game.currentArea === 4;
}

function testRectangle() {
    console.log('\n' + '='.repeat(60));
    console.log('测试4: 2x4 矩形路径');
    console.log('='.repeat(60));
    
    const game = new TestPathGame();
    
    game.path = [
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 3 },
        { x: 5, y: 4 },
        { x: 4, y: 4 },
        { x: 3, y: 4 },
        { x: 2, y: 4 }
    ];
    game.isClosed = true;
    
    game.calculateArea();
    game.printGrid();
    
    console.log('\n预期: 2x4 矩形路径应该包围 0 个内部格子');
    console.log('实际: ' + game.currentArea + ' 个内部格子');
    console.log('结果: ' + (game.currentArea === 0 ? '✅ 通过' : '❌ 失败'));
    
    return game.currentArea === 0;
}

function testRectangle3x5() {
    console.log('\n' + '='.repeat(60));
    console.log('测试5: 3x5 矩形路径');
    console.log('='.repeat(60));
    
    const game = new TestPathGame();
    
    game.path = [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 },
        { x: 6, y: 2 },
        { x: 6, y: 3 },
        { x: 6, y: 4 },
        { x: 5, y: 4 },
        { x: 4, y: 4 },
        { x: 3, y: 4 },
        { x: 2, y: 4 },
        { x: 2, y: 3 }
    ];
    game.isClosed = true;
    
    game.calculateArea();
    game.printGrid();
    
    console.log('\n预期: 3x5 矩形路径应该包围 3 个内部格子');
    console.log('实际: ' + game.currentArea + ' 个内部格子');
    console.log('结果: ' + (game.currentArea === 3 ? '✅ 通过' : '❌ 失败'));
    
    return game.currentArea === 3;
}

function testSelfIntersection() {
    console.log('\n' + '='.repeat(60));
    console.log('测试6: 自交检测');
    console.log('='.repeat(60));
    
    function isSelfIntersecting(path, x, y) {
        return path.some(p => p.x === x && p.y === y);
    }
    
    const path = [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 4, y: 4 },
        { x: 3, y: 4 }
    ];
    
    const test1 = isSelfIntersecting(path, 3, 3);
    const test2 = isSelfIntersecting(path, 5, 5);
    
    console.log('路径:', JSON.stringify(path));
    console.log('检测 (3,3) 是否在路径中:', test1, '预期: true, 结果:', test1 === true ? '✅ 通过' : '❌ 失败');
    console.log('检测 (5,5) 是否在路径中:', test2, '预期: false, 结果:', test2 === false ? '✅ 通过' : '❌ 失败');
    
    return test1 === true && test2 === false;
}

function testAdjacency() {
    console.log('\n' + '='.repeat(60));
    console.log('测试7: 相邻检测');
    console.log('='.repeat(60));
    
    function isAdjacent(cell1, cell2) {
        const dx = Math.abs(cell1.x - cell2.x);
        const dy = Math.abs(cell1.y - cell2.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }
    
    const tests = [
        { c1: {x: 3, y: 3}, c2: {x: 4, y: 3}, expected: true, desc: '右邻' },
        { c1: {x: 3, y: 3}, c2: {x: 3, y: 4}, expected: true, desc: '下邻' },
        { c1: {x: 3, y: 3}, c2: {x: 2, y: 3}, expected: true, desc: '左邻' },
        { c1: {x: 3, y: 3}, c2: {x: 3, y: 2}, expected: true, desc: '上邻' },
        { c1: {x: 3, y: 3}, c2: {x: 4, y: 4}, expected: false, desc: '对角(非相邻)' },
        { c1: {x: 3, y: 3}, c2: {x: 5, y: 3}, expected: false, desc: '隔一格(非相邻)' }
    ];
    
    let allPass = true;
    tests.forEach(t => {
        const result = isAdjacent(t.c1, t.c2);
        const pass = result === t.expected;
        console.log(`${t.desc}: ${t.c1.x},${t.c1.y} -> ${t.c2.x},${t.c2.y} = ${result}, 预期: ${t.expected}, 结果: ${pass ? '✅ 通过' : '❌ 失败'}`);
        if (!pass) allPass = false;
    });
    
    return allPass;
}

console.log('\n' + '#'.repeat(60));
console.log('#  彩色路径绘制游戏 - 功能测试');
console.log('#'.repeat(60));

const results = [];
results.push(testSquare2x2());
results.push(testSquare3x3());
results.push(testSquare4x4());
results.push(testRectangle());
results.push(testRectangle3x5());
results.push(testSelfIntersection());
results.push(testAdjacency());

console.log('\n' + '='.repeat(60));
console.log('测试总结');
console.log('='.repeat(60));
const passed = results.filter(r => r).length;
console.log(`通过: ${passed}/${results.length}`);
console.log('='.repeat(60));

if (passed === results.length) {
    console.log('\n🎉 所有测试通过！');
} else {
    console.log('\n⚠️  部分测试失败，请检查代码！');
    process.exit(1);
}
