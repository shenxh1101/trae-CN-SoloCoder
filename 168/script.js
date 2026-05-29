class PuzzleGame {
    constructor() {
        this.size = 4;
        this.board = [];
        this.obstacles = new Set();
        this.emptyPos = { row: 0, col: 0 };
        this.moves = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.gameStarted = false;
        this.gameWon = false;
        this.hintsRemaining = 5;
        this.undoStack = [];
        this.maxUndo = 10;
        this.soundEnabled = true;
        this.audioContext = null;
        this.mode = 'normal';
        this.customObstacles = new Set();
        this.touchStart = null;
        this.minTileSize = 50;
        this.maxTileSize = 80;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadBestTime();
        this.newGame();
        window.addEventListener('resize', () => {
            if (this.mode === 'custom') {
                this.renderCustomBoard();
            } else {
                this.render();
            }
        });
    }

    bindEvents() {
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('hint').addEventListener('click', () => this.showHint());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('sound-toggle').addEventListener('click', () => this.toggleSound());
        document.getElementById('play-again').addEventListener('click', () => {
            document.getElementById('win-modal').classList.add('hidden');
            this.newGame();
        });

        document.querySelectorAll('.btn-size').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-size').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.size = parseInt(e.target.dataset.size);
                this.loadBestTime();
                this.newGame();
            });
        });

        document.querySelectorAll('.btn-mode').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.mode = e.target.dataset.mode;
                document.getElementById('custom-panel').classList.toggle('hidden', this.mode !== 'custom');
                if (this.mode === 'custom') {
                    this.showCustomBoard();
                } else {
                    this.newGame();
                }
            });
        });

        document.getElementById('custom-apply').addEventListener('click', () => {
            const lastCell = `${this.size - 1},${this.size - 1}`;
            this.customObstacles.delete(lastCell);
            this.startCustomGame();
        });
        document.getElementById('custom-export').addEventListener('click', () => this.exportLayout());
        document.getElementById('custom-import').addEventListener('click', () => this.showImport());
        document.getElementById('custom-clear').addEventListener('click', () => this.clearCustomObstacles());

        document.getElementById('import-json').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.importLayout();
            }
        });

        const board = document.getElementById('board');
        board.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        board.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        board.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    getTargetBoard() {
        const target = [];
        const total = this.size * this.size;
        for (let row = 0; row < this.size; row++) {
            target[row] = [];
            for (let col = 0; col < this.size; col++) {
                const idx = row * this.size + col;
                if (idx === total - 1) {
                    target[row][col] = 0;
                } else {
                    target[row][col] = idx + 1;
                }
            }
        }
        return target;
    }

    generateObstacles() {
        this.obstacles.clear();
        const totalTiles = this.size * this.size;
        const maxObstacles = Math.floor(totalTiles * 0.2);
        const numObstacles = Math.max(2, Math.floor(Math.random() * maxObstacles) + 1);

        const target = this.getTargetBoard();
        const emptyIdx = totalTiles - 1;
        const emptyRow = Math.floor(emptyIdx / this.size);
        const emptyCol = emptyIdx % this.size;

        const availablePositions = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (row === emptyRow && col === emptyCol) continue;
                if (target[row][col] === 0) continue;
                availablePositions.push(`${row},${col}`);
            }
        }

        this.shuffleArray(availablePositions);

        for (let i = 0; i < Math.min(numObstacles, availablePositions.length); i++) {
            this.obstacles.add(availablePositions[i]);
        }
    }

    generateSolvableBoard() {
        if (this.mode === 'daily') {
            this.generateDailyBoard();
            return true;
        }

        const useCustomObstacles = this.mode === 'custom' || this.mode === 'custom-play';
        if (useCustomObstacles) {
            this.obstacles = new Set(this.customObstacles);
        }

        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            attempts++;

            if (!useCustomObstacles) {
                this.generateObstacles();
            }

            const target = this.getTargetBoard();
            this.board = [];
            const numbers = [];

            for (let row = 0; row < this.size; row++) {
                this.board[row] = [];
                for (let col = 0; col < this.size; col++) {
                    const key = `${row},${col}`;
                    if (this.obstacles.has(key)) {
                        this.board[row][col] = -1;
                    } else if (target[row][col] === 0) {
                        this.board[row][col] = 0;
                        this.emptyPos = { row, col };
                    } else {
                        numbers.push(target[row][col]);
                        this.board[row][col] = null;
                    }
                }
            }

            this.shuffleArray(numbers);

            let numIdx = 0;
            for (let row = 0; row < this.size; row++) {
                for (let col = 0; col < this.size; col++) {
                    if (this.board[row][col] === null) {
                        this.board[row][col] = numbers[numIdx++];
                    }
                }
            }

            if (this.isSolvable()) {
                return true;
            }
        }

        this.obstacles.clear();
        this.generateSolvedBoard();
        this.shuffleBoard();
        return true;
    }

    generateSolvedBoard() {
        this.board = this.getTargetBoard();
        this.emptyPos = { row: this.size - 1, col: this.size - 1 };

        for (const key of this.obstacles) {
            const [row, col] = key.split(',').map(Number);
            this.board[row][col] = -1;
        }
    }

    shuffleBoard() {
        const shuffleMoves = this.size * this.size * 50;
        for (let i = 0; i < shuffleMoves; i++) {
            const neighbors = this.getValidMoves();
            if (neighbors.length > 0) {
                const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                this.moveTile(randomNeighbor.row, randomNeighbor.col, true);
            }
        }
        this.moves = 0;
    }

    generateDailyBoard() {
        this.obstacles.clear();
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

        const random = this.seededRandom(seed);
        const totalTiles = this.size * this.size;
        const maxObstacles = Math.floor(totalTiles * 0.2);
        const numObstacles = Math.max(2, Math.floor(random() * maxObstacles) + 1);

        const positions = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (row === this.size - 1 && col === this.size - 1) continue;
                positions.push(`${row},${col}`);
            }
        }

        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        for (let i = 0; i < numObstacles; i++) {
            this.obstacles.add(positions[i]);
        }

        const random2 = this.seededRandom(seed + 1);
        this.board = this.getTargetBoard();
        this.emptyPos = { row: this.size - 1, col: this.size - 1 };

        for (const key of this.obstacles) {
            const [row, col] = key.split(',').map(Number);
            this.board[row][col] = -1;
        }

        const nonObstaclePositions = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] !== -1 && this.board[row][col] !== 0) {
                    nonObstaclePositions.push({ row, col });
                }
            }
        }

        const values = nonObstaclePositions.map(p => this.board[p.row][p.col]);
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(random2() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }

        nonObstaclePositions.forEach((p, idx) => {
            this.board[p.row][p.col] = values[idx];
        });

        if (!this.isSolvable() && nonObstaclePositions.length >= 2) {
            let swapIdx = 0;
            let maxAttempts = Math.min(nonObstaclePositions.length - 1, 10);

            while (!this.isSolvable() && swapIdx < maxAttempts) {
                const temp = this.board[nonObstaclePositions[swapIdx].row][nonObstaclePositions[swapIdx].col];
                this.board[nonObstaclePositions[swapIdx].row][nonObstaclePositions[swapIdx].col] =
                    this.board[nonObstaclePositions[swapIdx + 1].row][nonObstaclePositions[swapIdx + 1].col];
                this.board[nonObstaclePositions[swapIdx + 1].row][nonObstaclePositions[swapIdx + 1].col] = temp;
                swapIdx++;
            }
        }
    }

    seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    isSolvable() {
        const flatBoard = [];
        let emptyRow = 0;

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const val = this.board[row][col];
                if (val === 0) {
                    emptyRow = row;
                } else if (val !== -1) {
                    flatBoard.push(val);
                }
            }
        }

        let inversions = 0;
        for (let i = 0; i < flatBoard.length; i++) {
            for (let j = i + 1; j < flatBoard.length; j++) {
                if (flatBoard[i] > flatBoard[j]) {
                    inversions++;
                }
            }
        }

        if (this.size % 2 === 1) {
            return inversions % 2 === 0;
        } else {
            const emptyRowFromBottom = this.size - emptyRow;
            if (emptyRowFromBottom % 2 === 0) {
                return inversions % 2 === 1;
            } else {
                return inversions % 2 === 0;
            }
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getValidMoves() {
        const moves = [];
        const { row, col } = this.emptyPos;
        const directions = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 }
        ];

        for (const { dr, dc } of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidPosition(newRow, newCol) &&
                this.board[newRow][newCol] !== -1 &&
                this.board[newRow][newCol] !== 0) {
                moves.push({ row: newRow, col: newCol });
            }
        }
        return moves;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    moveTile(row, col, silent = false) {
        const { row: emptyRow, col: emptyCol } = this.emptyPos;

        if (Math.abs(row - emptyRow) + Math.abs(col - emptyCol) !== 1) {
            return false;
        }

        if (this.board[row][col] === -1 || this.board[row][col] === 0) {
            return false;
        }

        const prevState = {
            board: this.board.map(r => [...r]),
            emptyPos: { ...this.emptyPos },
            moves: this.moves,
            timer: this.timer
        };

        this.board[emptyRow][emptyCol] = this.board[row][col];
        this.board[row][col] = 0;
        this.emptyPos = { row, col };

        if (!silent) {
            this.moves++;
            this.undoStack.push(prevState);
            if (this.undoStack.length > this.maxUndo) {
                this.undoStack.shift();
            }
            this.playMoveSound();
        }

        this.render();
        this.updateStats();

        if (!silent && this.checkWin()) {
            this.handleWin();
        }

        return true;
    }

    handleTileClick(e) {
        if (this.gameWon) return;

        const tile = e.target.closest('.tile');
        if (!tile) return;

        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);

        if (!this.gameStarted) {
            this.startGame();
        }

        this.moveTile(row, col);
    }

    handleTouchStart(e) {
        e.preventDefault();
        if (this.gameWon) return;

        const touch = e.touches[0];
        this.touchStart = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        };
    }

    handleTouchMove(e) {
        e.preventDefault();
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (!this.touchStart || this.gameWon) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.touchStart.x;
        const deltaY = touch.clientY - this.touchStart.y;
        const deltaTime = Date.now() - this.touchStart.time;

        const minSwipeDistance = 30;
        const maxSwipeTime = 300;

        if (deltaTime > maxSwipeTime) {
            const board = document.getElementById('board');
            const rect = board.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            const { row, col } = this.getPositionFromCoords(x, y, rect);
            if (row !== -1 && col !== -1) {
                if (!this.gameStarted) this.startGame();
                this.moveTile(row, col);
            }
        } else {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (absX > minSwipeDistance || absY > minSwipeDistance) {
                if (!this.gameStarted) this.startGame();

                const { row, col } = this.emptyPos;
                let targetRow = row;
                let targetCol = col;

                if (absX > absY) {
                    targetCol = deltaX > 0 ? col - 1 : col + 1;
                } else {
                    targetRow = deltaY > 0 ? row - 1 : row + 1;
                }

                if (this.isValidPosition(targetRow, targetCol)) {
                    this.moveTile(targetRow, targetCol);
                }
            }
        }

        this.touchStart = null;
    }

    getPositionFromCoords(x, y, rect) {
        const tileSize = (rect.width - 16 - (this.size - 1) * 6) / this.size;
        const col = Math.floor((x - 8) / (tileSize + 6));
        const row = Math.floor((y - 8) / (tileSize + 6));

        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
            return { row, col };
        }
        return { row: -1, col: -1 };
    }

    handleKeyboard(e) {
        if (this.gameWon) return;

        const { row, col } = this.emptyPos;
        let targetRow = row;
        let targetCol = col;

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                targetRow = row + 1;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                targetRow = row - 1;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                targetCol = col + 1;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                targetCol = col - 1;
                break;
            case 'z':
            case 'Z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.undo();
                }
                return;
            default:
                return;
        }

        e.preventDefault();
        if (!this.gameStarted) this.startGame();
        this.moveTile(targetRow, targetCol);
    }

    checkWin() {
        const target = this.getTargetBoard();
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const key = `${row},${col}`;
                if (this.obstacles.has(key)) {
                    if (this.board[row][col] !== -1) return false;
                } else {
                    if (this.board[row][col] !== target[row][col]) return false;
                }
            }
        }
        return true;
    }

    handleWin() {
        this.gameWon = true;
        this.stopTimer();
        this.playWinSound();

        const isNewRecord = this.saveBestTime();

        document.getElementById('final-time').textContent = this.formatTime(this.timer);
        document.getElementById('final-moves').textContent = this.moves;
        document.getElementById('new-record').classList.toggle('hidden', !isNewRecord);
        document.getElementById('win-modal').classList.remove('hidden');
    }

    startGame() {
        this.gameStarted = true;
        this.startTimer();
    }

    newGame() {
        this.stopTimer();
        this.timer = 0;
        this.moves = 0;
        this.gameStarted = false;
        this.gameWon = false;
        this.hintsRemaining = 5;
        this.undoStack = [];

        this.generateSolvableBoard();

        this.render();
        this.updateStats();
        this.updateControls();
    }

    render() {
        const board = document.getElementById('board');
        const containerWidth = Math.min(500, window.innerWidth - 80);
        const tileSize = Math.max(this.minTileSize, Math.min(this.maxTileSize,
            Math.floor((containerWidth - 16 - (this.size - 1) * 6) / this.size)));

        board.style.gridTemplateColumns = `repeat(${this.size}, ${tileSize}px)`;
        board.style.gridTemplateRows = `repeat(${this.size}, ${tileSize}px)`;
        board.innerHTML = '';

        const target = this.getTargetBoard();

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = document.createElement('div');
                const value = this.board[row][col];
                const key = `${row},${col}`;

                tile.className = 'tile';
                tile.dataset.row = row;
                tile.dataset.col = col;
                tile.style.width = `${tileSize}px`;
                tile.style.height = `${tileSize}px`;

                if (value === 0) {
                    tile.classList.add('empty');
                } else if (value === -1 || this.obstacles.has(key)) {
                    tile.classList.add('obstacle');
                    tile.textContent = '';
                } else {
                    tile.textContent = value;
                    if (value === target[row][col]) {
                        tile.classList.add('correct');
                    }
                    tile.addEventListener('click', (e) => this.handleTileClick(e));
                }

                board.appendChild(tile);
            }
        }
    }

    updateStats() {
        document.getElementById('timer').textContent = this.formatTime(this.timer);
        document.getElementById('moves').textContent = this.moves;
        document.getElementById('manhattan').textContent = this.calculateManhattanDistance();
        this.updateControls();
    }

    calculateManhattanDistance() {
        let distance = 0;
        const target = this.getTargetBoard();
        const valuePositions = new Map();

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const key = `${row},${col}`;
                if (!this.obstacles.has(key) && target[row][col] !== 0) {
                    valuePositions.set(target[row][col], { row, col });
                }
            }
        }

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const value = this.board[row][col];
                const key = `${row},${col}`;
                if (value !== 0 && value !== -1 && !this.obstacles.has(key)) {
                    const targetPos = valuePositions.get(value);
                    if (targetPos) {
                        distance += Math.abs(row - targetPos.row) + Math.abs(col - targetPos.col);
                    }
                }
            }
        }

        return distance;
    }

    updateControls() {
        document.getElementById('hint-count').textContent = this.hintsRemaining;
        document.getElementById('undo-count').textContent = this.undoStack.length;
        document.getElementById('hint').disabled = this.hintsRemaining <= 0 || this.gameWon;
        document.getElementById('undo').disabled = this.undoStack.length === 0 || this.gameWon;
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            document.getElementById('timer').textContent = this.formatTime(this.timer);
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    loadBestTime() {
        const key = `puzzle_best_${this.size}`;
        const best = localStorage.getItem(key);
        document.getElementById('best-time').textContent = best ? this.formatTime(parseInt(best)) : '--:--';
    }

    saveBestTime() {
        const key = `puzzle_best_${this.size}`;
        const currentBest = parseInt(localStorage.getItem(key) || '999999');

        if (this.timer < currentBest) {
            localStorage.setItem(key, this.timer.toString());
            document.getElementById('best-time').textContent = this.formatTime(this.timer);
            return true;
        }
        return false;
    }

    showHint() {
        if (this.hintsRemaining <= 0 || this.gameWon) return;

        const hintTile = this.findHintTile();
        if (hintTile) {
            this.hintsRemaining--;
            this.highlightTile(hintTile.row, hintTile.col);
            this.updateControls();
        }
    }

    findHintTile() {
        const moves = this.getValidMoves();
        if (moves.length === 0) return null;

        let bestMove = null;
        let bestScore = Infinity;

        for (const move of moves) {
            const score = this.evaluateMove(move.row, move.col);
            if (score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    evaluateMove(row, col) {
        const { row: emptyRow, col: emptyCol } = this.emptyPos;

        const tempBoard = this.board.map(r => [...r]);
        tempBoard[emptyRow][emptyCol] = tempBoard[row][col];
        tempBoard[row][col] = 0;

        const target = this.getTargetBoard();
        let distance = 0;

        const valuePositions = new Map();
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const key = `${r},${c}`;
                if (!this.obstacles.has(key) && target[r][c] !== 0) {
                    valuePositions.set(target[r][c], { row: r, col: c });
                }
            }
        }

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const value = tempBoard[r][c];
                const key = `${r},${c}`;
                if (value !== 0 && value !== -1 && !this.obstacles.has(key)) {
                    const targetPos = valuePositions.get(value);
                    if (targetPos) {
                        distance += Math.abs(r - targetPos.row) + Math.abs(c - targetPos.col);
                    }
                }
            }
        }

        return distance;
    }

    highlightTile(row, col) {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(t => t.classList.remove('hint'));

        const idx = row * this.size + col;
        if (tiles[idx]) {
            tiles[idx].classList.add('hint');
            setTimeout(() => tiles[idx].classList.remove('hint'), 2000);
        }
    }

    undo() {
        if (this.undoStack.length === 0 || this.gameWon) return;

        const prevState = this.undoStack.pop();
        this.board = prevState.board;
        this.emptyPos = prevState.emptyPos;
        this.moves = prevState.moves;
        this.timer = prevState.timer;

        this.playMoveSound();
        this.render();
        this.updateStats();
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        document.getElementById('sound-toggle').textContent = this.soundEnabled ? '🔊' : '🔇';
    }

    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(frequency, duration, type = 'sine') {
        if (!this.soundEnabled) return;

        this.initAudio();
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playMoveSound() {
        this.playTone(440, 0.1, 'sine');
    }

    playWinSound() {
        if (!this.soundEnabled) return;

        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, 'sine'), i * 150);
        });
    }

    showCustomBoard() {
        this.customObstacles = new Set();
        this.renderCustomBoard();
    }

    renderCustomBoard() {
        const board = document.getElementById('board');
        const containerWidth = Math.min(500, window.innerWidth - 80);
        const tileSize = Math.max(this.minTileSize, Math.min(this.maxTileSize,
            Math.floor((containerWidth - 16 - (this.size - 1) * 6) / this.size)));

        board.style.gridTemplateColumns = `repeat(${this.size}, ${tileSize}px)`;
        board.style.gridTemplateRows = `repeat(${this.size}, ${tileSize}px)`;
        board.innerHTML = '';

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = document.createElement('div');
                const key = `${row},${col}`;

                tile.className = 'tile';
                tile.dataset.row = row;
                tile.dataset.col = col;
                tile.style.width = `${tileSize}px`;
                tile.style.height = `${tileSize}px`;

                const isLastCell = row === this.size - 1 && col === this.size - 1;

                if (isLastCell) {
                    tile.classList.add('empty');
                } else if (this.customObstacles.has(key)) {
                    tile.classList.add('obstacle');
                    tile.textContent = '';
                } else {
                    tile.textContent = row * this.size + col + 1;
                }

                if (!isLastCell) {
                    tile.addEventListener('click', () => {
                        if (this.customObstacles.has(key)) {
                            this.customObstacles.delete(key);
                        } else {
                            this.customObstacles.add(key);
                        }
                        this.renderCustomBoard();
                    });
                }

                board.appendChild(tile);
            }
        }
    }

    startCustomGame() {
        const lastCell = `${this.size - 1},${this.size - 1}`;
        this.customObstacles.delete(lastCell);

        if (this.customObstacles.size >= this.size * this.size - 2) {
            alert('障碍太多，无法游戏！请减少障碍数量。');
            return;
        }

        this.mode = 'custom-play';
        document.getElementById('custom-panel').classList.add('hidden');

        document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
        document.querySelector('.btn-mode[data-mode="custom"]').classList.add('active');

        this.newGame();
    }

    clearCustomObstacles() {
        this.customObstacles.clear();
        this.renderCustomBoard();
    }

    exportLayout() {
        const lastCell = `${this.size - 1},${this.size - 1}`;
        const obstacles = Array.from(this.customObstacles).filter(o => o !== lastCell);

        const layout = {
            size: this.size,
            obstacles: obstacles
        };
        const json = JSON.stringify(layout, null, 2);

        navigator.clipboard.writeText(json).then(() => {
            alert('布局已复制到剪贴板！');
        }).catch(() => {
            const textarea = document.getElementById('import-json');
            textarea.value = json;
            textarea.classList.remove('hidden');
            alert('请复制下方的JSON数据分享给朋友。');
        });
    }

    showImport() {
        const textarea = document.getElementById('import-json');
        textarea.classList.toggle('hidden');
        if (!textarea.classList.contains('hidden')) {
            textarea.focus();
        }
    }

    importLayout() {
        const textarea = document.getElementById('import-json');
        try {
            const layout = JSON.parse(textarea.value);
            if (!layout.size || !layout.obstacles) {
                throw new Error('无效的布局格式');
            }

            if (layout.size !== 4 && layout.size !== 5) {
                throw new Error('只支持 4x4 或 5x5 尺寸');
            }

            this.size = layout.size;
            this.customObstacles = new Set(layout.obstacles);

            const lastCell = `${this.size - 1},${this.size - 1}`;
            this.customObstacles.delete(lastCell);

            if (this.customObstacles.size >= this.size * this.size - 2) {
                throw new Error('障碍太多，无法游戏');
            }

            document.querySelectorAll('.btn-size').forEach(b => b.classList.remove('active'));
            const sizeBtn = document.querySelector(`.btn-size[data-size="${this.size}"]`);
            if (sizeBtn) sizeBtn.classList.add('active');

            this.loadBestTime();
            this.renderCustomBoard();
            textarea.classList.add('hidden');
            textarea.value = '';
            alert('布局导入成功！');
        } catch (e) {
            alert('导入失败：' + e.message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new PuzzleGame();
});
