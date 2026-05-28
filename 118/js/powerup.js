window.PowerUp = (function () {
    const POWERUP_TYPES = {
        boost: {
            width: 30,
            height: 30,
            speed: 3,
            color: '#ffe600',
            glowColor: 'rgba(255, 230, 0, 0.6)',
            icon: '\u26A1',
            weight: 1
        },
        shield: {
            width: 30,
            height: 30,
            speed: 3,
            color: '#00e676',
            glowColor: 'rgba(0, 230, 118, 0.6)',
            icon: '\u26E8',
            weight: 1
        }
    };

    class PowerUp {
        constructor(x, y, type) {
            this.type = type;
            const config = POWERUP_TYPES[type];
            this.width = config.width;
            this.height = config.height;
            this.speed = config.speed;
            this.color = config.color;
            this.glowColor = config.glowColor;
            this.icon = config.icon;
            this.x = x;
            this.y = y;
            this.collected = false;
            this.pulsePhase = Math.random() * Math.PI * 2;
        }

        update(deltaTime = 1) {
            this.y += this.speed * deltaTime;
            this.pulsePhase += 0.08;
        }

        isOffScreen(canvasHeight) {
            return this.y > canvasHeight + 20;
        }

        getRect() {
            return {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height
            };
        }
    }

    class PowerUpManager {
        constructor(canvas, laneCount = 2) {
            this.canvas = canvas;
            this.laneCount = laneCount;
            this.powerups = [];
            this.spawnInterval = 9000;
            this.lastSpawnTime = -Math.random() * 6000;
            this.baseSpeed = 3;
        }

        setLaneCount(laneCount) {
            this.laneCount = laneCount;
        }

        setDifficultyLevel(level) {
            this.baseSpeed = 3 + level * 0.5;
        }

        _getRoadWidth() {
            return this.laneCount === 3 ? 420 : 320;
        }

        _selectRandomType() {
            const types = Object.entries(POWERUP_TYPES);
            const totalWeight = types.reduce((sum, [, cfg]) => sum + cfg.weight, 0);
            let rand = Math.random() * totalWeight;
            for (const [type, cfg] of types) {
                rand -= cfg.weight;
                if (rand <= 0) return type;
            }
            return 'boost';
        }

        spawn(currentTime) {
            if (currentTime - this.lastSpawnTime < this.spawnInterval) return null;
            this.lastSpawnTime = currentTime;
            const type = this._selectRandomType();
            const config = POWERUP_TYPES[type];
            const roadWidth = this._getRoadWidth();
            const cw = this.canvas.clientWidth;
            const roadLeft = (cw - roadWidth) / 2;
            const maxX = roadLeft + roadWidth - config.width - 10;
            const minX = roadLeft + 10;
            const x = Math.random() * (maxX - minX) + minX;
            const y = -config.height - 10;
            const powerup = new PowerUp(x, y, type);
            powerup.speed = this.baseSpeed;
            this.powerups.push(powerup);
            return powerup;
        }

        update(deltaTime = 1) {
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const p = this.powerups[i];
                p.update(deltaTime);
                if (p.collected || p.isOffScreen(this.canvas.clientHeight)) {
                    this.powerups.splice(i, 1);
                }
            }
        }

        checkCollection(playerRect) {
            const collected = [];
            for (const p of this.powerups) {
                if (p.collected) continue;
                const r = p.getRect();
                if (this._rectsOverlap(playerRect, r)) {
                    p.collected = true;
                    collected.push(p);
                }
            }
            return collected;
        }

        _rectsOverlap(a, b) {
            return (
                a.x < b.x + b.width &&
                a.x + a.width > b.x &&
                a.y < b.y + b.height &&
                a.y + a.height > b.y
            );
        }

        reset() {
            this.powerups = [];
            this.lastSpawnTime = -Math.random() * 6000;
        }
    }

    return { PowerUp, PowerUpManager };
})();
