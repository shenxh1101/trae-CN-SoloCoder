class TetrisTests {
    constructor(game) {
        this.game = game;
        this.results = [];
        this.currentTest = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
        console.log(logEntry);
        this.results.push({ message, type, timestamp });
        this.updateTestUI();
    }

    assert(condition, message) {
        if (condition) {
            this.log(`✓ ${message}`, 'success');
            return true;
        } else {
            this.log(`✗ ${message}`, 'error');
            return false;
        }
    }

    assertApproximately(actual, expected, tolerance, message) {
        const diff = Math.abs(actual - expected);
        if (diff <= tolerance) {
            this.log(`✓ ${message} (${actual} ≈ ${expected} ± ${tolerance})`, 'success');
            return true;
        } else {
            this.log(`✗ ${message} (${actual} != ${expected} ± ${tolerance})`, 'error');
            return false;
        }
    }

    async runAllTests() {
        this.results = [];
        this.log('=== 开始运行所有测试 ===', 'info');
        
        await this.testAudioSystem();
        await this.testAIAutoPlacement();
        await this.testTouchControls();
        await this.testPenaltyLines();
        await this.testDifficultyLevels();
        
        const passed = this.results.filter(r => r.type === 'success').length;
        const total = this.results.filter(r => r.type === 'success' || r.type === 'error').length;
        this.log(`=== 测试完成: ${passed}/${total} 通过 ===`, passed === total ? 'success' : 'error');
        
        return this.results;
    }

    async testAudioSystem() {
        this.log('--- 测试1: 音效系统 (Web Audio API) ---', 'info');
        
        const hasAudioContext = this.game.audioContext !== null;
        this.assert(hasAudioContext, 'AudioContext 已初始化');
        
        if (hasAudioContext) {
            const isCorrectType = this.game.audioContext instanceof (window.AudioContext || window.webkitAudioContext);
            this.assert(isCorrectType, 'AudioContext 类型正确');
        }
        
        const soundTypes = ['rotate', 'move', 'drop', 'clear', 'penalty', 'victory'];
        for (const type of soundTypes) {
            const originalCreateOscillator = this.game.audioContext?.createOscillator;
            let oscillatorCreated = false;
            
            if (this.game.audioContext) {
                this.game.audioContext.createOscillator = () => {
                    oscillatorCreated = true;
                    return originalCreateOscillator.call(this.game.audioContext);
                };
            }
            
            const originalState = this.game.soundEnabled;
            this.game.soundEnabled = true;
            this.game.playSound(type);
            this.game.soundEnabled = originalState;
            
            if (this.game.audioContext) {
                this.game.audioContext.createOscillator = originalCreateOscillator;
            }
            
            this.assert(oscillatorCreated, `音效 "${type}" 使用 OscillatorNode 合成`);
        }
        
        const noAudioFiles = !document.querySelectorAll('audio, source').length;
        this.assert(noAudioFiles, '没有外部音频文件依赖');
        
        this.log('音效系统测试完成', 'success');
    }

    async testAIAutoPlacement() {
        this.log('--- 测试2: AI对战模式自动放置 ---', 'info');
        
        this.game.gameMode = 'single';
        this.game.difficulty = 'normal';
        this.game.speedMode = 'classic';
        this.game.startGame();
        this.game.gameState = GameState.PLAYING;
        
        const aiPlayer = this.game.players[1];
        this.assert(aiPlayer.isAI === true, 'AI玩家 isAI 标记正确');
        
        this.assert(aiPlayer.nextPiece !== null, 'AI有下一个方块');
        this.assert(aiPlayer.currentPiece !== null, 'AI有当前方块');
        
        const initialX = aiPlayer.currentPiece.x;
        const initialY = aiPlayer.currentPiece.y;
        
        this.game.calculateAITarget(1);
        this.assert(aiPlayer.aiTargetX !== null, 'AI计算了目标X位置');
        this.assert(aiPlayer.aiTargetRotation !== null, 'AI计算了目标旋转角度');
        
        this.assert(
            aiPlayer.aiTargetX >= -2 && aiPlayer.aiTargetX <= BOARD_WIDTH + 2,
            `AI目标X位置 ${aiPlayer.aiTargetX} 在合理范围内`
        );
        this.assert(
            aiPlayer.aiTargetRotation >= 0 && aiPlayer.aiTargetRotation < 4,
            `AI目标旋转角度 ${aiPlayer.aiTargetRotation} 在合理范围内 (0-3)`
        );
        
        let pieceMoved = false;
        let pieceRotated = false;
        const originalMove = this.game.movePiece.bind(this.game);
        const originalRotate = this.game.rotatePiece.bind(this.game);
        
        this.game.movePiece = (index, dx, dy) => {
            if (index === 1 && (dx !== 0 || dy !== 0)) pieceMoved = true;
            return originalMove(index, dx, dy);
        };
        
        this.game.rotatePiece = (index) => {
            if (index === 1) pieceRotated = true;
            return originalRotate(index);
        };
        
        for (let i = 0; i < 50; i++) {
            this.game.updateAI(1, 100);
            if (pieceMoved && pieceRotated) break;
        }
        
        this.game.movePiece = originalMove;
        this.game.rotatePiece = originalRotate;
        
        this.assert(pieceMoved, 'AI执行了移动操作');
        this.log('AI移动测试完成', 'success');
        
        const boardBefore = aiPlayer.board.map(row => [...row]);
        const filledBefore = boardBefore.flat().filter(c => c !== 0).length;
        
        let iterations = 0;
        const maxIterations = 500;
        while (iterations < maxIterations && !aiPlayer.gameOver) {
            aiPlayer.dropTimer += 200;
            this.game.updateAI(1, 50);
            
            if (aiPlayer.dropTimer >= SPEED_CONFIG.classic.aiDrop) {
                aiPlayer.dropTimer = 0;
                if (!this.game.movePiece(1, 0, 1)) {
                    this.game.lockPiece(1);
                    break;
                }
            }
            iterations++;
        }
        
        const boardAfter = aiPlayer.board.map(row => [...row]);
        const filledAfter = boardAfter.flat().filter(c => c !== 0).length;
        
        this.assert(filledAfter > filledBefore, 'AI成功放置方块到棋盘');
        this.assert(iterations < maxIterations, 'AI在合理时间内完成放置');
        
        const newPiece = aiPlayer.currentPiece;
        this.assert(newPiece !== null, 'AI放置后生成了新方块');
        this.assert(newPiece.y === -1, '新方块从顶部开始');
        
        this.log('AI自动放置测试完成', 'success');
        
        this.game.players.forEach(p => p.gameOver = false);
    }

    async testTouchControls() {
        this.log('--- 测试3: 移动端触摸控制 ---', 'info');
        
        this.game.gameMode = 'dual';
        this.game.startGame();
        this.game.gameState = GameState.PLAYING;
        
        const virtualButtons = document.querySelectorAll('.v-btn');
        this.assert(virtualButtons.length > 0, '虚拟按钮存在');
        
        const requiredActions = ['rotate', 'left', 'right', 'down', 'drop'];
        const player1Buttons = document.querySelectorAll('.v-controls-left .v-btn');
        const player2Buttons = document.querySelectorAll('.v-controls-right .v-btn');
        
        for (const action of requiredActions) {
            const p1Btn = document.querySelector(`.v-controls-left .v-btn[data-action="${action}"]`);
            const p2Btn = document.querySelector(`.v-controls-right .v-btn[data-action="${action}"]`);
            this.assert(p1Btn !== null, `玩家1有${action}按钮`);
            this.assert(p2Btn !== null, `玩家2有${action}按钮`);
        }
        
        const testCases = [
            { player: 1, action: 'left', expectedDx: -1, expectedDy: 0 },
            { player: 1, action: 'right', expectedDx: 1, expectedDy: 0 },
            { player: 1, action: 'down', expectedDx: 0, expectedDy: 1 },
        ];
        
        for (const testCase of testCases) {
            const playerIndex = testCase.player - 1;
            const player = this.game.players[playerIndex];
            const originalX = player.currentPiece.x;
            const originalY = player.currentPiece.y;
            
            const btn = document.querySelector(`.v-controls-${testCase.player === 1 ? 'left' : 'right'} .v-btn[data-action="${testCase.action}"]`);
            
            const touchStartEvent = new TouchEvent('touchstart', {
                bubbles: true,
                cancelable: true,
                touches: [{ clientX: 0, clientY: 0 }]
            });
            btn.dispatchEvent(touchStartEvent);
            
            const expectedX = originalX + testCase.expectedDx;
            const expectedY = originalY + testCase.expectedDy;
            
            this.assert(
                player.currentPiece.x === expectedX,
                `玩家${testCase.player} ${testCase.action} 按钮正确移动 X: ${player.currentPiece.x} === ${expectedX}`
            );
            this.assert(
                player.currentPiece.y === expectedY,
                `玩家${testCase.player} ${testCase.action} 按钮正确移动 Y: ${player.currentPiece.y} === ${expectedY}`
            );
            
            const touchEndEvent = new TouchEvent('touchend', {
                bubbles: true,
                cancelable: true
            });
            btn.dispatchEvent(touchEndEvent);
            
            this.assert(!btn.classList.contains('active'), `按钮 ${testCase.action} 触摸结束后移除 active 类`);
        }
        
        const rotateBtn = document.querySelector('.v-controls-left .v-btn[data-action="rotate"]');
        const player1 = this.game.players[0];
        const originalShape = player1.currentPiece.shape.map(row => [...row]);
        
        const touchStartEvent = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [{ clientX: 0, clientY: 0 }]
        });
        rotateBtn.dispatchEvent(touchStartEvent);
        
        const rotatedShape = player1.currentPiece.shape;
        const shapeChanged = !this.shapesEqual(originalShape, rotatedShape);
        this.assert(shapeChanged, '旋转按钮正确旋转方块');
        
        const touchEndEvent = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true
        });
        rotateBtn.dispatchEvent(touchEndEvent);
        
        const dropBtn = document.querySelector('.v-controls-left .v-btn[data-action="drop"]');
        const dropYBefore = player1.currentPiece.y;
        const boardBefore = player1.board.map(row => [...row]);
        const filledBefore = boardBefore.flat().filter(c => c !== 0).length;
        
        const dropTouchStart = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [{ clientX: 0, clientY: 0 }]
        });
        dropBtn.dispatchEvent(dropTouchStart);
        
        const boardAfter = player1.board.map(row => [...row]);
        const filledAfter = boardAfter.flat().filter(c => c !== 0).length;
        
        this.assert(filledAfter > filledBefore, '硬降按钮正确执行硬降操作并锁定方块');
        
        this.log('移动端触摸控制测试完成', 'success');
        
        this.game.players.forEach(p => p.gameOver = false);
    }

    async testPenaltyLines() {
        this.log('--- 测试4: 双人对战惩罚行机制 ---', 'info');
        
        this.game.gameMode = 'dual';
        this.game.startGame();
        this.game.gameState = GameState.PLAYING;
        
        const player1 = this.game.players[0];
        const player2 = this.game.players[1];
        
        this.clearBoard(player1);
        this.clearBoard(player2);
        
        const boardHeight = player1.board.length;
        const rowToFill = boardHeight - 1;
        
        for (let c = 0; c < BOARD_WIDTH; c++) {
            player1.board[rowToFill][c] = '#ff0000';
        }
        
        const p2BoardBefore = player2.board.map(row => [...row]);
        const p2EmptyRowsBefore = p2BoardBefore.filter(row => row.every(c => c === 0)).length;
        
        const p1LinesBefore = player1.linesCleared;
        
        this.game.clearLines(0);
        
        const p1LinesAfter = player1.linesCleared;
        this.assert(p1LinesAfter === p1LinesBefore + 1, `玩家1消除行数正确增加: ${p1LinesAfter} === ${p1LinesBefore + 1}`);
        
        const p2BoardAfter = player2.board.map(row => [...row]);
        const p2EmptyRowsAfter = p2BoardAfter.filter(row => row.every(c => c === 0)).length;
        
        this.assert(
            p2EmptyRowsAfter === p2EmptyRowsBefore - 1,
            `玩家2收到惩罚行: 空行数从 ${p2EmptyRowsBefore} 变为 ${p2EmptyRowsAfter}`
        );
        
        const penaltyRow = p2BoardAfter[boardHeight - 1];
        const emptyCells = penaltyRow.filter(c => c === 0).length;
        this.assert(emptyCells === 1, `惩罚行有1个空缺格: ${emptyCells}`);
        
        const filledCells = penaltyRow.filter(c => c === '#666').length;
        this.assert(filledCells === BOARD_WIDTH - 1, `惩罚行有${BOARD_WIDTH - 1}个填充格: ${filledCells}`);
        
        this.clearBoard(player1);
        this.clearBoard(player2);
        
        for (let r = boardHeight - 4; r < boardHeight; r++) {
            for (let c = 0; c < BOARD_WIDTH; c++) {
                player1.board[r][c] = '#ff0000';
            }
        }
        
        const p2LinesBefore = player2.linesCleared;
        this.game.clearLines(0);
        
        const p2BoardAfterTetris = player2.board.map(row => [...row]);
        const penaltyRowsCount = p2BoardAfterTetris.filter(row => 
            row.filter(c => c === '#666').length === BOARD_WIDTH - 1
        ).length;
        
        this.assert(penaltyRowsCount === 4, `消除4行(Tetris)给对方增加4个惩罚行: ${penaltyRowsCount}`);
        
        this.clearBoard(player1);
        this.clearBoard(player2);
        
        player1.currentPiece = this.game.getRandomTetromino();
        player1.currentPiece.x = 0;
        player1.currentPiece.y = BOARD_HEIGHT - 3;
        
        for (let c = 0; c < BOARD_WIDTH; c++) {
            player1.board[boardHeight - 1][c] = '#ff0000';
        }
        player1.board[boardHeight - 1][0] = 0;
        
        const originalY = player1.currentPiece.y;
        
        this.game.addPenaltyLines(0, 1);
        
        this.assert(
            player1.currentPiece.y < originalY,
            `惩罚行上移后当前方块位置调整: ${player1.currentPiece.y} < ${originalY}`
        );
        
        this.assert(
            this.game.isValidPosition(player1, player1.currentPiece),
            '惩罚行上移后方块位置仍然有效'
        );
        
        this.log('双人对战惩罚行机制测试完成', 'success');
        
        this.game.players.forEach(p => p.gameOver = false);
    }

    async testDifficultyLevels() {
        this.log('--- 测试5: 难度调节对AI行为的影响 ---', 'info');
        
        const difficulties = ['easy', 'normal', 'hard'];
        const results = {};
        
        for (const diff of difficulties) {
            this.game.difficulty = diff;
            const config = DIFFICULTY_CONFIG[diff];
            
            this.assert(
                config.aiDropMultiplier > 0,
                `${diff} 难度有下落速度乘数: ${config.aiDropMultiplier}`
            );
            this.assert(
                config.aiQuality > 0 && config.aiQuality <= 1,
                `${diff} 难度有决策质量: ${config.aiQuality}`
            );
            
            this.game.gameMode = 'single';
            this.game.startGame();
            this.game.gameState = GameState.PLAYING;
            
            const aiPlayer = this.game.players[1];
            
            let randomDecisions = 0;
            const totalTests = 20;
            
            for (let i = 0; i < totalTests; i++) {
                const originalRandom = Math.random;
                let randomValue = -1;
                Math.random = () => {
                    randomValue = originalRandom();
                    return randomValue;
                };
                
                aiPlayer.currentPiece = this.game.getRandomTetromino();
                this.game.calculateAITarget(1);
                
                const usedRandom = randomValue > config.aiQuality;
                if (usedRandom) randomDecisions++;
                
                Math.random = originalRandom;
            }
            
            results[diff] = {
                randomDecisions,
                totalTests,
                dropMultiplier: config.aiDropMultiplier,
                quality: config.aiQuality
            };
            
            this.log(`${diff} 难度: ${randomDecisions}/${totalTests} 次随机决策`, 'info');
        }
        
        this.assert(
            results.easy.randomDecisions >= results.normal.randomDecisions,
            `简单难度随机决策数(${results.easy.randomDecisions}) >= 普通难度(${results.normal.randomDecisions})`
        );
        this.assert(
            results.normal.randomDecisions >= results.hard.randomDecisions,
            `普通难度随机决策数(${results.normal.randomDecisions}) >= 困难难度(${results.hard.randomDecisions})`
        );
        
        this.assert(
            results.easy.dropMultiplier > results.normal.dropMultiplier,
            `简单难度下落乘数(${results.easy.dropMultiplier}) > 普通难度(${results.normal.dropMultiplier})`
        );
        this.assert(
            results.normal.dropMultiplier > results.hard.dropMultiplier,
            `普通难度下落乘数(${results.normal.dropMultiplier}) > 困难难度(${results.hard.dropMultiplier})`
        );
        
        this.assert(
            results.easy.quality < results.normal.quality,
            `简单难度决策质量(${results.easy.quality}) < 普通难度(${results.normal.quality})`
        );
        this.assert(
            results.normal.quality < results.hard.quality,
            `普通难度决策质量(${results.normal.quality}) < 困难难度(${results.hard.quality})`
        );
        
        const speedModes = ['classic', 'fast'];
        for (const mode of speedModes) {
            const speedConfig = SPEED_CONFIG[mode];
            this.assert(
                speedConfig.drop > 0,
                `${mode} 模式下落速度: ${speedConfig.drop}ms`
            );
            this.assert(
                speedConfig.aiDrop > 0,
                `${mode} 模式AI下落速度: ${speedConfig.aiDrop}ms`
            );
        }
        
        this.assert(
            SPEED_CONFIG.classic.drop > SPEED_CONFIG.fast.drop,
            `经典速度(${SPEED_CONFIG.classic.drop}ms) > 高速模式(${SPEED_CONFIG.fast.drop}ms)`
        );
        this.assert(
            SPEED_CONFIG.classic.aiDrop > SPEED_CONFIG.fast.aiDrop,
            `经典AI速度(${SPEED_CONFIG.classic.aiDrop}ms) > 高速AI模式(${SPEED_CONFIG.fast.aiDrop}ms)`
        );
        
        this.log('难度调节功能测试完成', 'success');
        
        this.game.players.forEach(p => p.gameOver = false);
    }

    clearBoard(player) {
        player.board = this.game.createEmptyBoard();
    }

    shapesEqual(a, b) {
        if (a.length !== b.length || a[0].length !== b[0].length) return false;
        for (let r = 0; r < a.length; r++) {
            for (let c = 0; c < a[r].length; c++) {
                if (a[r][c] !== b[r][c]) return false;
            }
        }
        return true;
    }

    updateTestUI() {
        const consoleEl = document.getElementById('testConsole');
        if (!consoleEl) return;
        
        consoleEl.innerHTML = '';
        for (const result of this.results.slice(-50)) {
            const div = document.createElement('div');
            div.className = `test-log test-${result.type}`;
            div.textContent = `[${result.timestamp}] ${result.message}`;
            consoleEl.appendChild(div);
        }
        consoleEl.scrollTop = consoleEl.scrollHeight;
        
        const passed = this.results.filter(r => r.type === 'success').length;
        const failed = this.results.filter(r => r.type === 'error').length;
        const total = passed + failed;
        
        const summaryEl = document.getElementById('testSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <span class="test-passed">✓ ${passed} 通过</span>
                <span class="test-failed">✗ ${failed} 失败</span>
                <span class="test-total">总计 ${total}</span>
            `;
        }
    }
}

window.TetrisTests = TetrisTests;
