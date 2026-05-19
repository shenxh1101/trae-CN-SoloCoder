class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.cols = Math.floor(this.canvas.width / this.gridSize);
        this.rows = Math.floor(this.canvas.height / this.gridSize);
        
        this.gameMode = null;
        this.gameState = 'menu';
        this.gameLoop = null;
        this.gameStartTime = 0;
        this.gameTime = 0;
        
        this.snake1 = null;
        this.snake2 = null;
        this.food = null;
        
        this.score1 = 0;
        this.score2 = 0;
        
        this.moveOrder = 1;
        
        this.init();
    }
    
    init() {
        this.loadHighScore();
        this.bindEvents();
    }
    
    loadHighScore() {
        const highScore = localStorage.getItem('snakeHighScore') || 0;
        document.getElementById('highScoreValue').textContent = highScore;
    }
    
    saveHighScore(score) {
        const currentHigh = parseInt(localStorage.getItem('snakeHighScore') || 0);
        if (score > currentHigh) {
            localStorage.setItem('snakeHighScore', score);
            document.getElementById('highScoreValue').textContent = score;
        }
    }
    
    bindEvents() {
        document.getElementById('btnSingle').addEventListener('click', () => this.startGame('single'));
        document.getElementById('btnDual').addEventListener('click', () => this.startGame('dual'));
        document.getElementById('btnRestart').addEventListener('click', () => this.restartGame());
        document.getElementById('btnBackMenu').addEventListener('click', () => this.backToMenu());
        document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
        document.getElementById('btnQuit').addEventListener('click', () => this.backToMenu());
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }
    
    handleKeyDown(e) {
        if (this.gameState !== 'playing') return;
        
        if (this.snake1) {
            switch(e.key) {
                case 'ArrowUp':
                    if (this.snake1.direction.y !== 1) this.snake1.nextDirection = { x: 0, y: -1 };
                    break;
                case 'ArrowDown':
                    if (this.snake1.direction.y !== -1) this.snake1.nextDirection = { x: 0, y: 1 };
                    break;
                case 'ArrowLeft':
                    if (this.snake1.direction.x !== 1) this.snake1.nextDirection = { x: -1, y: 0 };
                    break;
                case 'ArrowRight':
                    if (this.snake1.direction.x !== -1) this.snake1.nextDirection = { x: 1, y: 0 };
                    break;
            }
        }
        
        if (this.snake2 && this.gameMode === 'dual') {
            switch(e.key.toLowerCase()) {
                case 'w':
                    if (this.snake2.direction.y !== 1) this.snake2.nextDirection = { x: 0, y: -1 };
                    break;
                case 's':
                    if (this.snake2.direction.y !== -1) this.snake2.nextDirection = { x: 0, y: 1 };
                    break;
                case 'a':
                    if (this.snake2.direction.x !== 1) this.snake2.nextDirection = { x: -1, y: 0 };
                    break;
                case 'd':
                    if (this.snake2.direction.x !== -1) this.snake2.nextDirection = { x: 1, y: 0 };
                    break;
            }
        }
    }
    
    startGame(mode) {
        this.gameMode = mode;
        this.gameState = 'countdown';
        this.score1 = 0;
        this.score2 = 0;
        this.moveOrder = 1;
        
        this.snake1 = this.createSnake({ x: 5, y: Math.floor(this.rows / 2) }, { x: 1, y: 0 }, '#00ff88', '#00cc66');
        this.snake2 = this.createSnake({ x: this.cols - 6, y: Math.floor(this.rows / 2) }, { x: -1, y: 0 }, '#0096ff', '#0066cc');
        
        if (mode === 'single') {
            this.snake2.isAI = true;
            document.getElementById('player2Label').textContent = 'AI';
            document.getElementById('finalScore2Row').innerHTML = 'AI得分: <span id="finalScore2">0</span>';
        } else {
            this.snake2.isAI = false;
            document.getElementById('player2Label').textContent = '玩家2';
            document.getElementById('finalScore2Row').innerHTML = '玩家2得分: <span id="finalScore2">0</span>';
        }
        
        this.spawnFood();
        
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'flex';
        document.getElementById('score1').textContent = '0';
        document.getElementById('score2').textContent = '0';
        document.getElementById('gameTime').textContent = '00:00';
        
        this.showCountdown();
    }
    
    createSnake(startPos, direction, headColor, bodyColor) {
        const body = [];
        for (let i = 0; i < 4; i++) {
            body.push({
                x: startPos.x - direction.x * i,
                y: startPos.y - direction.y * i
            });
        }
        return {
            body: body,
            direction: { ...direction },
            nextDirection: { ...direction },
            headColor: headColor,
            bodyColor: bodyColor,
            isAI: false,
            alive: true
        };
    }
    
    spawnFood() {
        let validPosition = false;
        let attempts = 0;
        
        while (!validPosition && attempts < 100) {
            this.food = {
                x: Math.floor(Math.random() * this.cols),
                y: Math.floor(Math.random() * this.rows)
            };
            
            validPosition = true;
            
            if (this.snake1) {
                for (const segment of this.snake1.body) {
                    if (segment.x === this.food.x && segment.y === this.food.y) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            if (validPosition && this.snake2) {
                for (const segment of this.snake2.body) {
                    if (segment.x === this.food.x && segment.y === this.food.y) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            attempts++;
        }
    }
    
    showCountdown() {
        const countdownEl = document.getElementById('countdown');
        let count = 3;
        
        const countdownStep = () => {
            if (count > 0) {
                countdownEl.textContent = count;
                countdownEl.classList.remove('active');
                void countdownEl.offsetWidth;
                countdownEl.classList.add('active');
                count--;
                setTimeout(countdownStep, 800);
            } else {
                countdownEl.textContent = '开始!';
                countdownEl.classList.remove('active');
                void countdownEl.offsetWidth;
                countdownEl.classList.add('active');
                setTimeout(() => {
                    countdownEl.style.display = 'none';
                    this.startGameLoop();
                }, 600);
            }
        };
        
        countdownEl.style.display = 'block';
        countdownStep();
    }
    
    startGameLoop() {
        this.gameState = 'playing';
        this.gameStartTime = Date.now();
        this.gameLoop = setInterval(() => this.update(), 100);
    }
    
    update() {
        this.updateTimer();
        
        if (this.snake1.alive) {
            this.moveSnake(this.snake1);
        }
        
        if (this.snake2.alive) {
            if (this.snake2.isAI) {
                this.updateAI();
            }
            this.moveSnake(this.snake2);
        }
        
        this.moveOrder = this.moveOrder === 1 ? 2 : 1;
        
        this.checkCollisions();
        
        if (this.snake1.alive || this.snake2.alive) {
            this.render();
        }
    }
    
    updateTimer() {
        this.gameTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const minutes = Math.floor(this.gameTime / 60).toString().padStart(2, '0');
        const seconds = (this.gameTime % 60).toString().padStart(2, '0');
        document.getElementById('gameTime').textContent = `${minutes}:${seconds}`;
    }
    
    moveSnake(snake) {
        snake.direction = { ...snake.nextDirection };
        
        const head = snake.body[0];
        const newHead = {
            x: head.x + snake.direction.x,
            y: head.y + snake.direction.y
        };
        
        snake.body.unshift(newHead);
        
        if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
            if (snake === this.snake1) {
                this.score1 += 10;
                document.getElementById('score1').textContent = this.score1;
            } else {
                this.score2 += 10;
                document.getElementById('score2').textContent = this.score2;
            }
            this.spawnFood();
            this.createEatEffect(newHead);
        } else {
            snake.body.pop();
        }
    }
    
    updateAI() {
        const path = this.findPath(this.snake2.body[0], this.food, this.snake2, this.snake1);
        
        if (path && path.length > 1) {
            const nextPos = path[1];
            const head = this.snake2.body[0];
            this.snake2.nextDirection = {
                x: nextPos.x - head.x,
                y: nextPos.y - head.y
            };
        } else {
            this.wanderAI();
        }
    }
    
    findPath(start, goal, snake, otherSnake) {
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const startKey = `${start.x},${start.y}`;
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, goal));
        openSet.push({ pos: start, f: fScore.get(startKey) });
        
        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = `${current.pos.x},${current.pos.y}`;
            
            if (current.pos.x === goal.x && current.pos.y === goal.y) {
                return this.reconstructPath(cameFrom, current.pos);
            }
            
            closedSet.add(currentKey);
            
            const neighbors = this.getNeighbors(current.pos);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                if (closedSet.has(neighborKey)) continue;
                if (!this.isValidPosition(neighbor, snake, otherSnake)) continue;
                
                const tentativeG = gScore.get(currentKey) + 1;
                
                if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current.pos);
                    gScore.set(neighborKey, tentativeG);
                    const f = tentativeG + this.heuristic(neighbor, goal);
                    fScore.set(neighborKey, f);
                    
                    const existing = openSet.find(n => n.pos.x === neighbor.x && n.pos.y === neighbor.y);
                    if (!existing) {
                        openSet.push({ pos: neighbor, f: f });
                    } else {
                        existing.f = f;
                    }
                }
            }
        }
        
        return null;
    }
    
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    
    getNeighbors(pos) {
        return [
            { x: pos.x + 1, y: pos.y },
            { x: pos.x - 1, y: pos.y },
            { x: pos.x, y: pos.y + 1 },
            { x: pos.x, y: pos.y - 1 }
        ];
    }
    
    isValidPosition(pos, snake, otherSnake) {
        if (pos.x < 0 || pos.x >= this.cols || pos.y < 0 || pos.y >= this.rows) {
            return false;
        }
        
        for (let i = 0; i < snake.body.length - 1; i++) {
            if (snake.body[i].x === pos.x && snake.body[i].y === pos.y) {
                return false;
            }
        }
        
        if (otherSnake && otherSnake.alive) {
            for (const segment of otherSnake.body) {
                if (segment.x === pos.x && segment.y === pos.y) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = `${current.x},${current.y}`;
        
        while (cameFrom.has(currentKey)) {
            current = cameFrom.get(currentKey);
            path.unshift(current);
            currentKey = `${current.x},${current.y}`;
        }
        
        return path;
    }
    
    wanderAI() {
        const head = this.snake2.body[0];
        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];
        
        const validDirections = directions.filter(dir => {
            if (dir.x === -this.snake2.direction.x && dir.y === -this.snake2.direction.y) {
                return false;
            }
            const newPos = { x: head.x + dir.x, y: head.y + dir.y };
            return this.isValidPosition(newPos, this.snake2, this.snake1);
        });
        
        if (validDirections.length > 0) {
            this.snake2.nextDirection = validDirections[Math.floor(Math.random() * validDirections.length)];
        }
    }
    
    checkCollisions() {
        if (this.snake1.alive) {
            if (this.checkWallCollision(this.snake1) || this.checkSelfCollision(this.snake1)) {
                this.snake1.alive = false;
                this.endGame(this.snake2, this.snake1, '玩家1撞墙或撞到自己');
                return;
            }
        }
        
        if (this.snake2.alive) {
            if (this.checkWallCollision(this.snake2) || this.checkSelfCollision(this.snake2)) {
                this.snake2.alive = false;
                const loserName = this.gameMode === 'single' ? 'AI' : '玩家2';
                this.endGame(this.snake1, this.snake2, `${loserName}撞墙或撞到自己`);
                return;
            }
        }
        
        if (this.snake1.alive && this.snake2.alive) {
            const head1 = this.snake1.body[0];
            const head2 = this.snake2.body[0];
            
            if (head1.x === head2.x && head1.y === head2.y) {
                if (this.moveOrder === 1) {
                    this.endGame(this.snake2, this.snake1, '头碰头！后移动的蛇获胜');
                } else {
                    this.endGame(this.snake1, this.snake2, '头碰头！后移动的蛇获胜');
                }
                return;
            }
            
            for (let i = 0; i < this.snake2.body.length; i++) {
                if (head1.x === this.snake2.body[i].x && head1.y === this.snake2.body[i].y) {
                    this.endGame(this.snake2, this.snake1, '玩家1撞到对方身体');
                    return;
                }
            }
            
            for (let i = 0; i < this.snake1.body.length; i++) {
                if (head2.x === this.snake1.body[i].x && head2.y === this.snake1.body[i].y) {
                    const loserName = this.gameMode === 'single' ? 'AI' : '玩家2';
                    this.endGame(this.snake1, this.snake2, `${loserName}撞到对方身体`);
                    return;
                }
            }
        }
    }
    
    checkWallCollision(snake) {
        const head = snake.body[0];
        return head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows;
    }
    
    checkSelfCollision(snake) {
        const head = snake.body[0];
        for (let i = 1; i < snake.body.length; i++) {
            if (head.x === snake.body[i].x && head.y === snake.body[i].y) {
                return true;
            }
        }
        return false;
    }
    
    endGame(winner, loser, reason) {
        this.gameState = 'gameover';
        clearInterval(this.gameLoop);
        
        const maxScore = Math.max(this.score1, this.score2);
        this.saveHighScore(maxScore);
        
        const gameOverEl = document.getElementById('gameOver');
        const titleEl = document.getElementById('gameOverTitle');
        const messageEl = document.getElementById('gameOverMessage');
        
        if (winner === this.snake1) {
            titleEl.textContent = '🎉 玩家1 获胜！';
            titleEl.style.color = '#00ff88';
        } else if (winner === this.snake2) {
            const winnerName = this.gameMode === 'single' ? 'AI' : '玩家2';
            titleEl.textContent = `🎉 ${winnerName} 获胜！`;
            titleEl.style.color = '#0096ff';
        } else {
            titleEl.textContent = '🤝 平局！';
            titleEl.style.color = '#ffd700';
        }
        
        messageEl.textContent = reason;
        
        const minutes = Math.floor(this.gameTime / 60).toString().padStart(2, '0');
        const seconds = (this.gameTime % 60).toString().padStart(2, '0');
        document.getElementById('finalTime').textContent = `${minutes}:${seconds}`;
        document.getElementById('finalScore1').textContent = this.score1;
        document.getElementById('finalScore2').textContent = this.score2;
        
        gameOverEl.classList.add('active');
        this.createGameOverEffect();
    }
    
    createEatEffect(pos) {
        const wrapper = document.querySelector('.canvas-wrapper');
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.canvas.width;
        const scaleY = rect.height / this.canvas.height;
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 10 + 5;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.background = '#ffd700';
            particle.style.left = (pos.x * this.gridSize * scaleX + scaleX * this.gridSize / 2) + 'px';
            particle.style.top = (pos.y * this.gridSize * scaleY + scaleY * this.gridSize / 2) + 'px';
            particle.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`;
            wrapper.appendChild(particle);
            
            setTimeout(() => particle.remove(), 1000);
        }
    }
    
    createGameOverEffect() {
        const wrapper = document.querySelector('.canvas-wrapper');
        const rect = this.canvas.getBoundingClientRect();
        
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 15 + 8;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.background = ['#ff6b6b', '#ffd700', '#00ff88', '#0096ff'][Math.floor(Math.random() * 4)];
            particle.style.left = Math.random() * rect.width + 'px';
            particle.style.top = Math.random() * rect.height + 'px';
            wrapper.appendChild(particle);
            
            setTimeout(() => particle.remove(), 1500);
        }
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            clearInterval(this.gameLoop);
            document.getElementById('btnPause').textContent = '▶ 继续';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.gameLoop = setInterval(() => this.update(), 100);
            document.getElementById('btnPause').textContent = '⏸ 暂停';
        }
    }
    
    restartGame() {
        document.getElementById('gameOver').classList.remove('active');
        this.startGame(this.gameMode);
    }
    
    backToMenu() {
        this.gameState = 'menu';
        clearInterval(this.gameLoop);
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('menuScreen').style.display = 'flex';
        document.getElementById('gameOver').classList.remove('active');
        document.getElementById('countdown').style.display = 'none';
        document.getElementById('btnPause').textContent = '⏸ 暂停';
        this.loadHighScore();
    }
    
    render() {
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.cols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.gridSize, 0);
            this.ctx.lineTo(x * this.gridSize, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.rows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.gridSize);
            this.ctx.lineTo(this.canvas.width, y * this.gridSize);
            this.ctx.stroke();
        }
        
        if (this.food) {
            const foodX = this.food.x * this.gridSize + this.gridSize / 2;
            const foodY = this.food.y * this.gridSize + this.gridSize / 2;
            
            const gradient = this.ctx.createRadialGradient(foodX, foodY, 0, foodX, foodY, this.gridSize);
            gradient.addColorStop(0, '#ff6b6b');
            gradient.addColorStop(0.5, '#ee5a5a');
            gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(foodX, foodY, this.gridSize * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.beginPath();
            this.ctx.arc(foodX, foodY, this.gridSize * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        if (this.snake1) {
            this.renderSnake(this.snake1);
        }
        
        if (this.snake2) {
            this.renderSnake(this.snake2);
        }
    }
    
    renderSnake(snake) {
        if (!snake.alive) return;
        
        for (let i = snake.body.length - 1; i >= 0; i--) {
            const segment = snake.body[i];
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            const size = this.gridSize - 2;
            
            if (i === 0) {
                this.ctx.fillStyle = snake.headColor;
                this.ctx.shadowColor = snake.headColor;
                this.ctx.shadowBlur = 15;
                this.ctx.beginPath();
                this.ctx.roundRect(x + 1, y + 1, size, size, 6);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                
                this.ctx.fillStyle = '#fff';
                const eyeSize = 4;
                const eyeOffset = 5;
                
                if (snake.direction.x === 1) {
                    this.ctx.beginPath();
                    this.ctx.arc(x + size - eyeOffset, y + eyeOffset + 2, eyeSize, 0, Math.PI * 2);
                    this.ctx.arc(x + size - eyeOffset, y + size - eyeOffset - 2, eyeSize, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (snake.direction.x === -1) {
                    this.ctx.beginPath();
                    this.ctx.arc(x + eyeOffset, y + eyeOffset + 2, eyeSize, 0, Math.PI * 2);
                    this.ctx.arc(x + eyeOffset, y + size - eyeOffset - 2, eyeSize, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (snake.direction.y === 1) {
                    this.ctx.beginPath();
                    this.ctx.arc(x + eyeOffset + 2, y + size - eyeOffset, eyeSize, 0, Math.PI * 2);
                    this.ctx.arc(x + size - eyeOffset - 2, y + size - eyeOffset, eyeSize, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(x + eyeOffset + 2, y + eyeOffset, eyeSize, 0, Math.PI * 2);
                    this.ctx.arc(x + size - eyeOffset - 2, y + eyeOffset, eyeSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.fillStyle = '#000';
                const pupilSize = 2;
                if (snake.direction.x === 1) {
                    this.ctx.beginPath();
                    this.ctx.arc(x + size - eyeOffset + 1, y + eyeOffset + 2, pupilSize, 0, Math.PI * 2);
                    this.ctx.arc(x + size - eyeOffset + 1, y + size - eyeOffset - 2, pupilSize, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (snake.direction.x === -1) {
                    this.ctx.beginPath();
                    this.ctx.arc(x + eyeOffset - 1, y + eyeOffset + 2, pupilSize, 0, Math.PI * 2);
                    this.ctx.arc(x + eyeOffset - 1, y + size - eyeOffset - 2, pupilSize, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (snake.direction.y === 1) {
                    this.ctx.beginPath();
                    this.ctx.arc(x + eyeOffset + 2, y + size - eyeOffset + 1, pupilSize, 0, Math.PI * 2);
                    this.ctx.arc(x + size - eyeOffset - 2, y + size - eyeOffset + 1, pupilSize, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(x + eyeOffset + 2, y + eyeOffset - 1, pupilSize, 0, Math.PI * 2);
                    this.ctx.arc(x + size - eyeOffset - 2, y + eyeOffset - 1, pupilSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            } else {
                const alpha = 1 - (i / snake.body.length) * 0.5;
                this.ctx.fillStyle = snake.bodyColor;
                this.ctx.globalAlpha = alpha;
                this.ctx.beginPath();
                this.ctx.roundRect(x + 1, y + 1, size, size, 4);
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
            }
        }
    }
}

const game = new SnakeGame();
