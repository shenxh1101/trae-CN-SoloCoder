class WaveformVisualizer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        this.currentFrequency = null;
        this.isPlaying = false;
    }

    init(canvasId, analyser) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.analyser = analyser;
        
        this.resize();
        this._resizeHandler = () => this.resize();
        window.addEventListener('resize', this._resizeHandler);
        
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    setCurrentFrequency(freq) {
        this.currentFrequency = freq;
        this.updateFrequencyDisplay();
    }

    updateFrequencyDisplay() {
        const display = document.getElementById('freqDisplay');
        if (display) {
            display.textContent = this.currentFrequency 
                ? `${this.currentFrequency.toFixed(2)} Hz` 
                : '-- Hz';
        }
    }

    start() {
        if (this.animationId) return;
        this.isPlaying = true;
        this.animate();
    }

    stop() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        if (!this.isPlaying) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        this.draw();
    }

    draw() {
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;
        
        this.ctx.clearRect(0, 0, width, height);
        
        this.drawBackground(width, height);
        
        if (this.analyser) {
            this.analyser.getByteTimeDomainData(this.dataArray);
            
            let hasSignal = false;
            for (let i = 0; i < this.dataArray.length; i++) {
                if (Math.abs(this.dataArray[i] - 128) > 2) {
                    hasSignal = true;
                    break;
                }
            }
            
            if (hasSignal) {
                this.drawWaveform(width, height);
                this.drawGlow(width, height);
            } else {
                this.drawIdleWave(width, height);
            }
        }
    }

    drawBackground(width, height) {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(10, 10, 15, 0.9)');
        gradient.addColorStop(1, 'rgba(26, 26, 46, 0.9)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
        
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
        
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, height / 2);
        this.ctx.lineTo(width, height / 2);
        this.ctx.stroke();
    }

    drawWaveform(width, height) {
        const bufferLength = this.dataArray.length;
        const sliceWidth = width / bufferLength;
        
        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#00d4ff');
        gradient.addColorStop(0.5, '#a855f7');
        gradient.addColorStop(1, '#00d4ff');
        
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = gradient;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = (v * height) / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
    }

    drawGlow(width, height) {
        const bufferLength = this.dataArray.length;
        const sliceWidth = width / bufferLength;
        
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00d4ff';
        
        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0.3)');
        
        this.ctx.lineWidth = 8;
        this.ctx.strokeStyle = gradient;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = (v * height) / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0;
    }

    drawIdleWave(width, height) {
        const time = Date.now() / 1000;
        const frequency = 2;
        const amplitude = 20;
        
        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.5)');
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0.5)');
        
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = gradient;
        
        this.ctx.beginPath();
        
        for (let x = 0; x < width; x++) {
            const y = height / 2 + Math.sin(x * 0.02 + time * frequency) * amplitude;
            
            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }
}

const visualizer = new WaveformVisualizer();
