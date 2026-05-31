class CameraManager {
    constructor() {
        this.videoElement = null;
        this.stream = null;
        this.isRunning = false;
        this.onFrameCallback = null;
        this.lastFrameTime = 0;
        this.frameInterval = 100;
    }

    async init(videoElement) {
        this.videoElement = videoElement;
        
        try {
            const constraints = {
                video: {
                    width: { ideal: 720 },
                    height: { ideal: 540 },
                    facingMode: 'user'
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            
            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    this.isRunning = true;
                    this.startFrameLoop();
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('Failed to access camera:', error);
            throw new Error('无法访问摄像头，请确保已授予权限');
        }
    }

    startFrameLoop() {
        const loop = () => {
            if (!this.isRunning) return;
            
            const now = Date.now();
            if (now - this.lastFrameTime >= this.frameInterval) {
                if (this.onFrameCallback) {
                    this.onFrameCallback(this.videoElement);
                }
                this.lastFrameTime = now;
            }
            
            requestAnimationFrame(loop);
        };
        loop();
    }

    setFrameInterval(ms) {
        this.frameInterval = ms;
    }

    onFrame(callback) {
        this.onFrameCallback = callback;
    }

    getVideoDimensions() {
        if (!this.videoElement) return { width: 0, height: 0 };
        return {
            width: this.videoElement.videoWidth,
            height: this.videoElement.videoHeight
        };
    }

    captureFrame() {
        if (!this.videoElement) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(this.videoElement, 0, 0);
        ctx.restore();
        
        return canvas;
    }

    getStream() {
        return this.stream;
    }

    stop() {
        this.isRunning = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }
}
