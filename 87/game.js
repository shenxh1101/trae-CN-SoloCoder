class SpaceShooter {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.gameState = {
            score: 0,
            lives: 3,
            highScore: parseInt(localStorage.getItem('spaceShooterHighScore')) || 0,
            isPlaying: false,
            isPaused: false,
            soundEnabled: localStorage.getItem('spaceShooterSound') !== 'false',
            difficulty: 1,
            doubleScore: false,
            doubleScoreTimer: 0,
            speedBoost: false,
            speedBoostTimer: 0
        };

        this.turret = {
            x: 0,
            y: 0,
            width: 60,
            height: 40,
            angle: -Math.PI / 2,
            targetAngle: -Math.PI / 2
        };

        this.bullets = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];
        this.stars = [];

        this.maxBullets = 5;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000;

        this.audioContext = null;
        this.initAudio();

        this.resizeCanvas();
        this.initStars();
        this.bindEvents();
        this.updateHUD();
        this.updateSoundIcon();
        document.getElementById('menu-high-score').textContent = this.gameState.highScore;
        this.gameLoop();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    playSound(type) {
        if (!this.gameState.soundEnabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        switch (type) {
            case 'shoot':
                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.1);
                break;
            case 'hit':
                oscillator.frequency.setValueAtTime(400, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
                gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.15);
                break;
            case 'powerup':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(400, ctx.currentTime);
                oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.3);
                break;
            case 'loseLife':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(200, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
                gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.5);
                break;
            case 'gameOver':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(300, ctx.currentTime);
                oscillator.frequency.setValueAtTime(200, ctx.currentTime + 0.2);
                oscillator.frequency.setValueAtTime(100, ctx.currentTime + 0.4);
                oscillator.frequency.setValueAtTime(50, ctx.currentTime + 0.6);
                gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.8);
                break;
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.turret.x = this.canvas.width / 2;
        this.turret.y = this.canvas.height - 60;
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 150; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 2 + 0.5
            });
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.initStars();
        });

        this.isTouchDevice = false;

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isTouchDevice) {
                this.updateTurretAngle(e.clientX, e.clientY);
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.isTouchDevice && e.button === 0) {
                this.shoot();
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.isTouchDevice = true;
            const touch = e.touches[0];
            this.updateTurretAngle(touch.clientX, touch.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isTouchDevice = true;
            const touch = e.touches[0];
            this.updateTurretAngle(touch.clientX, touch.clientY);
            this.shoot();
        }, { passive: false });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.gameState.isPlaying) {
                this.togglePause();
            }
        });

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('quit-btn').addEventListener('click', () => this.quitToMenu());
        document.getElementById('retry-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('menu-btn').addEventListener('click', () => this.quitToMenu());
        document.getElementById('sound-toggle').addEventListener('click', () => this.toggleSound());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());

        document.addEventListener('click', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }, { once: true });
    }

    updateTurretAngle(x, y) {
        if (!this.gameState.isPlaying || this.gameState.isPaused) return;
        this.turret.targetAngle = Math.atan2(y - this.turret.y, x - this.turret.x);
    }

    shoot() {
        if (!this.gameState.isPlaying || this.gameState.isPaused) return;
        if (this.bullets.length >= this.maxBullets) return;

        this.playSound('shoot');

        const speed = this.gameState.speedBoost ? 15 : 10;
        const bullet = {
            x: this.turret.x + Math.cos(this.turret.angle) * 30,
            y: this.turret.y + Math.sin(this.turret.angle) * 30,
            vx: Math.cos(this.turret.angle) * speed,
            vy: Math.sin(this.turret.angle) * speed,
            radius: 5,
            speedBoost: this.gameState.speedBoost
        };

        this.bullets.push(bullet);
    }

    startGame() {
        this.gameState.score = 0;
        this.gameState.lives = 3;
        this.gameState.isPlaying = true;
        this.gameState.isPaused = false;
        this.gameState.difficulty = 1;
        this.gameState.doubleScore = false;
        this.gameState.speedBoost = false;
        this.gameState.doubleScoreTimer = 0;
        this.gameState.speedBoostTimer = 0;

        this.turret.angle = -Math.PI / 2;
        this.turret.targetAngle = -Math.PI / 2;

        this.bullets = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];

        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000;

        this.hideOverlay('start-screen');
        this.hideOverlay('gameover-screen');
        this.updateHUD();
        this.updatePowerupIndicator();

        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    restartGame() {
        this.hideOverlay('pause-screen');
        this.hideOverlay('gameover-screen');
        this.startGame();
    }

    quitToMenu() {
        this.gameState.isPlaying = false;
        this.gameState.isPaused = false;
        this.bullets = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];

        this.hideOverlay('pause-screen');
        this.hideOverlay('gameover-screen');
        this.showOverlay('start-screen');
        document.getElementById('menu-high-score').textContent = this.gameState.highScore;
    }

    togglePause() {
        if (!this.gameState.isPlaying) return;

        this.gameState.isPaused = !this.gameState.isPaused;

        if (this.gameState.isPaused) {
            this.showOverlay('pause-screen');
        } else {
            this.hideOverlay('pause-screen');
        }
    }

    toggleSound() {
        this.gameState.soundEnabled = !this.gameState.soundEnabled;
        localStorage.setItem('spaceShooterSound', this.gameState.soundEnabled);
        this.updateSoundIcon();

        if (this.gameState.soundEnabled && this.audioContext) {
            this.audioContext.resume();
        }
    }

    updateSoundIcon() {
        document.getElementById('sound-icon').textContent = this.gameState.soundEnabled ? '🔊' : '🔇';
    }

    showOverlay(id) {
        document.getElementById(id).classList.add('active');
    }

    hideOverlay(id) {
        document.getElementById(id).classList.remove('active');
    }

    updateHUD() {
        document.getElementById('score').textContent = this.gameState.score;
        document.getElementById('lives').textContent = '❤'.repeat(Math.max(0, this.gameState.lives));
        document.getElementById('high-score').textContent = this.gameState.highScore;
    }

    updatePowerupIndicator() {
        const container = document.getElementById('powerup-indicator');
        container.innerHTML = '';

        if (this.gameState.speedBoost) {
            const div = document.createElement('div');
            div.className = 'powerup-active powerup-speed';
            div.textContent = `⚡ 加速 ${Math.ceil(this.gameState.speedBoostTimer / 1000)}s`;
            container.appendChild(div);
        }

        if (this.gameState.doubleScore) {
            const div = document.createElement('div');
            div.className = 'powerup-active powerup-double';
            div.textContent = `✨ 双倍 ${Math.ceil(this.gameState.doubleScoreTimer / 1000)}s`;
            container.appendChild(div);
        }
    }

    spawnEnemy() {
        const types = ['normal', 'fast', 'armored'];
        const weights = [0.6, 0.25, 0.15];
        const rand = Math.random();
        let type = 'normal';
        let cumulative = 0;

        for (let i = 0; i < types.length; i++) {
            cumulative += weights[i];
            if (rand <= cumulative) {
                type = types[i];
                break;
            }
        }

        const baseSpeed = 1 + (this.gameState.difficulty - 1) * 0.3;

        const enemy = {
            x: Math.random() * (this.canvas.width - 60) + 30,
            y: -40,
            type: type,
            health: type === 'armored' ? 3 : 1,
            maxHealth: type === 'armored' ? 3 : 1,
            speed: (type === 'fast' ? baseSpeed * 2 : baseSpeed),
            points: type === 'normal' ? 1 : type === 'fast' ? 2 : 3,
            direction: Math.random() > 0.5 ? 1 : -1,
            size: type === 'armored' ? 35 : 25
        };

        this.enemies.push(enemy);
    }

    spawnPowerup(x, y) {
        if (Math.random() > 0.3) return;

        const types = ['speed', 'double', 'life'];
        const type = types[Math.floor(Math.random() * types.length)];

        this.powerups.push({
            x: x,
            y: y,
            type: type,
            vy: 2
        });
    }

    createExplosion(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = Math.random() * 4 + 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                maxLife: 1,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }

    update(deltaTime) {
        if (!this.gameState.isPlaying || this.gameState.isPaused) return;

        this.turret.angle += (this.turret.targetAngle - this.turret.angle) * 0.1;

        if (this.gameState.speedBoost) {
            this.gameState.speedBoostTimer -= deltaTime;
            if (this.gameState.speedBoostTimer <= 0) {
                this.gameState.speedBoost = false;
                this.updatePowerupIndicator();
            }
        }

        if (this.gameState.doubleScore) {
            this.gameState.doubleScoreTimer -= deltaTime;
            if (this.gameState.doubleScoreTimer <= 0) {
                this.gameState.doubleScore = false;
                this.updatePowerupIndicator();
            }
        }

        if (this.gameState.speedBoost || this.gameState.doubleScore) {
            this.updatePowerupIndicator();
        }

        const dt = deltaTime / 16.67;

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;

            if (bullet.x < 0 || bullet.x > this.canvas.width ||
                bullet.y < 0 || bullet.y > this.canvas.height) {
                this.bullets.splice(i, 1);
            }
        }

        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.y += enemy.speed * dt;
            enemy.x += enemy.direction * enemy.speed * 0.5 * dt;

            if (enemy.x <= enemy.size / 2) {
                enemy.x = enemy.size / 2;
                enemy.direction = 1;
            } else if (enemy.x >= this.canvas.width - enemy.size / 2) {
                enemy.x = this.canvas.width - enemy.size / 2;
                enemy.direction = -1;
            }

            const dxTurret = enemy.x - this.turret.x;
            const dyTurret = enemy.y - this.turret.y;
            const distTurret = Math.sqrt(dxTurret * dxTurret + dyTurret * dyTurret);

            if (distTurret < enemy.size / 2 + 30) {
                this.playSound('loseLife');
                this.gameState.lives--;
                this.createExplosion(enemy.x, enemy.y, '#ff3366', 20);
                this.enemies.splice(i, 1);
                this.updateHUD();

                if (this.gameState.lives <= 0) {
                    this.gameOver();
                    return;
                }
                continue;
            }

            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const bullet = this.bullets[j];
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < enemy.size / 2 + bullet.radius) {
                    enemy.health--;
                    this.bullets.splice(j, 1);

                    if (enemy.health <= 0) {
                        const points = this.gameState.doubleScore ? enemy.points * 2 : enemy.points;
                        this.gameState.score += points;

                        const newDifficulty = Math.floor(this.gameState.score / 100) + 1;
                        if (newDifficulty > this.gameState.difficulty) {
                            this.gameState.difficulty = newDifficulty;
                            this.enemySpawnInterval = Math.max(500, 2000 - (this.gameState.difficulty - 1) * 200);
                        }

                        this.playSound('hit');
                        this.createExplosion(enemy.x, enemy.y, this.getEnemyColor(enemy.type));
                        this.spawnPowerup(enemy.x, enemy.y);
                        this.enemies.splice(i, 1);
                    } else {
                        this.createExplosion(bullet.x, bullet.y, '#ffcc00', 5);
                    }

                    this.updateHUD();
                    break;
                }
            }
        }

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            powerup.y += powerup.vy * dt;

            const dx = powerup.x - this.turret.x;
            const dy = powerup.y - this.turret.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 60) {
                this.playSound('powerup');

                switch (powerup.type) {
                    case 'speed':
                        this.gameState.speedBoost = true;
                        this.gameState.speedBoostTimer = 8000;
                        break;
                    case 'double':
                        this.gameState.doubleScore = true;
                        this.gameState.doubleScoreTimer = 10000;
                        break;
                    case 'life':
                        this.gameState.lives = Math.min(this.gameState.lives + 1, 5);
                        break;
                }

                this.powerups.splice(i, 1);
                this.updateHUD();
                this.updatePowerupIndicator();
                continue;
            }

            if (powerup.y > this.canvas.height) {
                this.powerups.splice(i, 1);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.life -= deltaTime / 500;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        for (const star of this.stars) {
            star.y += star.speed * dt;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
        }
    }

    getEnemyColor(type) {
        switch (type) {
            case 'normal': return '#00d4ff';
            case 'fast': return '#ff3366';
            case 'armored': return '#ffcc00';
            default: return '#00d4ff';
        }
    }

    gameOver() {
        this.gameState.isPlaying = false;
        this.playSound('gameOver');

        const isNewRecord = this.gameState.score > this.gameState.highScore;
        if (isNewRecord) {
            this.gameState.highScore = this.gameState.score;
            localStorage.setItem('spaceShooterHighScore', this.gameState.highScore);
        }

        document.getElementById('final-score').textContent = this.gameState.score;
        document.getElementById('new-record').classList.toggle('hidden', !isNewRecord);
        this.updateHUD();
        this.showOverlay('gameover-screen');
    }

    render() {
        const ctx = this.ctx;

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (const star of this.stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.size * 0.3})`;
            ctx.fill();
        }

        if (!this.gameState.isPlaying && !this.gameState.isPaused) {
            this.drawMenuTurret();
            return;
        }

        for (const particle of this.particles) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        for (const powerup of this.powerups) {
            this.drawPowerup(powerup);
        }

        for (const enemy of this.enemies) {
            this.drawEnemy(enemy);
        }

        for (const bullet of this.bullets) {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fillStyle = bullet.speedBoost ? '#00ff88' : '#00d4ff';
            ctx.shadowColor = bullet.speedBoost ? '#00ff88' : '#00d4ff';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        this.drawTurret();
    }

    drawMenuTurret() {
        const ctx = this.ctx;
        const time = Date.now() / 1000;
        const bobY = Math.sin(time * 2) * 5;

        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height - 60 + bobY);
        ctx.rotate(-Math.PI / 2);

        ctx.fillStyle = '#2a2a4a';
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00d4ff';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(-8, -5, 40, 10);

        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(25, -3, 10, 6);

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    drawTurret() {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(this.turret.x, this.turret.y);
        ctx.rotate(this.turret.angle);

        ctx.fillStyle = '#2a2a4a';
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00d4ff';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(-8, -5, 40, 10);

        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(25, -3, 10, 6);

        if (this.gameState.speedBoost) {
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00ff88';
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    drawEnemy(enemy) {
        const ctx = this.ctx;
        const color = this.getEnemyColor(enemy.type);

        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;

        if (enemy.type === 'normal') {
            ctx.beginPath();
            ctx.moveTo(0, -enemy.size / 2);
            ctx.lineTo(enemy.size / 2, enemy.size / 2);
            ctx.lineTo(-enemy.size / 2, enemy.size / 2);
            ctx.closePath();
            ctx.fill();
        } else if (enemy.type === 'fast') {
            ctx.beginPath();
            ctx.moveTo(0, enemy.size / 2);
            ctx.lineTo(enemy.size / 2, -enemy.size / 2);
            ctx.lineTo(-enemy.size / 2, -enemy.size / 2);
            ctx.closePath();
            ctx.fill();
        } else if (enemy.type === 'armored') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const x = Math.cos(angle) * enemy.size / 2;
                const y = Math.sin(angle) * enemy.size / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();

            if (enemy.health < enemy.maxHealth) {
                const barWidth = enemy.size * 0.8;
                const barHeight = 4;
                const healthPercent = enemy.health / enemy.maxHealth;

                ctx.fillStyle = '#333';
                ctx.fillRect(-barWidth / 2, -enemy.size / 2 - 10, barWidth, barHeight);

                ctx.fillStyle = '#00ff88';
                ctx.fillRect(-barWidth / 2, -enemy.size / 2 - 10, barWidth * healthPercent, barHeight);
            }
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    drawPowerup(powerup) {
        const ctx = this.ctx;
        const time = Date.now() / 500;
        const pulse = Math.sin(time) * 0.2 + 1;

        ctx.save();
        ctx.translate(powerup.x, powerup.y);
        ctx.scale(pulse, pulse);

        let color, symbol;
        switch (powerup.type) {
            case 'speed':
                color = '#00ff88';
                symbol = '⚡';
                break;
            case 'double':
                color = '#ffcc00';
                symbol = '✨';
                break;
            case 'life':
                color = '#ff3366';
                symbol = '❤';
                break;
        }

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(symbol, 0, 0);

        ctx.restore();
    }

    gameLoop() {
        let lastTime = 0;
        let firstFrame = true;

        const loop = (timestamp) => {
            if (firstFrame) {
                lastTime = timestamp;
                firstFrame = false;
                requestAnimationFrame(loop);
                return;
            }

            const deltaTime = Math.min(timestamp - lastTime, 50);
            lastTime = timestamp;

            this.update(deltaTime);
            this.render();

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }
}

window.addEventListener('load', () => {
    new SpaceShooter();
});
