window.Obstacle = (function () {
    const OBSTACLE_TYPES = {
        car: {
            width: 40,
            height: 60,
            speedMultiplier: 1.0,
            color: '#ff6b35',
            darkColor: '#c44d20',
            weight: 5
        },
        truck: {
            width: 60,
            height: 90,
            speedMultiplier: 0.7,
            color: '#ffd600',
            darkColor: '#ff8f00',
            weight: 2
        },
        motorcycle: {
            width: 24,
            height: 44,
            speedMultiplier: 1.6,
            color: '#e040fb',
            darkColor: '#9c27b0',
            weight: 3
        }
    };

    class Obstacle {
        constructor(x, y, type, baseSpeed) {
            this.type = type;
            const config = OBSTACLE_TYPES[type];
            this.width = config.width;
            this.height = config.height;
            this.baseSpeed = baseSpeed;
            this.speedMultiplier = config.speedMultiplier;
            this.color = config.color;
            this.darkColor = config.darkColor;
            this.x = x;
            this.y = y;
            this.passed = false;
        }

        get speed() {
            return this.baseSpeed * this.speedMultiplier;
        }

        update(deltaTime = 1) {
            this.y += this.speed * deltaTime;
        }

        isOffScreen(canvasHeight) {
            return this.y > canvasHeight + 20;
        }

        getRect() {
            return {
                x: this.x + 2,
                y: this.y + 2,
                width: this.width - 4,
                height: this.height - 4
            };
        }
    }

    class ObstacleManager {
        constructor(canvas, laneCount = 2) {
            this.canvas = canvas;
            this.laneCount = laneCount;
            this.obstacles = [];
            this.baseSpeed = 3;
            this.baseSpawnInterval = laneCount === 3 ? 1200 : 1500;
            this.spawnInterval = this.baseSpawnInterval;
            this.lastSpawnTime = 0;
            this.difficultyLevel = 0;
        }

        setLaneCount(laneCount) {
            this.laneCount = laneCount;
            this.baseSpawnInterval = laneCount === 3 ? 1200 : 1500;
            this.setDifficultyLevel(this.difficultyLevel);
        }

        setDifficultyLevel(level) {
            this.difficultyLevel = level;
            this.baseSpeed = 3 + level * 0.5;
            this.spawnInterval = Math.max(
                400,
                this.baseSpawnInterval - level * 100
            );
        }

        _getRoadWidth() {
            return this.laneCount === 3 ? 420 : 320;
        }

        _getLaneCenters() {
            const roadWidth = this._getRoadWidth();
            const cw = this.canvas.clientWidth;
            const roadLeft = (cw - roadWidth) / 2;
            const laneWidth = roadWidth / this.laneCount;
            const centers = [];
            for (let i = 0; i < this.laneCount; i++) {
                centers.push(roadLeft + laneWidth * i + laneWidth / 2);
            }
            return centers;
        }

        _selectRandomType() {
            const types = Object.entries(OBSTACLE_TYPES);
            const totalWeight = types.reduce((sum, [, cfg]) => sum + cfg.weight, 0);
            let rand = Math.random() * totalWeight;
            for (const [type, cfg] of types) {
                rand -= cfg.weight;
                if (rand <= 0) return type;
            }
            return 'car';
        }

        spawn(currentTime) {
            if (currentTime - this.lastSpawnTime < this.spawnInterval) return null;
            this.lastSpawnTime = currentTime;
            const type = this._selectRandomType();
            const config = OBSTACLE_TYPES[type];
            const roadWidth = this._getRoadWidth();
            const cw = this.canvas.clientWidth;
            const roadLeft = (cw - roadWidth) / 2;
            const maxX = roadLeft + roadWidth - config.width - 10;
            const minX = roadLeft + 10;
            const x = Math.random() * (maxX - minX) + minX;
            const y = -config.height - 10;
            const obstacle = new Obstacle(x, y, type, this.baseSpeed);
            this.obstacles.push(obstacle);
            return obstacle;
        }

        update(deltaTime = 1) {
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obs = this.obstacles[i];
                obs.update(deltaTime);
                if (obs.isOffScreen(this.canvas.clientHeight)) {
                    this.obstacles.splice(i, 1);
                }
            }
        }

        checkDodged(playerBottomY) {
            let count = 0;
            for (const obs of this.obstacles) {
                if (!obs.passed && obs.y > playerBottomY) {
                    obs.passed = true;
                    count++;
                }
            }
            return count;
        }

        checkCollision(playerRect) {
            for (const obs of this.obstacles) {
                const r = obs.getRect();
                if (this._rectsOverlap(playerRect, r)) {
                    return obs;
                }
            }
            return null;
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
            this.obstacles = [];
            this.lastSpawnTime = 0;
        }
    }

    return { Obstacle, ObstacleManager };
})();
