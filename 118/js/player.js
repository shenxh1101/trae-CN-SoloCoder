window.Player = (function () {
    const SKIN_COLORS = {
        red: { body: '#ff1744', dark: '#d50000', light: '#ff5252' },
        blue: { body: '#2979ff', dark: '#0d47a1', light: '#64b5f6' },
        green: { body: '#00e676', dark: '#1b5e20', light: '#69f0ae' }
    };

    class Player {
        constructor(canvas, skin = 'red', laneCount = 2) {
            this.canvas = canvas;
            this.width = 40;
            this.height = 60;
            this.baseSpeed = 6;
            this.boostSpeed = 11;
            this.speed = this.baseSpeed;
            this.skin = skin;
            this.laneCount = laneCount;
            this.hasShield = false;
            this.hasBoost = false;
            this.boostEndTime = 0;
            this.isBlinking = false;
            this.blinkEndTime = 0;
            this.blinkVisible = true;
            this._resetPosition();
        }

        _resetPosition() {
            const roadWidth = this._getRoadWidth();
            const cw = this.canvas.clientWidth;
            const ch = this.canvas.clientHeight;
            const roadLeft = (cw - roadWidth) / 2;
            this.x = cw / 2 - this.width / 2;
            this.y = ch - this.height - 40;
            this.minX = roadLeft + 10;
            this.maxX = roadLeft + roadWidth - this.width - 10;
        }

        _getRoadWidth() {
            return this.laneCount === 3 ? 420 : 320;
        }

        get colors() {
            return SKIN_COLORS[this.skin] || SKIN_COLORS.red;
        }

        setSkin(skin) {
            if (SKIN_COLORS[skin]) {
                this.skin = skin;
            }
        }

        setLaneCount(laneCount) {
            this.laneCount = laneCount;
            this._resetPosition();
        }

        moveLeft(deltaTime = 1) {
            const currentSpeed = this.hasBoost ? this.boostSpeed : this.baseSpeed;
            this.x -= currentSpeed * deltaTime;
            if (this.x < this.minX) this.x = this.minX;
        }

        moveRight(deltaTime = 1) {
            const currentSpeed = this.hasBoost ? this.boostSpeed : this.baseSpeed;
            this.x += currentSpeed * deltaTime;
            if (this.x > this.maxX) this.x = this.maxX;
        }

        update(currentTime) {
            if (this.hasBoost && currentTime > this.boostEndTime) {
                this.hasBoost = false;
                this.speed = this.baseSpeed;
            }
            if (this.isBlinking) {
                if (currentTime > this.blinkEndTime) {
                    this.isBlinking = false;
                    this.blinkVisible = true;
                } else {
                    this.blinkVisible = Math.floor(currentTime / 80) % 2 === 0;
                }
            }
        }

        activateBoost(duration = 5000, currentTime = 0) {
            this.hasBoost = true;
            this.boostEndTime = currentTime + duration;
        }

        activateShield() {
            this.hasShield = true;
        }

        consumeShield(currentTime = 0) {
            if (this.hasShield) {
                this.hasShield = false;
                this.isBlinking = true;
                this.blinkEndTime = currentTime + 1000;
                this.blinkVisible = true;
                return true;
            }
            return false;
        }

        reset() {
            this.hasShield = false;
            this.hasBoost = false;
            this.boostEndTime = 0;
            this.isBlinking = false;
            this.blinkEndTime = 0;
            this.blinkVisible = true;
            this.speed = this.baseSpeed;
            this._resetPosition();
        }

        getRect() {
            return {
                x: this.x + 4,
                y: this.y + 4,
                width: this.width - 8,
                height: this.height - 8
            };
        }
    }
    return Player;
})();
