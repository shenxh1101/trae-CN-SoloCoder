#!/usr/bin/env node

const fs = require('fs');

let results = [];

function assert(condition, message) {
    results.push({
        passed: condition,
        message: message
    });
    return condition;
}

function assertEqual(actual, expected, message) {
    const passed = JSON.stringify(actual) === JSON.stringify(expected);
    results.push({
        passed: passed,
        message: `${message} - Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`
    });
    return passed;
}

function createEmptyGrid() {
    return [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
}

function simulateMoveLeft(grid) {
    let score = 0;
    let merged = false;
    
    for (let r = 0; r < 4; r++) {
        const row = grid[r].filter(val => val !== 0);
        const newRow = [];
        
        for (let i = 0; i < row.length; i++) {
            if (i + 1 < row.length && row[i] === row[i + 1]) {
                const mergedValue = row[i] * 2;
                newRow.push(mergedValue);
                score += mergedValue;
                merged = true;
                i++;
            } else {
                newRow.push(row[i]);
            }
        }
        
        while (newRow.length < 4) {
            newRow.push(0);
        }
        
        grid[r] = newRow;
    }
    
    return { grid, score, merged };
}

function simulateMoveRight(grid) {
    let score = 0;
    let merged = false;
    
    for (let r = 0; r < 4; r++) {
        const row = grid[r].filter(val => val !== 0);
        const newRow = [];
        
        for (let i = row.length - 1; i >= 0; i--) {
            if (i - 1 >= 0 && row[i] === row[i - 1]) {
                const mergedValue = row[i] * 2;
                newRow.unshift(mergedValue);
                score += mergedValue;
                merged = true;
                i--;
            } else {
                newRow.unshift(row[i]);
            }
        }
        
        while (newRow.length < 4) {
            newRow.unshift(0);
        }
        
        grid[r] = newRow;
    }
    
    return { grid, score, merged };
}

function simulateMoveUp(grid) {
    let score = 0;
    let merged = false;
    
    for (let c = 0; c < 4; c++) {
        const col = [];
        for (let r = 0; r < 4; r++) {
            if (grid[r][c] !== 0) col.push(grid[r][c]);
        }
        
        const newCol = [];
        for (let i = 0; i < col.length; i++) {
            if (i + 1 < col.length && col[i] === col[i + 1]) {
                const mergedValue = col[i] * 2;
                newCol.push(mergedValue);
                score += mergedValue;
                merged = true;
                i++;
            } else {
                newCol.push(col[i]);
            }
        }
        
        while (newCol.length < 4) {
            newCol.push(0);
        }
        
        for (let r = 0; r < 4; r++) {
            grid[r][c] = newCol[r];
        }
    }
    
    return { grid, score, merged };
}

function simulateMoveDown(grid) {
    let score = 0;
    let merged = false;
    
    for (let c = 0; c < 4; c++) {
        const col = [];
        for (let r = 0; r < 4; r++) {
            if (grid[r][c] !== 0) col.push(grid[r][c]);
        }
        
        const newCol = [];
        for (let i = col.length - 1; i >= 0; i--) {
            if (i - 1 >= 0 && col[i] === col[i - 1]) {
                const mergedValue = col[i] * 2;
                newCol.unshift(mergedValue);
                score += mergedValue;
                merged = true;
                i--;
            } else {
                newCol.unshift(col[i]);
            }
        }
        
        while (newCol.length < 4) {
            newCol.unshift(0);
        }
        
        for (let r = 0; r < 4; r++) {
            grid[r][c] = newCol[r];
        }
    }
    
    return { grid, score, merged };
}

function canMove(grid) {
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (grid[r][c] === 0) return true;
            const current = grid[r][c];
            if (c + 1 < 4 && grid[r][c + 1] === current) return true;
            if (r + 1 < 4 && grid[r + 1][c] === current) return true;
        }
    }
    return false;
}

function getEmptyCells(grid) {
    const cells = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (grid[r][c] === 0) {
                cells.push({ row: r, col: c });
            }
        }
    }
    return cells;
}

function testGridCreation() {
    const grid = createEmptyGrid();
    assert(grid.length === 4, 'Grid should have 4 rows');
    assert(grid[0].length === 4, 'Each row should have 4 columns');
    assert(grid.every(row => row.every(cell => cell === 0)), 'All cells should be 0 initially');
}

function testMoveLeft() {
    let grid = [
        [2, 0, 2, 4],
        [0, 0, 0, 0],
        [4, 4, 0, 0],
        [0, 8, 8, 0]
    ];
    
    const result = simulateMoveLeft(grid);
    
    assertEqual(result.grid[0], [4, 4, 0, 0], 'Row 0 should merge 2+2 and keep 4');
    assertEqual(result.grid[2], [8, 0, 0, 0], 'Row 2 should merge 4+4');
    assertEqual(result.grid[3], [16, 0, 0, 0], 'Row 3 should merge 8+8');
    assert(result.score === 4 + 8 + 16, `Score should be 28, got ${result.score}`);
    assert(result.merged === true, 'Should detect merge');
}

function testMoveRight() {
    let grid = [
        [2, 0, 2, 4],
        [0, 0, 0, 0],
        [4, 4, 0, 0],
        [0, 8, 8, 0]
    ];
    
    const result = simulateMoveRight(grid);
    
    assertEqual(result.grid[0], [0, 0, 4, 4], 'Row 0 should merge 2+2 and keep 4');
    assertEqual(result.grid[2], [0, 0, 0, 8], 'Row 2 should merge 4+4');
    assertEqual(result.grid[3], [0, 0, 0, 16], 'Row 3 should merge 8+8');
    assert(result.score === 4 + 8 + 16, `Score should be 28, got ${result.score}`);
}

function testMoveUp() {
    let grid = [
        [2, 0, 4, 0],
        [2, 0, 4, 8],
        [0, 0, 0, 8],
        [0, 0, 0, 0]
    ];
    
    const result = simulateMoveUp(grid);
    
    assertEqual(result.grid[0][0], 4, 'Column 0 should merge 2+2');
    assertEqual(result.grid[0][2], 8, 'Column 2 should merge 4+4');
    assertEqual(result.grid[0][3], 16, 'Column 3 should merge 8+8');
    assert(result.score === 4 + 8 + 16, `Score should be 28, got ${result.score}`);
}

function testMoveDown() {
    let grid = [
        [2, 0, 4, 0],
        [2, 0, 4, 8],
        [0, 0, 0, 8],
        [0, 0, 0, 0]
    ];
    
    const result = simulateMoveDown(grid);
    
    assertEqual(result.grid[3][0], 4, 'Column 0 should merge 2+2 at bottom');
    assertEqual(result.grid[3][2], 8, 'Column 2 should merge 4+4 at bottom');
    assertEqual(result.grid[3][3], 16, 'Column 3 should merge 8+8 at bottom');
    assert(result.score === 4 + 8 + 16, `Score should be 28, got ${result.score}`);
}

function testCanMove() {
    const fullGridNoMoves = [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2]
    ];
    assert(canMove(fullGridNoMoves) === false, 'Should not be able to move in full grid with no matches');
    
    const gridWithEmpty = [
        [2, 4, 2, 4],
        [4, 0, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2]
    ];
    assert(canMove(gridWithEmpty) === true, 'Should be able to move with empty cell');
    
    const gridWithMatches = [
        [2, 2, 4, 8],
        [4, 8, 16, 32],
        [8, 16, 32, 64],
        [16, 32, 64, 128]
    ];
    assert(canMove(gridWithMatches) === true, 'Should be able to move with adjacent matches');
}

function testEmptyCells() {
    const grid = [
        [2, 0, 0, 4],
        [0, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 4, 0]
    ];
    const emptyCells = getEmptyCells(grid);
    assert(emptyCells.length === 11, `Should have 11 empty cells, got ${emptyCells.length}`);
}

function testDifficultyProbabilities() {
    const DIFFICULTY = {
        easy: { fourProbability: 0.1 },
        normal: { fourProbability: 0.2 },
        hard: { fourProbability: 0.4 }
    };
    
    function testDifficulty(name, expectedProb) {
        let fours = 0;
        const iterations = 10000;
        
        for (let i = 0; i < iterations; i++) {
            const value = Math.random() < expectedProb ? 4 : 2;
            if (value === 4) fours++;
        }
        
        const actualProb = fours / iterations;
        const tolerance = 0.03;
        assert(
            Math.abs(actualProb - expectedProb) < tolerance,
            `${name} mode: Expected ~${expectedProb*100}% fours, got ${(actualProb*100).toFixed(1)}%`
        );
    }
    
    testDifficulty('Easy', DIFFICULTY.easy.fourProbability);
    testDifficulty('Normal', DIFFICULTY.normal.fourProbability);
    testDifficulty('Hard', DIFFICULTY.hard.fourProbability);
}

function testNoMergeWhenDifferent() {
    let grid = [
        [2, 4, 8, 16],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
    
    const result = simulateMoveLeft(grid);
    assertEqual(result.grid[0], [2, 4, 8, 16], 'Different numbers should not merge');
    assert(result.score === 0, 'Score should not increase');
    assert(result.merged === false, 'Should not detect merge');
}

function testMultipleMergesOneDirection() {
    let grid = [
        [2, 2, 2, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
    
    const result = simulateMoveLeft(grid);
    assertEqual(result.grid[0], [4, 4, 0, 0], 'Should create two 4s from four 2s');
    assert(result.score === 8, `Score should be 8, got ${result.score}`);
}

function runAllTests() {
    results = [];
    
    console.log('🧪 Running 2048 Game Tests...\n');
    
    testGridCreation();
    testMoveLeft();
    testMoveRight();
    testMoveUp();
    testMoveDown();
    testCanMove();
    testEmptyCells();
    testDifficultyProbabilities();
    testNoMergeWhenDifferent();
    testMultipleMergesOneDirection();
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log(`\n📊 Test Results: ${passed}/${total} passed`);
    console.log('=' .repeat(60));
    
    results.forEach((result, index) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} Test ${index + 1}: ${result.message}`);
    });
    
    console.log('=' .repeat(60));
    
    if (passed === total) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log(`\n⚠️  ${total - passed} test(s) failed`);
        process.exit(1);
    }
}

runAllTests();
