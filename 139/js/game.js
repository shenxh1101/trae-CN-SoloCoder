const Game = {
    allLevels: [],
    currentLevelIndex: 0,
    currentLevel: null,
    map: [],
    playerPos: { x: 0, y: 0 },
    steps: 0,
    history: [],
    maxHistory: 10,
    skinIndex: 0,
    hintTimeout: null,
    touchStartX: 0,
    touchStartY: 0,
    touchMinDistance: 30,
    isAnimating: false,

    init() {
        console.log('🎮 Game initializing...');
        
        const requiredElements = [
            'gameBoard', 'currentLevel', 'stepCount', 'bestSteps',
            'undoBtn', 'resetBtn', 'hintBtn', 'skipBtn',
            'soundBtn', 'skinBtn', 'editorBtn', 'importBtn', 'exportBtn'
        ];
        
        for (const id of requiredElements) {
            if (!document.getElementById(id)) {
                console.error('Missing element:', id);
                alert('页面元素加载失败，请刷新重试');
                return;
            }
        }
        
        try {
            localStorage.removeItem('sokoban_state');
            localStorage.removeItem('sokoban_best_steps');
            
            this.loadAllLevels();
            console.log('✅ Levels loaded:', this.allLevels.length);
            
            this.skinIndex = 0;
            SoundManager.enabled = true;
            this.updateSoundIcon();
            console.log('✅ Settings reset');
            
            this.bindEvents();
            console.log('✅ Events bound');
            
            LevelEditor.init();
            console.log('✅ Editor initialized');
            
            SoundManager.init();
            console.log('✅ Sound initialized');
            
            this.loadLevel(0);
            console.log('✅ Level 0 loaded');
            
            this.updateUI();
            console.log('🎉 Game initialized successfully!');
        } catch (e) {
            console.error('❌ Error during game init:', e);
            alert('游戏初始化失败: ' + e.message + '\n请刷新页面重试');
        }
    },

    loadAllLevels() {
        const customLevels = StorageManager.getCustomLevels();
        this.allLevels = [...BUILTIN_LEVELS, ...customLevels];
    },

    loadSettings() {
        this.skinIndex = StorageManager.loadSetting('skinIndex', 0);
        const soundEnabled = StorageManager.loadSetting('soundEnabled', true);
        SoundManager.setEnabled(soundEnabled);
        this.updateSoundIcon();
    },

    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        document.querySelectorAll('.dir-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dir = btn.dataset.dir;
                this.move(dir);
            });
        });

        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetLevel());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('skipBtn').addEventListener('click', () => this.skipLevel());
        
        document.getElementById('soundBtn').addEventListener('click', () => this.toggleSound());
        document.getElementById('skinBtn').addEventListener('click', () => this.openSkinModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportLevels());
        document.getElementById('importBtn').addEventListener('click', () => this.importLevels());

        document.getElementById('skinModalClose').addEventListener('click', () => this.closeSkinModal());
        document.getElementById('skinModal').addEventListener('click', (e) => {
            if (e.target.id === 'skinModal') this.closeSkinModal();
        });

        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());
        document.getElementById('replayBtn').addEventListener('click', () => {
            this.closeWinModal();
            this.resetLevel();
        });
        document.getElementById('winModal').addEventListener('click', (e) => {
            if (e.target.id === 'winModal') this.closeWinModal();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileImport(e));

        const gameBoard = document.getElementById('gameBoard');
        gameBoard.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        gameBoard.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        gameBoard.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                StorageManager.saveGameState(this);
            }
        });
    },

    handleKeyDown(e) {
        if (LevelEditor.isOpen) return;
        
        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'w': 'up',
            'W': 'up',
            's': 'down',
            'S': 'down',
            'a': 'left',
            'A': 'left',
            'd': 'right',
            'D': 'right'
        };

        if (keyMap[e.key]) {
            e.preventDefault();
            this.move(keyMap[e.key]);
        } else if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            this.undo();
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            this.resetLevel();
        } else if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            this.showHint();
        }
    },

    handleTouchStart(e) {
        if (LevelEditor.isOpen) return;
        e.preventDefault();
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    },

    handleTouchMove(e) {
        if (LevelEditor.isOpen) return;
        e.preventDefault();
    },

    handleTouchEnd(e) {
        if (LevelEditor.isOpen) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        if (Math.max(absX, absY) < this.touchMinDistance) return;
        
        if (absX > absY) {
            this.move(deltaX > 0 ? 'right' : 'left');
        } else {
            this.move(deltaY > 0 ? 'down' : 'up');
        }
    },

    loadLevel(index) {
        if (index < 0 || index >= this.allLevels.length) {
            if (index >= this.allLevels.length) {
                alert('🎉 恭喜你通关了所有关卡！');
                index = 0;
            } else {
                return;
            }
        }

        this.currentLevelIndex = index;
        this.currentLevel = this.allLevels[index];
        this.map = deepCloneMap(this.currentLevel.map);
        this.playerPos = findPlayer(this.map);
        this.steps = 0;
        this.history = [];
        this.hideHint();
        this.render();
        this.updateUI();
        StorageManager.clearGameState();
    },

    loadCustomLevel(level) {
        this.currentLevel = level;
        this.map = deepCloneMap(level.map);
        this.playerPos = findPlayer(this.map);
        this.steps = 0;
        this.history = [];
        this.currentLevelIndex = this.allLevels.length;
        this.allLevels.push(level);
        this.hideHint();
        this.render();
        this.updateUI();
    },

    loadState(state) {
        this.currentLevelIndex = state.currentLevel;
        this.currentLevel = this.allLevels[state.currentLevel];
        this.map = deepCloneMap(state.map);
        this.playerPos = { ...state.playerPos };
        this.steps = state.steps;
        this.history = state.history || [];
        this.render();
        this.updateUI();
    },

    move(direction) {
        if (this.isAnimating) return;
        
        this.hideHint();
        
        const result = simulateMove(this.map, this.playerPos, direction);
        if (!result) {
            SoundManager.playError();
            return;
        }

        this.saveHistory();
        
        const prevCompleted = countCompletedBoxes(this.map);
        
        this.map = result.map;
        this.playerPos = result.playerPos;
        this.steps++;

        const newCompleted = countCompletedBoxes(this.map);
        
        if (result.pushedBox) {
            SoundManager.playPush();
            if (newCompleted > prevCompleted) {
                SoundManager.playComplete();
            }
        } else {
            SoundManager.playMove();
        }

        this.render();
        this.updateUI();
        StorageManager.saveGameState(this);

        if (this.checkWin()) {
            this.handleWin();
        }
    },

    saveHistory() {
        const historyItem = {
            map: deepCloneMap(this.map),
            playerPos: { ...this.playerPos },
            steps: this.steps
        };
        
        this.history.push(historyItem);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    },

    undo() {
        if (this.history.length === 0) {
            SoundManager.playError();
            return;
        }

        const lastState = this.history.pop();
        this.map = lastState.map;
        this.playerPos = lastState.playerPos;
        this.steps = lastState.steps;
        
        SoundManager.playMove();
        this.hideHint();
        this.render();
        this.updateUI();
        StorageManager.saveGameState(this);
    },

    resetLevel() {
        if (!this.currentLevel) return;
        
        this.map = deepCloneMap(this.currentLevel.map);
        this.playerPos = findPlayer(this.map);
        this.steps = 0;
        this.history = [];
        
        SoundManager.playMove();
        this.hideHint();
        this.render();
        this.updateUI();
        StorageManager.saveGameState(this);
    },

    skipLevel() {
        if (confirm('确定要跳过当前关卡吗？')) {
            this.nextLevel();
        }
    },

    nextLevel() {
        this.closeWinModal();
        this.loadLevel(this.currentLevelIndex + 1);
    },

    checkWin() {
        const targets = countTargets(this.map);
        const completed = countCompletedBoxes(this.map);
        return targets > 0 && targets === completed;
    },

    handleWin() {
        this.isAnimating = true;
        
        StorageManager.saveBestSteps(this.currentLevel.id, this.steps);
        StorageManager.clearGameState();
        
        SoundManager.playWin();
        
        document.getElementById('winSteps').textContent = this.steps;
        const bestSteps = StorageManager.getBestSteps(this.currentLevel.id) || this.steps;
        document.getElementById('winBest').textContent = bestSteps;
        
        this.createConfetti();
        
        setTimeout(() => {
            document.getElementById('winModal').classList.remove('hidden');
            this.isAnimating = false;
        }, 500);
    },

    createConfetti() {
        const container = document.getElementById('confettiContainer');
        container.innerHTML = '';
        
        const colors = ['#f59e0b', '#14b8a6', '#a78bfa', '#f472b6', '#34d399', '#60a5fa'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            confetti.style.width = (6 + Math.random() * 8) + 'px';
            confetti.style.height = (6 + Math.random() * 8) + 'px';
            container.appendChild(confetti);
        }
    },

    showHint() {
        const hint = getHint(this.map, this.playerPos);
        if (!hint) return;

        const arrowEl = document.getElementById('hintArrow');
        const boardEl = document.getElementById('gameBoard');
        const boardRect = boardEl.getBoundingClientRect();
        
        const tileSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile-size')) || 48;
        const gap = 2;
        
        const centerX = this.playerPos.x * (tileSize + gap) + tileSize / 2 + 8;
        const centerY = this.playerPos.y * (tileSize + gap) + tileSize / 2 + 8;
        
        const offset = tileSize * 0.8;
        let arrowX = centerX;
        let arrowY = centerY;
        
        switch (hint) {
            case 'up':
                arrowY -= offset;
                arrowEl.textContent = DIR_ARROWS.up;
                break;
            case 'down':
                arrowY += offset;
                arrowEl.textContent = DIR_ARROWS.down;
                break;
            case 'left':
                arrowX -= offset;
                arrowEl.textContent = DIR_ARROWS.left;
                break;
            case 'right':
                arrowX += offset;
                arrowEl.textContent = DIR_ARROWS.right;
                break;
        }
        
        arrowEl.style.left = arrowX + 'px';
        arrowEl.style.top = arrowY + 'px';
        arrowEl.classList.remove('hidden');
        
        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
        }
        this.hintTimeout = setTimeout(() => {
            this.hideHint();
        }, 3000);
    },

    hideHint() {
        document.getElementById('hintArrow').classList.add('hidden');
        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
            this.hintTimeout = null;
        }
    },

    render() {
        const board = document.getElementById('gameBoard');
        const rows = this.map.length;
        const cols = this.map[0].length;
        
        board.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
        board.innerHTML = '';
        
        const skinEmoji = PLAYER_SKINS[this.skinIndex].emoji;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                const type = this.map[y][x];
                
                switch (type) {
                    case TILE_TYPES.WALL:
                        tile.classList.add('tile-wall');
                        break;
                    case TILE_TYPES.TARGET:
                        tile.classList.add('tile-target');
                        break;
                    case TILE_TYPES.BOX:
                        tile.classList.add('tile-box');
                        break;
                    case TILE_TYPES.PLAYER:
                        tile.classList.add('tile-player');
                        tile.dataset.skin = skinEmoji;
                        break;
                    case TILE_TYPES.BOX_ON_TARGET:
                        tile.classList.add('tile-box-complete');
                        break;
                    case TILE_TYPES.PLAYER_ON_TARGET:
                        tile.classList.add('tile-player', 'target');
                        tile.dataset.skin = skinEmoji;
                        break;
                    default:
                        tile.classList.add('tile-floor');
                }
                
                board.appendChild(tile);
            }
        }
    },

    updateUI() {
        document.getElementById('currentLevel').textContent = this.currentLevelIndex + 1;
        document.getElementById('stepCount').textContent = this.steps;
        
        const bestSteps = StorageManager.getBestSteps(this.currentLevel.id);
        document.getElementById('bestSteps').textContent = bestSteps || '-';
    },

    toggleSound() {
        const enabled = SoundManager.toggle();
        this.updateSoundIcon();
    },

    updateSoundIcon() {
        document.getElementById('soundIcon').textContent = SoundManager.enabled ? '🔊' : '🔇';
        document.getElementById('soundBtn').classList.toggle('active', !SoundManager.enabled);
    },

    openSkinModal() {
        const grid = document.getElementById('skinGrid');
        grid.innerHTML = '';
        
        PLAYER_SKINS.forEach((skin, index) => {
            const option = document.createElement('div');
            option.className = 'skin-option' + (index === this.skinIndex ? ' selected' : '');
            option.textContent = skin.emoji;
            option.title = skin.name;
            option.addEventListener('click', () => this.selectSkin(index));
            grid.appendChild(option);
        });
        
        document.getElementById('skinModal').classList.remove('hidden');
    },

    closeSkinModal() {
        document.getElementById('skinModal').classList.add('hidden');
    },

    selectSkin(index) {
        this.skinIndex = index;
        StorageManager.saveSetting('skinIndex', index);
        
        document.querySelectorAll('.skin-option').forEach((el, i) => {
            el.classList.toggle('selected', i === index);
        });
        
        this.render();
    },

    closeWinModal() {
        document.getElementById('winModal').classList.add('hidden');
    },

    exportLevels() {
        const data = StorageManager.exportAllData();
        StorageManager.downloadJSON(data, `sokoban-levels-${Date.now()}.json`);
    },

    importLevels() {
        document.getElementById('fileInput').click();
    },

    async handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const result = await StorageManager.importLevels(file);
            
            if (result.errors.length > 0) {
                alert('部分关卡导入失败：\n' + result.errors.join('\n'));
            }
            
            if (result.imported.length > 0) {
                alert(`成功导入 ${result.imported.length} 个自定义关卡！`);
                this.loadAllLevels();
            } else if (result.errors.length === 0) {
                alert('未导入任何自定义关卡（可能文件中只有内置关卡）');
            }
        } catch (err) {
            alert('导入失败：' + err.message);
        }
        
        e.target.value = '';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
