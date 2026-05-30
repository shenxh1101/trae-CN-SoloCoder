class CanvasRenderer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.foregroundImage = null;
        this.foregroundData = null;
        this.maskData = null;
        this.originalImage = null;
        this.shadowData = null;
        
        this.background = {
            type: 'transparent',
            color: '#ffffff',
            gradient: { colors: ['#667eea', '#764ba2'], angle: 135 },
            image: null,
            opacity: 1
        };
        
        this.foregroundPosition = {
            x: 0,
            y: 0,
            scale: 1
        };
        
        this.settings = {
            shadowEnabled: true,
            shadowOpacity: 0.6,
            featherRadius: 5,
            edgeAdjust: 0,
            showMask: false,
            confidenceMaskEnabled: false,
            confidenceMaskColor: [99, 102, 241, 0.5]
        };
        
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.animationFrame = null;
        
        this._bindEvents();
    }

    setForeground(imageElement, imageData = null) {
        this.originalImage = imageElement;
        this.foregroundImage = imageElement;
        
        if (imageData) {
            this.foregroundData = imageData;
        } else {
            this.foregroundData = ImageProcessor.getImageDataFromImage(imageElement);
        }
        
        this.canvas.width = this.foregroundData.width;
        this.canvas.height = this.foregroundData.height;
        
        this._extractShadow();
        this.render();
    }

    setMask(maskData) {
        this.maskData = maskData;
        this._extractShadow();
        this.render();
    }

    setBackground(type, data = null) {
        this.background.type = type;
        
        if (type === 'solid' && data) {
            this.background.color = data;
        } else if (type === 'gradient' && data) {
            this.background.gradient = data;
        } else if (type === 'image' && data) {
            this.background.image = data;
        }
        
        this.render();
    }

    setBackgroundOpacity(opacity) {
        this.background.opacity = opacity;
        this.render();
    }

    setPosition(x, y, scale = null) {
        this.foregroundPosition.x = x;
        this.foregroundPosition.y = y;
        if (scale !== null) {
            this.foregroundPosition.scale = scale;
        }
        this.render();
    }

    setScale(scale) {
        this.foregroundPosition.scale = scale;
        this.render();
    }

    resetPosition() {
        this.foregroundPosition = { x: 0, y: 0, scale: 1 };
        this.render();
    }

    setFeatherRadius(radius) {
        this.settings.featherRadius = radius;
        this.render();
    }

    setEdgeAdjust(amount) {
        this.settings.edgeAdjust = amount;
        this.render();
    }

    enableShadow(enabled) {
        this.settings.shadowEnabled = enabled;
        this.render();
    }

    setShadowOpacity(opacity) {
        this.settings.shadowOpacity = opacity;
        this.render();
    }

    showMask(show) {
        this.settings.showMask = show;
        this.render();
    }

    enableConfidenceMask(enabled) {
        this.settings.confidenceMaskEnabled = enabled;
        this.render();
    }

    setConfidenceMaskColor(color) {
        this.settings.confidenceMaskColor = color;
        this.render();
    }

    _extractShadow() {
        if (this.foregroundData && this.maskData && this.settings.shadowEnabled) {
            this.shadowData = ImageProcessor.extractShadow(this.foregroundData, this.maskData);
        } else {
            this.shadowData = null;
        }
    }

    render() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.animationFrame = requestAnimationFrame(() => {
            this._render();
        });
    }

    _render() {
        const { width, height } = this.canvas;
        const ctx = this.ctx;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!this.foregroundData || !this.maskData) {
            return;
        }
        
        let processedMask = ImageProcessor.processMask(this.maskData, {
            featherRadius: this.settings.featherRadius,
            edgeAdjust: this.settings.edgeAdjust,
            shadowData: this.settings.shadowEnabled ? this.shadowData : null,
            shadowOpacity: this.settings.shadowOpacity
        });
        
        if (this.settings.showMask) {
            const grayscaleMask = ImageProcessor.createGrayscaleMask(processedMask);
            ctx.putImageData(grayscaleMask, 0, 0);
            return;
        }
        
        let backgroundData = null;
        
        if (this.background.type === 'solid') {
            backgroundData = this.background.color;
        } else if (this.background.type === 'gradient') {
            backgroundData = `gradient:${JSON.stringify(this.background.gradient)}`;
        } else if (this.background.type === 'image' && this.background.image) {
            backgroundData = this.background.image;
        }
        
        const composedCanvas = ImageProcessor.composeImage(
            this.foregroundData,
            backgroundData,
            processedMask,
            this.foregroundPosition,
            this.background.opacity
        );
        
        ctx.drawImage(composedCanvas, 0, 0);

        if (this.settings.confidenceMaskEnabled) {
            const colorMask = ImageProcessor.createColorMaskOverlay(
                processedMask,
                this.settings.confidenceMaskColor
            );
            ctx.putImageData(colorMask, 0, 0);
        }
    }

    exportPNG() {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.canvas.width;
        exportCanvas.height = this.canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        
        let processedMask = ImageProcessor.processMask(this.maskData, {
            featherRadius: this.settings.featherRadius,
            edgeAdjust: this.settings.edgeAdjust,
            shadowData: this.settings.shadowEnabled ? this.shadowData : null,
            shadowOpacity: this.settings.shadowOpacity
        });
        
        let backgroundData = null;
        
        if (this.background.type === 'solid') {
            backgroundData = this.background.color;
        } else if (this.background.type === 'gradient') {
            backgroundData = `gradient:${JSON.stringify(this.background.gradient)}`;
        } else if (this.background.type === 'image' && this.background.image) {
            backgroundData = this.background.image;
        }
        
        const composedCanvas = ImageProcessor.composeImage(
            this.foregroundData,
            backgroundData,
            processedMask,
            this.foregroundPosition,
            this.background.opacity
        );
        
        exportCtx.drawImage(composedCanvas, 0, 0);
        
        return exportCanvas;
    }

    exportMask() {
        if (!this.maskData) return null;
        
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.canvas.width;
        exportCanvas.height = this.canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        
        let processedMask = ImageProcessor.processMask(this.maskData, {
            featherRadius: this.settings.featherRadius,
            edgeAdjust: this.settings.edgeAdjust
        });
        
        const grayscaleMask = ImageProcessor.createGrayscaleMask(processedMask);
        exportCtx.putImageData(grayscaleMask, 0, 0);
        
        return exportCanvas;
    }

    _bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseHover(e));
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));
        document.addEventListener('mouseup', (e) => this._onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this._onMouseLeave(e));
        
        this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this._onTouchEnd(e));
    }

    _getCanvasScale() {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.canvas.width;
        const scaleY = rect.height / this.canvas.height;
        return { scaleX, scaleY, rect };
    }

    _onMouseDown(e) {
        if (!this.foregroundImage || !this.maskData) return;
        
        const { scaleX, scaleY } = this._getCanvasScale();
        const rect = this.canvas.getBoundingClientRect();
        const displayX = (e.clientX - rect.left);
        const displayY = (e.clientY - rect.top);
        
        const canvasX = displayX / scaleX;
        const canvasY = displayY / scaleY;
        
        if (this._isOnForeground(canvasX, canvasY)) {
            this.isDragging = true;
            this.dragStart = {
                x: canvasX - this.foregroundPosition.x,
                y: canvasY - this.foregroundPosition.y
            };
            this.canvas.style.cursor = 'grabbing';
        }
    }

    _onMouseHover(e) {
        if (this.isDragging || !this.foregroundImage || !this.maskData) return;
        
        const { scaleX, scaleY } = this._getCanvasScale();
        const rect = this.canvas.getBoundingClientRect();
        const displayX = (e.clientX - rect.left);
        const displayY = (e.clientY - rect.top);
        
        const canvasX = displayX / scaleX;
        const canvasY = displayY / scaleY;
        
        this.canvas.style.cursor = this._isOnForeground(canvasX, canvasY) ? 'grab' : 'default';
    }

    _onMouseMove(e) {
        if (!this.isDragging) return;
        
        const { scaleX, scaleY } = this._getCanvasScale();
        const rect = this.canvas.getBoundingClientRect();
        const displayX = (e.clientX - rect.left);
        const displayY = (e.clientY - rect.top);
        
        const canvasX = displayX / scaleX;
        const canvasY = displayY / scaleY;
        
        const newX = canvasX - this.dragStart.x;
        const newY = canvasY - this.dragStart.y;
        
        this.foregroundPosition.x = newX;
        this.foregroundPosition.y = newY;
        
        this.render();
        this._updatePositionDisplay();
    }

    _onMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        }
    }

    _onMouseLeave(e) {
        if (!this.isDragging && this.foregroundImage) {
            this.canvas.style.cursor = 'default';
        }
    }

    _onTouchStart(e) {
        e.preventDefault();
        if (!this.foregroundImage || !this.maskData) return;
        
        const { scaleX, scaleY } = this._getCanvasScale();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        const displayX = touch.clientX - rect.left;
        const displayY = touch.clientY - rect.top;
        
        const canvasX = displayX / scaleX;
        const canvasY = displayY / scaleY;
        
        if (this._isOnForeground(canvasX, canvasY)) {
            this.isDragging = true;
            this.dragStart = {
                x: canvasX - this.foregroundPosition.x,
                y: canvasY - this.foregroundPosition.y
            };
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
        if (!this.isDragging) return;
        
        const { scaleX, scaleY } = this._getCanvasScale();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        const displayX = touch.clientX - rect.left;
        const displayY = touch.clientY - rect.top;
        
        const canvasX = displayX / scaleX;
        const canvasY = displayY / scaleY;
        
        this.foregroundPosition.x = canvasX - this.dragStart.x;
        this.foregroundPosition.y = canvasY - this.dragStart.y;
        
        this.render();
        this._updatePositionDisplay();
    }

    _onTouchEnd(e) {
        this.isDragging = false;
    }

    _isOnForeground(canvasX, canvasY) {
        if (!this.maskData) return true;
        
        const { width, height } = this.canvas;
        const { scale } = this.foregroundPosition;
        const adjustedX = (canvasX - this.foregroundPosition.x) / scale;
        const adjustedY = (canvasY - this.foregroundPosition.y) / scale;
        
        if (adjustedX < 0 || adjustedX >= width || adjustedY < 0 || adjustedY >= height) {
            return false;
        }
        
        const pixelIndex = (Math.floor(adjustedY) * width + Math.floor(adjustedX)) * 4;
        return this.maskData.data[pixelIndex + 3] > 50;
    }

    _updatePositionDisplay() {
        const posInfo = document.getElementById('positionInfo');
        if (posInfo) {
            posInfo.textContent = `X: ${Math.round(this.foregroundPosition.x)}, Y: ${Math.round(this.foregroundPosition.y)}`;
        }
        
        const posXSlider = document.getElementById('positionX');
        const posYSlider = document.getElementById('positionY');
        if (posXSlider) posXSlider.value = Math.round(this.foregroundPosition.x);
        if (posYSlider) posYSlider.value = Math.round(this.foregroundPosition.y);
    }

    getForegroundPosition() {
        return { ...this.foregroundPosition };
    }

    getSize() {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    resize(containerWidth, containerHeight) {
        if (!this.foregroundData) return;
        
        const { width, height } = this.foregroundData;
        const scaleX = containerWidth / width;
        const scaleY = containerHeight / height;
        const scale = Math.min(scaleX, scaleY, 1) * 0.9;
        
        this.canvas.style.width = `${width * scale}px`;
        this.canvas.style.height = `${height * scale}px`;
    }

    dispose() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.foregroundImage = null;
        this.foregroundData = null;
        this.maskData = null;
        this.shadowData = null;
        this.background.image = null;
    }
}
