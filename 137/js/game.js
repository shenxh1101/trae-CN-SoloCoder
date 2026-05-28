const GameState = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

const BallType = {
    NORMAL: { name: 'normal', color: '#ff006e', speedMultiplier: 1, score: 10 },
    LIGHTNING: { name: 'lightning', color: '#9d4edd', speedMultiplier: 1.5, score: 10 },
    BONUS: { name: 'bonus', color: '#ffd700', speedMultiplier: 1, score: 20 }
};

const PowerUpType = {
    PADDLE_BIG: { name: 'paddleBig', color: '#00ff88', icon: '📏', duration: 10000 },
    PADDLE_SMALL: { name: 'paddleSmall', color: '#ff4444', icon: '📐', duration: 8000 },
    MULTI_BALL: { name: 'multiBall', color: '#00aaff', icon: '🎱', duration: 0 }
};

const PaddleSkin = {
    WOOD: { name: 'wood', colors: ['#8B4513', '#A0522D', '#654321'] },
    METAL: { name: 'metal', colors: ['#708090', '#A9A9A9', '#4a5568'] },
    COLORFUL: { name: 'colorful', colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'] }
};

class AudioManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playCatch() {
        this.playTone(880, 0.1, 'sine', 0.4);
        setTimeout(() => this.playTone(1100, 0.1, 'sine', 0.3), 50);
    }

    playMiss() {
        this.playTone(200, 0.3, 'sawtooth', 0.3);
    }

    playGameOver() {
        this.playTone(400, 0.2, 'square', 0.3);
        setTimeout(() => this.playTone(300, 0.2, 'square', 0.3), 150);
        setTimeout(() => this.playTone(200, 0.4, 'square', 0.3), 300);
    }

    playPowerUp() {
        this.playTone(523, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 80);
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.3), 160);
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

class Particle {
    constructor(x, y, color, size = 3, life = 1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 100;
    }

    emit(x, y, color, count = 5, size = 3) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length < this.maxParticles) {
                this.particles.push(new Particle(x, y, color, size));
            }
        }
    }

    update() {
        this.particles = this.particles.filter(p => {
            p.update();
            return p.life > 0;
        });
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}

class Ball {
    constructor(x, y, type = BallType.NORMAL) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.type = type;
        this.baseSpeed = 4;
        this.dx = (Math.random() > 0.5 ? 1 : -1) * this.baseSpeed * type.speedMultiplier;
        this.dy = -this.baseSpeed * type.speedMultiplier;
        this.trail = [];
        this.maxTrailLength = 10;
    }

    update() {
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }

        this.x += this.dx;
        this.y += this.dy;
    }

    draw(ctx) {
        this.trail.forEach((point, index) => {
            const alpha = 1 - index / this.maxTrailLength;
            const size = this.radius * (1 - index / this.maxTrailLength * 0.5);
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = this.type.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 1.5
        );
        gradient.addColorStop(0, this.type.color);
        gradient.addColorStop(0.5, this.type.color + '80');
        gradient.addColorStop(1, 'transparent');

        ctx.save();
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.type.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x - 3, this.y - 3, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    bounceX() {
        this.dx = -this.dx;
    }

    bounceY() {
        this.dy = -this.dy;
    }

    increaseSpeed(amount = 0.2) {
        const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        const newSpeed = currentSpeed + amount;
        const ratio = newSpeed / currentSpeed;
        this.dx *= ratio;
        this.dy *= ratio;
    }
}

class Paddle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.baseWidth = width;
        this.width = width;
        this.height = height;
        this.skin = PaddleSkin.COLORFUL;
        this.targetX = x;
        this.shakeOffset = 0;
        this.shakeIntensity = 0;
    }

    update() {
        this.x += (this.targetX - this.x) * 0.2;

        if (this.shakeIntensity > 0) {
            this.shakeOffset = (Math.random() - 0.5) * this.shakeIntensity * 10;
            this.shakeIntensity -= 0.05;
        } else {
            this.shakeOffset = 0;
        }
    }

    draw(ctx) {
        const drawX = this.x + this.shakeOffset;
        const colors = this.skin.colors;

        ctx.save();
        
        ctx.shadowColor = colors[0];
        ctx.shadowBlur = 15;

        const gradient = ctx.createLinearGradient(
            drawX - this.width / 2, this.y,
            drawX - this.width / 2, this.y + this.height
        );
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.5, colors[1]);
        gradient.addColorStop(1, colors[2]);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
            drawX - this.width / 2,
            this.y,
            this.width,
            this.height,
            8
        );
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.roundRect(
            drawX - this.width / 2 + 3,
            this.y + 3,
            this.width - 6,
            this.height / 3,
            4
        );
        ctx.fill();

        ctx.restore();
    }

    moveTo(x) {
        this.targetX = x;
    }

    shake() {
        this.shakeIntensity = 1;
    }

    resize(multiplier) {
        this.width = this.baseWidth * multiplier;
    }

    resetSize() {
        this.width = this.baseWidth;
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 15;
        this.speed = 2;
        this.rotation = 0;
        this.active = true;
    }

    update() {
        this.y += this.speed;
        this.rotation += 0.05;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.shadowColor = this.type.color;
        ctx.shadowBlur = 20;

        ctx.fillStyle = this.type.color + '40';
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.rotate(-this.rotation);
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, 0, 0);

        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1;
        this.vy = -2;
    }

    update() {
        this.y += this.vy;
        this.life -= 0.02;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.font = 'bold 16px "Press Start 2P", cursive';
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioManager = new AudioManager();
        this.particleSystem = new ParticleSystem();
        
        this.state = GameState.IDLE;
        this.score = 0;
        this.lives = 3;
        this.highScore = parseInt(localStorage.getItem('ballGameHighScore')) || 0;
        this.lastMilestone = 0;
        this.balls = [];
        this.powerUps = [];
        this.floatingTexts = [];
        this.keys = {};
        this.paddleResizeTimer = null;
        this.frameCount = 0;
        
        this.initCanvas();
        this.initPaddle();
        this.initEventListeners();
        this.updateUI();
        this.gameLoop();
    }

    initCanvas() {
        const maxWidth = Math.min(600, window.innerWidth - 40);
        const maxHeight = Math.min(450, window.innerHeight - 250);
        
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;
    }

    initPaddle() {
        const paddleWidth = Math.min(100, this.canvas.width * 0.2);
        this.paddle = new Paddle(
            this.canvas.width / 2,
            this.canvas.height - 30,
            paddleWidth,
            15
        );
    }

    initEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === ' ' && this.state === GameState.IDLE) {
                this.start();
            }
            if (e.key === 'Escape') {
                this.togglePause();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            this.paddle.moveTo(this.clamp(x, this.paddle.width / 2, this.canvas.width - this.paddle.width / 2));
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouch(e);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleTouch(e);
        });

        document.getElementById('startBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('soundBtn').addEventListener('click', () => this.toggleSound());
        document.getElementById('skinSelect').addEventListener('change', (e) => this.changeSkin(e.target.value));
        document.getElementById('startGameBtn').addEventListener('click', () => this.start());
        document.getElementById('restartBtn').addEventListener('click', () => this.reset());

        window.addEventListener('resize', () => {
            this.initCanvas();
            this.initPaddle();
        });
    }

    handleTouch(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        this.paddle.moveTo(this.clamp(x, this.paddle.width / 2, this.canvas.width - this.paddle.width / 2));
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    start() {
        this.audioManager.init();
        document.getElementById('startOverlay').classList.add('hidden');
        this.state = GameState.PLAYING;
        this.spawnBall();
        this.updateStartButton();
    }

    togglePause() {
        if (this.state === GameState.IDLE) {
            this.start();
            return;
        }
        
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
        } else if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
        }
        this.updateStartButton();
    }

    updateStartButton() {
        const icon = document.querySelector('#startBtn .icon');
        if (this.state === GameState.PLAYING) {
            icon.textContent = '⏸️';
        } else {
            icon.textContent = '▶️';
        }
    }

    reset() {
        this.state = GameState.IDLE;
        this.score = 0;
        this.lives = 3;
        this.lastMilestone = 0;
        this.frameCount = 0;
        this.balls = [];
        this.powerUps = [];
        this.floatingTexts = [];
        this.particleSystem.particles = [];
        
        if (this.paddleResizeTimer) {
            clearTimeout(this.paddleResizeTimer);
            this.paddle.resetSize();
        }
        
        this.paddle.x = this.canvas.width / 2;
        this.paddle.targetX = this.canvas.width / 2;
        
        document.getElementById('gameOverModal').classList.remove('active');
        document.getElementById('startOverlay').classList.remove('hidden');
        
        this.updateUI();
        this.updateStartButton();
    }

    toggleSound() {
        const enabled = this.audioManager.toggle();
        document.getElementById('soundIcon').textContent = enabled ? '🔊' : '🔇';
    }

    changeSkin(skinName) {
        this.paddle.skin = PaddleSkin[skinName.toUpperCase()] || PaddleSkin.COLORFUL;
    }

    spawnBall(type = null) {
        const ballType = type || this.getRandomBallType();
        const ball = new Ball(
            this.canvas.width / 2 + (Math.random() - 0.5) * 100,
            this.canvas.height / 3,
            ballType
        );
        this.balls.push(ball);
    }

    getRandomBallType() {
        const rand = Math.random();
        if (rand < 0.1) return BallType.LIGHTNING;
        if (rand < 0.2) return BallType.BONUS;
        return BallType.NORMAL;
    }

    spawnPowerUp() {
        if (Math.random() > 0.02) return;
        
        const types = Object.values(PowerUpType);
        const type = types[Math.floor(Math.random() * types.length)];
        const powerUp = new PowerUp(
            Math.random() * (this.canvas.width - 60) + 30,
            -20,
            type
        );
        this.powerUps.push(powerUp);
    }

    activatePowerUp(powerUp) {
        this.audioManager.playPowerUp();
        
        switch (powerUp.type.name) {
            case 'paddleBig':
                if (this.paddleResizeTimer) clearTimeout(this.paddleResizeTimer);
                this.paddle.resize(1.5);
                this.paddleResizeTimer = setTimeout(() => {
                    this.paddle.resetSize();
                }, powerUp.type.duration);
                break;
                
            case 'paddleSmall':
                if (this.paddleResizeTimer) clearTimeout(this.paddleResizeTimer);
                this.paddle.resize(0.6);
                this.paddleResizeTimer = setTimeout(() => {
                    this.paddle.resetSize();
                }, powerUp.type.duration);
                break;
                
            case 'multiBall':
                const maxBalls = 3;
                const ballsToAdd = maxBalls - this.balls.length;
                if (ballsToAdd > 0 && this.balls.length > 0) {
                    const sourceBall = this.balls[0];
                    for (let i = 0; i < ballsToAdd; i++) {
                        const newBall = new Ball(sourceBall.x, sourceBall.y, sourceBall.type);
                        const angle = (Math.random() - 0.5) * Math.PI * 0.8;
                        const speed = Math.sqrt(sourceBall.dx * sourceBall.dx + sourceBall.dy * sourceBall.dy);
                        newBall.dx = Math.sin(angle) * speed * (i % 2 === 0 ? 1 : -1);
                        newBall.dy = -Math.abs(Math.cos(angle) * speed);
                        this.balls.push(newBall);
                    }
                }
                break;
        }
        
        this.addFloatingText(powerUp.x, powerUp.y, powerUp.type.icon, powerUp.type.color);
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push(new FloatingText(x, y, text, color));
    }

    update() {
        if (this.state !== GameState.PLAYING) return;

        this.frameCount++;

        if (this.keys['ArrowLeft'] || this.keys['a']) {
            const newX = this.paddle.targetX - 8;
            this.paddle.moveTo(this.clamp(newX, this.paddle.width / 2, this.canvas.width - this.paddle.width / 2));
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            const newX = this.paddle.targetX + 8;
            this.paddle.moveTo(this.clamp(newX, this.paddle.width / 2, this.canvas.width - this.paddle.width / 2));
        }

        this.paddle.update();

        const emitParticles = this.frameCount % 2 === 0;
        this.balls.forEach(ball => {
            ball.update();
            if (emitParticles) {
                this.particleSystem.emit(ball.x, ball.y, ball.type.color, 1, 2);
            }
        });

        this.balls = this.balls.filter(ball => {
            if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= this.canvas.width) {
                ball.bounceX();
                ball.x = this.clamp(ball.x, ball.radius, this.canvas.width - ball.radius);
            }

            if (ball.y - ball.radius <= 0) {
                ball.bounceY();
                ball.y = ball.radius;
            }

            if (this.checkPaddleCollision(ball)) {
                ball.bounceY();
                ball.y = this.paddle.y - ball.radius;
                ball.increaseSpeed(0.15);
                
                this.score += ball.type.score;
                this.audioManager.playCatch();
                this.paddle.shake();
                this.particleSystem.emit(ball.x, ball.y, ball.type.color, 10, 4);
                this.addFloatingText(ball.x, ball.y, '+' + ball.type.score, ball.type.color);
                
                const currentMilestone = Math.floor(this.score / 100);
                if (currentMilestone > this.lastMilestone) {
                    this.lastMilestone = currentMilestone;
                    this.triggerMilestone();
                }
                
                this.updateUI();
            }

            if (ball.y > this.canvas.height) {
                this.loseLife();
                return false;
            }

            return true;
        });

        if (this.balls.length === 0 && this.state === GameState.PLAYING) {
            this.spawnBall();
        }

        this.spawnPowerUp();

        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.update();

            if (this.checkPowerUpCollision(powerUp)) {
                this.activatePowerUp(powerUp);
                return false;
            }

            return powerUp.y < this.canvas.height + 30;
        });

        this.floatingTexts = this.floatingTexts.filter(text => {
            text.update();
            return text.life > 0;
        });

        this.particleSystem.update();
    }

    checkPaddleCollision(ball) {
        return ball.y + ball.radius >= this.paddle.y &&
               ball.y - ball.radius <= this.paddle.y + this.paddle.height &&
               ball.x >= this.paddle.x - this.paddle.width / 2 - ball.radius &&
               ball.x <= this.paddle.x + this.paddle.width / 2 + ball.radius &&
               ball.dy > 0;
    }

    checkPowerUpCollision(powerUp) {
        const dx = powerUp.x - this.paddle.x;
        const dy = powerUp.y - (this.paddle.y + this.paddle.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < powerUp.radius + this.paddle.width / 2;
    }

    loseLife() {
        this.lives--;
        this.audioManager.playMiss();
        this.updateUI();

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.state = GameState.GAME_OVER;
        this.audioManager.playGameOver();

        const isNewHighScore = this.score > this.highScore;
        if (isNewHighScore) {
            this.highScore = this.score;
            localStorage.setItem('ballGameHighScore', this.highScore);
        }

        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('newHighScore').classList.toggle('active', isNewHighScore);
        document.getElementById('gameOverModal').classList.add('active');
        
        this.updateUI();
    }

    triggerMilestone() {
        const flashEffect = document.getElementById('flashEffect');
        const milestoneText = document.getElementById('milestoneText');
        
        flashEffect.classList.add('active');
        milestoneText.textContent = '+' + (this.lastMilestone * 100) + '!';
        milestoneText.classList.add('active');
        
        setTimeout(() => {
            flashEffect.classList.remove('active');
            milestoneText.classList.remove('active');
        }, 1000);

        this.balls.forEach(ball => ball.increaseSpeed(0.3));
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
        document.getElementById('lives').textContent = '❤️'.repeat(Math.max(0, this.lives));
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid();

        this.particleSystem.draw(this.ctx);

        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));

        this.balls.forEach(ball => ball.draw(this.ctx));

        this.paddle.draw(this.ctx);

        this.floatingTexts.forEach(text => text.draw(this.ctx));

        if (this.state === GameState.PAUSED) {
            this.drawPauseOverlay();
        }
    }

    drawGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 255, 245, 0.05)';
        this.ctx.lineWidth = 1;

        const gridSize = 30;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawPauseOverlay() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(10, 10, 26, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = '24px "Press Start 2P", cursive';
        this.ctx.fillStyle = '#00fff5';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = '#00fff5';
        this.ctx.shadowBlur = 20;
        this.ctx.fillText('暂停', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.restore();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
