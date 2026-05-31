class EffectRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.maxParticles = 50;
        this.intensity = 0.5;
        this.currentEmotion = 'neutral';
        this.isRunning = false;
        this.animationId = null;
        this.particlePool = [];
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    setEmotion(emotion) {
        this.currentEmotion = emotion;
    }

    setIntensity(value) {
        this.intensity = value / 100;
    }

    setMaxParticles(count) {
        this.maxParticles = count;
    }

    start() {
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    animate() {
        if (!this.isRunning) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.emitParticles();
        this.updateParticles();
        this.drawParticles();
        this.drawEmotionEffect();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    emitParticles() {
        const emitCount = Math.floor(this.intensity * 3);
        
        for (let i = 0; i < emitCount && this.particles.length < this.maxParticles; i++) {
            const particle = this.createParticle();
            this.particles.push(particle);
        }
    }

    createParticle() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        let particle;
        
        switch (this.currentEmotion) {
            case 'happy':
                particle = {
                    x: Utils.random(0, width),
                    y: -20,
                    vx: Utils.random(-1, 1),
                    vy: Utils.random(1, 3),
                    size: Utils.random(8, 15),
                    rotation: Utils.random(0, Math.PI * 2),
                    rotationSpeed: Utils.random(-0.05, 0.05),
                    life: 1,
                    decay: Utils.random(0.003, 0.006),
                    type: 'petal',
                    color: `hsl(${Utils.random(45, 60)}, 100%, ${Utils.random(50, 70)}%)`
                };
                break;
            case 'sad':
                particle = {
                    x: Utils.random(0, width),
                    y: -10,
                    vx: Utils.random(-0.5, 0.5),
                    vy: Utils.random(4, 8),
                    size: Utils.random(2, 4),
                    life: 1,
                    decay: Utils.random(0.005, 0.01),
                    type: 'rain',
                    color: 'rgba(59, 130, 246, 0.6)'
                };
                break;
            case 'angry':
                particle = {
                    x: Utils.random(width * 0.2, width * 0.8),
                    y: Utils.random(height * 0.2, height * 0.8),
                    vx: Utils.random(-2, 2),
                    vy: Utils.random(-3, -1),
                    size: Utils.random(10, 25),
                    life: 1,
                    decay: Utils.random(0.01, 0.02),
                    type: 'fire',
                    hue: Utils.random(0, 40)
                };
                break;
            case 'surprised':
                particle = {
                    x: width / 2 + Utils.random(-50, 50),
                    y: height / 2 + Utils.random(-50, 50),
                    vx: Utils.random(-5, 5),
                    vy: Utils.random(-5, 5),
                    size: Utils.random(5, 15),
                    life: 1,
                    decay: Utils.random(0.02, 0.04),
                    type: 'star',
                    color: '#f97316'
                };
                break;
            case 'fearful':
                particle = {
                    x: Utils.random(0, width),
                    y: Utils.random(0, height),
                    vx: Utils.random(-1, 1),
                    vy: Utils.random(-1, 1),
                    size: Utils.random(20, 50),
                    life: 1,
                    decay: Utils.random(0.005, 0.01),
                    type: 'smoke',
                    color: 'rgba(139, 92, 246, 0.3)'
                };
                break;
            case 'disgusted':
                particle = {
                    x: Utils.random(width * 0.3, width * 0.7),
                    y: Utils.random(height * 0.3, height * 0.7),
                    vx: Utils.random(-1, 1),
                    vy: Utils.random(-2, -0.5),
                    size: Utils.random(8, 20),
                    life: 1,
                    decay: Utils.random(0.008, 0.015),
                    type: 'bubble',
                    color: 'rgba(34, 197, 94, 0.5)'
                };
                break;
            default:
                particle = {
                    x: Utils.random(0, width),
                    y: Utils.random(0, height),
                    vx: Utils.random(-0.5, 0.5),
                    vy: Utils.random(-0.5, 0.5),
                    size: Utils.random(2, 5),
                    life: 1,
                    decay: Utils.random(0.003, 0.006),
                    type: 'sparkle',
                    color: 'rgba(255, 255, 255, 0.6)'
                };
        }
        
        return particle;
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx * this.intensity;
            p.y += p.vy * this.intensity;
            
            if (p.rotation !== undefined) {
                p.rotation += p.rotationSpeed;
            }
            
            p.life -= p.decay;
            
            if (p.life <= 0 || p.y > this.canvas.height + 50 || p.y < -50) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            
            switch (p.type) {
                case 'petal':
                    this.drawPetal(p);
                    break;
                case 'rain':
                    this.drawRain(p);
                    break;
                case 'fire':
                    this.drawFire(p);
                    break;
                case 'star':
                    this.drawStar(p);
                    break;
                case 'smoke':
                    this.drawSmoke(p);
                    break;
                case 'bubble':
                    this.drawBubble(p);
                    break;
                case 'sparkle':
                    this.drawSparkle(p);
                    break;
            }
            
            this.ctx.restore();
        });
    }

    drawPetal(p) {
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        
        this.ctx.beginPath();
        this.ctx.fillStyle = p.color;
        this.ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawRain(p) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = p.size;
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 3);
        this.ctx.stroke();
    }

    drawFire(p) {
        const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `hsla(${p.hue + 20}, 100%, 70%, ${p.life})`);
        gradient.addColorStop(0.4, `hsla(${p.hue}, 100%, 50%, ${p.life * 0.8})`);
        gradient.addColorStop(1, `hsla(${p.hue - 10}, 100%, 30%, 0)`);
        
        this.ctx.beginPath();
        this.ctx.fillStyle = gradient;
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawStar(p) {
        this.ctx.translate(p.x, p.y);
        this.ctx.fillStyle = p.color;
        
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * p.size;
            const y = Math.sin(angle) * p.size;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawSmoke(p) {
        const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBubble(p) {
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(p.x - p.size / 3, p.y - p.size / 3, p.size / 4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawSparkle(p) {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawEmotionEffect() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        switch (this.currentEmotion) {
            case 'happy':
                this.drawGlowBorder('rgba(251, 191, 36, 0.3)');
                break;
            case 'sad':
                this.drawVignette('rgba(59, 130, 246, 0.2)');
                break;
            case 'angry':
                this.drawPulseBorder('rgba(239, 68, 68, 0.5)');
                break;
            case 'surprised':
                this.drawZoomEffect();
                break;
            case 'fearful':
                this.drawShakeEffect();
                break;
            case 'disgusted':
                this.drawRippleEffect();
                break;
            default:
                this.drawSoftGlow('rgba(255, 255, 255, 0.1)');
        }
    }

    drawGlowBorder(color) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 20 * this.intensity;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawVignette(color) {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, color);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawPulseBorder(color) {
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = (10 + pulse * 20) * this.intensity;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawZoomEffect() {
        const pulse = (Math.sin(Date.now() / 100) + 1) / 2;
        this.ctx.strokeStyle = `rgba(249, 115, 22, ${pulse * 0.3})`;
        this.ctx.lineWidth = 5;
        this.ctx.strokeRect(
            pulse * 20, pulse * 20,
            this.canvas.width - pulse * 40,
            this.canvas.height - pulse * 40
        );
    }

    drawShakeEffect() {
        const shake = (Math.random() - 0.5) * 5 * this.intensity;
        this.ctx.fillStyle = 'rgba(139, 92, 246, 0.05)';
        this.ctx.fillRect(shake, shake, this.canvas.width, this.canvas.height);
    }

    drawRippleEffect() {
        const time = Date.now() / 500;
        for (let i = 0; i < 3; i++) {
            const radius = ((time + i * 0.3) % 1) * Math.min(this.canvas.width, this.canvas.height) / 2;
            const alpha = 1 - ((time + i * 0.3) % 1);
            
            this.ctx.strokeStyle = `rgba(34, 197, 94, ${alpha * 0.3 * this.intensity})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    drawSoftGlow(color) {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    clear() {
        this.particles = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
