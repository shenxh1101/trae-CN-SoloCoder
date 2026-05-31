class PhotoCanvas {
    constructor(canvasId, maskCanvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.maskCanvas = document.getElementById(maskCanvasId);
        this.maskCtx = this.maskCanvas.getContext('2d');
        this.currentImage = null;
        this.imageDataURL = null;
        this.brushMode = 'all';
        this.brushSize = 30;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        
        this.initEvents();
    }

    initEvents() {
        this.maskCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.maskCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.maskCanvas.addEventListener('mouseup', () => this.stopDrawing());
        this.maskCanvas.addEventListener('mouseleave', () => this.stopDrawing());
        
        this.maskCanvas.addEventListener('touchstart', (e) => this.startDrawing(e));
        this.maskCanvas.addEventListener('touchmove', (e) => this.draw(e));
        this.maskCanvas.addEventListener('touchend', () => this.stopDrawing());
    }

    async loadImage(dataURL) {
        this.imageDataURL = dataURL;
        await Tools.loadImageToCanvas(dataURL, this.canvas);
        this.maskCanvas.width = this.canvas.width;
        this.maskCanvas.height = this.canvas.height;
        this.clearMask();
        this.currentImage = new Image();
        this.currentImage.src = dataURL;
    }

    setBrushMode(mode) {
        this.brushMode = mode;
        if (mode === 'brush') {
            this.maskCanvas.classList.add('drawing');
        } else {
            this.maskCanvas.classList.remove('drawing');
        }
    }

    setBrushSize(size) {
        this.brushSize = size;
    }

    getCanvasPosition(e) {
        const rect = this.maskCanvas.getBoundingClientRect();
        const scaleX = this.maskCanvas.width / rect.width;
        const scaleY = this.maskCanvas.height / rect.height;
        
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    startDrawing(e) {
        if (this.brushMode !== 'brush') return;
        e.preventDefault();
        this.isDrawing = true;
        const pos = this.getCanvasPosition(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        this.drawCircle(pos.x, pos.y);
    }

    draw(e) {
        if (!this.isDrawing || this.brushMode !== 'brush') return;
        e.preventDefault();
        const pos = this.getCanvasPosition(e);
        this.drawLine(this.lastX, this.lastY, pos.x, pos.y);
        this.lastX = pos.x;
        this.lastY = pos.y;
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    drawCircle(x, y) {
        this.maskCtx.beginPath();
        this.maskCtx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
        this.maskCtx.fillStyle = 'rgba(255, 183, 77, 0.5)';
        this.maskCtx.fill();
    }

    drawLine(x1, y1, x2, y2) {
        this.maskCtx.beginPath();
        this.maskCtx.moveTo(x1, y1);
        this.maskCtx.lineTo(x2, y2);
        this.maskCtx.strokeStyle = 'rgba(255, 183, 77, 0.5)';
        this.maskCtx.lineWidth = this.brushSize;
        this.maskCtx.lineCap = 'round';
        this.maskCtx.lineJoin = 'round';
        this.maskCtx.stroke();
    }

    clearMask() {
        this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    }

    invertMask() {
        const imageData = this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const newAlpha = 255 - data[i + 3];
            data[i + 3] = newAlpha;
            if (newAlpha > 0) {
                data[i] = 255;
                data[i + 1] = 183;
                data[i + 2] = 77;
            } else {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
            }
        }
        
        this.maskCtx.putImageData(imageData, 0, 0);
    }

    getMaskDataURL() {
        if (this.brushMode === 'all') {
            return null;
        }
        
        if (!this.hasMask()) {
            return null;
        }
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.maskCanvas.width;
        tempCanvas.height = this.maskCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        const imageData = this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 255;
            } else {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
                data[i + 3] = 255;
            }
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        return tempCanvas.toDataURL('image/png');
    }

    hasMask() {
        const imageData = this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        const data = imageData.data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) return true;
        }
        return false;
    }

    getMaskDataURLForDisplay() {
        if (this.brushMode === 'all') {
            return null;
        }
        return this.maskCanvas.toDataURL('image/png');
    }

    async restoreMaskFromDataURL(dataURL) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
                this.maskCtx.drawImage(img, 0, 0, this.maskCanvas.width, this.maskCanvas.height);
                resolve();
            };
            img.onerror = reject;
            img.src = dataURL;
        });
    }
}

class CompareSlider {
    constructor(originalCanvasId, containerId, sliderId) {
        this.originalCanvas = document.getElementById(originalCanvasId);
        this.container = document.getElementById(containerId);
        this.slider = document.getElementById(sliderId);
        this.repairedCanvas = null;
        this.isDragging = false;
        this.position = 50;
        
        this.initEvents();
    }

    initEvents() {
        this.slider.addEventListener('mousedown', () => this.startDrag());
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        this.slider.addEventListener('touchstart', () => this.startDrag());
        document.addEventListener('touchmove', (e) => this.drag(e));
        document.addEventListener('touchend', () => this.stopDrag());
    }

    async loadImages(originalDataURL, repairedDataURL) {
        await Tools.loadImageToCanvas(originalDataURL, this.originalCanvas);
        
        if (!this.repairedCanvas) {
            this.repairedCanvas = document.createElement('canvas');
            this.repairedCanvas.className = 'compare-canvas';
            this.repairedCanvas.style.position = 'absolute';
            this.repairedCanvas.style.top = '0';
            this.repairedCanvas.style.left = '0';
            this.container.insertBefore(this.repairedCanvas, this.slider);
        }
        
        await Tools.loadImageToCanvas(repairedDataURL, this.repairedCanvas);
        
        this.originalCanvas.style.position = 'relative';
        this.repairedCanvas.style.zIndex = '2';
        this.slider.style.zIndex = '3';
        
        this.updateSliderPosition();
    }

    startDrag() {
        this.isDragging = true;
    }

    drag(e) {
        if (!this.isDragging) return;
        
        const rect = this.container.getBoundingClientRect();
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let x = clientX - rect.left;
        
        this.position = (x / rect.width) * 100;
        this.position = Math.max(0, Math.min(100, this.position));
        
        this.updateSliderPosition();
    }

    stopDrag() {
        this.isDragging = false;
    }

    updateSliderPosition() {
        this.slider.style.left = `${this.position}%`;
        
        if (this.repairedCanvas) {
            this.repairedCanvas.style.clipPath = `inset(0 0 0 ${this.position}%)`;
        }
    }
}

class OverlayViewer {
    constructor(originalCanvasId, repairedCanvasId, opacitySliderId) {
        this.originalCanvas = document.getElementById(originalCanvasId);
        this.repairedCanvas = document.getElementById(repairedCanvasId);
        this.opacitySlider = document.getElementById(opacitySliderId);
        this.opacity = 0.5;
        
        this.initEvents();
    }

    initEvents() {
        this.opacitySlider.addEventListener('input', (e) => {
            this.opacity = e.target.value / 100;
            this.updateOpacity();
        });
    }

    async loadImages(originalDataURL, repairedDataURL) {
        await Tools.loadImageToCanvas(originalDataURL, this.originalCanvas);
        await Tools.loadImageToCanvas(repairedDataURL, this.repairedCanvas);
        this.updateOpacity();
    }

    updateOpacity() {
        this.repairedCanvas.style.opacity = this.opacity;
    }
}

class StepsPreview {
    constructor() {
        this.canvases = {
            original: document.getElementById('stepOriginal'),
            denoised: document.getElementById('stepDenoised'),
            sharpened: document.getElementById('stepSharpened'),
            contrast: document.getElementById('stepContrast'),
            colorized: document.getElementById('stepColorized'),
            final: document.getElementById('stepFinal')
        };
        
        this.containers = {
            denoised: document.getElementById('stepDenoisedItem'),
            sharpened: document.getElementById('stepSharpenedItem'),
            contrast: document.getElementById('stepContrastItem'),
            colorized: document.getElementById('stepColorizedItem')
        };
    }

    async showSteps(original, steps, final) {
        document.getElementById('stepsPreview').style.display = 'block';
        
        await Tools.loadImageToCanvas(original, this.canvases.original);
        await Tools.loadImageToCanvas(final, this.canvases.final);
        
        if (steps.denoised) {
            this.containers.denoised.style.display = 'block';
            await Tools.loadImageToCanvas(steps.denoised, this.canvases.denoised);
        } else {
            this.containers.denoised.style.display = 'none';
        }
        
        if (steps.sharpened) {
            this.containers.sharpened.style.display = 'block';
            await Tools.loadImageToCanvas(steps.sharpened, this.canvases.sharpened);
        } else {
            this.containers.sharpened.style.display = 'none';
        }
        
        if (steps.contrast) {
            this.containers.contrast.style.display = 'block';
            await Tools.loadImageToCanvas(steps.contrast, this.canvases.contrast);
        } else {
            this.containers.contrast.style.display = 'none';
        }
        
        if (steps.colorized) {
            this.containers.colorized.style.display = 'block';
            await Tools.loadImageToCanvas(steps.colorized, this.canvases.colorized);
        } else {
            this.containers.colorized.style.display = 'none';
        }
    }

    hide() {
        document.getElementById('stepsPreview').style.display = 'none';
    }
}

class GifGenerator {
    constructor() {
        this.gif = null;
    }

    async generate(originalDataURL, repairedDataURL) {
        return new Promise((resolve, reject) => {
            try {
                const gif = new GIF({
                    quality: 10,
                    width: 600,
                    height: 400
                });

                const originalImg = new Image();
                const repairedImg = new Image();
                const canvas = document.createElement('canvas');
                canvas.width = 600;
                canvas.height = 400;
                const ctx = canvas.getContext('2d');

                let loadedCount = 0;
                const checkLoaded = () => {
                    if (loadedCount === 2) {
                        const scale = Math.min(600 / originalImg.width, 400 / originalImg.height);
                        const w = originalImg.width * scale;
                        const h = originalImg.height * scale;
                        const x = (600 - w) / 2;
                        const y = (400 - h) / 2;

                        for (let i = 0; i <= 10; i++) {
                            ctx.fillStyle = '#FAF5EF';
                            ctx.fillRect(0, 0, 600, 400);
                            ctx.drawImage(originalImg, x, y, w, h);
                            const overlayWidth = (w / 10) * i;
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(x, y, overlayWidth, h);
                            ctx.clip();
                            ctx.drawImage(repairedImg, x, y, w, h);
                            ctx.restore();
                            gif.addFrame(ctx, { delay: 200 });
                        }

                        for (let i = 9; i > 0; i--) {
                            ctx.fillStyle = '#FAF5EF';
                            ctx.fillRect(0, 0, 600, 400);
                            ctx.drawImage(originalImg, x, y, w, h);
                            const overlayWidth = (w / 10) * i;
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(x, y, overlayWidth, h);
                            ctx.clip();
                            ctx.drawImage(repairedImg, x, y, w, h);
                            ctx.restore();
                            gif.addFrame(ctx, { delay: 200 });
                        }

                        gif.on('finished', (blob) => {
                            resolve(blob);
                        });

                        gif.render();
                    }
                };

                originalImg.onload = () => { loadedCount++; checkLoaded(); };
                repairedImg.onload = () => { loadedCount++; checkLoaded(); };
                originalImg.crossOrigin = 'anonymous';
                repairedImg.crossOrigin = 'anonymous';
                originalImg.src = originalDataURL;
                repairedImg.src = repairedDataURL;

            } catch (error) {
                reject(error);
            }
        });
    }
}
