class Match3Game {
    constructor() {
        this.gridSize = 8;
        this.gemTypes = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
        this.gemScores = { red: 10, blue: 15, green: 20, yellow: 25, purple: 30, orange: 35 };
        this.grid = [];
        this.selectedGem = null;
        this.score = 0;
        this.targetScore = 1000;
        this.moves = 30;
        this.level = 1;
        this.mode = 'level';
        this.timer = 60;
        this.timerInterval = null;
        this.isAnimating = false;
        this.soundEnabled = true;
        this.audioContext = null;
        this.history = [];
        this.maxHistory = 3;
        this.highScore = parseInt(localStorage.getItem('match3HighScore')) || 0;
        
        this.gameBoard = document.getElementById('game-board');
        this.scoreDisplay = document.getElementById('score');
        this.targetDisplay = document.getElementById('target');
        this.movesDisplay = document.getElementById('moves');
        this.timerDisplay = document.getElementById('timer');
        this.timerContainer = document.getElementById('timer-container');
        this.levelDisplay = document.getElementById('level');
        this.highScoreDisplay = document.getElementById('high-score');
        this.undoBtn = document.getElementById('undo-btn');
        this.soundBtn = document.getElementById('sound-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.modal = document.getElementById('game-over-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMessage = document.getElementById('modal-message');
        this.modalBtn = document.getElementById('modal-btn');
        
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchGem = null;
        
        this.init();
    }
    
    init() {
        this.initAudio();
        this.loadHighScore();
        this.setupEventListeners();
        
        const infoItems = document.querySelectorAll('.info-item');
        if (this.mode === 'level') {
            infoItems[1].style.display = 'flex';
            infoItems[2].style.display = 'flex';
            infoItems[3].style.display = 'none';
        } else {
            infoItems[1].style.display = 'none';
            infoItems[2].style.display = 'none';
            infoItems[3].style.display = 'flex';
        }
        
        this.initGame();
    }
    
    initAudio() {
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
        
        switch(type) {
            case 'swap':
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.1);
                break;
            case 'match':
                oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
                oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.3);
                break;
            case 'special':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
                for (let i = 0; i < 5; i++) {
                    oscillator.frequency.setValueAtTime(300 + i * 100, this.audioContext.currentTime + i * 0.08);
                }
                gainNode.gain.setValueAtTime(0.12, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.4);
                break;
            case 'explosion':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.3);
                break;
        }
    }
    
    loadHighScore() {
        this.highScoreDisplay.textContent = this.highScore;
    }
    
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('match3HighScore', this.highScore);
            this.highScoreDisplay.textContent = this.highScore;
        }
    }
    
    setupEventListeners() {
        this.soundBtn.addEventListener('click', () => this.toggleSound());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.undoBtn.addEventListener('click', () => this.undoMove());
        this.modalBtn.addEventListener('click', () => this.handleModalClose());
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.mode = e.target.dataset.mode;
                
                const infoItems = document.querySelectorAll('.info-item');
                if (this.mode === 'level') {
                    infoItems[1].style.display = 'flex';
                    infoItems[2].style.display = 'flex';
                    infoItems[3].style.display = 'none';
                } else {
                    infoItems[1].style.display = 'none';
                    infoItems[2].style.display = 'none';
                    infoItems[3].style.display = 'flex';
                }
                
                this.restartGame();
            });
        });
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.soundBtn.classList.toggle('muted', !this.soundEnabled);
        this.soundBtn.textContent = this.soundEnabled ? '🔊 音效' : '🔇 音效';
    }
    
    initGame() {
        this.score = 0;
        this.history = [];
        this.updateUndoButton();
        
        if (this.mode === 'level') {
            this.level = 1;
            this.targetScore = 1000;
            this.moves = 30;
        } else {
            this.targetScore = -1;
            this.moves = 999;
            this.timer = 60;
            this.startTimer();
        }
        
        this.updateUI();
        this.createGrid();
        this.ensureInitialMatches();
        this.renderBoard();
    }
    
    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timer--;
            this.timerDisplay.textContent = this.timer;
            if (this.timer <= 0) {
                this.endGame();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    createGrid() {
        this.grid = [];
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                this.grid[row][col] = this.createRandomGem(row, col);
            }
        }
    }
    
    createRandomGem(row, col) {
        const type = this.gemTypes[Math.floor(Math.random() * this.gemTypes.length)];
        return {
            type,
            special: null,
            row,
            col,
            id: `gem-${row}-${col}-${Date.now()}-${Math.random()}`
        };
    }
    
    ensureInitialMatches() {
        let hasMatches = true;
        while (hasMatches) {
            hasMatches = false;
            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    while (this.hasInitialMatchAt(row, col)) {
                        this.grid[row][col] = this.createRandomGem(row, col);
                        hasMatches = true;
                    }
                }
            }
        }
    }
    
    hasInitialMatchAt(row, col) {
        const type = this.grid[row][col].type;
        let horizontalCount = 1;
        let verticalCount = 1;
        
        for (let c = col - 1; c >= 0 && this.grid[row][c].type === type; c--) {
            horizontalCount++;
        }
        for (let c = col + 1; c < this.gridSize && this.grid[row][c].type === type; c++) {
            horizontalCount++;
        }
        
        for (let r = row - 1; r >= 0 && this.grid[r][col].type === type; r--) {
            verticalCount++;
        }
        for (let r = row + 1; r < this.gridSize && this.grid[r][col].type === type; r++) {
            verticalCount++;
        }
        
        return horizontalCount >= 3 || verticalCount >= 3;
    }
    
    renderBoard() {
        this.gameBoard.innerHTML = '';
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const gemElement = this.createGemElement(this.grid[row][col]);
                this.gameBoard.appendChild(gemElement);
            }
        }
    }
    
    createGemElement(gem) {
        const element = document.createElement('div');
        element.className = `gem gem-${gem.special || gem.type}`;
        element.dataset.row = gem.row;
        element.dataset.col = gem.col;
        element.dataset.id = gem.id;
        
        element.addEventListener('click', () => this.handleGemClick(gem.row, gem.col));
        
        element.addEventListener('touchstart', (e) => this.handleTouchStart(e, gem.row, gem.col), { passive: true });
        element.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        element.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        
        return element;
    }
    
    handleTouchStart(e, row, col) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchGem = { row, col };
    }
    
    handleTouchMove(e) {
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        if (!this.touchGem || this.isAnimating) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        const minSwipe = 30;
        
        let targetRow = this.touchGem.row;
        let targetCol = this.touchGem.col;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (Math.abs(deltaX) > minSwipe) {
                targetCol += deltaX > 0 ? 1 : -1;
            }
        } else {
            if (Math.abs(deltaY) > minSwipe) {
                targetRow += deltaY > 0 ? 1 : -1;
            }
        }
        
        if (targetRow !== this.touchGem.row || targetCol !== this.touchGem.col) {
            if (this.isValidPosition(targetRow, targetCol)) {
                this.selectedGem = { row: this.touchGem.row, col: this.touchGem.col };
                this.attemptSwap(targetRow, targetCol);
            }
        }
        
        this.touchGem = null;
    }
    
    handleGemClick(row, col) {
        if (this.isAnimating) return;
        
        if (!this.selectedGem) {
            this.selectedGem = { row, col };
            this.highlightSelectedGem();
        } else {
            if (this.selectedGem.row === row && this.selectedGem.col === col) {
                this.clearSelection();
            } else if (this.isAdjacent(this.selectedGem, { row, col })) {
                this.attemptSwap(row, col);
            } else {
                this.selectedGem = { row, col };
                this.highlightSelectedGem();
            }
        }
    }
    
    highlightSelectedGem() {
        document.querySelectorAll('.gem').forEach(g => g.classList.remove('selected'));
        const element = document.querySelector(`[data-row="${this.selectedGem.row}"][data-col="${this.selectedGem.col}"]`);
        if (element) element.classList.add('selected');
    }
    
    clearSelection() {
        document.querySelectorAll('.gem').forEach(g => g.classList.remove('selected'));
        this.selectedGem = null;
    }
    
    isAdjacent(pos1, pos2) {
        const rowDiff = Math.abs(pos1.row - pos2.row);
        const colDiff = Math.abs(pos1.col - pos2.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
    
    isValidPosition(row, col) {
        return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
    }
    
    saveState() {
        const state = {
            grid: JSON.parse(JSON.stringify(this.grid)),
            score: this.score,
            moves: this.moves
        };
        this.history.push(state);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        this.updateUndoButton();
    }
    
    undoMove() {
        if (this.history.length === 0 || this.isAnimating) return;
        
        const state = this.history.pop();
        this.grid = state.grid;
        this.score = state.score;
        this.moves = state.moves;
        
        this.updateUI();
        this.renderBoard();
        this.updateUndoButton();
        this.playSound('swap');
    }
    
    updateUndoButton() {
        this.undoBtn.disabled = this.history.length === 0;
        this.undoBtn.textContent = `↶ 撤销 (${this.history.length})`;
    }
    
    async attemptSwap(row, col) {
        this.saveState();
        
        const pos1 = this.selectedGem;
        const pos2 = { row, col };
        
        this.swapGems(pos1, pos2);
        this.playSound('swap');
        
        await this.animateSwap(pos1, pos2);
        
        const matches = this.findAllMatches();
        
        if (matches.length === 0) {
            this.swapGems(pos1, pos2);
            await this.animateSwap(pos1, pos2);
            this.history.pop();
            this.updateUndoButton();
        } else {
            this.moves--;
            this.updateUI();
            await this.processMatches();
        }
        
        this.clearSelection();
        this.checkGameState();
    }
    
    swapGems(pos1, pos2) {
        const temp = this.grid[pos1.row][pos1.col];
        this.grid[pos1.row][pos1.col] = this.grid[pos2.row][pos2.col];
        this.grid[pos2.row][pos2.col] = temp;
        
        this.grid[pos1.row][pos1.col].row = pos1.row;
        this.grid[pos1.row][pos1.col].col = pos1.col;
        this.grid[pos2.row][pos2.col].row = pos2.row;
        this.grid[pos2.row][pos2.col].col = pos2.col;
    }
    
    async animateSwap(pos1, pos2) {
        this.isAnimating = true;
        
        const gem1 = document.querySelector(`[data-row="${pos1.row}"][data-col="${pos1.col}"]`);
        const gem2 = document.querySelector(`[data-row="${pos2.row}"][data-col="${pos2.col}"]`);
        
        if (gem1 && gem2) {
            gem1.classList.add('swapping');
            gem2.classList.add('swapping');
            
            const cellSize = this.gameBoard.offsetWidth / this.gridSize;
            const dx = (pos2.col - pos1.col) * cellSize;
            const dy = (pos2.row - pos1.row) * cellSize;
            
            gem1.style.transform = `translate(${dx}px, ${dy}px)`;
            gem2.style.transform = `translate(${-dx}px, ${-dy}px)`;
            
            await this.delay(300);
            
            gem1.style.transform = '';
            gem2.style.transform = '';
            gem1.classList.remove('swapping');
            gem2.classList.remove('swapping');
        }
        
        this.renderBoard();
        this.isAnimating = false;
    }
    
    findAllMatches() {
        const matches = [];
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize - 2; col++) {
                const match = this.findMatch(row, col, 0, 1);
                if (match) matches.push(match);
            }
        }
        
        for (let row = 0; row < this.gridSize - 2; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const match = this.findMatch(row, col, 1, 0);
                if (match) matches.push(match);
            }
        }
        
        return this.mergeMatches(matches);
    }
    
    findMatch(row, col, rowDir, colDir) {
        const gem = this.grid[row][col];
        if (!gem) return null;
        
        const type = gem.type;
        const gems = [{ row, col, gem }];
        
        if (gem.special === 'rainbow') {
            for (let i = 1; i < this.gridSize; i++) {
                const newRow = row + i * rowDir;
                const newCol = col + i * colDir;
                
                if (!this.isValidPosition(newRow, newCol)) break;
                
                const nextGem = this.grid[newRow][newCol];
                if (!nextGem) break;
                
                gems.push({ row: newRow, col: newCol, gem: nextGem });
                break;
            }
            
            if (gems.length >= 2) {
                return {
                    gems,
                    direction: rowDir === 0 ? 'horizontal' : 'vertical',
                    length: gems.length
                };
            }
            return null;
        }
        
        for (let i = 1; i < this.gridSize; i++) {
            const newRow = row + i * rowDir;
            const newCol = col + i * colDir;
            
            if (!this.isValidPosition(newRow, newCol)) break;
            
            const nextGem = this.grid[newRow][newCol];
            if (!nextGem) break;
            
            if (nextGem.special === 'rainbow') {
                gems.push({ row: newRow, col: newCol, gem: nextGem });
            } else if (nextGem.type === type) {
                gems.push({ row: newRow, col: newCol, gem: nextGem });
            } else {
                break;
            }
        }
        
        const hasRainbow = gems.some(g => g.gem.special === 'rainbow');
        
        if (gems.length >= 3 || (hasRainbow && gems.length >= 2)) {
            return {
                gems,
                direction: rowDir === 0 ? 'horizontal' : 'vertical',
                length: gems.length
            };
        }
        
        return null;
    }
    
    mergeMatches(matches) {
        const merged = [];
        const used = new Set();
        
        for (const match of matches) {
            const key = match.gems.map(g => `${g.row},${g.col}`).join('|');
            if (!used.has(key)) {
                merged.push(match);
                match.gems.forEach(g => used.add(`${g.row},${g.col}`));
            }
        }
        
        return merged;
    }
    
    async processMatches() {
        this.isAnimating = true;
        let hasMatches = true;
        let chainCount = 0;
        
        while (hasMatches) {
            const matches = this.findAllMatches();
            
            if (matches.length === 0) {
                hasMatches = false;
                break;
            }
            
            chainCount++;
            const specialGems = [];
            const gemsToPreserve = new Set();
            const allGemsToRemove = new Set();
            const processedGems = new Set();
            
            for (const match of matches) {
                let hasRainbow = false;
                let hasBomb = false;
                let rainbowGem = null;
                let bombGem = null;
                
                for (const g of match.gems) {
                    if (g.gem.special === 'rainbow') {
                        hasRainbow = true;
                        rainbowGem = g;
                    }
                    if (g.gem.special === 'bomb') {
                        hasBomb = true;
                        bombGem = g;
                    }
                }
                
                if (hasRainbow && match.gems.length > 1) {
                    const otherGem = match.gems.find(g => g.gem.special !== 'rainbow');
                    if (otherGem) {
                        const colorToRemove = otherGem.gem.type;
                        for (let r = 0; r < this.gridSize; r++) {
                            for (let c = 0; c < this.gridSize; c++) {
                                const key = `${r},${c}`;
                                if (this.grid[r][c] && this.grid[r][c].type === colorToRemove && !processedGems.has(key)) {
                                    allGemsToRemove.add(key);
                                    processedGems.add(key);
                                }
                            }
                        }
                        const rainbowKey = `${rainbowGem.row},${rainbowGem.col}`;
                        allGemsToRemove.add(rainbowKey);
                        processedGems.add(rainbowKey);
                        this.playSound('special');
                    }
                } else if (hasBomb && match.length >= 3) {
                    for (const g of match.gems) {
                        const key = `${g.row},${g.col}`;
                        if (!processedGems.has(key)) {
                            allGemsToRemove.add(key);
                            processedGems.add(key);
                        }
                    }
                    
                    const centerRow = bombGem.row;
                    const centerCol = bombGem.col;
                    this.createExplosionEffect(centerRow, centerCol);
                    for (let r = centerRow - 1; r <= centerRow + 1; r++) {
                        for (let c = centerCol - 1; c <= centerCol + 1; c++) {
                            const key = `${r},${c}`;
                            if (this.isValidPosition(r, c) && this.grid[r][c] && !processedGems.has(key)) {
                                allGemsToRemove.add(key);
                                processedGems.add(key);
                            }
                        }
                    }
                    this.playSound('explosion');
                } else {
                    let specialType = null;
                    let specialPos = null;
                    
                    if (match.length >= 5) {
                        specialType = 'rainbow';
                        specialPos = match.gems[0];
                        this.playSound('special');
                    } else if (match.length >= 4) {
                        specialType = 'bomb';
                        specialPos = match.gems[0];
                        this.playSound('special');
                    }
                    
                    for (const g of match.gems) {
                        const key = `${g.row},${g.col}`;
                        if (processedGems.has(key)) continue;
                        
                        if (specialPos && g.row === specialPos.row && g.col === specialPos.col) {
                            gemsToPreserve.add(key);
                            specialGems.push({
                                row: g.row,
                                col: g.col,
                                type: specialType
                            });
                        } else {
                            allGemsToRemove.add(key);
                            processedGems.add(key);
                        }
                    }
                }
            }
            
            gemsToPreserve.forEach(pos => {
                allGemsToRemove.delete(pos);
                processedGems.delete(pos);
            });
            
            let totalScore = 0;
            for (const key of allGemsToRemove) {
                const [row, col] = key.split(',').map(Number);
                if (this.grid[row][col]) {
                    totalScore += this.gemScores[this.grid[row][col].type] || 10;
                }
            }
            
            if (allGemsToRemove.size > 0 || specialGems.length > 0) {
                this.score += totalScore;
                if (totalScore > 0) {
                    this.playSound('match');
                    this.showScorePopup(totalScore);
                }
                
                if (allGemsToRemove.size > 0) {
                    await this.removeGems(allGemsToRemove);
                    await this.dropGems();
                    await this.fillEmptySpaces();
                }
                
                for (const special of specialGems) {
                    if (this.grid[special.row][special.col]) {
                        this.grid[special.row][special.col].special = special.type;
                    }
                }
                
                this.renderBoard();
                this.updateUI();
            } else {
                hasMatches = false;
            }
        }
        
        this.isAnimating = false;
    }
    
    createExplosionEffect(row, col) {
        const element = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (element) {
            const explosion = document.createElement('div');
            explosion.className = 'explosion';
            element.appendChild(explosion);
            setTimeout(() => explosion.remove(), 500);
        }
    }
    
    showScorePopup(points) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = `+${points}`;
        popup.style.left = '50%';
        popup.style.top = '50%';
        this.gameBoard.appendChild(popup);
        setTimeout(() => popup.remove(), 1000);
    }
    
    async removeGems(gemsToRemove) {
        const elements = [];
        
        for (const key of gemsToRemove) {
            const [row, col] = key.split(',').map(Number);
            const element = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (element) {
                element.classList.add('removing');
                elements.push(element);
            }
            this.grid[row][col] = null;
        }
        
        await this.delay(400);
    }
    
    async dropGems() {
        let dropped = false;
        
        for (let col = 0; col < this.gridSize; col++) {
            let emptyRow = this.gridSize - 1;
            
            for (let row = this.gridSize - 1; row >= 0; row--) {
                if (this.grid[row][col] !== null) {
                    if (row !== emptyRow) {
                        this.grid[emptyRow][col] = this.grid[row][col];
                        this.grid[emptyRow][col].row = emptyRow;
                        this.grid[row][col] = null;
                        dropped = true;
                    }
                    emptyRow--;
                }
            }
        }
        
        if (dropped) {
            this.renderBoard();
            document.querySelectorAll('.gem').forEach(g => g.classList.add('falling'));
            await this.delay(300);
        }
    }
    
    async fillEmptySpaces() {
        for (let col = 0; col < this.gridSize; col++) {
            for (let row = 0; row < this.gridSize; row++) {
                if (this.grid[row][col] === null) {
                    this.grid[row][col] = this.createRandomGem(row, col);
                }
            }
        }
        
        this.renderBoard();
        document.querySelectorAll('.gem').forEach(g => g.classList.add('falling'));
        await this.delay(300);
    }
    
    updateUI() {
        this.scoreDisplay.textContent = this.score;
        this.targetDisplay.textContent = this.targetScore > 0 ? this.targetScore : '-';
        this.movesDisplay.textContent = this.moves < 999 ? this.moves : '-';
        this.timerDisplay.textContent = this.timer;
        this.levelDisplay.textContent = this.level;
    }
    
    checkGameState() {
        if (this.mode === 'level') {
            if (this.score >= this.targetScore) {
                this.nextLevel();
            } else if (this.moves <= 0) {
                this.endGame();
            }
        }
    }
    
    nextLevel() {
        this.stopTimer();
        this.saveHighScore();
        this.level++;
        this.targetScore = Math.floor(this.targetScore * 1.5);
        this.moves = Math.max(20, 30 - this.level);
        this.history = [];
        this.updateUndoButton();
        this.updateUI();
        
        this.modalTitle.textContent = `🎉 第 ${this.level - 1} 关完成！`;
        this.modalMessage.textContent = `进入第 ${this.level} 关\n目标分数: ${this.targetScore}\n剩余步数: ${this.moves}`;
        this.modalBtn.textContent = '继续';
        this.modal.classList.add('show');
        
        this.createGrid();
        this.ensureInitialMatches();
        this.renderBoard();
    }
    
    endGame() {
        this.stopTimer();
        this.isAnimating = true;
        this.saveHighScore();
        
        const isNewHighScore = this.score >= this.highScore;
        
        this.modalTitle.textContent = isNewHighScore ? '🏆 新纪录！' : '游戏结束';
        this.modalMessage.textContent = `你的分数: ${this.score}\n最高分: ${this.highScore}`;
        this.modalBtn.textContent = '再来一局';
        this.modal.classList.add('show');
    }
    
    handleModalClose() {
        this.modal.classList.remove('show');
        if (this.mode === 'timed') {
            this.restartGame();
        } else if (this.moves <= 0 && this.score < this.targetScore) {
            this.restartGame();
        } else {
            this.renderBoard();
            this.isAnimating = false;
        }
    }
    
    restartGame() {
        this.stopTimer();
        this.isAnimating = false;
        this.modal.classList.remove('show');
        this.clearSelection();
        this.initGame();
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Match3Game();
});
