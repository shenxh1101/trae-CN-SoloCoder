/* ============================================
 * 4x4 井字棋强化版 - 游戏逻辑
 * 包含：游戏引擎、AI算法、音效管理、存储管理、UI管理
 * ============================================ */

(function() {
    'use strict';

    /* ============================================
     * 常量定义
     * ============================================ */

    const BOARD_SIZE = 4;
    const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;
    const TIME_LIMIT = 30; // 每步限时30秒

    // 获胜线定义（共10条）
    const WINNING_LINES = [
        [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], // 横向
        [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], // 纵向
        [0, 5, 10, 15], [3, 6, 9, 12] // 对角线
    ];

    // 玩家标识
    const PLAYER = {
        NONE: 0,
        X: 1,
        O: 2
    };

    // 游戏模式
    const GAME_MODE = {
        PVE: 'pve',
        PVP: 'pvp'
    };

    // AI难度
    const DIFFICULTY = {
        EASY: 'easy',
        HARD: 'hard'
    };

    // 主题
    const THEME = {
        CLASSIC: 'classic',
        DARK: 'dark',
        WOOD: 'wood'
    };

    /* ============================================
     * 存储管理模块
     * ============================================ */

    const StorageManager = {
        KEYS: {
            SCORES: 'tictactoe_scores',
            SETTINGS: 'tictactoe_settings'
        },

        getScores() {
            try {
                const saved = localStorage.getItem(this.KEYS.SCORES);
                return saved ? JSON.parse(saved) : {
                    player1: 0,
                    player2: 0,
                    draws: 0
                };
            } catch (e) {
                return { player1: 0, player2: 0, draws: 0 };
            }
        },

        saveScores(scores) {
            try {
                localStorage.setItem(this.KEYS.SCORES, JSON.stringify(scores));
            } catch (e) {
                console.warn('无法保存分数:', e);
            }
        },

        getSettings() {
            try {
                const saved = localStorage.getItem(this.KEYS.SETTINGS);
                return saved ? JSON.parse(saved) : {
                    theme: THEME.CLASSIC,
                    soundEnabled: true,
                    gameMode: GAME_MODE.PVE,
                    difficulty: DIFFICULTY.EASY,
                    firstPlayer: PLAYER.X
                };
            } catch (e) {
                return {
                    theme: THEME.CLASSIC,
                    soundEnabled: true,
                    gameMode: GAME_MODE.PVE,
                    difficulty: DIFFICULTY.EASY,
                    firstPlayer: PLAYER.X
                };
            }
        },

        saveSettings(settings) {
            try {
                localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
            } catch (e) {
                console.warn('无法保存设置:', e);
            }
        },

        resetScores() {
            this.saveScores({ player1: 0, player2: 0, draws: 0 });
        }
    };

    /* ============================================
     * 音效管理模块
     * ============================================ */

    const AudioManager = {
        audioContext: null,
        enabled: true,

        init() {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API 不支持:', e);
            }
        },

        resumeContext() {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        },

        setEnabled(enabled) {
            this.enabled = enabled;
        },

        playTone(frequency, duration, type = 'sine', volume = 0.3) {
            if (!this.enabled || !this.audioContext) return;

            try {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.type = type;
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

                gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration);
            } catch (e) {
                console.warn('播放音效失败:', e);
            }
        },

        playPlaceSound(player) {
            const freq = player === PLAYER.X ? 523.25 : 659.25; // C5 或 E5
            this.playTone(freq, 0.15, 'sine', 0.2);
        },

        playWinSound() {
            if (!this.enabled || !this.audioContext) return;

            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    this.playTone(freq, 0.2, 'sine', 0.25);
                }, i * 120);
            });
        },

        playDrawSound() {
            if (!this.enabled || !this.audioContext) return;

            const notes = [392, 349.23, 311.13]; // G4, F4, Eb4
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    this.playTone(freq, 0.15, 'triangle', 0.15);
                }, i * 100);
            });
        },

        playErrorSound() {
            this.playTone(200, 0.1, 'sawtooth', 0.15);
        },

        playTimeoutSound() {
            if (!this.enabled || !this.audioContext) return;

            const notes = [440, 415.30, 392, 369.99]; // 下降音阶
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    this.playTone(freq, 0.15, 'square', 0.1);
                }, i * 80);
            });
        }
    };

    /* ============================================
     * AI 策略模块
     * ============================================ */

    const AIStrategy = {
        checkWin(board, player) {
            for (const line of WINNING_LINES) {
                if (line.every(index => board[index] === player)) {
                    return line;
                }
            }
            return null;
        },

        isBoardFull(board) {
            return board.every(cell => cell !== PLAYER.NONE);
        },

        getEmptyCells(board) {
            return board.map((cell, index) => cell === PLAYER.NONE ? index : -1)
                       .filter(index => index !== -1);
        },

        getEasyMove(board, aiPlayer) {
            const humanPlayer = aiPlayer === PLAYER.X ? PLAYER.O : PLAYER.X;
            const emptyCells = this.getEmptyCells(board);

            if (emptyCells.length === 0) return -1;

            // 1. 检查AI是否能直接获胜
            for (const cell of emptyCells) {
                const testBoard = [...board];
                testBoard[cell] = aiPlayer;
                if (this.checkWin(testBoard, aiPlayer)) {
                    return cell;
                }
            }

            // 2. 阻止玩家获胜
            for (const cell of emptyCells) {
                const testBoard = [...board];
                testBoard[cell] = humanPlayer;
                if (this.checkWin(testBoard, humanPlayer)) {
                    return cell;
                }
            }

            // 3. 优先占据中心位置
            const centerCells = [5, 6, 9, 10];
            const emptyCenters = centerCells.filter(c => board[c] === PLAYER.NONE);
            if (emptyCenters.length > 0 && Math.random() > 0.3) {
                return emptyCenters[Math.floor(Math.random() * emptyCenters.length)];
            }

            // 4. 随机落子
            return emptyCells[Math.floor(Math.random() * emptyCells.length)];
        },

        minimax(board, depth, isMaximizing, alpha, beta, aiPlayer, humanPlayer, maxDepth = 6) {
            const aiWin = this.checkWin(board, aiPlayer);
            const humanWin = this.checkWin(board, humanPlayer);
            const isFull = this.isBoardFull(board);

            if (aiWin) return 100 - depth;
            if (humanWin) return depth - 100;
            if (isFull || depth >= maxDepth) return 0;

            const emptyCells = this.getEmptyCells(board);

            if (isMaximizing) {
                let maxEval = -Infinity;
                for (const cell of emptyCells) {
                    board[cell] = aiPlayer;
                    const evalScore = this.minimax(board, depth + 1, false, alpha, beta, aiPlayer, humanPlayer, maxDepth);
                    board[cell] = PLAYER.NONE;
                    maxEval = Math.max(maxEval, evalScore);
                    alpha = Math.max(alpha, evalScore);
                    if (beta <= alpha) break;
                }
                return maxEval;
            } else {
                let minEval = Infinity;
                for (const cell of emptyCells) {
                    board[cell] = humanPlayer;
                    const evalScore = this.minimax(board, depth + 1, true, alpha, beta, aiPlayer, humanPlayer, maxDepth);
                    board[cell] = PLAYER.NONE;
                    minEval = Math.min(minEval, evalScore);
                    beta = Math.min(beta, evalScore);
                    if (beta <= alpha) break;
                }
                return minEval;
            }
        },

        getHardMove(board, aiPlayer) {
            const humanPlayer = aiPlayer === PLAYER.X ? PLAYER.O : PLAYER.X;
            const emptyCells = this.getEmptyCells(board);

            if (emptyCells.length === 0) return -1;

            let bestScore = -Infinity;
            let bestMove = emptyCells[0];

            const maxDepth = emptyCells.length > 10 ? 4 : emptyCells.length > 6 ? 5 : 6;

            for (const cell of emptyCells) {
                const newBoard = [...board];
                newBoard[cell] = aiPlayer;
                const score = this.minimax(newBoard, 0, false, -Infinity, Infinity, aiPlayer, humanPlayer, maxDepth);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = cell;
                }
            }

            return bestMove;
        },

        getMove(board, aiPlayer, difficulty) {
            if (difficulty === DIFFICULTY.EASY) {
                return this.getEasyMove(board, aiPlayer);
            } else {
                return this.getHardMove(board, aiPlayer);
            }
        }
    };

    /* ============================================
     * 游戏引擎模块
     * ============================================ */

    const GameEngine = {
        state: null,
        timerInterval: null,
        history: [],

        init() {
            const savedSettings = StorageManager.getSettings();
            const savedScores = StorageManager.getScores();

            this.state = {
                board: new Array(TOTAL_CELLS).fill(PLAYER.NONE),
                currentPlayer: savedSettings.firstPlayer,
                gameMode: savedSettings.gameMode,
                difficulty: savedSettings.difficulty,
                firstPlayer: savedSettings.firstPlayer,
                isGameOver: false,
                winner: null,
                winningLine: null,
                timeLeft: TIME_LIMIT,
                scores: savedScores,
                settings: savedSettings,
                aiPlayer: PLAYER.O
            };

            this.history = [];
            AudioManager.setEnabled(savedSettings.soundEnabled);
        },

        resetGame(keepScores = true) {
            this.stopTimer();
            
            this.state.board = new Array(TOTAL_CELLS).fill(PLAYER.NONE);
            this.state.currentPlayer = this.state.firstPlayer;
            this.state.isGameOver = false;
            this.state.winner = null;
            this.state.winningLine = null;
            this.state.timeLeft = TIME_LIMIT;
            this.history = [];

            if (!keepScores) {
                this.state.scores = { player1: 0, player2: 0, draws: 0 };
                StorageManager.saveScores(this.state.scores);
            }
        },

        makeMove(index) {
            if (this.state.isGameOver || this.state.board[index] !== PLAYER.NONE) {
                return { success: false };
            }

            this.saveHistory();

            this.state.board[index] = this.state.currentPlayer;

            const winningLine = AIStrategy.checkWin(this.state.board, this.state.currentPlayer);
            if (winningLine) {
                this.state.isGameOver = true;
                this.state.winner = this.state.currentPlayer;
                this.state.winningLine = winningLine;
                this.stopTimer();
                this.updateScores(this.state.currentPlayer);
                return { success: true, win: true, winningLine, player: this.state.currentPlayer };
            }

            if (AIStrategy.isBoardFull(this.state.board)) {
                this.state.isGameOver = true;
                this.state.winner = 'draw';
                this.stopTimer();
                this.updateScores('draw');
                return { success: true, draw: true };
            }

            this.switchPlayer();
            return { success: true, nextPlayer: this.state.currentPlayer };
        },

        saveHistory() {
            this.history.push({
                board: [...this.state.board],
                currentPlayer: this.state.currentPlayer,
                timeLeft: this.state.timeLeft
            });

            if (this.history.length > 50) {
                this.history.shift();
            }
        },

        undoMove() {
            if (this.history.length === 0) return false;

            this.stopTimer();

            const lastState = this.history.pop();
            this.state.board = lastState.board;
            this.state.currentPlayer = lastState.currentPlayer;
            this.state.timeLeft = lastState.timeLeft;
            this.state.isGameOver = false;
            this.state.winner = null;
            this.state.winningLine = null;

            return true;
        },

        switchPlayer() {
            this.state.currentPlayer = this.state.currentPlayer === PLAYER.X ? PLAYER.O : PLAYER.X;
            this.state.timeLeft = TIME_LIMIT;
            this.resetTimer();
        },

        updateScores(winner) {
            if (winner === PLAYER.X) {
                this.state.scores.player1++;
            } else if (winner === PLAYER.O) {
                this.state.scores.player2++;
            } else if (winner === 'draw') {
                this.state.scores.draws++;
            }
            StorageManager.saveScores(this.state.scores);
        },

        setGameMode(mode) {
            this.state.gameMode = mode;
            this.state.settings.gameMode = mode;
            StorageManager.saveSettings(this.state.settings);
            this.resetGame();
        },

        setDifficulty(difficulty) {
            this.state.difficulty = difficulty;
            this.state.settings.difficulty = difficulty;
            StorageManager.saveSettings(this.state.settings);
        },

        setFirstPlayer(player) {
            this.state.firstPlayer = player;
            this.state.settings.firstPlayer = player;
            StorageManager.saveSettings(this.state.settings);
            this.resetGame();
        },

        setTheme(theme) {
            this.state.settings.theme = theme;
            StorageManager.saveSettings(this.state.settings);
        },

        setSoundEnabled(enabled) {
            this.state.settings.soundEnabled = enabled;
            StorageManager.saveSettings(this.state.settings);
            AudioManager.setEnabled(enabled);
        },

        startTimer() {
            this.stopTimer();
            this.timerInterval = setInterval(() => {
                this.state.timeLeft--;
                
                if (this.state.timeLeft <= 0) {
                    this.handleTimeout();
                }
            }, 1000);
        },

        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        },

        resetTimer() {
            this.startTimer();
        },

        handleTimeout() {
            this.stopTimer();
            this.state.isGameOver = true;
            
            const winner = this.state.currentPlayer === PLAYER.X ? PLAYER.O : PLAYER.X;
            this.state.winner = winner;
            this.updateScores(winner);
            
            UIManager.showTimeoutWin(winner);
        },

        isAITurn() {
            return this.state.gameMode === GAME_MODE.PVE && 
                   this.state.currentPlayer === this.state.aiPlayer;
        },

        makeAIMove() {
            if (this.state.isGameOver) return;

            const aiPlayer = this.state.aiPlayer;
            const move = AIStrategy.getMove(this.state.board, aiPlayer, this.state.difficulty);
            
            if (move !== -1) {
                setTimeout(() => {
                    const result = this.makeMove(move);
                    UIManager.handleMoveResult(result, move);
                }, 400 + Math.random() * 200);
            }
        }
    };

    /* ============================================
     * UI 管理模块
     * ============================================ */

    const UIManager = {
        elements: {},

        init() {
            this.cacheElements();
            this.bindEvents();
            this.applyTheme(GameEngine.state.settings.theme);
            this.updateUI();
            GameEngine.startTimer();

            if (GameEngine.isAITurn()) {
                GameEngine.makeAIMove();
            }
        },

        cacheElements() {
            this.elements = {
                board: document.getElementById('board'),
                cells: document.querySelectorAll('.cell'),
                currentTurn: document.getElementById('currentTurn'),
                turnText: document.getElementById('turnText'),
                timerText: document.getElementById('timerText'),
                timerProgress: document.getElementById('timerProgress'),
                score1: document.getElementById('score1'),
                score2: document.getElementById('score2'),
                scoreDraws: document.getElementById('scoreDraws'),
                player2Name: document.getElementById('player2Name'),
                player1Score: document.getElementById('player1Score'),
                player2Score: document.getElementById('player2Score'),
                undoBtn: document.getElementById('undoBtn'),
                resetBtn: document.getElementById('resetBtn'),
                playAgainBtn: document.getElementById('playAgainBtn'),
                resetScoresBtn: document.getElementById('resetScoresBtn'),
                winOverlay: document.getElementById('winOverlay'),
                winText: document.getElementById('winText'),
                winIcon: document.getElementById('winIcon'),
                modeBtns: document.querySelectorAll('.mode-btn'),
                firstBtns: document.querySelectorAll('.first-btn'),
                firstPlayer1Label: document.getElementById('firstPlayer1Label'),
                firstPlayer2Label: document.getElementById('firstPlayer2Label'),
                difficultySlider: document.getElementById('difficultySlider'),
                difficultyGroup: document.getElementById('difficultyGroup'),
                soundToggle: document.getElementById('soundToggle'),
                themeCards: document.querySelectorAll('.theme-card'),
                tabBtns: document.querySelectorAll('.tab-btn'),
                tabContents: document.querySelectorAll('.tab-content')
            };
        },

        bindEvents() {
            this.elements.cells.forEach((cell, index) => {
                cell.addEventListener('click', () => this.handleCellClick(index));
                cell.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.handleCellClick(index);
                }, { passive: false });
                cell.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.handleCellClick(index);
                    }
                });
            });

            this.elements.modeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.mode;
                    this.setGameMode(mode);
                });
            });

            this.elements.firstBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const first = parseInt(btn.dataset.first);
                    this.setFirstPlayer(first);
                });
            });

            this.elements.difficultySlider.addEventListener('input', (e) => {
                const difficulty = e.target.value === '0' ? DIFFICULTY.EASY : DIFFICULTY.HARD;
                GameEngine.setDifficulty(difficulty);
            });

            this.elements.soundToggle.addEventListener('change', (e) => {
                GameEngine.setSoundEnabled(e.target.checked);
                AudioManager.resumeContext();
            });

            this.elements.themeCards.forEach(card => {
                card.addEventListener('click', () => {
                    const theme = card.dataset.theme;
                    this.setTheme(theme);
                });
            });

            this.elements.tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.dataset.tab;
                    this.switchTab(tab);
                });
            });

            this.elements.undoBtn.addEventListener('click', () => this.handleUndo());
            this.elements.resetBtn.addEventListener('click', () => this.handleReset());
            this.elements.playAgainBtn.addEventListener('click', () => this.handleReset());
            this.elements.resetScoresBtn.addEventListener('click', () => this.handleResetScores());

            document.addEventListener('click', () => AudioManager.resumeContext(), { once: true });
        },

        handleCellClick(index) {
            if (GameEngine.state.isGameOver) return;
            if (GameEngine.isAITurn()) return;
            if (GameEngine.state.board[index] !== PLAYER.NONE) {
                AudioManager.playErrorSound();
                return;
            }

            AudioManager.resumeContext();

            const result = GameEngine.makeMove(index);
            this.handleMoveResult(result, index);
        },

        handleMoveResult(result, index) {
            if (!result.success) {
                AudioManager.playErrorSound();
                return;
            }

            AudioManager.playPlaceSound(GameEngine.state.board[index] || result.player);

            this.updateBoard();
            this.updateTimerUI();
            this.updateTurnUI();
            this.updateUndoButton();

            if (result.win) {
                this.highlightWinningLine(result.winningLine);
                this.showWinOverlay(result.player);
                AudioManager.playWinSound();
                this.updateScoresUI(true);
            } else if (result.draw) {
                this.showWinOverlay('draw');
                AudioManager.playDrawSound();
                this.updateScoresUI(true);
            } else if (GameEngine.isAITurn() && !GameEngine.state.isGameOver) {
                this.disableBoard();
                GameEngine.makeAIMove();
            } else {
                this.enableBoard();
            }
        },

        handleUndo() {
            let undoCount = 1;
            
            if (GameEngine.state.gameMode === GAME_MODE.PVE) {
                if (GameEngine.state.isGameOver) {
                    if (GameEngine.history.length >= 2) {
                        undoCount = 2;
                    }
                } else if (GameEngine.history.length >= 2 && !GameEngine.isAITurn()) {
                    undoCount = 2;
                }
            }

            let success = false;
            for (let i = 0; i < undoCount; i++) {
                if (GameEngine.undoMove()) {
                    success = true;
                }
            }

            if (success) {
                GameEngine.state.timeLeft = TIME_LIMIT;
                this.updateBoard();
                this.updateTurnUI();
                this.updateTimerUI();
                this.updateUndoButton();
                this.hideWinOverlay();
                this.enableBoard();
                GameEngine.startTimer();
            }
        },

        handleReset() {
            GameEngine.resetGame();
            this.updateBoard();
            this.updateTurnUI();
            this.updateTimerUI();
            this.updateUndoButton();
            this.hideWinOverlay();
            this.enableBoard();
            GameEngine.startTimer();

            if (GameEngine.isAITurn()) {
                GameEngine.makeAIMove();
            }
        },

        handleResetScores() {
            if (confirm('确定要清空所有胜场记录吗？此操作不可撤销。')) {
                StorageManager.resetScores();
                GameEngine.state.scores = { player1: 0, player2: 0, draws: 0 };
                this.updateScoresUI();
            }
        },

        setGameMode(mode) {
            this.elements.modeBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });

            if (mode === GAME_MODE.PVE) {
                this.elements.difficultyGroup.style.display = 'flex';
                this.elements.player2Name.textContent = '电脑';
                this.elements.firstPlayer2Label.textContent = '电脑';
                GameEngine.state.aiPlayer = GameEngine.state.firstPlayer === PLAYER.X ? PLAYER.O : PLAYER.X;
            } else {
                this.elements.difficultyGroup.style.display = 'none';
                this.elements.player2Name.textContent = '玩家 2';
                this.elements.firstPlayer2Label.textContent = '玩家 2';
            }

            GameEngine.setGameMode(mode);
            this.updateBoard();
            this.updateTurnUI();
            this.updateTimerUI();
            this.updateUndoButton();
            this.hideWinOverlay();
            this.enableBoard();
            GameEngine.startTimer();

            if (GameEngine.isAITurn()) {
                GameEngine.makeAIMove();
            }
        },

        setFirstPlayer(player) {
            this.elements.firstBtns.forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.first) === player);
            });

            if (GameEngine.state.gameMode === GAME_MODE.PVE) {
                GameEngine.state.aiPlayer = player === PLAYER.X ? PLAYER.O : PLAYER.X;
            }

            GameEngine.setFirstPlayer(player);
            this.updateBoard();
            this.updateTurnUI();
            this.updateTimerUI();
            this.updateUndoButton();
            this.hideWinOverlay();
            this.enableBoard();
            GameEngine.startTimer();

            if (GameEngine.isAITurn()) {
                GameEngine.makeAIMove();
            }
        },

        setTheme(theme) {
            this.elements.themeCards.forEach(card => {
                card.classList.toggle('active', card.dataset.theme === theme);
            });

            GameEngine.setTheme(theme);
            this.applyTheme(theme);
        },

        applyTheme(theme) {
            document.body.className = `theme-${theme}`;
            this.elements.cells.forEach(cell => {
                cell.classList.remove('preview-x', 'preview-o');
            });
            this.updatePreviewClass();
        },

        switchTab(tab) {
            this.elements.tabBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tab);
            });

            this.elements.tabContents.forEach(content => {
                content.classList.toggle('active', content.id === `${tab}Tab`);
            });
        },

        updateUI() {
            const settings = GameEngine.state.settings;

            this.elements.modeBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === settings.gameMode);
            });

            this.elements.firstBtns.forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.first) === settings.firstPlayer);
            });

            this.elements.difficultySlider.value = settings.difficulty === DIFFICULTY.EASY ? 0 : 1;
            this.elements.soundToggle.checked = settings.soundEnabled;

            this.elements.themeCards.forEach(card => {
                card.classList.toggle('active', card.dataset.theme === settings.theme);
            });

            if (settings.gameMode === GAME_MODE.PVE) {
                this.elements.difficultyGroup.style.display = 'flex';
                this.elements.player2Name.textContent = '电脑';
                this.elements.firstPlayer2Label.textContent = '电脑';
                GameEngine.state.aiPlayer = settings.firstPlayer === PLAYER.X ? PLAYER.O : PLAYER.X;
            } else {
                this.elements.difficultyGroup.style.display = 'none';
                this.elements.player2Name.textContent = '玩家 2';
                this.elements.firstPlayer2Label.textContent = '玩家 2';
            }

            this.updateBoard();
            this.updateScoresUI();
            this.updateTurnUI();
            this.updateTimerUI();
            this.updateUndoButton();
        },

        updateBoard() {
            const board = GameEngine.state.board;

            this.elements.cells.forEach((cell, index) => {
                cell.classList.remove('has-piece', 'win', 'disabled');
                cell.innerHTML = '';
                cell.removeAttribute('aria-label');

                if (board[index] !== PLAYER.NONE) {
                    cell.classList.add('has-piece');
                    const piece = document.createElement('span');
                    piece.className = `cell-piece ${board[index] === PLAYER.X ? 'x' : 'o'}`;
                    piece.textContent = board[index] === PLAYER.X ? 'X' : 'O';
                    cell.appendChild(piece);
                    cell.setAttribute('aria-label', `${board[index] === PLAYER.X ? 'X' : 'O'} 棋子`);
                }

                if (GameEngine.state.isGameOver) {
                    cell.classList.add('disabled');
                }
            });

            this.updatePreviewClass();
        },

        updatePreviewClass() {
            const currentPlayer = GameEngine.state.currentPlayer;
            this.elements.cells.forEach(cell => {
                cell.classList.remove('preview-x', 'preview-o');
                if (!cell.classList.contains('has-piece')) {
                    cell.classList.add(currentPlayer === PLAYER.X ? 'preview-x' : 'preview-o');
                }
            });
        },

        highlightWinningLine(line) {
            if (!line) return;

            line.forEach(index => {
                this.elements.cells[index].classList.add('win');
            });
        },

        updateTurnUI() {
            const state = GameEngine.state;
            let playerName = '';
            let playerMark = '';

            if (state.currentPlayer === PLAYER.X) {
                playerName = state.gameMode === GAME_MODE.PVE ? '玩家' : '玩家 1';
                playerMark = 'X';
                this.elements.currentTurn.className = 'current-turn player1';
                this.elements.player1Score.classList.add('active');
                this.elements.player2Score.classList.remove('active');
            } else {
                playerName = state.gameMode === GAME_MODE.PVE ? '电脑' : '玩家 2';
                playerMark = 'O';
                this.elements.currentTurn.className = 'current-turn player2';
                this.elements.player1Score.classList.remove('active');
                this.elements.player2Score.classList.add('active');
            }

            this.elements.turnText.textContent = `${playerName} (${playerMark}) 的回合`;
        },

        updateTimerUI() {
            const timeLeft = GameEngine.state.timeLeft;
            const progress = document.getElementById('timerProgress');
            const text = document.getElementById('timerText');

            const circumference = 2 * Math.PI * 45;
            const offset = circumference * (1 - timeLeft / TIME_LIMIT);

            progress.style.strokeDashoffset = offset;
            text.textContent = timeLeft;

            progress.classList.remove('warning', 'danger');
            if (timeLeft <= 5) {
                progress.classList.add('danger');
            } else if (timeLeft <= 10) {
                progress.classList.add('warning');
            }
        },

        updateScoresUI(animate = false) {
            const scores = GameEngine.state.scores;
            
            this.elements.score1.textContent = scores.player1;
            this.elements.score2.textContent = scores.player2;
            this.elements.scoreDraws.textContent = scores.draws;

            if (animate) {
                this.elements.score1.classList.add('animate');
                this.elements.score2.classList.add('animate');
                this.elements.scoreDraws.classList.add('animate');

                setTimeout(() => {
                    this.elements.score1.classList.remove('animate');
                    this.elements.score2.classList.remove('animate');
                    this.elements.scoreDraws.classList.remove('animate');
                }, 300);
            }
        },

        updateUndoButton() {
            const canUndo = GameEngine.history.length > 0;
            this.elements.undoBtn.disabled = !canUndo || GameEngine.isAITurn();
        },

        showWinOverlay(winner) {
            const overlay = this.elements.winOverlay;
            const text = this.elements.winText;
            const icon = this.elements.winIcon;

            if (winner === 'draw') {
                text.textContent = '平局！';
                icon.textContent = '🤝';
            } else {
                let playerName = '';
                if (winner === PLAYER.X) {
                    playerName = GameEngine.state.gameMode === GAME_MODE.PVE ? '玩家 (X)' : '玩家 1 (X)';
                } else {
                    playerName = GameEngine.state.gameMode === GAME_MODE.PVE ? '电脑 (O)' : '玩家 2 (O)';
                }
                text.textContent = `${playerName} 获胜！`;
                icon.textContent = '🎉';
            }

            overlay.classList.add('show');
        },

        showTimeoutWin(winner) {
            AudioManager.playTimeoutSound();
            this.updateScoresUI(true);
            this.updateBoard();

            const overlay = this.elements.winOverlay;
            const text = this.elements.winText;
            const icon = this.elements.winIcon;

            let winnerName = '';
            if (winner === PLAYER.X) {
                winnerName = GameEngine.state.gameMode === GAME_MODE.PVE ? '玩家 (X)' : '玩家 1 (X)';
            } else {
                winnerName = GameEngine.state.gameMode === GAME_MODE.PVE ? '电脑 (O)' : '玩家 2 (O)';
            }

            text.textContent = `时间到！${winnerName} 获胜！`;
            icon.textContent = '⏰';
            overlay.classList.add('show');
        },

        hideWinOverlay() {
            this.elements.winOverlay.classList.remove('show');
        },

        disableBoard() {
            this.elements.cells.forEach(cell => {
                if (!cell.classList.contains('has-piece')) {
                    cell.classList.add('disabled');
                }
            });
        },

        enableBoard() {
            this.elements.cells.forEach(cell => {
                cell.classList.remove('disabled');
            });
        }
    };

    /* ============================================
     * 初始化
     * ============================================ */

    let timerUIInterval = null;

    function init() {
        AudioManager.init();
        GameEngine.init();
        UIManager.init();

        if (timerUIInterval) clearInterval(timerUIInterval);
        timerUIInterval = setInterval(() => {
            if (!GameEngine.state.isGameOver) {
                UIManager.updateTimerUI();
            }
        }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
