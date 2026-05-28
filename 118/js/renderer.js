window.Renderer = (function () {
    class Renderer {
        constructor(canvas, laneCount = 2) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.laneCount = laneCount;
            this.roadOffset = 0;
            this.roadLineHeight = 40;
            this.roadLineGap = 30;
            this._resizeCanvas();
            window.addEventListener('resize', () => this._resizeCanvas());
        }

        setLaneCount(laneCount) {
            this.laneCount = laneCount;
            this._resizeCanvas();
        }

        _resizeCanvas() {
            const container = this.canvas.parentElement;
            const ratio = window.devicePixelRatio || 1;
            const cssWidth = container.clientWidth;
            const cssHeight = container.clientHeight;
            this.canvas.width = cssWidth * ratio;
            this.canvas.height = cssHeight * ratio;
            this.canvas.style.width = cssWidth + 'px';
            this.canvas.style.height = cssHeight + 'px';
            this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        }

        _getRoadWidth() {
            const cssWidth = this.canvas.clientWidth;
            return Math.min(this.laneCount === 3 ? 420 : 320, cssWidth - 40);
        }

        clear() {
            const w = this.canvas.clientWidth;
            const h = this.canvas.clientHeight;
            const gradient = this.ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, '#0a0a12');
            gradient.addColorStop(1, '#0f0f1a');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, w, h);
        }

        drawRoad(baseSpeed, deltaTime) {
            const w = this.canvas.clientWidth;
            const h = this.canvas.clientHeight;
            const roadWidth = this._getRoadWidth();
            const roadLeft = (w - roadWidth) / 2;
            const roadRight = roadLeft + roadWidth;

            this.roadOffset = (this.roadOffset + baseSpeed * 2 * deltaTime) % (this.roadLineHeight + this.roadLineGap);

            this.ctx.fillStyle = '#1a1a2e';
            this.ctx.fillRect(roadLeft, 0, roadWidth, h);

            this.ctx.fillStyle = '#2d5a2d';
            this.ctx.fillRect(0, 0, roadLeft, h);
            this.ctx.fillRect(roadRight, 0, w - roadRight, h);

            this.ctx.strokeStyle = '#e0e0e0';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(roadLeft, 0);
            this.ctx.lineTo(roadLeft, h);
            this.ctx.moveTo(roadRight, 0);
            this.ctx.lineTo(roadRight, h);
            this.ctx.stroke();

            this.ctx.fillStyle = '#ffffff';
            const laneWidth = roadWidth / this.laneCount;
            for (let i = 1; i < this.laneCount; i++) {
                const x = roadLeft + laneWidth * i;
                for (let y = -this.roadLineHeight + this.roadOffset; y < h; y += this.roadLineHeight + this.roadLineGap) {
                    this.ctx.fillRect(x - 2, y, 4, this.roadLineHeight);
                }
            }

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            for (let y = -50; y < h; y += 80) {
                this.ctx.fillRect(roadLeft + 4, y, roadWidth - 8, 1);
            }
        }

        drawPlayer(player) {
            if (player.isBlinking && !player.blinkVisible) return;
            const ctx = this.ctx;
            const { x, y, width, height } = player;
            const colors = player.colors;

            ctx.save();

            if (player.hasBoost) {
                const flameHeight = 12 + Math.random() * 6;
                const flameGrad = ctx.createLinearGradient(x + width / 2, y + height, x + width / 2, y + height + flameHeight);
                flameGrad.addColorStop(0, 'rgba(255, 230, 0, 0.9)');
                flameGrad.addColorStop(0.5, 'rgba(255, 100, 0, 0.7)');
                flameGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = flameGrad;
                ctx.beginPath();
                ctx.moveTo(x + width * 0.3, y + height);
                ctx.lineTo(x + width / 2, y + height + flameHeight);
                ctx.lineTo(x + width * 0.7, y + height);
                ctx.closePath();
                ctx.fill();
            }

            if (player.hasShield) {
                ctx.strokeStyle = 'rgba(0, 230, 118, 0.8)';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#00e676';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(x + width / 2, y + height / 2, Math.max(width, height) / 2 + 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            const grad = ctx.createLinearGradient(x, y, x, y + height);
            grad.addColorStop(0, colors.light);
            grad.addColorStop(0.4, colors.body);
            grad.addColorStop(1, colors.dark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x + width * 0.2, y);
            ctx.lineTo(x + width * 0.8, y);
            ctx.lineTo(x + width, y + height * 0.3);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x, y + height * 0.3);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.moveTo(x + width * 0.3, y + height * 0.1);
            ctx.lineTo(x + width * 0.7, y + height * 0.1);
            ctx.lineTo(x + width * 0.8, y + height * 0.3);
            ctx.lineTo(x + width * 0.2, y + height * 0.3);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#111';
            ctx.fillRect(x - 2, y + height * 0.2, 5, height * 0.2);
            ctx.fillRect(x + width - 3, y + height * 0.2, 5, height * 0.2);
            ctx.fillRect(x - 2, y + height * 0.65, 5, height * 0.2);
            ctx.fillRect(x + width - 3, y + height * 0.65, 5, height * 0.2);

            ctx.fillStyle = '#ffe600';
            ctx.shadowColor = '#ffe600';
            ctx.shadowBlur = 6;
            ctx.fillRect(x + width * 0.25, y + height * 0.85, width * 0.15, 4);
            ctx.fillRect(x + width * 0.6, y + height * 0.85, width * 0.15, 4);

            ctx.restore();
        }

        drawObstacle(obs) {
            const ctx = this.ctx;
            const { x, y, width, height, color, darkColor, type } = obs;

            ctx.save();

            const grad = ctx.createLinearGradient(x, y, x, y + height);
            grad.addColorStop(0, color);
            grad.addColorStop(1, darkColor);
            ctx.fillStyle = grad;

            if (type === 'truck') {
                ctx.fillRect(x, y + height * 0.2, width, height * 0.8);
                ctx.fillRect(x + width * 0.1, y, width * 0.8, height * 0.25);
            } else if (type === 'motorcycle') {
                ctx.beginPath();
                ctx.moveTo(x + width * 0.3, y);
                ctx.lineTo(x + width * 0.7, y);
                ctx.lineTo(x + width, y + height * 0.4);
                ctx.lineTo(x + width, y + height);
                ctx.lineTo(x, y + height);
                ctx.lineTo(x, y + height * 0.4);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(x + width * 0.15, y);
                ctx.lineTo(x + width * 0.85, y);
                ctx.lineTo(x + width, y + height * 0.25);
                ctx.lineTo(x + width, y + height);
                ctx.lineTo(x, y + height);
                ctx.lineTo(x, y + height * 0.25);
                ctx.closePath();
                ctx.fill();
            }

            if (type !== 'motorcycle') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                const windY = type === 'truck' ? y + height * 0.28 : y + height * 0.15;
                const windH = type === 'truck' ? height * 0.12 : height * 0.18;
                ctx.fillRect(x + width * 0.2, windY, width * 0.6, windH);
            }

            ctx.fillStyle = '#111';
            const wheelW = 4;
            const wheelH = height * 0.18;
            ctx.fillRect(x - 2, y + height * 0.25, wheelW, wheelH);
            ctx.fillRect(x + width - wheelW + 2, y + height * 0.25, wheelW, wheelH);
            ctx.fillRect(x - 2, y + height * 0.65, wheelW, wheelH);
            ctx.fillRect(x + width - wheelW + 2, y + height * 0.65, wheelW, wheelH);

            ctx.fillStyle = '#ff1744';
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur = 5;
            const tailY = y + height * 0.88;
            ctx.fillRect(x + width * 0.2, tailY, width * 0.15, 3);
            ctx.fillRect(x + width * 0.65, tailY, width * 0.15, 3);

            ctx.restore();
        }

        drawPowerUp(powerup) {
            const ctx = this.ctx;
            const { x, y, width, height, color, glowColor, icon, pulsePhase } = powerup;

            ctx.save();

            const pulse = 1 + Math.sin(pulsePhase) * 0.15;
            const cx = x + width / 2;
            const cy = y + height / 2;
            const r = (width / 2) * pulse;

            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
            ctx.stroke();

            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, color);
            grad.addColorStop(1, color);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#111';
            ctx.font = `bold ${Math.floor(width * 0.6)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, cx, cy + 1);

            ctx.restore();
        }

        render(gameState) {
            const { player, obstacles, powerups, baseSpeed, deltaTime } = gameState;
            this.clear();
            this.drawRoad(baseSpeed, deltaTime);

            for (const p of powerups) {
                this.drawPowerUp(p);
            }

            for (const obs of obstacles) {
                this.drawObstacle(obs);
            }

            this.drawPlayer(player);
        }
    }
    return Renderer;
})();
