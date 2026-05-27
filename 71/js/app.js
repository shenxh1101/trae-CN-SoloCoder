class SlidePuzzle {
    constructor() {
        this.size = 4;
        this.tiles = [];
        this.tileElements = [];
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.isPlaying = false;
        this.history = [];
        this.maxHistory = 5;
        this.soundEnabled = true;
        this.colorMode = true;
        this.audioContext = null;
        this.isAnimating = false;
        
        this.initElements();
        this.initEventListeners();
        this.loadSettings();
        this.loadBestRecords();
        this.initGame();
    }

    initElements() {
        this.gameBoard = document.getElementById('gameBoard');
        this.movesEl = document.getElementById('moves');
        this.timeEl = document.getElementById('time');
        this.diffEl = document.getElementById('diff');
        this.winModal = document.getElementById('winModal');
        this.winMoves = document.getElementById('winMoves');
        this.winTime = document.getElementById('winTime');
        this.colorModeToggle = document.getElementById('colorMode');
        this.soundModeToggle = document.getElementById('soundMode');
    }

    initEventListeners() {
        document.getElementById('shuffleBtn').addEventListener('click', () => this.shuffle());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.hideWinModal();
            this.shuffle();
        });

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const size = parseInt(e.target.dataset.size);
                this.setDifficulty(size);
            });
        });

        this.colorModeToggle.addEventListener('change', (e) => {
            this.colorMode = e.target.checked;
            this.saveSettings();
            this.updateTileColors();
        });

        this.soundModeToggle.addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
            this.saveSettings();
        });

        this.winModal.addEventListener('click', (e) => {
            if (e.target === this.winModal) {
                this.hideWinModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.isAnimating) return;
            
            const emptyIndex = this.tiles.indexOf(0);
            const row = Math.floor(emptyIndex / this.size);
            const col = emptyIndex % this.size;
            let targetIndex = -1;

            switch(e.key) {
                case 'ArrowUp':
                    if (row < this.size - 1) targetIndex = emptyIndex + this.size;
                    break;
                case 'ArrowDown':
                    if (row > 0) targetIndex = emptyIndex - this.size;
                    break;
                case 'ArrowLeft':
                    if (col < this.size - 1) targetIndex = emptyIndex + 1;
                    break;
                case 'ArrowRight':
                    if (col > 0) targetIndex = emptyIndex - 1;
                    break;
            }

            if (targetIndex >= 0) {
                e.preventDefault();
                this.moveTile(targetIndex);
            }
        });

        window.addEventListener('resize', () => {
            this.updateTilePositions(false);
        });
    }

    initGame() {
        this.tiles = [];
        for (let i = 1; i < this.size * this.size; i++) {
            this.tiles.push(i);
        }
        this.tiles.push(0);
        
        this.moves = 0;
        this.history = [];
        this.stopTimer();
        this.isPlaying = false;
        this.elapsed = 0;
        this.isAnimating = false;
        
        this.updateStats();
        this.createBoard();
    }

    setDifficulty(size) {
        this.size = size;
        
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.size) === size);
        });
        
        this.initGame();
        this.shuffle();
    }

    shuffle() {
        if (this.isAnimating) return;
        
        this.saveState();
        
        do {
            this.tiles = [];
            for (let i = 1; i < this.size * this.size; i++) {
                this.tiles.push(i);
            }
            this.tiles.push(0);
            
            for (let i = this.tiles.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
            }
        } while (!this.isSolvable() || this.checkWin());

        this.moves = 0;
        this.history = [];
        this.startTimer();
        this.isPlaying = true;
        
        this.updateStats();
        this.updateTilePositions(false);
    }

    isSolvable() {
        let inversions = 0;
        const flatTiles = this.tiles.filter(t => t !== 0);
        
        for (let i = 0; i < flatTiles.length; i++) {
            for (let j = i + 1; j < flatTiles.length; j++) {
                if (flatTiles[i] > flatTiles[j]) {
                    inversions++;
                }
            }
        }

        if (this.size % 2 === 1) {
            return inversions % 2 === 0;
        } else {
            const emptyRow = Math.floor(this.tiles.indexOf(0) / this.size);
            const emptyRowFromBottom = this.size - emptyRow;
            return (inversions + emptyRowFromBottom) % 2 === 1;
        }
    }

    createBoard() {
        this.gameBoard.innerHTML = '';
        this.gameBoard.className = `game-board size-${this.size}`;
        this.tileElements = [];
        
        const gap = 8;
        const boardSize = this.gameBoard.clientWidth;
        const tileSize = (boardSize - gap * (this.size + 1)) / this.size;
        
        for (let i = 0; i < this.size * this.size; i++) {
            const value = this.tiles[i];
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.value = value;
            
            const row = Math.floor(i / this.size);
            const col = i % this.size;
            
            if (value === 0) {
                tile.classList.add('empty');
            } else {
                tile.textContent = value;
                
                if (this.colorMode) {
                    tile.classList.add(`color-mode-${(value - 1) % 24}`);
                } else {
                    tile.classList.add('no-color');
                }
                
                tile.addEventListener('click', () => this.moveTile(value));
            }
            
            this.gameBoard.appendChild(tile);
            this.tileElements.push(tile);
        }
        
        this.updateTilePositions(false);
    }

    updateTilePositions(animate = true) {
        const gap = 8;
        const boardSize = this.gameBoard.clientWidth;
        const tileSize = (boardSize - gap * (this.size + 1)) / this.size;
        
        this.tileElements.forEach((tile, domIndex) => {
            const value = parseInt(tile.dataset.value);
            const tileIndex = this.tiles.indexOf(value);
            
            const row = Math.floor(tileIndex / this.size);
            const col = tileIndex % this.size;
            
            const x = gap + col * (tileSize + gap);
            const y = gap + row * (tileSize + gap);
            
            if (animate) {
                tile.style.transition = 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
            } else {
                tile.style.transition = 'none';
            }
            
            tile.style.transform = `translate(${x}px, ${y}px)`;
            tile.style.width = `${tileSize}px`;
            tile.style.height = `${tileSize}px`;
            tile.style.position = 'absolute';
        });
    }

    updateTileColors() {
        this.tileElements.forEach((tile, index) => {
            const value = parseInt(tile.dataset.value);
            
            tile.classList.remove('no-color');
            for (let i = 0; i < 24; i++) {
                tile.classList.remove(`color-mode-${i}`);
            }
            
            if (value !== 0) {
                if (this.colorMode) {
                    tile.classList.add(`color-mode-${(value - 1) % 24}`);
                } else {
                    tile.classList.add('no-color');
                }
            }
        });
    }

    moveTile(clickedValue) {
        if (!this.isPlaying || this.isAnimating) return;
        
        const emptyIndex = this.tiles.indexOf(0);
        const tileIndex = this.tiles.indexOf(clickedValue);
        
        if (tileIndex === -1 || clickedValue === 0) return;
        
        const row = Math.floor(tileIndex / this.size);
        const col = tileIndex % this.size;
        const emptyRow = Math.floor(emptyIndex / this.size);
        const emptyCol = emptyIndex % this.size;
        
        const isAdjacent = 
            (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
            (Math.abs(col - emptyCol) === 1 && row === emptyRow);
        
        if (!isAdjacent) return;
        
        this.saveState();
        this.isAnimating = true;
        
        [this.tiles[tileIndex], this.tiles[emptyIndex]] = [this.tiles[emptyIndex], this.tiles[tileIndex]];
        
        this.moves++;
        
        this.playMoveSound();
        this.updateStats();
        this.updateTilePositions(true);
        
        setTimeout(() => {
            this.isAnimating = false;
            
            if (this.checkWin()) {
                this.handleWin();
            }
        }, 160);
    }

    saveState() {
        this.history.push({
            tiles: [...this.tiles],
            moves: this.moves,
            elapsed: this.elapsed || 0
        });
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length === 0 || this.isAnimating) return;
        
        const prevState = this.history.pop();
        this.tiles = prevState.tiles;
        this.moves = prevState.moves;
        this.elapsed = prevState.elapsed;
        
        this.tileElements.forEach((tile, i) => {
            tile.remove();
        });
        this.tileElements = [];
        
        this.createBoard();
        
        this.updateStats();
        this.playMoveSound();
    }

    reset() {
        if (this.isAnimating) return;
        this.initGame();
    }

    checkWin() {
        for (let i = 0; i < this.tiles.length - 1; i++) {
            if (this.tiles[i] !== i + 1) return false;
        }
        return this.tiles[this.tiles.length - 1] === 0;
    }

    getDiffCount() {
        let diff = 0;
        for (let i = 0; i < this.tiles.length - 1; i++) {
            if (this.tiles[i] !== i + 1) diff++;
        }
        if (this.tiles[this.tiles.length - 1] !== 0) diff++;
        return diff;
    }

    showHint() {
        const emptyIndex = this.tiles.indexOf(0);
        const correctValue = emptyIndex + 1;
        const hintValueIndex = this.tiles.indexOf(correctValue);
        
        this.tileElements.forEach(tile => tile.classList.remove('hint'));
        
        if (hintValueIndex !== -1 && correctValue !== this.size * this.size) {
            const hintTile = this.tileElements.find(t => parseInt(t.dataset.value) === correctValue);
            if (hintTile) {
                hintTile.classList.add('hint');
                setTimeout(() => {
                    hintTile.classList.remove('hint');
                }, 2000);
            }
        } else {
            const neighbors = this.getMovableTiles();
            if (neighbors.length > 0) {
                const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                const neighborTile = this.tileElements.find((t, i) => i === randomNeighbor);
                if (neighborTile && !neighborTile.classList.contains('empty')) {
                    neighborTile.classList.add('hint');
                    setTimeout(() => {
                        neighborTile.classList.remove('hint');
                    }, 2000);
                }
            }
        }
    }

    getMovableTiles() {
        const emptyIndex = this.tiles.indexOf(0);
        const emptyRow = Math.floor(emptyIndex / this.size);
        const emptyCol = emptyIndex % this.size;
        const neighbors = [];
        
        if (emptyRow > 0) neighbors.push(emptyIndex - this.size);
        if (emptyRow < this.size - 1) neighbors.push(emptyIndex + this.size);
        if (emptyCol > 0) neighbors.push(emptyIndex - 1);
        if (emptyCol < this.size - 1) neighbors.push(emptyIndex + 1);
        
        return neighbors;
    }

    handleWin() {
        this.stopTimer();
        this.isPlaying = false;
        this.playWinSound();
        this.startFireworks();
        
        this.winMoves.textContent = this.moves;
        this.winTime.textContent = this.formatTime(this.elapsed);
        
        this.saveBestRecord();
        
        setTimeout(() => {
            this.showWinModal();
        }, 1000);
    }

    showWinModal() {
        this.winModal.classList.add('show');
    }

    hideWinModal() {
        this.winModal.classList.remove('show');
        this.stopFireworks();
    }

    startTimer() {
        this.startTime = Date.now();
        this.elapsed = 0;
        this.timerInterval = setInterval(() => {
            this.elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateStats();
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

    updateStats() {
        this.movesEl.textContent = this.moves;
        this.timeEl.textContent = this.formatTime(this.elapsed || 0);
        this.diffEl.textContent = this.getDiffCount();
    }

    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playMoveSound() {
        if (!this.soundEnabled) return;
        
        this.initAudio();
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    playWinSound() {
        if (!this.soundEnabled) return;
        
        this.initAudio();
        
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        notes.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.15);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime + i * 0.15);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.15 + 0.3);
            
            oscillator.start(this.audioContext.currentTime + i * 0.15);
            oscillator.stop(this.audioContext.currentTime + i * 0.15 + 0.3);
        });
    }

    startFireworks() {
        const canvas = document.getElementById('fireworksCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        this.fireworks = [];
        this.particles = [];
        this.fireworkRunning = true;
        
        const animate = () => {
            if (!this.fireworkRunning) return;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            if (Math.random() < 0.05) {
                this.fireworks.push({
                    x: Math.random() * canvas.width,
                    y: canvas.height,
                    targetY: Math.random() * canvas.height * 0.5 + 50,
                    speed: 8,
                    color: `hsl(${Math.random() * 360}, 100%, 50%)`
                });
            }
            
            this.fireworks = this.fireworks.filter(fw => {
                fw.y -= fw.speed;
                
                ctx.beginPath();
                ctx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = fw.color;
                ctx.fill();
                
                if (fw.y <= fw.targetY) {
                    this.explode(fw.x, fw.y, fw.color);
                    return false;
                }
                return true;
            });
            
            this.particles = this.particles.filter(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.alpha -= 0.02;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
                ctx.fill();
                
                return p.alpha > 0;
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    explode(x, y, color) {
        const rgb = this.hslToRgb(color);
        
        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 / 50) * i;
            const speed = Math.random() * 6 + 2;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: rgb.r,
                g: rgb.g,
                b: rgb.b,
                alpha: 1
            });
        }
    }

    hslToRgb(hsl) {
        const match = hsl.match(/hsl\((\d+),\s*100%,\s*50%\)/);
        if (!match) return { r: 255, g: 255, b: 255 };
        
        const h = parseInt(match[1]) / 360;
        const s = 1;
        const l = 0.5;
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    stopFireworks() {
        this.fireworkRunning = false;
        const canvas = document.getElementById('fireworksCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    saveBestRecord() {
        const key = `puzzle_best_${this.size}`;
        const current = JSON.parse(localStorage.getItem(key)) || { moves: Infinity, time: Infinity };
        
        let newRecord = false;
        
        if (this.moves < current.moves) {
            current.moves = this.moves;
            newRecord = true;
        }
        
        if (this.elapsed < current.time) {
            current.time = this.elapsed;
            newRecord = true;
        }
        
        if (newRecord) {
            localStorage.setItem(key, JSON.stringify(current));
            this.loadBestRecords();
        }
    }

    loadBestRecords() {
        [3, 4, 5].forEach(size => {
            const key = `puzzle_best_${size}`;
            const record = JSON.parse(localStorage.getItem(key));
            const el = document.getElementById(`best${size}`);
            
            if (record && record.moves !== Infinity) {
                el.textContent = `${record.moves}步 / ${this.formatTime(record.time)}`;
            } else {
                el.textContent = '-';
            }
        });
    }

    saveSettings() {
        localStorage.setItem('puzzle_settings', JSON.stringify({
            soundEnabled: this.soundEnabled,
            colorMode: this.colorMode
        }));
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('puzzle_settings')) || {};
        
        if (typeof settings.soundEnabled !== 'undefined') {
            this.soundEnabled = settings.soundEnabled;
            this.soundModeToggle.checked = this.soundEnabled;
        }
        
        if (typeof settings.colorMode !== 'undefined') {
            this.colorMode = settings.colorMode;
            this.colorModeToggle.checked = this.colorMode;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new SlidePuzzle();
    setTimeout(() => window.game.shuffle(), 500);
});
