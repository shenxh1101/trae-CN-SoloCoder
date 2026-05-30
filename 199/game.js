class PathGame {
    constructor() {
        this.gridSize = 10;
        this.path = [];
        this.isDrawing = false;
        this.isClosed = false;
        this.filledCells = [];
        this.currentArea = 0;
        this.gameMode = 'normal';
        this.currentPlayer = 1;
        this.playerScores = [0, 0];
        this.playerPaths = [[], []];
        this.playerFilled = [[], []];
        this.timeLeft = 120;
        this.timerInterval = null;
        this.audioContext = null;
        this.soundEnabled = true;
        this.bestRecord = 0;
        this.history = [];

        this.init();
    }

    init() {
        this.loadBestRecord();
        this.createGrid();
        this.bindEvents();
        this.updateUI();
    }

    createGrid() {
        const grid = document.getElementById('gameGrid');
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                grid.appendChild(cell);
            }
        }

        this.cells = grid.querySelectorAll('.cell');
    }

    getCell(x, y) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
            return null;
        }
        return this.cells[y * this.gridSize + x];
    }

    getCellIndex(x, y) {
        return y * this.gridSize + x;
    }

    isAdjacent(cell1, cell2) {
        const dx = Math.abs(cell1.x - cell2.x);
        const dy = Math.abs(cell1.y - cell2.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    isInPath(x, y) {
        return this.path.some(p => p.x === x && p.y === y);
    }

    isSelfIntersecting(x, y) {
        return this.path.some(p => p.x === x && p.y === y);
    }

    addCellToPath(x, y) {
        if (this.isClosed) {
            if (this.gameMode === 'normal' || this.gameMode === 'timed') {
                return false;
            }
        }

        if (this.gameMode === 'versus') {
            const allPaths = [...this.playerPaths[0], ...this.playerPaths[1]];
            if (allPaths.some(p => p.x === x && p.y === y)) {
                return false;
            }
        } else {
            if (this.isSelfIntersecting(x, y)) {
                return false;
            }
        }

        if (this.path.length > 0) {
            const lastCell = this.path[this.path.length - 1];
            if (!this.isAdjacent(lastCell, { x, y })) {
                return false;
            }
        }

        this.path.push({ x, y });
        this.playDrawSound();
        return true;
    }

    undoLastCell() {
        if (this.path.length === 0) return;

        const removed = this.path.pop();
        this.isClosed = false;
        this.clearFilledArea();
        this.playUndoSound();

        if (this.gameMode === 'versus') {
            this.updatePlayerPathUI();
        }

        this.updateUI();
    }

    clearAll() {
        if (this.gameMode === 'versus') {
            this.playerPaths = [[], []];
            this.playerFilled = [[], []];
            this.playerScores = [0, 0];
            this.currentPlayer = 1;
            this.path = [];
            this.currentArea = 0;
            this.isClosed = false;
            this.clearFilledArea();
            this.updatePlayerScoreUI();
        } else {
            this.path = [];
            this.currentArea = 0;
            this.isClosed = false;
            this.clearFilledArea();
        }

        this.stopTimer();
        this.timeLeft = 120;
        this.updateUI();
        this.updateGridDisplay();
    }

    closePath() {
        if (this.path.length < 4) {
            this.showModal('提示', '路径太短啦，至少需要4个格子才能闭合路径！');
            return;
        }

        const first = this.path[0];
        const last = this.path[this.path.length - 1];

        if (!this.isAdjacent(first, last)) {
            this.showModal('提示', '路径无法闭合！起点和终点必须相邻。');
            return;
        }

        this.isClosed = true;
        this.calculateArea();
        this.playSuccessSound();

        if (this.gameMode === 'versus') {
            this.playerPaths[this.currentPlayer - 1] = [...this.path];
            this.playerFilled[this.currentPlayer - 1] = [...this.filledCells];
            this.playerScores[this.currentPlayer - 1] = this.currentArea;

            if (this.currentPlayer === 1) {
                this.currentPlayer = 2;
                this.path = [];
                this.isClosed = false;
                this.clearFilledArea();
                this.updateGridDisplay();
                this.showModal('玩家1完成', `玩家1围出了 ${this.playerScores[0]} 面积！轮到玩家2。`);
            } else {
                this.updatePlayerScoreUI();
                const winner = this.playerScores[0] > this.playerScores[1] ? 1 :
                              this.playerScores[1] > this.playerScores[0] ? 2 : 0;
                if (winner === 0) {
                    this.showModal('游戏结束', `平局！双方都围出了 ${this.playerScores[0]} 面积！`);
                } else {
                    this.showModal('游戏结束', `玩家${winner}获胜！围出了 ${this.playerScores[winner - 1]} 面积！`);
                }
            }
        } else {
            if (this.currentArea > this.bestRecord) {
                this.bestRecord = this.currentArea;
                this.saveBestRecord();
            }
        }

        this.updateUI();
    }

    calculateArea() {
        if (!this.isClosed) return;

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

        this.updateGridDisplay();
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

    floodFill(startX, startY, pathSet) {
        const visited = new Set();
        const queue = [{ x: startX, y: startY }];
        const filled = [];
        let touchedBorder = false;

        while (queue.length > 0) {
            const { x, y } = queue.shift();
            const key = `${x},${y}`;

            if (visited.has(key) || pathSet.has(key)) continue;
            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
                touchedBorder = true;
                continue;
            }

            visited.add(key);
            filled.push({ x, y });

            queue.push({ x: x + 1, y });
            queue.push({ x: x - 1, y });
            queue.push({ x, y: y + 1 });
            queue.push({ x, y: y - 1 });
        }

        return { filled, touchedBorder };
    }

    clearFilledArea() {
        this.filledCells = [];
        this.cells.forEach(cell => {
            cell.classList.remove('filled', 'player1', 'player2');
        });
    }

    updateGridDisplay() {
        this.cells.forEach(cell => {
            cell.classList.remove('path', 'start', 'filled', 'player1', 'player2', 'invalid');
        });

        if (this.gameMode === 'versus') {
            for (let p = 0; p < 2; p++) {
                const playerPath = this.playerPaths[p];
                const playerClass = `player${p + 1}`;

                playerPath.forEach((pos, idx) => {
                    const cell = this.getCell(pos.x, pos.y);
                    if (cell) {
                        cell.classList.add('path', playerClass);
                        if (idx === 0) cell.classList.add('start');
                    }
                });

                this.playerFilled[p].forEach(pos => {
                    const cell = this.getCell(pos.x, pos.y);
                    if (cell) {
                        cell.classList.add('filled', playerClass);
                    }
                });
            }

            this.path.forEach((pos, idx) => {
                const cell = this.getCell(pos.x, pos.y);
                if (cell) {
                    cell.classList.add('path', `player${this.currentPlayer}`);
                    if (idx === 0) cell.classList.add('start');
                }
            });
        } else {
            this.path.forEach((pos, idx) => {
                const cell = this.getCell(pos.x, pos.y);
                if (cell) {
                    cell.classList.add('path');
                    if (idx === 0) cell.classList.add('start');
                }
            });

            this.filledCells.forEach(pos => {
                const cell = this.getCell(pos.x, pos.y);
                if (cell) {
                    cell.classList.add('filled');
                }
            });
        }
    }

    setGridSize(size) {
        this.gridSize = size;
        this.clearAll();
        this.createGrid();
        this.updateUI();
    }

    setGameMode(mode) {
        this.gameMode = mode;
        this.clearAll();

        const timerContainer = document.getElementById('timerContainer');
        const playerContainer = document.getElementById('playerContainer');
        const versusScores = document.getElementById('versusScores');

        timerContainer.style.display = mode === 'timed' ? 'flex' : 'none';
        playerContainer.style.display = mode === 'versus' ? 'flex' : 'none';
        versusScores.style.display = mode === 'versus' ? 'flex' : 'none';

        if (mode === 'timed') {
            this.startTimer();
        }

        this.updateUI();
    }

    startTimer() {
        this.stopTimer();
        this.timeLeft = 120;
        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.stopTimer();
                this.onTimeUp();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const timerEl = document.getElementById('timer');
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (this.timeLeft <= 30) {
            timerEl.classList.add('warning');
        } else {
            timerEl.classList.remove('warning');
        }
    }

    onTimeUp() {
        if (!this.isClosed && this.currentArea > this.bestRecord) {
            this.bestRecord = this.currentArea;
            this.saveBestRecord();
        }
        this.showModal('时间到！', `游戏结束！你围出了 ${this.currentArea} 面积！最佳记录: ${this.bestRecord}`);
    }

    updateUI() {
        const currentAreaEl = document.getElementById('currentArea');
        if (currentAreaEl) currentAreaEl.textContent = this.currentArea;
        
        const pathLengthEl = document.getElementById('pathLength');
        if (pathLengthEl) pathLengthEl.textContent = this.path.length;
        
        const bestRecordEl = document.getElementById('bestRecord');
        if (bestRecordEl) bestRecordEl.textContent = this.bestRecord;
        
        const currentPlayerEl = document.getElementById('currentPlayer');
        if (currentPlayerEl) currentPlayerEl.textContent = this.currentPlayer;

        this.updateGridDisplay();
        this.updateUndoButton();
    }

    updatePlayerPathUI() {
        const pathLengthEl = document.getElementById('pathLength');
        if (pathLengthEl) pathLengthEl.textContent = this.path.length;
        this.updateGridDisplay();
        this.updateUndoButton();
    }

    updatePlayerScoreUI() {
        const player1AreaEl = document.getElementById('player1Area');
        if (player1AreaEl) player1AreaEl.textContent = this.playerScores[0];
        
        const player2AreaEl = document.getElementById('player2Area');
        if (player2AreaEl) player2AreaEl.textContent = this.playerScores[1];
    }

    updateUndoButton() {
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) undoBtn.disabled = this.path.length === 0;
    }

    saveBestRecord() {
        try {
            localStorage.setItem('pathGameBestRecord', this.bestRecord.toString());
        } catch (e) {
            console.error('保存记录失败:', e);
        }
    }

    loadBestRecord() {
        try {
            const saved = localStorage.getItem('pathGameBestRecord');
            if (saved) {
                this.bestRecord = parseInt(saved, 10) || 0;
            }
        } catch (e) {
            console.error('加载记录失败:', e);
        }
    }

    exportPath() {
        const data = {
            gridSize: this.gridSize,
            path: this.path,
            filledCells: this.filledCells,
            isClosed: this.isClosed,
            currentArea: this.currentArea,
            gameMode: this.gameMode,
            timestamp: new Date().toISOString()
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `path-game-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showModal('导出成功', '路径数据已导出为JSON文件！');
    }

    importPath(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.gridSize) {
                    this.gridSize = data.gridSize;
                    document.querySelectorAll('.size-btn').forEach(btn => {
                        btn.classList.toggle('active', parseInt(btn.dataset.size) === data.gridSize);
                    });
                }

                this.createGrid();

                this.path = data.path || [];
                this.filledCells = data.filledCells || [];
                this.isClosed = data.isClosed || false;
                this.currentArea = data.currentArea || 0;

                if (data.gameMode && data.gameMode !== this.gameMode) {
                    this.setGameMode(data.gameMode);
                }

                this.updateUI();
                this.showModal('导入成功', '路径数据已成功导入！');
            } catch (err) {
                this.showModal('导入失败', '文件格式错误，请检查JSON文件！');
            }
        };
        reader.readAsText(file);
    }

    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playDrawSound() {
        if (!this.soundEnabled) return;
        this.initAudio();

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(659, this.audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    playUndoSound() {
        if (!this.soundEnabled) return;
        this.initAudio();

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(392, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(330, this.audioContext.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    playSuccessSound() {
        if (!this.soundEnabled) return;
        this.initAudio();

        const notes = [523, 659, 784];
        notes.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.1);
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime + i * 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.1 + 0.2);

            oscillator.start(this.audioContext.currentTime + i * 0.1);
            oscillator.stop(this.audioContext.currentTime + i * 0.1 + 0.2);
        });
    }

    playErrorSound() {
        if (!this.soundEnabled) return;
        this.initAudio();

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    showModal(title, message) {
        const modal = document.getElementById('messageModal');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        modal.style.display = 'flex';
    }

    hideModal() {
        document.getElementById('messageModal').style.display = 'none';
    }

    getCellFromEvent(e) {
        e.preventDefault();
        let target;

        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            target = document.elementFromPoint(touch.clientX, touch.clientY);
        } else {
            target = e.target;
        }

        if (!target || !target.classList.contains('cell')) return null;

        return {
            x: parseInt(target.dataset.x),
            y: parseInt(target.dataset.y),
            element: target
        };
    }

    handleDrawStart(e) {
        this.isDrawing = true;
        const cell = this.getCellFromEvent(e);
        if (!cell) return;

        if (this.path.length === 0) {
            this.addCellToPath(cell.x, cell.y);
            this.updateUI();
        } else if (this.gameMode !== 'versus' && this.isClosed) {
            return;
        }
    }

    handleDrawMove(e) {
        if (!this.isDrawing) return;
        const cell = this.getCellFromEvent(e);
        if (!cell) return;

        const lastCell = this.path[this.path.length - 1];
        if (!lastCell) return;

        if (lastCell.x === cell.x && lastCell.y === cell.y) return;

        const success = this.addCellToPath(cell.x, cell.y);

        if (!success && !this.isInPath(cell.x, cell.y)) {
            cell.element.classList.add('invalid');
            this.playErrorSound();
            setTimeout(() => {
                cell.element.classList.remove('invalid');
            }, 300);
        }

        this.updateUI();
    }

    handleDrawEnd() {
        this.isDrawing = false;
    }

    bindEvents() {
        const grid = document.getElementById('gameGrid');
        if (grid) {
            grid.addEventListener('mousedown', (e) => this.handleDrawStart(e));
            grid.addEventListener('mousemove', (e) => this.handleDrawMove(e));
            document.addEventListener('mouseup', () => this.handleDrawEnd());

            grid.addEventListener('touchstart', (e) => this.handleDrawStart(e), { passive: false });
            grid.addEventListener('touchmove', (e) => this.handleDrawMove(e), { passive: false });
            document.addEventListener('touchend', () => this.handleDrawEnd());
        }

        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) undoBtn.addEventListener('click', () => this.undoLastCell());
        
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearAll());
        
        const closePathBtn = document.getElementById('closePathBtn');
        if (closePathBtn) closePathBtn.addEventListener('click', () => this.closePath());
        
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportPath());
        
        const importBtn = document.getElementById('importBtn');
        const importFile = document.getElementById('importFile');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.importPath(e.target.files[0]);
                }
            });
        }
        
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => this.hideModal());
        
        const messageModal = document.getElementById('messageModal');
        if (messageModal) {
            messageModal.addEventListener('click', (e) => {
                if (e.target.id === 'messageModal') this.hideModal();
            });
        }

        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setGridSize(parseInt(btn.dataset.size));
            });
        });

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setGameMode(btn.dataset.mode);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.undoLastCell();
            }
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new PathGame();
});
