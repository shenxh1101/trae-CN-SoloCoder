class Robot {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.state = {
            position: { x: this.width / 2, y: this.height / 2 },
            rotation: 0,
            scale: 1,
            emotion: 'neutral',
            isAnimating: false,
            currentAnimation: null
        };

        this.emotionConfigs = {
            happy: {
                eyeShape: 'circle',
                eyeSize: 20,
                eyebrowAngle: -15,
                mouthShape: 'smile',
                mouthCurve: 20
            },
            sad: {
                eyeShape: 'semicircle',
                eyeSize: 18,
                eyebrowAngle: 15,
                mouthShape: 'frown',
                mouthCurve: -15
            },
            surprised: {
                eyeShape: 'circle',
                eyeSize: 28,
                eyebrowAngle: 0,
                mouthShape: 'o',
                mouthCurve: 0
            },
            angry: {
                eyeShape: 'narrow',
                eyeSize: 16,
                eyebrowAngle: 30,
                mouthShape: 'line',
                mouthCurve: 0
            },
            neutral: {
                eyeShape: 'ellipse',
                eyeSize: 20,
                eyebrowAngle: 0,
                mouthShape: 'line',
                mouthCurve: 0
            }
        };

        this.animationFrame = null;
        this.waveOffset = 0;
        this.blinkPhase = 0;
        this.idleOffset = 0;
        
        this.init();
    }

    init() {
        this.draw();
        this.startIdleAnimation();
    }

    startIdleAnimation() {
        const animate = () => {
            this.idleOffset += 0.02;
            this.blinkPhase += 0.01;
            this.draw();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    stopIdleAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    setEmotion(emotion) {
        if (this.emotionConfigs[emotion]) {
            this.state.emotion = emotion;
            this.draw();
            return true;
        }
        return false;
    }

    getEmotion() {
        return this.state.emotion;
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        
        ctx.save();
        ctx.translate(this.state.position.x, this.state.position.y);
        ctx.scale(this.state.scale, this.state.scale);
        
        const idleBob = Math.sin(this.idleOffset) * 3;
        ctx.translate(0, idleBob);
        
        this.drawBody(ctx);
        this.drawHead(ctx);
        this.drawArms(ctx);
        this.drawLegs(ctx);
        
        ctx.restore();
    }

    drawBody(ctx) {
        const gradient = ctx.createLinearGradient(-60, -20, 60, 100);
        gradient.addColorStop(0, '#6366F1');
        gradient.addColorStop(1, '#4338CA');
        
        ctx.beginPath();
        ctx.roundRect(-55, -10, 110, 120, 20);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#818CF8';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, 30, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#1E293B';
        ctx.fill();
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const coreGlow = Math.sin(this.idleOffset * 2) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(0, 30, 15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249, 115, 22, ${coreGlow})`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(0, 30, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FBBF24';
        ctx.fill();
    }

    drawHead(ctx) {
        const headGradient = ctx.createLinearGradient(-50, -100, 50, -20);
        headGradient.addColorStop(0, '#818CF8');
        headGradient.addColorStop(1, '#6366F1');
        
        ctx.beginPath();
        ctx.roundRect(-50, -100, 100, 80, 25);
        ctx.fillStyle = headGradient;
        ctx.fill();
        ctx.strokeStyle = '#A5B4FC';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, -100);
        ctx.lineTo(0, -125);
        ctx.strokeStyle = '#818CF8';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, -130, 8, 0, Math.PI * 2);
        const antennaGlow = Math.sin(this.idleOffset * 3) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(249, 115, 22, ${antennaGlow + 0.5})`;
        ctx.fill();
        
        this.drawEyes(ctx);
        this.drawEyebrows(ctx);
        this.drawMouth(ctx);
    }

    drawEyes(ctx) {
        const config = this.emotionConfigs[this.state.emotion];
        const eyeY = -65;
        const eyeSpacing = 25;
        
        const blinkScale = this.blinkPhase % 4 > 3.8 ? 0.1 : 1;
        
        [-1, 1].forEach(side => {
            const x = side * eyeSpacing;
            
            ctx.beginPath();
            ctx.ellipse(x, eyeY, 24, 20 * blinkScale, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#4F46E5';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.save();
            ctx.translate(x, eyeY);
            
            switch (config.eyeShape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, config.eyeSize * blinkScale, 0, Math.PI * 2);
                    ctx.fillStyle = '#1E293B';
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(-5, -5, 5 * blinkScale, 0, Math.PI * 2);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fill();
                    break;
                case 'semicircle':
                    ctx.beginPath();
                    ctx.arc(0, 5, config.eyeSize * blinkScale, Math.PI, 0);
                    ctx.fillStyle = '#1E293B';
                    ctx.fill();
                    break;
                case 'narrow':
                    ctx.beginPath();
                    ctx.ellipse(0, 0, config.eyeSize, 8 * blinkScale, 0, 0, Math.PI * 2);
                    ctx.fillStyle = '#1E293B';
                    ctx.fill();
                    break;
                case 'ellipse':
                default:
                    ctx.beginPath();
                    ctx.ellipse(0, 0, config.eyeSize, 16 * blinkScale, 0, 0, Math.PI * 2);
                    ctx.fillStyle = '#1E293B';
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(-5, -5, 4 * blinkScale, 0, Math.PI * 2);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fill();
            }
            
            ctx.restore();
        });
    }

    drawEyebrows(ctx) {
        const config = this.emotionConfigs[this.state.emotion];
        const eyeY = -85;
        const eyeSpacing = 25;
        
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        const angleRad = (config.eyebrowAngle * Math.PI) / 180;
        
        [-1, 1].forEach(side => {
            const x = side * eyeSpacing;
            ctx.save();
            ctx.translate(x, eyeY);
            ctx.rotate(side * angleRad);
            
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(20, 0);
            ctx.stroke();
            
            ctx.restore();
        });
    }

    drawMouth(ctx) {
        const config = this.emotionConfigs[this.state.emotion];
        const mouthY = -35;
        
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        
        switch (config.mouthShape) {
            case 'smile':
                ctx.arc(0, mouthY - 5, 20, 0.2 * Math.PI, 0.8 * Math.PI);
                ctx.stroke();
                break;
            case 'frown':
                ctx.arc(0, mouthY + 10, 18, 1.2 * Math.PI, 1.8 * Math.PI);
                ctx.stroke();
                break;
            case 'o':
                ctx.ellipse(0, mouthY, 12, 16, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#1E293B';
                ctx.fill();
                break;
            case 'line':
            default:
                ctx.moveTo(-18, mouthY);
                ctx.lineTo(18, mouthY);
                ctx.stroke();
        }
    }

    drawArms(ctx) {
        const armGradient = ctx.createLinearGradient(-75, 0, -55, 80);
        armGradient.addColorStop(0, '#818CF8');
        armGradient.addColorStop(1, '#6366F1');
        
        const waveAngle = Math.sin(this.waveOffset) * 0.5;
        
        [-1, 1].forEach(side => {
            ctx.save();
            ctx.translate(side * 55, 10);
            
            const angle = side === 1 ? -0.3 + waveAngle : 0.3;
            ctx.rotate(angle);
            
            ctx.beginPath();
            ctx.roundRect(-10, 0, 20, 70, 10);
            ctx.fillStyle = armGradient;
            ctx.fill();
            ctx.strokeStyle = '#A5B4FC';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 75, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#F97316';
            ctx.fill();
            ctx.strokeStyle = '#FB923C';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        });
    }

    drawLegs(ctx) {
        const legGradient = ctx.createLinearGradient(-25, 100, -5, 180);
        legGradient.addColorStop(0, '#6366F1');
        legGradient.addColorStop(1, '#4338CA');
        
        [-1, 1].forEach((side, index) => {
            const walkOffset = Math.sin(this.idleOffset + index * Math.PI) * 5;
            
            ctx.save();
            ctx.translate(side * 20, 105);
            
            ctx.beginPath();
            ctx.roundRect(-15, 0, 30, 55 + walkOffset, 10);
            ctx.fillStyle = legGradient;
            ctx.fill();
            ctx.strokeStyle = '#818CF8';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.roundRect(-22, 55 + walkOffset, 44, 20, 8);
            ctx.fillStyle = '#1E293B';
            ctx.fill();
            ctx.strokeStyle = '#4F46E5';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        });
    }

    wave(duration = 1500) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.waveOffset = Math.sin(progress * Math.PI * 4) * 1.5;
                this.draw();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.waveOffset = 0;
                    this.draw();
                    resolve();
                }
            };
            animate();
        });
    }

    blink(duration = 300) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const originalPhase = this.blinkPhase;
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.blinkPhase = originalPhase + progress * 4;
                this.draw();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.blinkPhase = originalPhase;
                    resolve();
                }
            };
            animate();
        });
    }

    reset() {
        this.state = {
            position: { x: this.width / 2, y: this.height / 2 },
            rotation: 0,
            scale: 1,
            emotion: 'neutral',
            isAnimating: false,
            currentAnimation: null
        };
        this.waveOffset = 0;
        this.draw();
    }
}
