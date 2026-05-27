class Minesweeper {
    constructor() {
        this.rows = 9;
        this.cols = 9;
        this.mines = 10;
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.questioned = [];
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        this.timer = 0;
        this.timerInterval = null;
        this.timerStartTime = null;
        this.minesLeft = this.mines;
        this.difficulty = 'easy';
        this.soundEnabled = true;
        this.questionMarkEnabled = true;
        this.autoSaveEnabled = true;
        this.audioContext = null;
        this.longPressTimer = null;
        this.lastTap = 0;
        this.touchStartPos = null;
        this.touchStartTime = null;
        this.isLongPressTriggered = false;

        this.init();
    }

    init() {
        this.loadSettings();
        this.loadHighScores();
        this.bindEvents();
        
        if (this.autoSaveEnabled && this.hasSavedGame()) {
            this.showRestoreModal();
        } else {
            this.newGame();
        }
    }

    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        this.initAudio();
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            switch(type) {
                case 'reveal':
                    oscillator.frequency.value = 440;
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.05);
                    break;
                case 'flag':
                    oscillator.frequency.value = 660;
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.08);
                    break;
                case 'win':
                    const notes = [523, 659, 784, 1047];
                    notes.forEach((freq, i) => {
                        const osc = this.audioContext.createOscillator();
                        const gain = this.audioContext.createGain();
                        osc.connect(gain);
                        gain.connect(this.audioContext.destination);
                        osc.frequency.value = freq;
                        gain.gain.value = 0.1;
                        osc.start(this.audioContext.currentTime + i * 0.15);
                        osc.stop(this.audioContext.currentTime + i * 0.15 + 0.15);
                    });
                    break;
                case 'lose':
                    oscillator.frequency.value = 200;
                    oscillator.type = 'sawtooth';
                    gainNode.gain.value = 0.15;
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.3);
                    break;
            }
        } catch (e) {
            console.log('Audio error:', e);
        }
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('minesweeper_settings') || '{}');
            this.soundEnabled = settings.sound !== false;
            this.questionMarkEnabled = settings.questionMark !== false;
            this.autoSaveEnabled = settings.autoSave !== false;
            
            if (settings.darkTheme) {
                document.body.classList.add('dark-theme');
            }
            
            document.getElementById('soundToggle').checked = this.soundEnabled;
            document.getElementById('themeToggle').checked = settings.darkTheme || false;
            document.getElementById('questionMarkToggle').checked = this.questionMarkEnabled;
            document.getElementById('autoSaveToggle').checked = this.autoSaveEnabled;
        } catch (e) {
            console.log('Load settings error:', e);
        }
    }

    saveSettings() {
        try {
            const settings = {
                sound: this.soundEnabled,
                darkTheme: document.body.classList.contains('dark-theme'),
                questionMark: this.questionMarkEnabled,
                autoSave: this.autoSaveEnabled
            };
            localStorage.setItem('minesweeper_settings', JSON.stringify(settings));
        } catch (e) {
            console.log('Save settings error:', e);
        }
    }

    loadHighScores() {
        try {
            const scores = JSON.parse(localStorage.getItem('minesweeper_highscores') || '{}');
            document.getElementById('easyScore').textContent = scores.easy ? scores.easy + 's' : '--';
            document.getElementById('mediumScore').textContent = scores.medium ? scores.medium + 's' : '--';
            document.getElementById('hardScore').textContent = scores.hard ? scores.hard + 's' : '--';
        } catch (e) {
            console.log('Load high scores error:', e);
        }
    }

    saveHighScore(difficulty, time) {
        try {
            const scores = JSON.parse(localStorage.getItem('minesweeper_highscores') || '{}');
            if (!scores[difficulty] || time < scores[difficulty]) {
                scores[difficulty] = time;
                localStorage.setItem('minesweeper_highscores', JSON.stringify(scores));
                this.loadHighScores();
                return true;
            }
        } catch (e) {
            console.log('Save high score error:', e);
        }
        return false;
    }

    bindEvents() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('faceBtn').addEventListener('click', () => this.newGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.hideModal('gameOverModal');
            this.newGame();
        });
        
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                this.showModal('settingsModal');
            } else {
                this.setDifficulty(e.target.value);
            }
        });

        document.getElementById('settingsBtn').addEventListener('click', () => this.showModal('settingsModal'));
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.hideModal('settingsModal'));

        document.getElementById('soundToggle').addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('themeToggle').addEventListener('change', (e) => {
            document.body.classList.toggle('dark-theme', e.target.checked);
            this.saveSettings();
        });

        document.getElementById('questionMarkToggle').addEventListener('change', (e) => {
            this.questionMarkEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('autoSaveToggle').addEventListener('change', (e) => {
            this.autoSaveEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('applyCustomBtn').addEventListener('click', () => this.applyCustomDifficulty());

        document.getElementById('restoreGameBtn').addEventListener('click', () => {
            this.hideModal('restoreModal');
            this.restoreGame();
        });

        document.getElementById('newGameFromRestoreBtn').addEventListener('click', () => {
            this.hideModal('restoreModal');
            this.clearSavedGame();
            this.newGame();
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal && modal.id !== 'restoreModal') {
                    this.hideModal(modal.id);
                }
            });
        });

        document.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('cell')) {
                e.preventDefault();
            }
        });
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        switch(difficulty) {
            case 'easy':
                this.rows = 9;
                this.cols = 9;
                this.mines = 10;
                break;
            case 'medium':
                this.rows = 16;
                this.cols = 16;
                this.mines = 40;
                break;
            case 'hard':
                this.rows = 16;
                this.cols = 30;
                this.mines = 99;
                break;
        }
        document.getElementById('difficultySelect').value = difficulty;
        this.newGame();
    }

    applyCustomDifficulty() {
        const rows = parseInt(document.getElementById('customRows').value) || 9;
        const cols = parseInt(document.getElementById('customCols').value) || 9;
        const mines = parseInt(document.getElementById('customMines').value) || 10;
        
        this.rows = Math.max(5, Math.min(30, rows));
        this.cols = Math.max(5, Math.min(50, cols));
        const maxMines = Math.floor(this.rows * this.cols * 0.8);
        this.mines = Math.max(1, Math.min(maxMines, mines));
        
        document.getElementById('customRows').value = this.rows;
        document.getElementById('customCols').value = this.cols;
        document.getElementById('customMines').value = this.mines;
        
        this.difficulty = 'custom';
        document.getElementById('difficultySelect').value = 'custom';
        
        this.hideModal('settingsModal');
        this.newGame();
    }

    newGame() {
        this.clearTimer();
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.questioned = [];
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        this.timer = 0;
        this.minesLeft = this.mines;

        for (let i = 0; i < this.rows; i++) {
            this.board[i] = [];
            this.revealed[i] = [];
            this.flagged[i] = [];
            this.questioned[i] = [];
            for (let j = 0; j < this.cols; j++) {
                this.board[i][j] = 0;
                this.revealed[i][j] = false;
                this.flagged[i][j] = false;
                this.questioned[i][j] = false;
            }
        }

        this.updateMineCount();
        this.updateTimer();
        this.updateFace('😊');
        this.renderBoard();
        this.clearSavedGame();
    }

    placeMines(excludeRow, excludeCol) {
        let placed = 0;
        const maxAttempts = this.rows * this.cols * 10;
        let attempts = 0;
        
        while (placed < this.mines && attempts < maxAttempts) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            const isExcluded = Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1;
            
            if (this.board[row][col] !== -1 && !isExcluded) {
                this.board[row][col] = -1;
                placed++;
            }
            attempts++;
        }

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.board[i][j] !== -1) {
                    this.board[i][j] = this.countAdjacentMines(i, j);
                }
            }
        }
    }

    countAdjacentMines(row, col) {
        let count = 0;
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                if (di === 0 && dj === 0) continue;
                const ni = row + di;
                const nj = col + dj;
                if (ni >= 0 && ni < this.rows && nj >= 0 && nj < this.cols) {
                    if (this.board[ni][nj] === -1) count++;
                }
            }
        }
        return count;
    }

    renderBoard() {
        const boardEl = document.getElementById('gameBoard');
        boardEl.innerHTML = '';
        boardEl.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;

                cell.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleClick(i, j);
                });
                
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.handleRightClick(i, j);
                });

                cell.addEventListener('touchstart', (e) => this.handleTouchStart(e, i, j), { passive: false });
                cell.addEventListener('touchend', (e) => this.handleTouchEnd(e, i, j), { passive: false });
                cell.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
                cell.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });

                this.updateCellDisplay(cell, i, j);
                boardEl.appendChild(cell);
            }
        }
    }

    updateCellDisplay(cell, row, col) {
        if (!cell) return;
        
        cell.className = 'cell';
        cell.textContent = '';

        if (this.revealed[row] && this.revealed[row][col]) {
            cell.classList.add('revealed');
            if (this.board[row] && this.board[row][col] === -1) {
                cell.textContent = '💣';
                cell.classList.add('mine');
            } else if (this.board[row] && this.board[row][col] > 0) {
                cell.textContent = this.board[row][col];
                cell.classList.add(`num-${this.board[row][col]}`);
            }
        } else if (this.flagged[row] && this.flagged[row][col]) {
            cell.textContent = '🚩';
            cell.classList.add('flagged');
        } else if (this.questioned[row] && this.questioned[row][col]) {
            cell.textContent = '❓';
            cell.classList.add('question');
        }
    }

    handleClick(row, col) {
        if (this.gameOver || this.gameWon) return;
        if (!this.isValidCell(row, col)) return;
        if (this.flagged[row][col] || this.questioned[row][col]) return;
        if (this.revealed[row][col]) return;

        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(row, col);
            this.startTimer();
        }

        this.reveal(row, col);
        this.checkWin();
        this.autoSaveGame();
    }

    handleRightClick(row, col) {
        if (this.gameOver || this.gameWon) return;
        if (!this.isValidCell(row, col)) return;
        if (this.revealed[row][col]) return;

        if (this.flagged[row][col]) {
            this.flagged[row][col] = false;
            if (this.questionMarkEnabled) {
                this.questioned[row][col] = true;
            }
            this.minesLeft++;
            this.playSound('flag');
        } else if (this.questioned[row][col]) {
            this.questioned[row][col] = false;
        } else {
            this.flagged[row][col] = true;
            this.minesLeft--;
            this.playSound('flag');
        }

        this.updateMineCount();
        const cell = this.getCell(row, col);
        this.updateCellDisplay(cell, row, col);
        this.autoSaveGame();
    }

    isValidCell(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    handleTouchStart(e, row, col) {
        if (e.touches.length === 2) {
            e.preventDefault();
            this.clearLongPressTimer();
            return;
        }

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.touchStartPos = { x: touch.clientX, y: touch.clientY };
            this.touchStartTime = Date.now();
            this.isLongPressTriggered = false;
            
            this.longPressTimer = setTimeout(() => {
                this.isLongPressTriggered = true;
                this.handleRightClick(row, col);
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }, 400);
        }
    }

    handleTouchEnd(e, row, col) {
        e.preventDefault();
        
        this.clearLongPressTimer();
        
        if (this.isLongPressTriggered) {
            this.isLongPressTriggered = false;
            return;
        }

        const now = Date.now();
        const timeDiff = now - this.lastTap;
        
        if (timeDiff < 300 && timeDiff > 0) {
            this.lastTap = 0;
            this.handleRightClick(row, col);
        } else {
            this.lastTap = now;
            setTimeout(() => {
                if (this.lastTap === now && !this.isLongPressTriggered) {
                    this.handleClick(row, col);
                }
            }, 250);
        }
        
        this.touchStartPos = null;
        this.touchStartTime = null;
    }

    handleTouchMove(e) {
        if (e.touches.length === 1 && this.touchStartPos) {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - this.touchStartPos.x);
            const dy = Math.abs(touch.clientY - this.touchStartPos.y);
            
            if (dx > 10 || dy > 10) {
                this.clearLongPressTimer();
            }
        }
    }

    handleTouchCancel(e) {
        this.clearLongPressTimer();
        this.touchStartPos = null;
        this.touchStartTime = null;
    }

    clearLongPressTimer() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    reveal(row, col) {
        if (!this.isValidCell(row, col)) return;
        if (this.revealed[row][col]) return;
        if (this.flagged[row][col]) return;
        if (this.questioned[row][col]) return;

        this.revealed[row][col] = true;
        this.playSound('reveal');

        const cell = this.getCell(row, col);
        this.updateCellDisplay(cell, row, col);

        if (this.board[row][col] === -1) {
            this.loseGame(row, col);
            return;
        }

        if (this.board[row][col] === 0) {
            setTimeout(() => {
                for (let di = -1; di <= 1; di++) {
                    for (let dj = -1; dj <= 1; dj++) {
                        if (di !== 0 || dj !== 0) {
                            this.reveal(row + di, col + dj);
                        }
                    }
                }
            }, 0);
        }
    }

    getCell(row, col) {
        return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }

    checkWin() {
        let unrevealedSafe = 0;
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (!this.revealed[i][j] && this.board[i][j] !== -1) {
                    unrevealedSafe++;
                }
            }
        }

        if (unrevealedSafe === 0 && !this.firstClick) {
            this.winGame();
        }
    }

    winGame() {
        this.gameWon = true;
        this.clearTimer();
        this.playSound('win');
        this.updateFace('😎');
        this.clearSavedGame();

        let isNewRecord = false;
        if (this.difficulty !== 'custom') {
            isNewRecord = this.saveHighScore(this.difficulty, this.timer);
        }

        document.getElementById('gameOverTitle').textContent = '🎉 恭喜获胜！';
        document.getElementById('gameOverMessage').textContent = '你成功排除了所有地雷！';
        document.getElementById('gameOverTime').textContent = `用时: ${this.timer} 秒`;
        document.getElementById('newRecord').style.display = isNewRecord ? 'block' : 'none';
        this.showModal('gameOverModal');
    }

    loseGame(mineRow, mineCol) {
        this.gameOver = true;
        this.clearTimer();
        this.playSound('lose');
        this.updateFace('😵');
        this.clearSavedGame();

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const cell = this.getCell(i, j);
                
                if (this.board[i][j] === -1) {
                    this.revealed[i][j] = true;
                    this.updateCellDisplay(cell, i, j);
                    
                    if (i === mineRow && j === mineCol) {
                        cell.style.backgroundColor = '#ff4444';
                    }
                }
                
                if (this.flagged[i][j] && this.board[i][j] !== -1) {
                    if (cell) {
                        cell.textContent = '❌';
                        cell.classList.remove('flagged');
                        cell.classList.add('revealed');
                    }
                }
            }
        }

        document.getElementById('gameOverTitle').textContent = '💥 游戏结束';
        document.getElementById('gameOverMessage').textContent = '你踩到了地雷！';
        document.getElementById('gameOverTime').textContent = `用时: ${this.timer} 秒`;
        document.getElementById('newRecord').style.display = 'none';
        this.showModal('gameOverModal');
    }

    updateMineCount() {
        const el = document.getElementById('mineCount');
        el.textContent = this.minesLeft;
        
        if (this.minesLeft < 0) {
            el.style.color = '#ff0000';
        } else if (this.minesLeft <= 3) {
            el.style.color = '#ff8800';
        } else {
            el.style.color = '';
        }
    }

    startTimer() {
        this.timerStartTime = Date.now();
        this.timer = 0;
        this.updateTimer();
        
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.timerStartTime) / 1000);
            if (elapsed !== this.timer) {
                this.timer = elapsed;
                this.updateTimer();
                if (this.timer % 5 === 0) {
                    this.autoSaveGame();
                }
            }
        }, 100);
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timerStartTime = null;
    }

    updateTimer() {
        document.getElementById('timer').textContent = this.timer;
    }

    updateFace(emoji) {
        document.getElementById('faceBtn').textContent = emoji;
    }

    showModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showRestoreModal() {
        const saved = JSON.parse(localStorage.getItem('minesweeper_save') || '{}');
        document.getElementById('restoreInfo').textContent = 
            `${saved.rows || 9}×${saved.cols || 9} 网格, ${saved.mines || 10} 颗雷, 已用时 ${saved.timer || 0} 秒`;
        this.showModal('restoreModal');
    }

    hasSavedGame() {
        try {
            const saved = localStorage.getItem('minesweeper_save');
            if (!saved) return false;
            const data = JSON.parse(saved);
            return data && data.board && data.board.length > 0 && !data.gameOver && !data.gameWon;
        } catch (e) {
            return false;
        }
    }

    autoSaveGame() {
        if (!this.autoSaveEnabled || this.firstClick || this.gameOver || this.gameWon) return;
        
        try {
            const saveData = {
                rows: this.rows,
                cols: this.cols,
                mines: this.mines,
                difficulty: this.difficulty,
                timer: this.timer,
                minesLeft: this.minesLeft,
                board: this.board,
                revealed: this.revealed,
                flagged: this.flagged,
                questioned: this.questioned,
                firstClick: this.firstClick,
                gameOver: this.gameOver,
                gameWon: this.gameWon
            };
            localStorage.setItem('minesweeper_save', JSON.stringify(saveData));
        } catch (e) {
            console.log('Auto save error:', e);
        }
    }

    restoreGame() {
        try {
            const saved = JSON.parse(localStorage.getItem('minesweeper_save') || '{}');
            if (!saved || !saved.board) return;

            this.rows = saved.rows;
            this.cols = saved.cols;
            this.mines = saved.mines;
            this.difficulty = saved.difficulty;
            this.timer = saved.timer;
            this.minesLeft = saved.minesLeft;
            this.board = saved.board;
            this.revealed = saved.revealed;
            this.flagged = saved.flagged;
            this.questioned = saved.questioned;
            this.firstClick = saved.firstClick;
            this.gameOver = false;
            this.gameWon = false;

            document.getElementById('difficultySelect').value = 
                ['easy', 'medium', 'hard'].includes(this.difficulty) ? this.difficulty : 'custom';

            this.updateMineCount();
            this.updateTimer();
            this.updateFace('😊');
            this.renderBoard();
            
            if (!this.firstClick) {
                this.timerStartTime = Date.now() - (this.timer * 1000);
                this.timerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - this.timerStartTime) / 1000);
                    if (elapsed !== this.timer) {
                        this.timer = elapsed;
                        this.updateTimer();
                        if (this.timer % 5 === 0) {
                            this.autoSaveGame();
                        }
                    }
                }, 100);
            }
        } catch (e) {
            console.log('Restore game error:', e);
        }
    }

    clearSavedGame() {
        try {
            localStorage.removeItem('minesweeper_save');
        } catch (e) {
            console.log('Clear saved game error:', e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Minesweeper();
});
