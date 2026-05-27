const Game = (function() {
    const GRID_SIZE = 4;
    const MILESTONES = [128, 256, 512, 1024, 2048, 4096, 8192];
    
    const DIFFICULTY = {
        easy: { fourProbability: 0.1 },
        normal: { fourProbability: 0.2 },
        hard: { fourProbability: 0.4 }
    };

    let grid = [];
    let score = 0;
    let bestScore = 0;
    let won = false;
    let over = false;
    let keepPlaying = false;
    let difficulty = 'normal';
    let previewEnabled = false;
    let nextTileValue = 2;
    let nextTilePosition = null;
    let previousState = null;
    let achievedMilestones = [];

    let tilesContainer, gridContainer, scoreElement, bestScoreElement;
    let gameMessage, messageTitle, messageText, messageBtn, continueBtn;
    let previewHint, nextTileElement;
    let milestonePopup, milestoneText, confettiContainer;

    function init() {
        cacheElements();
        loadSettings();
        bindEvents();
        
        const savedGame = Storage.loadGame();
        if (savedGame && savedGame.grid) {
            restoreGame(savedGame);
        } else {
            newGame();
        }
    }

    function cacheElements() {
        tilesContainer = document.getElementById('tilesContainer');
        gridContainer = document.getElementById('gridContainer');
        scoreElement = document.getElementById('score');
        bestScoreElement = document.getElementById('bestScore');
        gameMessage = document.getElementById('gameMessage');
        messageTitle = document.getElementById('messageTitle');
        messageText = document.getElementById('messageText');
        messageBtn = document.getElementById('messageBtn');
        continueBtn = document.getElementById('continueBtn');
        previewHint = document.getElementById('previewHint');
        nextTileElement = document.getElementById('nextTile');
        milestonePopup = document.getElementById('milestonePopup');
        milestoneText = document.getElementById('milestoneText');
        confettiContainer = document.getElementById('confettiContainer');
    }

    function loadSettings() {
        const savedTheme = Storage.loadTheme();
        setTheme(savedTheme);

        difficulty = Storage.loadDifficulty();
        document.getElementById('difficultySelect').value = difficulty;

        const soundEnabled = Storage.loadSoundEnabled();
        Audio.setEnabled(soundEnabled);
        updateSoundButton(soundEnabled);

        previewEnabled = Storage.loadPreviewEnabled();
        updatePreviewButton(previewEnabled);
        updatePreviewVisibility();
    }

    function bindEvents() {
        document.addEventListener('keydown', handleKeydown);
        
        let touchStartX, touchStartY, touchStartTime;
        let isSwiping = false;
        
        const gameContainer = document.querySelector('.game-container');
        
        gameContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isSwiping = false;
        }, { passive: true });
        
        gameContainer.addEventListener('touchmove', (e) => {
            if (!touchStartX || !touchStartY || e.touches.length !== 1) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            const diffX = currentX - touchStartX;
            const diffY = currentY - touchStartY;
            
            const minSwipe = 20;
            
            if (Math.abs(diffX) > minSwipe || Math.abs(diffY) > minSwipe) {
                isSwiping = true;
            }
        }, { passive: true });

        gameContainer.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY) return;
            if (over && !keepPlaying) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();
            
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            const timeDiff = touchEndTime - touchStartTime;
            
            const minSwipe = 30;
            const maxSwipeTime = 500;
            
            if (timeDiff > maxSwipeTime) {
                touchStartX = null;
                touchStartY = null;
                return;
            }
            
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > minSwipe) {
                    if (diffX > 0) move('right');
                    else move('left');
                }
            } else {
                if (Math.abs(diffY) > minSwipe) {
                    if (diffY > 0) move('down');
                    else move('up');
                }
            }
            
            touchStartX = null;
            touchStartY = null;
        }, { passive: true });

        document.getElementById('newGameBtn').addEventListener('click', newGame);
        document.getElementById('undoBtn').addEventListener('click', undo);
        document.getElementById('leaderboardBtn').addEventListener('click', showLeaderboard);
        document.getElementById('themeBtn').addEventListener('click', toggleTheme);
        document.getElementById('soundBtn').addEventListener('click', toggleSound);
        document.getElementById('previewBtn').addEventListener('click', togglePreview);
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            difficulty = e.target.value;
            Storage.saveDifficulty(difficulty);
        });
        document.getElementById('messageBtn').addEventListener('click', newGame);
        document.getElementById('continueBtn').addEventListener('click', continueAfterWin);
        document.getElementById('closeModal').addEventListener('click', closeLeaderboard);
        document.getElementById('leaderboardModal').addEventListener('click', (e) => {
            if (e.target.id === 'leaderboardModal') closeLeaderboard();
        });
    }

    function newGame() {
        grid = createEmptyGrid();
        score = 0;
        won = false;
        over = false;
        keepPlaying = false;
        previousState = null;
        achievedMilestones = [];
        
        bestScore = Storage.loadBestScore();
        
        generateNextTile();
        addRandomTile();
        generateNextTile();
        addRandomTile();
        
        updateScore();
        render();
        hideMessage();
        Storage.clearGame();
    }

    function restoreGame(savedState) {
        try {
            if (!savedState || !Array.isArray(savedState.grid)) {
                throw new Error('Invalid saved state');
            }
            
            if (savedState.grid.length !== 4 || savedState.grid.some(row => row.length !== 4)) {
                throw new Error('Invalid grid dimensions');
            }
            
            grid = savedState.grid.map(row => [...row]);
            score = typeof savedState.score === 'number' ? savedState.score : 0;
            won = typeof savedState.won === 'boolean' ? savedState.won : false;
            over = typeof savedState.over === 'boolean' ? savedState.over : false;
            keepPlaying = typeof savedState.keepPlaying === 'boolean' ? savedState.keepPlaying : false;
            achievedMilestones = Array.isArray(savedState.achievedMilestones) ? savedState.achievedMilestones : [];
            previousState = null;
            
            bestScore = Storage.loadBestScore();
            
            generateNextTile();
            updateScore();
            render();
            
            if (over) {
                showGameOver();
            } else if (won && !keepPlaying) {
                showWin();
            }
            
            return true;
        } catch (e) {
            console.error('Failed to restore game:', e);
            Storage.clearGame();
            newGame();
            return false;
        }
    }

    function createEmptyGrid() {
        return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    }

    function generateNextTile() {
        const prob = DIFFICULTY[difficulty].fourProbability;
        nextTileValue = Math.random() < prob ? 4 : 2;
        
        if (previewEnabled) {
            const emptyCells = getEmptyCells();
            if (emptyCells.length > 0) {
                nextTilePosition = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            }
            nextTileElement.textContent = nextTileValue;
        }
    }

    function addRandomTile() {
        const emptyCells = getEmptyCells();
        if (emptyCells.length === 0) return;

        let row, col;
        if (previewEnabled && nextTilePosition && 
            grid[nextTilePosition.row][nextTilePosition.col] === 0) {
            row = nextTilePosition.row;
            col = nextTilePosition.col;
        } else {
            const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            row = cell.row;
            col = cell.col;
        }

        grid[row][col] = nextTileValue;
        generateNextTile();
        return { row, col, value: nextTileValue };
    }

    function getEmptyCells() {
        const cells = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] === 0) {
                    cells.push({ row: r, col: c });
                }
            }
        }
        return cells;
    }

    function saveState() {
        previousState = {
            grid: grid.map(row => [...row]),
            score: score,
            won: won,
            over: over
        };
    }

    function undo() {
        if (!previousState) return;
        
        grid = previousState.grid.map(row => [...row]);
        score = previousState.score;
        won = previousState.won;
        over = previousState.over;
        previousState = null;
        
        updateScore();
        render();
        hideMessage();
    }

    function handleKeydown(e) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }

        if (over && !keepPlaying) return;

        switch (e.key) {
            case 'ArrowUp':
                move('up');
                break;
            case 'ArrowDown':
                move('down');
                break;
            case 'ArrowLeft':
                move('left');
                break;
            case 'ArrowRight':
                move('right');
                break;
        }
    }

    function move(direction) {
        if (over && !keepPlaying) return;

        saveState();
        
        let moved = false;
        let merged = false;
        const oldGrid = grid.map(row => [...row]);

        switch (direction) {
            case 'up':
                ({ moved, merged } = moveUp());
                break;
            case 'down':
                ({ moved, merged } = moveDown());
                break;
            case 'left':
                ({ moved, merged } = moveLeft());
                break;
            case 'right':
                ({ moved, merged } = moveRight());
                break;
        }

        if (moved) {
            Audio.playMove();
            
            const newTile = addRandomTile();
            
            updateScore();
            render(oldGrid, newTile);
            checkMilestones();
            Storage.saveGame({ grid, score, won, over, keepPlaying, achievedMilestones });

            if (!canMove()) {
                over = true;
                showGameOver();
                Storage.addToLeaderboard(score);
            } else if (won && !keepPlaying) {
                showWin();
            }
        } else {
            previousState = null;
        }
    }

    function moveLeft() {
        let moved = false;
        let merged = false;

        for (let r = 0; r < GRID_SIZE; r++) {
            const row = grid[r].filter(val => val !== 0);
            const newRow = [];
            
            for (let i = 0; i < row.length; i++) {
                if (i + 1 < row.length && row[i] === row[i + 1]) {
                    const mergedValue = row[i] * 2;
                    newRow.push(mergedValue);
                    score += mergedValue;
                    merged = true;
                    i++;
                    
                    if (mergedValue >= 2048) {
                        won = true;
                    }
                } else {
                    newRow.push(row[i]);
                }
            }

            while (newRow.length < GRID_SIZE) {
                newRow.push(0);
            }

            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] !== newRow[c]) {
                    moved = true;
                }
                grid[r][c] = newRow[c];
            }
        }

        if (merged) Audio.playMerge();
        return { moved, merged };
    }

    function moveRight() {
        let moved = false;
        let merged = false;

        for (let r = 0; r < GRID_SIZE; r++) {
            const row = grid[r].filter(val => val !== 0);
            const newRow = [];
            
            for (let i = row.length - 1; i >= 0; i--) {
                if (i - 1 >= 0 && row[i] === row[i - 1]) {
                    const mergedValue = row[i] * 2;
                    newRow.unshift(mergedValue);
                    score += mergedValue;
                    merged = true;
                    i--;
                    
                    if (mergedValue >= 2048) {
                        won = true;
                    }
                } else {
                    newRow.unshift(row[i]);
                }
            }

            while (newRow.length < GRID_SIZE) {
                newRow.unshift(0);
            }

            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] !== newRow[c]) {
                    moved = true;
                }
                grid[r][c] = newRow[c];
            }
        }

        if (merged) Audio.playMerge();
        return { moved, merged };
    }

    function moveUp() {
        let moved = false;
        let merged = false;

        for (let c = 0; c < GRID_SIZE; c++) {
            const col = [];
            for (let r = 0; r < GRID_SIZE; r++) {
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
                    
                    if (mergedValue >= 2048) {
                        won = true;
                    }
                } else {
                    newCol.push(col[i]);
                }
            }

            while (newCol.length < GRID_SIZE) {
                newCol.push(0);
            }

            for (let r = 0; r < GRID_SIZE; r++) {
                if (grid[r][c] !== newCol[r]) {
                    moved = true;
                }
                grid[r][c] = newCol[r];
            }
        }

        if (merged) Audio.playMerge();
        return { moved, merged };
    }

    function moveDown() {
        let moved = false;
        let merged = false;

        for (let c = 0; c < GRID_SIZE; c++) {
            const col = [];
            for (let r = 0; r < GRID_SIZE; r++) {
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
                    
                    if (mergedValue >= 2048) {
                        won = true;
                    }
                } else {
                    newCol.unshift(col[i]);
                }
            }

            while (newCol.length < GRID_SIZE) {
                newCol.unshift(0);
            }

            for (let r = 0; r < GRID_SIZE; r++) {
                if (grid[r][c] !== newCol[r]) {
                    moved = true;
                }
                grid[r][c] = newCol[r];
            }
        }

        if (merged) Audio.playMerge();
        return { moved, merged };
    }

    function canMove() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] === 0) return true;
                const current = grid[r][c];
                if (c + 1 < GRID_SIZE && grid[r][c + 1] === current) return true;
                if (r + 1 < GRID_SIZE && grid[r + 1][c] === current) return true;
            }
        }
        return false;
    }

    function checkMilestones() {
        for (const milestone of MILESTONES) {
            if (score >= milestone && !achievedMilestones.includes(milestone)) {
                achievedMilestones.push(milestone);
                showMilestone(milestone);
                break;
            }
        }
    }

    function showMilestone(milestone) {
        milestoneText.textContent = `🎉 达到 ${milestone} 分！`;
        milestonePopup.classList.add('show');
        Audio.playMilestone();
        createConfetti();
        
        setTimeout(() => {
            milestonePopup.classList.remove('show');
        }, 2000);
    }

    function createConfetti() {
        const colors = ['#f2b179', '#f59563', '#f67c5f', '#edc22e', '#edcf72'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confettiContainer.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3500);
        }
    }

    function updateScore() {
        if (score > bestScore) {
            bestScore = score;
            Storage.saveBestScore(bestScore);
        }
        scoreElement.textContent = score;
        bestScoreElement.textContent = bestScore;
    }

    function render(oldGrid = null, newTile = null) {
        tilesContainer.innerHTML = '';

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const value = grid[r][c];
                if (value !== 0) {
                    const tile = createTileElement(value, r, c);
                    
                    if (newTile && newTile.row === r && newTile.col === c) {
                        tile.classList.add('tile-new');
                    } else if (oldGrid && oldGrid[r][c] !== value && value !== 0) {
                        tile.classList.add('tile-merged');
                    }
                    
                    tilesContainer.appendChild(tile);
                }
            }
        }

        if (previewEnabled && nextTilePosition) {
            const { row, col } = nextTilePosition;
            if (grid[row][col] === 0) {
                const previewTile = createTileElement(nextTileValue, row, col);
                previewTile.classList.add('tile-preview');
                tilesContainer.appendChild(previewTile);
            }
        }
    }

    function createTileElement(value, row, col) {
        const tile = document.createElement('div');
        const tileClass = value <= 2048 ? `tile-${value}` : 'tile-super';
        tile.className = `tile ${tileClass}`;
        tile.textContent = value;
        
        const cellSize = 100 / GRID_SIZE;
        const gap = 12 * (GRID_SIZE - 1) / GRID_SIZE;
        tile.style.left = `calc(${col * cellSize}% + ${col * gap}px)`;
        tile.style.top = `calc(${row * cellSize}% + ${row * gap}px)`;
        
        return tile;
    }

    function showWin() {
        messageTitle.textContent = '🎉 胜利！';
        messageText.textContent = `恭喜你达到了2048分！当前得分：${score}`;
        messageBtn.textContent = '再来一局';
        continueBtn.style.display = 'inline-block';
        gameMessage.classList.add('show');
        Audio.playWin();
        createConfetti();
    }

    function showGameOver() {
        messageTitle.textContent = '😢 游戏结束';
        messageText.textContent = `最终得分：${score}`;
        messageBtn.textContent = '再来一局';
        continueBtn.style.display = 'none';
        gameMessage.classList.add('show');
        Audio.playGameOver();
    }

    function hideMessage() {
        gameMessage.classList.remove('show');
    }

    function continueAfterWin() {
        keepPlaying = true;
        hideMessage();
        Storage.saveGame({ grid, score, won, over, keepPlaying, achievedMilestones });
    }

    function showLeaderboard() {
        const leaderboard = Storage.loadLeaderboard();
        const list = document.getElementById('leaderboardList');
        list.innerHTML = '';
        
        if (leaderboard.length === 0) {
            const li = document.createElement('li');
            li.textContent = '暂无记录，开始游戏吧！';
            li.style.justifyContent = 'center';
            list.appendChild(li);
        } else {
            leaderboard.forEach(entry => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${entry.date}</span>
                    <span class="leaderboard-score">${entry.score}</span>
                `;
                list.appendChild(li);
            });
        }
        
        document.getElementById('leaderboardModal').classList.add('show');
    }

    function closeLeaderboard() {
        document.getElementById('leaderboardModal').classList.remove('show');
    }

    function toggleTheme() {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }

    function setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            document.getElementById('themeBtn').textContent = '☀️ 浅色';
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            document.getElementById('themeBtn').textContent = '🌙 深色';
        }
        Storage.saveTheme(theme);
    }

    function toggleSound() {
        const enabled = Audio.toggle();
        updateSoundButton(enabled);
    }

    function updateSoundButton(enabled) {
        const btn = document.getElementById('soundBtn');
        btn.textContent = enabled ? '🔊 音效' : '🔇 静音';
        btn.classList.toggle('active', enabled);
    }

    function togglePreview() {
        previewEnabled = !previewEnabled;
        Storage.savePreviewEnabled(previewEnabled);
        updatePreviewButton(previewEnabled);
        updatePreviewVisibility();
        render();
    }

    function updatePreviewButton(enabled) {
        const btn = document.getElementById('previewBtn');
        btn.textContent = enabled ? '👁️ 预览开' : '👁️ 预览关';
        btn.classList.toggle('active', enabled);
    }

    function updatePreviewVisibility() {
        previewHint.style.display = previewEnabled ? 'block' : 'none';
    }

    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
