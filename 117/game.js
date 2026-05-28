const SnakeGame = {
    cols: 20,
    rows: 20,

    presetMaps: {},
    customMaps: [],

    currentMapName: '经典模式',
    currentMapData: null,

    snake1: null,
    snake2: null,
    food: null,
    nextFood: null,

    mode: 'single',
    isRunning: false,
    isPaused: false,
    isGameOver: true,

    lastTime: 0,
    accumulator: 0,
    baseInterval: 150,
    currentInterval: 150,
    rafId: null,

    showHint: true,

    ui: {},

    init() {
        this.initPresetMaps();
        this.cacheUI();
        this.bindEvents();
        SnakeAudio.init();
        SnakeRenderer.init(this.ui.gameCanvas);
        SnakeEditor.init(this.ui.editorCanvas, (maps) => this.onCustomMapsUpdated(maps));
        this.customMaps = SnakeStorage.getCustomMaps();
        this.renderMapButtons();
        this.loadMap('经典模式');
        this.updateScoreDisplay();
        this.render();
        window.addEventListener('resize', () => this.onResize());
        this.onResize();
    },

    initPresetMaps() {
        const empty = () => Array.from({ length: this.rows }, () => new Array(this.cols).fill(0));

        const classic = empty();

        const cross = empty();
        for (let i = 0; i < this.cols; i++) {
            if (i >= 8 && i <= 12) continue;
            cross[9][i] = 1;
            cross[10][i] = 1;
        }
        for (let i = 0; i < this.rows; i++) {
            if (i >= 8 && i <= 12) continue;
            cross[i][9] = 1;
            cross[i][10] = 1;
        }

        const boxInBox = empty();
        for (let i = 0; i < this.cols; i++) {
            boxInBox[2][i] = 1;
            boxInBox[17][i] = 1;
        }
        for (let i = 0; i < this.rows; i++) {
            boxInBox[i][2] = 1;
            boxInBox[i][17] = 1;
        }
        for (let i = 6; i < this.cols - 6; i++) {
            boxInBox[6][i] = 1;
            boxInBox[13][i] = 1;
        }
        for (let i = 6; i < this.rows - 6; i++) {
            boxInBox[i][6] = 1;
            boxInBox[i][13] = 1;
        }
        for (let x = 8; x <= 12; x++) {
            boxInBox[2][x] = 0;
            boxInBox[17][x] = 0;
        }
        for (let x = 8; x <= 12; x++) {
            boxInBox[6][x] = 0;
            boxInBox[13][x] = 0;
        }
        boxInBox[10][2] = 0;
        boxInBox[10][17] = 0;
        boxInBox[10][6] = 0;
        boxInBox[10][13] = 0;

        const scattered = empty();
        const walls = [
            [3, 3], [4, 3], [5, 3],
            [14, 3], [15, 3], [16, 3],
            [3, 16], [4, 16], [5, 16],
            [14, 16], [15, 16], [16, 16],
            [7, 6], [7, 7], [7, 8],
            [12, 6], [12, 7], [12, 8],
            [7, 12], [7, 13], [7, 14],
            [12, 12], [12, 13], [12, 14],
        ];
        walls.forEach(([x, y]) => { scattered[y][x] = 1; });

        this.presetMaps = {
            '经典模式': classic,
            '十字迷宫': cross,
            '框中框': boxInBox,
            '散落障碍': scattered
        };
    },

    cacheUI() {
        this.ui = {
            gameCanvas: document.getElementById('game-canvas'),
            editorCanvas: document.getElementById('editor-canvas'),
            scoreDisplay: document.getElementById('score-display'),
            scoreDisplayP2: document.getElementById('score-display-p2'),
            highscoreDisplay: document.getElementById('highscore-display'),
            highscoreDisplayP2: document.getElementById('highscore-display-p2'),
            speedDisplay: document.getElementById('speed-display'),
            mapButtons: document.getElementById('map-buttons'),
            customMapButtons: document.getElementById('custom-map-buttons'),
            customMapsSection: document.getElementById('custom-maps-section'),
            player2Scores: document.getElementById('player2-scores'),
            btnStart: document.getElementById('btn-start'),
            btnPause: document.getElementById('btn-pause'),
            btnResume: document.getElementById('btn-resume'),
            btnSound: document.getElementById('btn-sound'),
            btnSingle: document.getElementById('btn-single'),
            btnDual: document.getElementById('btn-dual'),
            btnEditor: document.getElementById('btn-editor'),
            btnEditorClose: document.getElementById('btn-editor-close'),
            btnEditorSave: document.getElementById('btn-editor-save'),
            btnEditorClear: document.getElementById('btn-editor-clear'),
            btnEditorDelete: document.getElementById('btn-editor-delete'),
            mapNameInput: document.getElementById('map-name-input'),
            gameOverlay: document.getElementById('game-overlay'),
            overlayContent: document.getElementById('overlay-content'),
            editorModal: document.getElementById('editor-modal'),
            controlsInfo: document.getElementById('controls-info'),
            controlsInfoP2: document.getElementById('controls-info-p2'),
            soundOn: document.querySelector('.icon-sound-on'),
            soundOff: document.querySelector('.icon-sound-off'),
            touchBtns: document.querySelectorAll('.touch-btn')
        };
    },

    bindEvents() {
        this.ui.btnStart.addEventListener('click', () => this.startGame());
        this.ui.btnPause.addEventListener('click', () => this.togglePause());
        this.ui.btnResume.addEventListener('click', () => this.togglePause());
        this.ui.btnSound.addEventListener('click', () => this.toggleSound());
        this.ui.btnSingle.addEventListener('click', () => this.setMode('single'));
        this.ui.btnDual.addEventListener('click', () => this.setMode('dual'));
        this.ui.btnEditor.addEventListener('click', () => this.openEditor());
        this.ui.btnEditorClose.addEventListener('click', () => this.closeEditor());
        this.ui.btnEditorSave.addEventListener('click', () => this.saveEditorMap());
        this.ui.btnEditorClear.addEventListener('click', () => this.clearEditorMap());
        this.ui.btnEditorDelete.addEventListener('click', () => this.deleteEditorMap());

        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        this.ui.touchBtns.forEach(btn => {
            const handler = (e) => {
                e.preventDefault();
                const dir = btn.dataset.dir;
                this.onTouchDirection(dir, 1);
            };
            btn.addEventListener('touchstart', handler, { passive: false });
            btn.addEventListener('click', handler);
        });

        let touchStartX = 0;
        let touchStartY = 0;
        this.ui.gameCanvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        this.ui.gameCanvas.addEventListener('touchend', (e) => {
            if (!this.isRunning || this.isPaused || this.isGameOver) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
            if (Math.abs(dx) > Math.abs(dy)) {
                this.onTouchDirection(dx > 0 ? 'right' : 'left', 1);
            } else {
                this.onTouchDirection(dy > 0 ? 'down' : 'up', 1);
            }
        });
    },

    onResize() {
        SnakeRenderer.resize();
        SnakeEditor.resize();
        if (!this.isGameOver) this.render();
    },

    renderMapButtons() {
        this.ui.mapButtons.innerHTML = '';
        Object.keys(this.presetMaps).forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'map-btn' + (name === this.currentMapName ? ' active' : '');
            btn.textContent = name;
            btn.addEventListener('click', () => this.loadMap(name));
            this.ui.mapButtons.appendChild(btn);
        });

        this.ui.customMapButtons.innerHTML = '';
        if (this.customMaps.length > 0) {
            this.ui.customMapsSection.style.display = 'block';
            this.customMaps.forEach(map => {
                const btn = document.createElement('button');
                btn.className = 'map-btn' + (map.name === this.currentMapName ? ' active' : '');
                btn.textContent = map.name;
                btn.addEventListener('click', () => this.loadCustomMap(map.name));
                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.openEditor(map);
                });
                this.ui.customMapButtons.appendChild(btn);
            });
        } else {
            this.ui.customMapsSection.style.display = 'none';
        }
    },

    loadMap(name) {
        if (this.isRunning && !this.isGameOver) {
            if (!confirm('切换地图将结束当前游戏，确定吗？')) return;
            this.stopGame();
        }
        this.currentMapName = name;
        this.currentMapData = this.presetMaps[name];
        this.renderMapButtons();
        this.resetGame();
        this.render();
    },

    loadCustomMap(name) {
        const map = this.customMaps.find(m => m.name === name);
        if (map) {
            if (this.isRunning && !this.isGameOver) {
                if (!confirm('切换地图将结束当前游戏，确定吗？')) return;
                this.stopGame();
            }
            this.currentMapName = name;
            this.currentMapData = map.data;
            this.renderMapButtons();
            this.resetGame();
            this.render();
        }
    },

    onCustomMapsUpdated(maps) {
        this.customMaps = maps;
        this.renderMapButtons();
    },

    setMode(mode) {
        if (this.isRunning && !this.isGameOver) {
            if (!confirm('切换模式将结束当前游戏，确定吗？')) return;
            this.stopGame();
        }
        this.mode = mode;
        this.ui.btnSingle.classList.toggle('active', mode === 'single');
        this.ui.btnDual.classList.toggle('active', mode === 'dual');
        this.ui.player2Scores.style.display = mode === 'dual' ? 'flex' : 'none';
        this.ui.controlsInfoP2.style.display = mode === 'dual' ? 'block' : 'none';
        this.resetGame();
        this.updateScoreDisplay();
        this.render();
    },

    toggleSound() {
        const enabled = SnakeAudio.toggle();
        this.ui.soundOn.style.display = enabled ? 'inline' : 'none';
        this.ui.soundOff.style.display = enabled ? 'none' : 'inline';
    },

    createSnake(startX, startY, dirX, dirY) {
        const body = [];
        for (let i = 0; i < 3; i++) {
            body.push({ x: startX - i * dirX, y: startY - i * dirY });
        }
        return {
            body,
            direction: { x: dirX, y: dirY },
            nextDirection: { x: dirX, y: dirY },
            alive: true,
            score: 0
        };
    },

    resetGame() {
        this.stopGame();
        this.snake1 = this.createSnake(10, 10, 1, 0);
        if (this.mode === 'dual') {
            this.snake2 = this.createSnake(10, 10, -1, 0);
        } else {
            this.snake2 = null;
        }
        this.food = null;
        this.nextFood = null;
        this.spawnFood();
        this.spawnNextFood();
        this.currentInterval = this.baseInterval;
        this.isGameOver = true;
        this.isPaused = false;
        this.isRunning = false;
        this.updateScoreDisplay();
        this.updateSpeedDisplay();
        this.updateButtons();
        this.showOverlay(this.mode === 'dual'
            ? '<div class="overlay-title">双人模式</div><div class="overlay-subtitle">按 开始 或 空格 开始游戏</div>'
            : '<div class="overlay-title">NEON SNAKE</div><div class="overlay-subtitle">按 开始 或 空格 开始游戏</div>');
    },

    startGame() {
        if (this.isRunning && !this.isGameOver) return;
        if (this.isPaused && !this.isGameOver) {
            this.resumeGame();
            return;
        }
        this.resetGame();
        this.isGameOver = false;
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.hideOverlay();
        this.updateButtons();
        this.loop();
    },

    stopGame() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.isRunning = false;
    },

    togglePause() {
        if (!this.isRunning || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.showOverlay('<div class="overlay-title">已暂停</div><div class="overlay-subtitle">按 空格 或 恢复 继续</div>');
        } else {
            this.hideOverlay();
            this.lastTime = performance.now();
        }
        this.updateButtons();
    },

    resumeGame() {
        this.isPaused = false;
        this.lastTime = performance.now();
        this.hideOverlay();
        this.updateButtons();
        this.loop();
    },

    gameOver(reason) {
        this.stopGame();
        this.isGameOver = true;
        this.isRunning = false;

        let winner = null;
        let title = '游戏结束';
        let subtitle = '';

        if (this.mode === 'dual') {
            if (this.snake1.alive && !this.snake2.alive) {
                winner = 1;
                title = '玩家1 获胜！';
                SnakeAudio.playWin();
            } else if (this.snake2.alive && !this.snake1.alive) {
                winner = 2;
                title = '玩家2 获胜！';
                SnakeAudio.playWin();
            } else {
                title = '平局！';
                SnakeAudio.playDie();
            }
            if (this.snake1.score > this.snake2.score) {
                SnakeStorage.saveHighScore('dual', this.snake1.score);
            } else {
                SnakeStorage.saveHighScore('dual', this.snake2.score);
            }
            subtitle = `P1: ${this.snake1.score} 分  |  P2: ${this.snake2.score} 分`;
        } else {
            SnakeStorage.saveHighScore('single', this.snake1.score);
            SnakeAudio.playDie();
            subtitle = `得分: ${this.snake1.score}`;
        }

        const highScores = SnakeStorage.getHighScores();
        const best = this.mode === 'single' ? highScores.single : highScores.dual;
        this.showOverlay(
            `<div class="overlay-title">${title}</div>` +
            `<div class="overlay-score">${subtitle}</div>` +
            `<div class="overlay-winner">最高分: ${best}</div>` +
            `<div class="overlay-subtitle">按 空格 重新开始</div>`
        );

        this.updateScoreDisplay();
        this.updateButtons();
    },

    spawnFood() {
        const occupied = new Set();
        if (this.snake1 && this.snake1.body) {
            this.snake1.body.forEach(s => occupied.add(`${s.x},${s.y}`));
        }
        if (this.snake2 && this.snake2.body) {
            this.snake2.body.forEach(s => occupied.add(`${s.x},${s.y}`));
        }

        let x, y;
        let attempts = 0;
        do {
            x = Math.floor(Math.random() * this.cols);
            y = Math.floor(Math.random() * this.rows);
            attempts++;
            if (attempts > 1000) return null;
        } while (
            occupied.has(`${x},${y}`) ||
            (this.currentMapData[y] && this.currentMapData[y][x] === 1) ||
            (this.nextFood && this.nextFood.x === x && this.nextFood.y === y)
        );

        this.food = { x, y };
        return this.food;
    },

    spawnNextFood() {
        const occupied = new Set();
        if (this.snake1 && this.snake1.body) {
            this.snake1.body.forEach(s => occupied.add(`${s.x},${s.y}`));
        }
        if (this.snake2 && this.snake2.body) {
            this.snake2.body.forEach(s => occupied.add(`${s.x},${s.y}`));
        }
        if (this.food) occupied.add(`${this.food.x},${this.food.y}`);

        let x, y;
        let attempts = 0;
        do {
            x = Math.floor(Math.random() * this.cols);
            y = Math.floor(Math.random() * this.rows);
            attempts++;
            if (attempts > 1000) return null;
        } while (
            occupied.has(`${x},${y}`) ||
            (this.currentMapData[y] && this.currentMapData[y][x] === 1)
        );

        this.nextFood = { x, y };
        return this.nextFood;
    },

    loop() {
        if (!this.isRunning || this.isGameOver) return;
        if (this.isPaused) {
            this.render();
            this.rafId = requestAnimationFrame(() => this.loop());
            return;
        }

        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        this.accumulator += delta;

        while (this.accumulator >= this.currentInterval) {
            this.step();
            this.accumulator -= this.currentInterval;
        }

        this.render();
        this.rafId = requestAnimationFrame(() => this.loop());
    },

    step() {
        if (!this.snake1 || this.isGameOver) return;

        if (this.snake1.alive) {
            this.snake1.direction = { ...this.snake1.nextDirection };
        }
        if (this.snake2 && this.snake2.alive) {
            this.snake2.direction = { ...this.snake2.nextDirection };
        }

        const prevTail1 = this.snake1.body.length > 0 ? { ...this.snake1.body[this.snake1.body.length - 1] } : null;
        const prevTail2 = this.snake2 ? (this.snake2.body.length > 0 ? { ...this.snake2.body[this.snake2.body.length - 1] } : null) : null;

        if (this.snake1.alive) this.moveSnake(this.snake1);
        if (this.snake2 && this.snake2.alive) this.moveSnake(this.snake2);

        const death1 = this.checkDeath(this.snake1, this.snake2);
        const death2 = this.snake2 ? this.checkDeath(this.snake2, this.snake1) : false;

        if (death1) this.snake1.alive = false;
        if (death2) this.snake2.alive = false;

        let ate1 = false;
        let ate2 = false;

        if (this.snake1.alive && this.food && this.snake1.body[0].x === this.food.x && this.snake1.body[0].y === this.food.y) {
            ate1 = true;
            this.snake1.score++;
            if (prevTail1) this.snake1.body.push(prevTail1);
            SnakeAudio.playEat();
        }

        if (this.snake2 && this.snake2.alive && this.food && this.snake2.body[0].x === this.food.x && this.snake2.body[0].y === this.food.y) {
            ate2 = true;
            this.snake2.score++;
            if (prevTail2) this.snake2.body.push(prevTail2);
            SnakeAudio.playEat();
        }

        if (ate1 || ate2) {
            this.food = this.nextFood;
            this.spawnNextFood();
            this.updateSpeed();
        }

        this.updateScoreDisplay();

        if (this.mode === 'single') {
            if (!this.snake1.alive) {
                this.gameOver();
            }
        } else {
            if (!this.snake1.alive || !this.snake2.alive) {
                this.gameOver();
            }
        }
    },

    moveSnake(snake) {
        if (!snake || !snake.alive || snake.body.length === 0) return;
        const head = snake.body[0];
        const newHead = {
            x: head.x + snake.direction.x,
            y: head.y + snake.direction.y
        };
        for (let i = snake.body.length - 1; i > 0; i--) {
            snake.body[i] = { ...snake.body[i - 1] };
        }
        snake.body[0] = newHead;
    },

    checkDeath(snake, otherSnake) {
        if (!snake || !snake.alive || snake.body.length === 0) return false;
        const head = snake.body[0];

        if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
            return true;
        }

        if (this.currentMapData[head.y] && this.currentMapData[head.y][head.x] === 1) {
            return true;
        }

        for (let i = 1; i < snake.body.length; i++) {
            if (snake.body[i].x === head.x && snake.body[i].y === head.y) {
                return true;
            }
        }

        if (otherSnake && otherSnake.alive && otherSnake.body) {
            for (const seg of otherSnake.body) {
                if (seg.x === head.x && seg.y === head.y) {
                    return true;
                }
            }
        }

        return false;
    },

    updateSpeed() {
        const maxScore = this.mode === 'dual'
            ? Math.max(this.snake1.score, this.snake2.score)
            : this.snake1.score;
        this.currentInterval = Math.max(60, this.baseInterval - maxScore * 3);
        this.updateSpeedDisplay();
    },

    onKeyDown(e) {
        SnakeAudio.resume();

        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (this.isGameOver) {
                this.startGame();
            } else {
                this.togglePause();
            }
            return;
        }

        if (this.isPaused || this.isGameOver || !this.isRunning) return;

        const key = e.key.toLowerCase();
        let dir1 = null;
        let dir2 = null;

        switch (key) {
            case 'w': case 'arrowup':
                if (this.mode === 'single') dir1 = { x: 0, y: -1 };
                else if (e.key.toLowerCase() === 'w') dir1 = { x: 0, y: -1 };
                else dir2 = { x: 0, y: -1 };
                break;
            case 's': case 'arrowdown':
                if (this.mode === 'single') dir1 = { x: 0, y: 1 };
                else if (e.key.toLowerCase() === 's') dir1 = { x: 0, y: 1 };
                else dir2 = { x: 0, y: 1 };
                break;
            case 'a': case 'arrowleft':
                if (this.mode === 'single') dir1 = { x: -1, y: 0 };
                else if (e.key.toLowerCase() === 'a') dir1 = { x: -1, y: 0 };
                else dir2 = { x: -1, y: 0 };
                break;
            case 'd': case 'arrowright':
                if (this.mode === 'single') dir1 = { x: 1, y: 0 };
                else if (e.key.toLowerCase() === 'd') dir1 = { x: 1, y: 0 };
                else dir2 = { x: 1, y: 0 };
                break;
        }

        if (dir1 && this.snake1 && this.snake1.alive) {
            if (!this.isOpposite(dir1, this.snake1.direction)) {
                this.snake1.nextDirection = dir1;
                e.preventDefault();
            }
        }
        if (dir2 && this.snake2 && this.snake2.alive) {
            if (!this.isOpposite(dir2, this.snake2.direction)) {
                this.snake2.nextDirection = dir2;
                e.preventDefault();
            }
        }
    },

    onTouchDirection(dir, player) {
        if (!this.isRunning || this.isPaused || this.isGameOver) return;
        let dirVec;
        switch (dir) {
            case 'up': dirVec = { x: 0, y: -1 }; break;
            case 'down': dirVec = { x: 0, y: 1 }; break;
            case 'left': dirVec = { x: -1, y: 0 }; break;
            case 'right': dirVec = { x: 1, y: 0 }; break;
        }
        const snake = player === 1 ? this.snake1 : this.snake2;
        if (snake && snake.alive && !this.isOpposite(dirVec, snake.direction)) {
            snake.nextDirection = dirVec;
        }
    },

    isOpposite(dir1, dir2) {
        return dir1.x === -dir2.x && dir1.y === -dir2.y;
    },

    openEditor(map) {
        if (map) {
            SnakeEditor.open(map.data, map.name);
            this.ui.mapNameInput.value = map.name;
            this.ui.btnEditorDelete.style.display = 'flex';
        } else {
            SnakeEditor.open(null, null);
            this.ui.mapNameInput.value = '';
            this.ui.btnEditorDelete.style.display = 'none';
        }
        this.ui.editorModal.style.display = 'flex';
        setTimeout(() => SnakeEditor.resize(), 100);
    },

    closeEditor() {
        this.ui.editorModal.style.display = 'none';
    },

    saveEditorMap() {
        const name = this.ui.mapNameInput.value.trim();
        const result = SnakeEditor.save(name);
        if (result.success) {
            alert(result.message);
            this.ui.btnEditorDelete.style.display = 'flex';
        } else {
            alert(result.message);
        }
    },

    clearEditorMap() {
        SnakeEditor.clear();
        this.ui.mapNameInput.value = '';
        this.ui.btnEditorDelete.style.display = 'none';
    },

    deleteEditorMap() {
        if (confirm('确定要删除这张地图吗？')) {
            const result = SnakeEditor.delete();
            if (result.success) {
                this.ui.mapNameInput.value = '';
                this.ui.btnEditorDelete.style.display = 'none';
            }
        }
    },

    render() {
        const state = {
            mapData: this.currentMapData,
            snake1: this.snake1,
            snake2: this.snake2,
            food: this.food,
            nextFood: this.nextFood,
            isPaused: this.isPaused,
            isGameOver: this.isGameOver,
            showHint: this.showHint
        };
        SnakeRenderer.render(state);
    },

    updateScoreDisplay() {
        const highScores = SnakeStorage.getHighScores();
        this.ui.scoreDisplay.textContent = this.snake1 ? this.snake1.score : 0;
        this.ui.highscoreDisplay.textContent = highScores.single;
        if (this.mode === 'dual') {
            this.ui.scoreDisplayP2.textContent = this.snake2 ? this.snake2.score : 0;
            this.ui.highscoreDisplayP2.textContent = highScores.dual;
        }
    },

    updateSpeedDisplay() {
        const ratio = (this.baseInterval / this.currentInterval).toFixed(1);
        this.ui.speedDisplay.textContent = ratio + 'x';
    },

    updateButtons() {
        if (this.isGameOver) {
            this.ui.btnStart.style.display = 'flex';
            this.ui.btnPause.style.display = 'none';
            this.ui.btnResume.style.display = 'none';
        } else if (this.isPaused) {
            this.ui.btnStart.style.display = 'none';
            this.ui.btnPause.style.display = 'none';
            this.ui.btnResume.style.display = 'flex';
        } else {
            this.ui.btnStart.style.display = 'none';
            this.ui.btnPause.style.display = 'flex';
            this.ui.btnResume.style.display = 'none';
        }
    },

    showOverlay(html) {
        this.ui.overlayContent.innerHTML = html;
        this.ui.gameOverlay.classList.remove('hidden');
    },

    hideOverlay() {
        this.ui.gameOverlay.classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SnakeGame.init();
});
