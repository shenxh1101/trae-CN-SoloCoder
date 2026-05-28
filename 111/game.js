const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 25;

const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

const TETROMINOES = {
    I: { shape: [[1, 1, 1, 1]], color: '#00f5ff' },
    O: { shape: [[1, 1], [1, 1]], color: '#ffd700' },
    T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },
    S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },
    Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
    J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
    L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' }
};

const TETROMINO_KEYS = Object.keys(TETROMINOES);

const SCORE_TABLE = { 1: 100, 2: 300, 3: 500, 4: 800 };

const SPEED_CONFIG = {
    classic: { drop: 800, soft: 50, aiDrop: 600 },
    fast: { drop: 400, soft: 30, aiDrop: 300 }
};

const DIFFICULTY_CONFIG = {
    easy: { aiDropMultiplier: 1.5, aiQuality: 0.6 },
    normal: { aiDropMultiplier: 1.0, aiQuality: 0.85 },
    hard: { aiDropMultiplier: 0.7, aiQuality: 1.0 }
};

class TetrisGame {
    constructor() {
        this.gameState = GameState.MENU;
        this.gameMode = 'single';
        this.difficulty = 'normal';
        this.speedMode = 'classic';
        this.winLines = 20;
        this.soundEnabled = true;
        this.players = [];
        this.particles = [];
        this.animationFrame = null;
        this.lastTime = 0;
        this.streaks = { player1: 0, player2: 0, ai: 0 };
        this.records = this.loadRecords();
        
        this.initDOM();
        this.initCanvas();
        this.initAudio();
        this.initControls();
        this.updateRecordsDisplay();
        this.initTests();
        this.gameLoop(0);
    }

    initTests() {
        if (window.TetrisTests) {
            this.tests = new window.TetrisTests(this);
            
            const testToggleBtn = document.getElementById('testToggleBtn');
            const testPanel = document.getElementById('testPanel');
            
            if (testToggleBtn && testPanel) {
                testToggleBtn.addEventListener('click', () => {
                    testPanel.classList.toggle('collapsed');
                    testToggleBtn.textContent = testPanel.classList.contains('collapsed') ? '+' : '−';
                });
            }
            
            const bindTestBtn = (id, testFn) => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.addEventListener('click', async () => {
                        btn.disabled = true;
                        btn.textContent = '运行中...';
                        try {
                            await testFn.call(this.tests);
                        } catch (e) {
                            this.tests.log(`测试错误: ${e.message}`, 'error');
                        }
                        btn.disabled = false;
                        btn.textContent = btn.dataset.originalText || btn.textContent;
                    });
                    btn.dataset.originalText = btn.textContent;
                }
            };
            
            bindTestBtn('runAllTests', this.tests.runAllTests);
            bindTestBtn('runAudioTest', this.tests.testAudioSystem);
            bindTestBtn('runAITest', this.tests.testAIAutoPlacement);
            bindTestBtn('runTouchTest', this.tests.testTouchControls);
            bindTestBtn('runPenaltyTest', this.tests.testPenaltyLines);
            bindTestBtn('runDifficultyTest', this.tests.testDifficultyLevels);
        }
    }

    initDOM() {
        this.startMenu = document.getElementById('startMenu');
        this.gameScreen = document.getElementById('gameScreen');
        this.victoryModal = document.getElementById('victoryModal');
        this.pauseModal = document.getElementById('pauseModal');
        
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.menuBtn = document.getElementById('menuBtn');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        this.backToMenuBtn = document.getElementById('backToMenuBtn');
        this.resumeBtn = document.getElementById('resumeBtn');
        this.pauseMenuBtn = document.getElementById('pauseMenuBtn');
        this.soundToggle1 = document.getElementById('soundToggle1');
        this.soundToggle2 = document.getElementById('soundToggle2');
        
        this.winLinesSlider = document.getElementById('winLinesSlider');
        this.winLinesDisplay = document.getElementById('winLinesDisplay');
        this.targetLinesDisplay = document.getElementById('targetLines');
        this.speedModeDisplay = document.getElementById('speedMode');
        this.player2Name = document.getElementById('player2Name');
        
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.menuBtn.addEventListener('click', () => this.returnToMenu());
        this.playAgainBtn.addEventListener('click', () => this.restartGame());
        this.backToMenuBtn.addEventListener('click', () => this.returnToMenu());
        this.resumeBtn.addEventListener('click', () => this.togglePause());
        this.pauseMenuBtn.addEventListener('click', () => this.returnToMenu());
        this.soundToggle1.addEventListener('click', () => this.toggleSound(1));
        this.soundToggle2.addEventListener('click', () => this.toggleSound(2));
        
        this.winLinesSlider.addEventListener('input', (e) => {
            this.winLines = parseInt(e.target.value);
            this.winLinesDisplay.textContent = this.winLines;
        });
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.gameMode = btn.dataset.mode;
            });
        });
        
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.difficulty = btn.dataset.difficulty;
            });
        });
        
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.speedMode = btn.dataset.speed;
                this.speedModeDisplay.textContent = this.speedMode === 'classic' ? '经典' : '高速';
            });
        });
    }

    initCanvas() {
        this.boardCanvas1 = document.getElementById('board1');
        this.boardCanvas2 = document.getElementById('board2');
        this.nextCanvas1 = document.getElementById('next1');
        this.nextCanvas2 = document.getElementById('next2');
        this.particleCanvas = document.getElementById('particleCanvas');
        
        this.boardCtx1 = this.boardCanvas1.getContext('2d');
        this.boardCtx2 = this.boardCanvas2.getContext('2d');
        this.nextCtx1 = this.nextCanvas1.getContext('2d');
        this.nextCtx2 = this.nextCanvas2.getContext('2d');
        this.particleCtx = this.particleCanvas.getContext('2d');
        
        this.resizeParticleCanvas();
        window.addEventListener('resize', () => this.resizeParticleCanvas());
    }

    resizeParticleCanvas() {
        this.particleCanvas.width = window.innerWidth;
        this.particleCanvas.height = window.innerHeight;
    }

    initAudio() {
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        switch (type) {
            case 'rotate':
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
                break;
            case 'move':
                oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.05);
                break;
            case 'drop':
                oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.15);
                gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.15);
                break;
            case 'clear':
                const osc1 = this.audioContext.createOscillator();
                const osc2 = this.audioContext.createOscillator();
                const gain1 = this.audioContext.createGain();
                const gain2 = this.audioContext.createGain();
                
                osc1.connect(gain1);
                osc2.connect(gain2);
                gain1.connect(this.audioContext.destination);
                gain2.connect(this.audioContext.destination);
                
                osc1.frequency.setValueAtTime(523, this.audioContext.currentTime);
                osc2.frequency.setValueAtTime(659, this.audioContext.currentTime);
                osc1.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.1);
                osc2.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.1);
                
                gain1.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gain2.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gain1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                
                osc1.start();
                osc2.start();
                osc1.stop(this.audioContext.currentTime + 0.3);
                osc2.stop(this.audioContext.currentTime + 0.3);
                break;
            case 'penalty':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.2);
                break;
            case 'victory':
                const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
                notes.forEach((freq, i) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.1);
                    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime + i * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.1 + 0.2);
                    osc.start(this.audioContext.currentTime + i * 0.1);
                    osc.stop(this.audioContext.currentTime + i * 0.1 + 0.2);
                });
                break;
        }
    }

    initControls() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        document.querySelectorAll('.v-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('active');
                const player = parseInt(btn.dataset.player);
                const action = btn.dataset.action;
                this.handleVirtualButton(player, action, true);
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
                const player = parseInt(btn.dataset.player);
                const action = btn.dataset.action;
                this.handleVirtualButton(player, action, false);
            });
        });
    }

    handleKeyDown(e) {
        if (this.gameState !== GameState.PLAYING) {
            if (e.key.toLowerCase() === 'p' && this.gameState === GameState.PAUSED) {
                this.togglePause();
            }
            return;
        }
        
        if (e.key.toLowerCase() === 'p') {
            this.togglePause();
            return;
        }
        
        if (e.key.toLowerCase() === 'r') {
            this.resetGame();
            return;
        }
        
        if (this.players[0] && !this.players[0].gameOver) {
            switch (e.key.toLowerCase()) {
                case 'a': this.movePiece(0, -1, 0); break;
                case 'd': this.movePiece(0, 1, 0); break;
                case 's': this.movePiece(0, 0, 1); break;
                case 'w': this.rotatePiece(0); break;
                case ' ':
                    e.preventDefault();
                    this.hardDrop(0);
                    break;
            }
        }
        
        if (this.players[1] && !this.players[1].gameOver && !this.players[1].isAI) {
            switch (e.key) {
                case 'ArrowLeft': e.preventDefault(); this.movePiece(1, -1, 0); break;
                case 'ArrowRight': e.preventDefault(); this.movePiece(1, 1, 0); break;
                case 'ArrowDown': e.preventDefault(); this.movePiece(1, 0, 1); break;
                case 'ArrowUp': e.preventDefault(); this.rotatePiece(1); break;
            }
        }
    }

    handleKeyUp(e) {
    }

    handleVirtualButton(playerId, action, isPressed) {
        if (this.gameState !== GameState.PLAYING) return;
        const playerIndex = playerId - 1;
        if (this.players[playerIndex]?.gameOver) return;
        if (this.players[playerIndex]?.isAI) return;
        
        if (isPressed) {
            switch (action) {
                case 'left': this.movePiece(playerIndex, -1, 0); break;
                case 'right': this.movePiece(playerIndex, 1, 0); break;
                case 'down': this.movePiece(playerIndex, 0, 1); break;
                case 'rotate': this.rotatePiece(playerIndex); break;
                case 'drop': this.hardDrop(playerIndex); break;
            }
        }
    }

    createPlayer(id, isAI = false) {
        const controls = id === 1 
            ? { left: 'a', right: 'd', down: 's', rotate: 'w', drop: ' ' }
            : { left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', rotate: 'ArrowUp', drop: ' ' };
        
        return {
            id,
            board: this.createEmptyBoard(),
            currentPiece: null,
            nextPiece: null,
            score: 0,
            linesCleared: 0,
            controls,
            isAI,
            gameOver: false,
            dropTimer: 0,
            aiDecisionTimer: 0,
            aiTargetX: null,
            aiTargetRotation: null,
            streakKey: isAI ? 'ai' : (id === 1 ? 'player1' : 'player2')
        };
    }

    createEmptyBoard() {
        return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
    }

    getRandomTetromino() {
        const key = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
        const tetromino = TETROMINOES[key];
        return {
            shape: tetromino.shape.map(row => [...row]),
            color: tetromino.color,
            x: Math.floor(BOARD_WIDTH / 2) - Math.ceil(tetromino.shape[0].length / 2),
            y: -1
        };
    }

    rotate(shape) {
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                rotated[c][rows - 1 - r] = shape[r][c];
            }
        }
        return rotated;
    }

    isValidPosition(player, piece, offsetX = 0, offsetY = 0) {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    const newX = piece.x + c + offsetX;
                    const newY = piece.y + r + offsetY;
                    if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
                        return false;
                    }
                    if (newY >= 0 && player.board[newY][newX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    movePiece(playerIndex, dx, dy) {
        const player = this.players[playerIndex];
        if (!player || player.gameOver || !player.currentPiece) return false;
        
        if (this.isValidPosition(player, player.currentPiece, dx, dy)) {
            player.currentPiece.x += dx;
            player.currentPiece.y += dy;
            if (dx !== 0) this.playSound('move');
            return true;
        }
        return false;
    }

    rotatePiece(playerIndex) {
        const player = this.players[playerIndex];
        if (!player || player.gameOver || !player.currentPiece) return;
        
        const rotated = this.rotate(player.currentPiece.shape);
        const originalShape = player.currentPiece.shape;
        player.currentPiece.shape = rotated;
        
        const kicks = [0, -1, 1, -2, 2];
        let valid = false;
        for (const kick of kicks) {
            if (this.isValidPosition(player, player.currentPiece, kick, 0)) {
                player.currentPiece.x += kick;
                valid = true;
                break;
            }
        }
        
        if (!valid) {
            player.currentPiece.shape = originalShape;
        } else {
            this.playSound('rotate');
        }
    }

    hardDrop(playerIndex) {
        const player = this.players[playerIndex];
        if (!player || player.gameOver || !player.currentPiece) return;
        
        let dropDistance = 0;
        while (this.isValidPosition(player, player.currentPiece, 0, 1)) {
            player.currentPiece.y++;
            dropDistance++;
        }
        
        player.score += dropDistance * 2;
        this.playSound('drop');
        this.lockPiece(playerIndex);
    }

    lockPiece(playerIndex) {
        const player = this.players[playerIndex];
        if (!player.currentPiece) return;
        
        for (let r = 0; r < player.currentPiece.shape.length; r++) {
            for (let c = 0; c < player.currentPiece.shape[r].length; c++) {
                if (player.currentPiece.shape[r][c]) {
                    const boardY = player.currentPiece.y + r;
                    const boardX = player.currentPiece.x + c;
                    if (boardY < 0) {
                        player.gameOver = true;
                        this.checkGameOver();
                        return;
                    }
                    player.board[boardY][boardX] = player.currentPiece.color;
                }
            }
        }
        
        this.clearLines(playerIndex);
        this.spawnPiece(playerIndex);
    }

    clearLines(playerIndex) {
        const player = this.players[playerIndex];
        const linesToClear = [];
        
        for (let r = BOARD_HEIGHT - 1; r >= 0; r--) {
            if (player.board[r].every(cell => cell !== 0)) {
                linesToClear.push(r);
            }
        }
        
        if (linesToClear.length > 0) {
            const opponentIndex = playerIndex === 0 ? 1 : 0;
            const opponent = this.players[opponentIndex];
            
            linesToClear.forEach(line => {
                player.board.splice(line, 1);
                player.board.unshift(Array(BOARD_WIDTH).fill(0));
                this.createLineClearParticles(playerIndex, line);
            });
            
            const cleared = linesToClear.length;
            player.linesCleared += cleared;
            player.score += SCORE_TABLE[cleared] || 0;
            
            this.playSound('clear');
            
            if (opponent && !opponent.gameOver) {
                this.addPenaltyLines(opponentIndex, cleared);
            }
            
            this.checkWinCondition(playerIndex);
        }
    }

    addPenaltyLines(playerIndex, count) {
        const player = this.players[playerIndex];
        if (!player || player.gameOver) return;
        
        this.playSound('penalty');
        
        const overlay = document.getElementById(`overlay${playerIndex + 1}`);
        overlay.classList.add('penalty');
        setTimeout(() => overlay.classList.remove('penalty'), 500);
        
        for (let i = 0; i < count; i++) {
            const penaltyRow = Array(BOARD_WIDTH).fill('#666');
            const emptyCell = Math.floor(Math.random() * BOARD_WIDTH);
            penaltyRow[emptyCell] = 0;
            
            for (let r = 0; r < BOARD_HEIGHT - 1; r++) {
                player.board[r] = player.board[r + 1];
            }
            player.board[BOARD_HEIGHT - 1] = penaltyRow;
        }
        
        if (player.currentPiece) {
            while (!this.isValidPosition(player, player.currentPiece)) {
                player.currentPiece.y--;
                if (player.currentPiece.y < -10) {
                    player.gameOver = true;
                    this.checkGameOver();
                    return;
                }
            }
        }
    }

    spawnPiece(playerIndex) {
        const player = this.players[playerIndex];
        player.currentPiece = player.nextPiece || this.getRandomTetromino();
        player.nextPiece = this.getRandomTetromino();
        player.currentPiece.x = Math.floor(BOARD_WIDTH / 2) - Math.ceil(player.currentPiece.shape[0].length / 2);
        player.currentPiece.y = -1;
        
        if (!this.isValidPosition(player, player.currentPiece)) {
            player.gameOver = true;
            this.checkGameOver();
        }
        
        if (player.isAI) {
            this.calculateAITarget(playerIndex);
        }
    }

    calculateAITarget(playerIndex) {
        const player = this.players[playerIndex];
        if (!player.currentPiece) return;
        
        const difficulty = DIFFICULTY_CONFIG[this.difficulty];
        const quality = difficulty.aiQuality;
        
        if (Math.random() > quality) {
            player.aiTargetX = Math.floor(Math.random() * BOARD_WIDTH);
            player.aiTargetRotation = Math.floor(Math.random() * 4);
            return;
        }
        
        let bestScore = -Infinity;
        let bestX = player.currentPiece.x;
        let bestRotation = 0;
        
        const originalShape = player.currentPiece.shape.map(row => [...row]);
        
        for (let rotation = 0; rotation < 4; rotation++) {
            const rotatedShape = this.rotateNTimes(originalShape, rotation);
            
            for (let x = -2; x < BOARD_WIDTH + 2; x++) {
                const testPiece = {
                    shape: rotatedShape.map(row => [...row]),
                    x: x,
                    y: -1,
                    color: player.currentPiece.color
                };
                
                if (!this.isValidPosition(player, testPiece)) continue;
                
                while (this.isValidPosition(player, testPiece, 0, 1)) {
                    testPiece.y++;
                }
                
                const testBoard = player.board.map(row => [...row]);
                let validPlacement = true;
                for (let r = 0; r < testPiece.shape.length; r++) {
                    for (let c = 0; c < testPiece.shape[r].length; c++) {
                        if (testPiece.shape[r][c]) {
                            const by = testPiece.y + r;
                            const bx = testPiece.x + c;
                            if (by >= 0 && by < BOARD_HEIGHT && bx >= 0 && bx < BOARD_WIDTH) {
                                testBoard[by][bx] = testPiece.color;
                            } else {
                                validPlacement = false;
                            }
                        }
                    }
                }
                
                if (!validPlacement) continue;
                
                const score = this.evaluateBoard(testBoard, testPiece);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestX = x;
                    bestRotation = rotation;
                }
            }
        }
        
        player.aiTargetX = bestX;
        player.aiTargetRotation = bestRotation;
    }

    rotateNTimes(shape, n) {
        let result = shape.map(row => [...row]);
        for (let i = 0; i < n; i++) {
            result = this.rotate(result);
        }
        return result;
    }

    evaluateBoard(board, piece) {
        let score = 0;
        
        let linesCleared = 0;
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            if (board[r].every(cell => cell !== 0)) {
                linesCleared++;
            }
        }
        score += linesCleared * 1000;
        
        const heights = [];
        for (let c = 0; c < BOARD_WIDTH; c++) {
            let height = 0;
            for (let r = 0; r < BOARD_HEIGHT; r++) {
                if (board[r][c] !== 0) {
                    height = BOARD_HEIGHT - r;
                    break;
                }
            }
            heights.push(height);
        }
        
        const maxHeight = Math.max(...heights);
        score -= maxHeight * 10;
        
        const avgHeight = heights.reduce((a, b) => a + b, 0) / BOARD_WIDTH;
        score -= avgHeight * 5;
        
        let holes = 0;
        for (let c = 0; c < BOARD_WIDTH; c++) {
            let foundBlock = false;
            for (let r = 0; r < BOARD_HEIGHT; r++) {
                if (board[r][c] !== 0) {
                    foundBlock = true;
                } else if (foundBlock && board[r][c] === 0) {
                    holes++;
                }
            }
        }
        score -= holes * 50;
        
        let bumpiness = 0;
        for (let i = 0; i < heights.length - 1; i++) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }
        score -= bumpiness * 3;
        
        score += piece.y * 2;
        
        return score;
    }

    updateAI(playerIndex, deltaTime) {
        const player = this.players[playerIndex];
        if (!player.isAI || player.gameOver || !player.currentPiece) return;
        
        player.aiDecisionTimer += deltaTime;
        const decisionInterval = 50;
        
        if (player.aiDecisionTimer >= decisionInterval) {
            player.aiDecisionTimer = 0;
            
            let currentRotation = 0;
            let testShape = player.currentPiece.shape.map(row => [...row]);
            const originalShape = player.currentPiece.shape.map(row => [...row]);
            
            for (let r = 0; r < 4; r++) {
                if (this.shapesEqual(testShape, this.rotateNTimes(originalShape, player.aiTargetRotation))) {
                    currentRotation = r;
                    break;
                }
                testShape = this.rotate(testShape);
            }
            
            if (currentRotation !== player.aiTargetRotation) {
                this.rotatePiece(playerIndex);
                return;
            }
            
            if (player.currentPiece.x < player.aiTargetX) {
                this.movePiece(playerIndex, 1, 0);
            } else if (player.currentPiece.x > player.aiTargetX) {
                this.movePiece(playerIndex, -1, 0);
            } else {
                this.movePiece(playerIndex, 0, 1);
            }
        }
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

    checkWinCondition(playerIndex) {
        const player = this.players[playerIndex];
        if (player.linesCleared >= this.winLines) {
            this.endGame(playerIndex);
        }
    }

    checkGameOver() {
        const alivePlayers = this.players.filter(p => !p.gameOver);
        if (alivePlayers.length <= 1) {
            if (alivePlayers.length === 1) {
                const winnerIndex = this.players.indexOf(alivePlayers[0]);
                this.endGame(winnerIndex);
            } else {
                this.endGame(-1);
            }
        }
    }

    endGame(winnerIndex) {
        this.gameState = GameState.GAME_OVER;
        
        if (winnerIndex >= 0) {
            const winner = this.players[winnerIndex];
            
            this.streaks[winner.streakKey]++;
            const loserIndex = winnerIndex === 0 ? 1 : 0;
            const loser = this.players[loserIndex];
            if (loser) {
                this.streaks[loser.streakKey] = 0;
            }
            
            this.saveRecords();
            
            this.playSound('victory');
            this.createVictoryParticles();
            this.createConfetti();
            
            document.getElementById('winnerName').textContent = 
                winner.isAI ? 'AI' : `玩家 ${winner.id}`;
            document.getElementById('finalScore').textContent = winner.score;
            document.getElementById('finalLines').textContent = winner.linesCleared;
            document.getElementById('finalStreak').textContent = this.streaks[winner.streakKey];
            
            this.victoryModal.classList.add('show');
        }
    }

    startGame() {
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.gameState = GameState.PLAYING;
        this.startMenu.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        
        this.players = [];
        this.players.push(this.createPlayer(1, false));
        
        const isAI = this.gameMode === 'single';
        this.players.push(this.createPlayer(2, isAI));
        
        this.player2Name.textContent = isAI ? 'AI' : '玩家 2';
        this.targetLinesDisplay.textContent = this.winLines;
        
        this.spawnPiece(0);
        this.spawnPiece(1);
        
        this.updateUI();
    }

    resetGame() {
        this.particles = [];
        this.startGame();
    }

    restartGame() {
        this.victoryModal.classList.remove('show');
        this.pauseModal.classList.remove('show');
        this.resetGame();
    }

    returnToMenu() {
        this.gameState = GameState.MENU;
        this.players = [];
        this.particles = [];
        this.victoryModal.classList.remove('show');
        this.pauseModal.classList.remove('show');
        this.gameScreen.classList.add('hidden');
        this.startMenu.classList.remove('hidden');
        this.updateRecordsDisplay();
    }

    togglePause() {
        if (this.gameState === GameState.PLAYING) {
            this.gameState = GameState.PAUSED;
            this.pauseModal.classList.add('show');
        } else if (this.gameState === GameState.PAUSED) {
            this.gameState = GameState.PLAYING;
            this.pauseModal.classList.remove('show');
        }
    }

    toggleSound(playerId) {
        this.soundEnabled = !this.soundEnabled;
        const icon = this.soundEnabled ? '🔊' : '🔇';
        this.soundToggle1.textContent = icon;
        this.soundToggle2.textContent = icon;
    }

    loadRecords() {
        try {
            const data = localStorage.getItem('tetris_records');
            return data ? JSON.parse(data) : { player1: 0, player2: 0, ai: 0 };
        } catch (e) {
            return { player1: 0, player2: 0, ai: 0 };
        }
    }

    saveRecords() {
        this.records.player1 = Math.max(this.records.player1, this.streaks.player1);
        this.records.player2 = Math.max(this.records.player2, this.streaks.player2);
        this.records.ai = Math.max(this.records.ai, this.streaks.ai);
        
        try {
            localStorage.setItem('tetris_records', JSON.stringify(this.records));
        } catch (e) {
            console.log('Failed to save records');
        }
    }

    updateRecordsDisplay() {
        document.getElementById('recordP1').textContent = this.records.player1;
        document.getElementById('recordP2').textContent = this.records.player2;
        document.getElementById('recordAI').textContent = this.records.ai;
    }

    createLineClearParticles(playerIndex, line) {
        const canvas = playerIndex === 0 ? this.boardCanvas1 : this.boardCanvas2;
        const rect = canvas.getBoundingClientRect();
        const baseX = rect.left;
        const baseY = rect.top + (line * CELL_SIZE) + (CELL_SIZE / 2);
        
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: baseX + Math.random() * rect.width,
                y: baseY,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 5,
                life: 1,
                decay: 0.02,
                color: playerIndex === 0 ? '#00d4ff' : '#ff4757',
                size: Math.random() * 6 + 2
            });
        }
    }

    createVictoryParticles() {
        for (let i = 0; i < 100; i++) {
            const colors = ['#00d4ff', '#ff4757', '#ffd700', '#22c55e', '#a855f7'];
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                decay: 0.005,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 10 + 4
            });
        }
    }

    createConfetti() {
        const container = document.getElementById('confettiContainer');
        container.innerHTML = '';
        
        const colors = ['#00d4ff', '#ff4757', '#ffd700', '#22c55e', '#a855f7', '#f97316'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            container.appendChild(confetti);
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life -= p.decay;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
        
        for (const p of this.particles) {
            this.particleCtx.globalAlpha = p.life;
            this.particleCtx.fillStyle = p.color;
            this.particleCtx.beginPath();
            this.particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.particleCtx.fill();
        }
        
        this.particleCtx.globalAlpha = 1;
    }

    drawBoard(ctx, player) {
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let r = 0; r <= BOARD_HEIGHT; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * CELL_SIZE);
            ctx.lineTo(BOARD_WIDTH * CELL_SIZE, r * CELL_SIZE);
            ctx.stroke();
        }
        for (let c = 0; c <= BOARD_WIDTH; c++) {
            ctx.beginPath();
            ctx.moveTo(c * CELL_SIZE, 0);
            ctx.lineTo(c * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
            ctx.stroke();
        }
        
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < BOARD_WIDTH; c++) {
                if (player.board[r][c]) {
                    this.drawCell(ctx, c, r, player.board[r][c]);
                }
            }
        }
        
        if (player.currentPiece && !player.gameOver) {
            let ghostY = player.currentPiece.y;
            while (this.isValidPosition(player, player.currentPiece, 0, ghostY - player.currentPiece.y + 1)) {
                ghostY++;
            }
            
            ctx.globalAlpha = 0.2;
            for (let r = 0; r < player.currentPiece.shape.length; r++) {
                for (let c = 0; c < player.currentPiece.shape[r].length; c++) {
                    if (player.currentPiece.shape[r][c]) {
                        const x = player.currentPiece.x + c;
                        const y = ghostY + r;
                        if (y >= 0) {
                            this.drawCell(ctx, x, y, player.currentPiece.color);
                        }
                    }
                }
            }
            ctx.globalAlpha = 1;
            
            for (let r = 0; r < player.currentPiece.shape.length; r++) {
                for (let c = 0; c < player.currentPiece.shape[r].length; c++) {
                    if (player.currentPiece.shape[r][c]) {
                        const x = player.currentPiece.x + c;
                        const y = player.currentPiece.y + r;
                        if (y >= 0) {
                            this.drawCell(ctx, x, y, player.currentPiece.color, true);
                        }
                    }
                }
            }
        }
        
        if (player.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('游戏结束', ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
    }

    drawCell(ctx, x, y, color, isActive = false) {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        const padding = 1;
        
        const gradient = ctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.darkenColor(color, 0.3));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(px + padding, py + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2);
        
        if (isActive) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.fillRect(px + padding, py + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2);
            ctx.shadowBlur = 0;
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(px + padding, py + padding, CELL_SIZE - padding * 2, 4);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + padding, py + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2);
    }

    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }

    drawNextPiece(ctx, player) {
        ctx.fillStyle = 'transparent';
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        if (!player.nextPiece) return;
        
        const shape = player.nextPiece.shape;
        const pieceWidth = shape[0].length * CELL_SIZE;
        const pieceHeight = shape.length * CELL_SIZE;
        const offsetX = (ctx.canvas.width - pieceWidth) / 2;
        const offsetY = (ctx.canvas.height - pieceHeight) / 2;
        
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const px = offsetX + c * CELL_SIZE;
                    const py = offsetY + r * CELL_SIZE;
                    const padding = 1;
                    
                    const gradient = ctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE);
                    gradient.addColorStop(0, player.nextPiece.color);
                    gradient.addColorStop(1, this.darkenColor(player.nextPiece.color, 0.3));
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(px + padding, py + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2);
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(px + padding, py + padding, CELL_SIZE - padding * 2, 3);
                }
            }
        }
    }

    updateUI() {
        if (this.players[0]) {
            document.getElementById('score1').textContent = this.players[0].score;
            document.getElementById('lines1').textContent = this.players[0].linesCleared;
            document.getElementById('streak1').textContent = this.streaks.player1;
            this.drawNextPiece(this.nextCtx1, this.players[0]);
        }
        
        if (this.players[1]) {
            document.getElementById('score2').textContent = this.players[1].score;
            document.getElementById('lines2').textContent = this.players[1].linesCleared;
            document.getElementById('streak2').textContent = this.streaks[this.players[1].isAI ? 'ai' : 'player2'];
            this.drawNextPiece(this.nextCtx2, this.players[1]);
        }
    }

    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === GameState.PLAYING) {
            const speed = SPEED_CONFIG[this.speedMode];
            const diffMultiplier = DIFFICULTY_CONFIG[this.difficulty].aiDropMultiplier;
            
            this.players.forEach((player, index) => {
                if (player.gameOver) return;
                
                player.dropTimer += deltaTime;
                const dropSpeed = player.isAI ? speed.aiDrop * diffMultiplier : speed.drop;
                
                if (player.isAI) {
                    this.updateAI(index, deltaTime);
                }
                
                if (player.dropTimer >= dropSpeed) {
                    player.dropTimer = 0;
                    if (!this.movePiece(index, 0, 1)) {
                        this.lockPiece(index);
                    }
                }
            });
            
            this.updateUI();
        }
        
        this.drawBoard(this.boardCtx1, this.players[0] || this.createPlayer(1));
        this.drawBoard(this.boardCtx2, this.players[1] || this.createPlayer(2));
        
        this.updateParticles(deltaTime);
        this.drawParticles();
        
        this.animationFrame = requestAnimationFrame((t) => this.gameLoop(t));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new TetrisGame();
});
