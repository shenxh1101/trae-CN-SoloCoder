const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const TILE_SIZE = 40;
const GRID_SIZE = 13;

class Game {
    constructor() {
        this.currentLevel = 0;
        this.lives = 3;
        this.isPaused = false;
        this.isGameOver = false;
        this.isEditorMode = false;
        this.currentTool = 'stone';
        this.editorMap = null;
        this.editorEnemies = [];

        this.player = {
            x: 1, y: 1,
            bombs: 1, maxBombs: 1,
            bombRange: 1,
            speed: 0.08,
            invincible: false,
            invincibleTimer: 0
        };

        this.bombs = [];
        this.explosions = [];
        this.enemies = [];
        this.map = [];
        this.powerups = [];
        this.exit = null;

        this.keys = {};
        this.lastTime = 0;
        this.animationId = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadLevel(this.currentLevel);
        this.gameLoop();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                this.placeBomb();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('editorBtn').addEventListener('click', () => this.toggleEditor());
        document.getElementById('soundBtn').addEventListener('click', () => this.toggleSound());

        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());

        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTool = e.target.dataset.tool;
            });
        });

        document.getElementById('saveLevelBtn').addEventListener('click', () => this.saveEditorLevel());
        document.getElementById('loadLevelBtn').addEventListener('click', () => this.loadEditorLevel());
        document.getElementById('clearLevelBtn').addEventListener('click', () => this.clearEditorMap());
        document.getElementById('closeEditorBtn').addEventListener('click', () => this.toggleEditor());

        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        this.setupMobileControls();
    }

    setupMobileControls() {
        const joystick = document.getElementById('joystick');
        const joystickKnob = document.getElementById('joystickKnob');
        const bombBtn = document.getElementById('bombBtn');

        let joystickActive = false;
        let joystickCenter = { x: 0, y: 0 };

        const updateJoystick = (clientX, clientY) => {
            const rect = joystick.getBoundingClientRect();
            joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            
            let dx = clientX - joystickCenter.x;
            let dy = clientY - joystickCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = rect.width / 2 - 25;

            if (distance > maxDistance) {
                dx = (dx / distance) * maxDistance;
                dy = (dy / distance) * maxDistance;
            }

            joystickKnob.style.left = `calc(50% + ${dx}px)`;
            joystickKnob.style.top = `calc(50% + ${dy}px)`;

            this.keys['arrowup'] = Math.abs(dy) > 15 && dy < -10;
            this.keys['arrowdown'] = Math.abs(dy) > 15 && dy > 10;
            this.keys['arrowleft'] = Math.abs(dx) > 15 && dx < -10;
            this.keys['arrowright'] = Math.abs(dx) > 15 && dx > 10;
        };

        const resetJoystick = () => {
            joystickActive = false;
            joystickKnob.style.left = '50%';
            joystickKnob.style.top = '50%';
            this.keys['arrowup'] = false;
            this.keys['arrowdown'] = false;
            this.keys['arrowleft'] = false;
            this.keys['arrowright'] = false;
        };

        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            joystickActive = true;
            updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
        });

        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (joystickActive) {
                updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
            }
        });

        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            resetJoystick();
        });

        joystick.addEventListener('mousedown', (e) => {
            joystickActive = true;
            updateJoystick(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (joystickActive) {
                updateJoystick(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', () => {
            if (joystickActive) {
                resetJoystick();
            }
        });

        bombBtn.addEventListener('click', () => this.placeBomb());
        bombBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.placeBomb();
        });
    }

    loadLevel(levelIndex) {
        const levelData = getLevel(levelIndex);
        this.currentLevelData = levelData;
        this.map = levelData.map;
        this.enemies = levelData.enemies.map(e => ({
            ...e,
            direction: Math.floor(Math.random() * 4),
            moveTimer: 0
        }));
        this.player.x = levelData.playerStart.x;
        this.player.y = levelData.playerStart.y;
        this.bombs = [];
        this.explosions = [];
        this.powerups = [];
        
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const tile = this.map[y][x];
                if (tile === TILE.POWERUP_BOMB || tile === TILE.POWERUP_RANGE || tile === TILE.POWERUP_SPEED) {
                    this.powerups.push({ x, y, type: tile });
                    this.map[y][x] = TILE.EMPTY;
                }
            }
        }
        
        this.exit = null;
        this.isGameOver = false;
        this.updateUI();
    }

    togglePause() {
        if (this.isGameOver || this.isEditorMode) return;
        this.isPaused = !this.isPaused;
        document.getElementById('pauseModal').classList.toggle('hidden', !this.isPaused);
    }

    resetGame() {
        this.currentLevel = 0;
        this.lives = 3;
        this.player.bombs = 1;
        this.player.maxBombs = 1;
        this.player.bombRange = 1;
        this.player.speed = 0.08;
        this.isGameOver = false;
        this.isPaused = false;
        document.getElementById('gameOverModal').classList.add('hidden');
        document.getElementById('pauseModal').classList.add('hidden');
        this.loadLevel(0);
    }

    nextLevel() {
        this.currentLevel++;
        document.getElementById('levelCompleteModal').classList.add('hidden');
        this.loadLevel(this.currentLevel);
    }

    toggleSound() {
        const enabled = audioManager.toggle();
        document.getElementById('soundBtn').textContent = enabled ? '🔊' : '🔇';
    }

    toggleEditor() {
        this.isEditorMode = !this.isEditorMode;
        document.getElementById('editorPanel').classList.toggle('hidden', !this.isEditorMode);
        
        if (this.isEditorMode) {
            this.editorMap = createEmptyMap();
            this.editorEnemies = [];
        }
    }

    handleCanvasClick(e) {
        if (!this.isEditorMode) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
        const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);

        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
        if (x === 0 || y === 0 || x === 12 || y === 12) return;
        if (x % 2 === 0 && y % 2 === 0) return;

        this.editorEnemies = this.editorEnemies.filter(e => e.x !== x || e.y !== y);

        switch (this.currentTool) {
            case 'stone':
                this.editorMap[y][x] = TILE.STONE;
                break;
            case 'brick':
                this.editorMap[y][x] = TILE.BRICK;
                break;
            case 'enemy':
                if (this.editorMap[y][x] === TILE.EMPTY) {
                    this.editorEnemies.push({ x, y, speed: 0.03 });
                }
                break;
            case 'powerup-bomb':
                this.editorMap[y][x] = TILE.POWERUP_BOMB;
                break;
            case 'powerup-range':
                this.editorMap[y][x] = TILE.POWERUP_RANGE;
                break;
            case 'powerup-speed':
                this.editorMap[y][x] = TILE.POWERUP_SPEED;
                break;
            case 'eraser':
                this.editorMap[y][x] = TILE.EMPTY;
                break;
        }
    }

    saveEditorLevel() {
        const levelData = {
            map: this.editorMap,
            enemies: this.editorEnemies,
            playerStart: { x: 1, y: 1 }
        };
        saveCustomLevel(levelData);
        alert('关卡已保存！');
    }

    loadEditorLevel() {
        const customLevels = loadCustomLevels();
        if (customLevels.length > 0) {
            const latest = customLevels[customLevels.length - 1];
            this.editorMap = JSON.parse(JSON.stringify(latest.map));
            this.editorEnemies = JSON.parse(JSON.stringify(latest.enemies));
        } else {
            alert('没有保存的关卡！');
        }
    }

    clearEditorMap() {
        this.editorMap = createEmptyMap();
        this.editorEnemies = [];
    }

    placeBomb() {
        if (this.isPaused || this.isGameOver || this.isEditorMode) return;
        if (this.player.bombs <= 0) return;

        const bx = Math.floor(this.player.x + 0.5);
        const by = Math.floor(this.player.y + 0.5);

        if (this.map[by][bx] !== TILE.EMPTY) return;
        if (this.bombs.some(b => Math.floor(b.x) === bx && Math.floor(b.y) === by)) return;

        this.bombs.push({
            x: bx, y: by,
            timer: 3,
            range: this.player.bombRange
        });
        this.player.bombs--;
        audioManager.playPlaceBomb();
        this.updateUI();
    }

    canMove(x, y, excludeBombs = false) {
        const checkPoints = [
            { x: x - 0.3, y: y - 0.3 },
            { x: x + 0.3, y: y - 0.3 },
            { x: x - 0.3, y: y + 0.3 },
            { x: x + 0.3, y: y + 0.3 }
        ];
        
        for (const point of checkPoints) {
            const gx = Math.floor(point.x);
            const gy = Math.floor(point.y);
            
            if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return false;
            if (this.map[gy][gx] === TILE.STONE || this.map[gy][gx] === TILE.BRICK) return false;
            
            if (!excludeBombs) {
                for (const bomb of this.bombs) {
                    if (Math.floor(bomb.x) === gx && Math.floor(bomb.y) === gy) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    update(deltaTime) {
        if (this.isPaused || this.isGameOver || this.isEditorMode) return;

        if (this.player.invincible) {
            this.player.invincibleTimer -= deltaTime;
            if (this.player.invincibleTimer <= 0) {
                this.player.invincible = false;
            }
        }

        this.updatePlayer(deltaTime);
        this.updateBombs(deltaTime);
        this.updateExplosions(deltaTime);
        this.updateEnemies(deltaTime);
        this.checkCollisions();
        this.checkWinCondition();
    }

    updatePlayer(deltaTime) {
        let dx = 0, dy = 0;

        if (this.keys['w'] || this.keys['arrowup']) dy = -1;
        if (this.keys['s'] || this.keys['arrowdown']) dy = 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx = -1;
        if (this.keys['d'] || this.keys['arrowright']) dx = 1;

        const speed = this.player.speed;
        const newX = this.player.x + dx * speed;
        const newY = this.player.y + dy * speed;

        if (this.canMove(newX, this.player.y, true)) {
            this.player.x = newX;
        }
        if (this.canMove(this.player.x, newY, true)) {
            this.player.y = newY;
        }
    }

    updateBombs(deltaTime) {
        let hasExplosion = false;
        
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.timer -= deltaTime;
            
            if (bomb.timer <= 0) {
                this.explodeBomb(bomb);
                this.bombs.splice(i, 1);
                this.player.bombs = Math.min(this.player.bombs + 1, this.player.maxBombs);
                hasExplosion = true;
            }
        }
        
        if (hasExplosion) {
            audioManager.playExplosion();
            this.updateUI();
            this.updateBombs(0);
        }
    }

    explodeBomb(bomb) {
        const { x, y, range } = bomb;
        const explosionTiles = [{ x, y }];

        const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
        ];

        for (const dir of directions) {
            for (let i = 1; i <= range; i++) {
                const nx = x + dir.dx * i;
                const ny = y + dir.dy * i;

                if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) break;
                if (this.map[ny][nx] === TILE.STONE) break;

                explosionTiles.push({ x: nx, y: ny });

                if (this.map[ny][nx] === TILE.BRICK) {
                    this.map[ny][nx] = TILE.EMPTY;
                    if (Math.random() < 0.3) {
                        const types = [TILE.POWERUP_BOMB, TILE.POWERUP_RANGE, TILE.POWERUP_SPEED];
                        this.powerups.push({
                            x: nx, y: ny,
                            type: types[Math.floor(Math.random() * types.length)]
                        });
                    }
                    break;
                }
            }
        }

        this.explosions.push({
            tiles: explosionTiles,
            timer: 0.5
        });

        for (const otherBomb of this.bombs) {
            if (otherBomb !== bomb) {
                for (const tile of explosionTiles) {
                    if (Math.floor(otherBomb.x) === tile.x && Math.floor(otherBomb.y) === tile.y) {
                        otherBomb.timer = 0;
                    }
                }
            }
        }
    }

    updateExplosions(deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].timer -= deltaTime;
            if (this.explosions[i].timer <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }

    updateEnemies(deltaTime) {
        for (const enemy of this.enemies) {
            enemy.moveTimer += deltaTime;
            
            if (enemy.moveTimer >= 0.5) {
                enemy.moveTimer = 0;
                if (Math.random() < 0.3) {
                    enemy.direction = Math.floor(Math.random() * 4);
                }
            }

            const directions = [
                { dx: 0, dy: -1 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 },
                { dx: 1, dy: 0 }
            ];

            const dir = directions[enemy.direction];
            const newX = enemy.x + dir.dx * enemy.speed;
            const newY = enemy.y + dir.dy * enemy.speed;

            if (this.canMove(newX, newY)) {
                enemy.x = newX;
                enemy.y = newY;
            } else {
                enemy.direction = Math.floor(Math.random() * 4);
            }
        }
    }

    checkCollisions() {
        const px = this.player.x;
        const py = this.player.y;

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            if (Math.abs(px - p.x) < 0.5 && Math.abs(py - p.y) < 0.5) {
                this.applyPowerup(p.type);
                this.powerups.splice(i, 1);
                audioManager.playPowerup();
            }
        }

        if (!this.player.invincible) {
            for (const enemy of this.enemies) {
                if (Math.abs(px - enemy.x) < 0.5 && Math.abs(py - enemy.y) < 0.5) {
                    this.playerHit();
                }
            }
        }

        for (const exp of this.explosions) {
            for (const tile of exp.tiles) {
                if (Math.abs(px - tile.x) < 0.5 && Math.abs(py - tile.y) < 0.5) {
                    if (!this.player.invincible) {
                        this.playerHit();
                    }
                }

                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const enemy = this.enemies[i];
                    if (Math.abs(enemy.x - tile.x) < 0.5 && Math.abs(enemy.y - tile.y) < 0.5) {
                        this.enemies.splice(i, 1);
                    }
                }
            }
        }

        if (this.exit) {
            if (Math.abs(px - this.exit.x) < 0.5 && Math.abs(py - this.exit.y) < 0.5) {
                this.levelComplete();
            }
        }
    }

    applyPowerup(type) {
        switch (type) {
            case TILE.POWERUP_BOMB:
                this.player.maxBombs++;
                this.player.bombs++;
                break;
            case TILE.POWERUP_RANGE:
                this.player.bombRange++;
                break;
            case TILE.POWERUP_SPEED:
                this.player.speed = Math.min(this.player.speed + 0.02, 0.2);
                break;
        }
        this.updateUI();
    }

    playerHit() {
        this.lives--;
        audioManager.playDeath();
        this.updateUI();

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.player.x = this.currentLevelData.playerStart.x;
            this.player.y = this.currentLevelData.playerStart.y;
            this.player.invincible = true;
            this.player.invincibleTimer = 2;
        }
    }

    gameOver() {
        this.isGameOver = true;
        document.getElementById('gameOverTitle').textContent = '游戏结束';
        document.getElementById('gameOverMessage').textContent = '你被敌人抓住了！';
        document.getElementById('gameOverModal').classList.remove('hidden');
    }

    checkWinCondition() {
        if (this.enemies.length === 0 && !this.exit) {
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    if (this.map[y][x] === TILE.EMPTY) {
                        this.exit = { x, y };
                        audioManager.playVictory();
                        return;
                    }
                }
            }
        }
    }

    levelComplete() {
        this.isGameOver = true;
        document.getElementById('levelCompleteMessage').textContent = `准备进入第 ${this.currentLevel + 2} 关...`;
        document.getElementById('levelCompleteModal').classList.remove('hidden');
    }

    updateUI() {
        document.getElementById('level').textContent = this.currentLevel + 1;
        document.getElementById('lives').textContent = '❤️'.repeat(Math.max(0, this.lives));
        document.getElementById('bombs').textContent = this.player.maxBombs;
        document.getElementById('range').textContent = this.player.bombRange;
        document.getElementById('speed').textContent = Math.round((this.player.speed - 0.06) / 0.02) + 1;
    }

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const map = this.isEditorMode ? this.editorMap : this.map;

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const tile = map[y][x];
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;

                ctx.fillStyle = '#4a5568';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                switch (tile) {
                    case TILE.STONE:
                        ctx.fillStyle = '#718096';
                        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                        ctx.fillStyle = '#a0aec0';
                        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 12, TILE_SIZE - 12);
                        break;
                    case TILE.BRICK:
                        ctx.fillStyle = '#c53030';
                        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                        ctx.strokeStyle = '#9b2c2c';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(px + 6, py + 6, 12, 8);
                        ctx.strokeRect(px + 22, py + 6, 12, 8);
                        ctx.strokeRect(px + 14, py + 20, 12, 8);
                        break;
                    case TILE.POWERUP_BOMB:
                        this.drawPowerup(px, py, '💣');
                        break;
                    case TILE.POWERUP_RANGE:
                        this.drawPowerup(px, py, '🔥');
                        break;
                    case TILE.POWERUP_SPEED:
                        this.drawPowerup(px, py, '⚡');
                        break;
                }
            }
        }

        if (!this.isEditorMode) {
            for (const p of this.powerups) {
                const icon = p.type === TILE.POWERUP_BOMB ? '💣' : 
                            p.type === TILE.POWERUP_RANGE ? '🔥' : '⚡';
                this.drawPowerup(p.x * TILE_SIZE, p.y * TILE_SIZE, icon);
            }
        }

        if (this.exit) {
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚪', this.exit.x * TILE_SIZE + TILE_SIZE / 2, this.exit.y * TILE_SIZE + TILE_SIZE / 2);
        }

        for (const bomb of this.bombs) {
            const bx = Math.floor(bomb.x);
            const by = Math.floor(bomb.y);
            const flash = Math.floor(bomb.timer * 4) % 2 === 0;
            ctx.fillStyle = flash ? '#000' : '#f56565';
            ctx.beginPath();
            ctx.arc(bx * TILE_SIZE + TILE_SIZE / 2, by * TILE_SIZE + TILE_SIZE / 2, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.ceil(bomb.timer), bx * TILE_SIZE + TILE_SIZE / 2, by * TILE_SIZE + TILE_SIZE / 2);
        }

        for (const exp of this.explosions) {
            for (const tile of exp.tiles) {
                ctx.fillStyle = `rgba(251, 146, 60, ${exp.timer / 0.5})`;
                ctx.fillRect(tile.x * TILE_SIZE + 4, tile.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.fillStyle = `rgba(255, 251, 235, ${exp.timer / 0.5 * 0.7})`;
                ctx.beginPath();
                ctx.arc(tile.x * TILE_SIZE + TILE_SIZE / 2, tile.y * TILE_SIZE + TILE_SIZE / 2, 10, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const enemies = this.isEditorMode ? this.editorEnemies : this.enemies;
        for (const enemy of enemies) {
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👾', enemy.x * TILE_SIZE + TILE_SIZE / 2, enemy.y * TILE_SIZE + TILE_SIZE / 2);
        }

        if (!this.isEditorMode) {
            if (!this.player.invincible || Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('😎', this.player.x * TILE_SIZE + TILE_SIZE / 2, this.player.y * TILE_SIZE + TILE_SIZE / 2);
            }
        }
    }

    drawPowerup(x, y, icon) {
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
        ctx.save();
        ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        ctx.scale(pulse, pulse);
        ctx.fillText(icon, 0, 0);
        ctx.restore();
    }

    gameLoop(currentTime = 0) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(Math.min(deltaTime, 0.1));
        this.render();

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }
}

const game = new Game();
