class ComparisonView {
    constructor(mainCanvas, compareCanvas, sliderElement) {
        this.mainCanvas = mainCanvas;
        this.compareCanvas = compareCanvas;
        this.slider = sliderElement;
        
        this.originalImage = null;
        this.isActive = false;
        this.sliderPosition = 50;
        this.isDragging = false;
        
        this._bindEvents();
    }

    setOriginalImage(imageElement) {
        this.originalImage = imageElement;
    }

    activate() {
        if (!this.originalImage) return;
        
        this.isActive = true;
        this.compareCanvas.classList.remove('hidden');
        this.slider.classList.add('active');
        
        this._updateCompareCanvas();
        this._updateSliderPosition();
    }

    deactivate() {
        this.isActive = false;
        this.compareCanvas.classList.add('hidden');
        this.slider.classList.remove('active');
    }

    setPosition(percent) {
        this.sliderPosition = Utils.clamp(percent, 0, 100);
        this._updateSliderPosition();
        this._updateClipPath();
    }

    _updateCompareCanvas() {
        if (!this.originalImage) return;
        
        const ctx = this.compareCanvas.getContext('2d');
        this.compareCanvas.width = this.mainCanvas.width;
        this.compareCanvas.height = this.mainCanvas.height;
        
        ctx.clearRect(0, 0, this.compareCanvas.width, this.compareCanvas.height);
        ctx.drawImage(
            this.originalImage,
            0, 0,
            this.compareCanvas.width,
            this.compareCanvas.height
        );
    }

    _updateClipPath() {
        const percent = this.sliderPosition;
        this.compareCanvas.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    }

    _updateSliderPosition() {
        const wrapper = this.mainCanvas.parentElement;
        const canvasRect = this.mainCanvas.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        
        const leftPercent = this.sliderPosition;
        const left = canvasRect.left - wrapperRect.left + (canvasRect.width * leftPercent / 100);
        
        this.slider.style.left = `${left}px`;
        this._updateClipPath();
    }

    _bindEvents() {
        this.slider.addEventListener('mousedown', (e) => this._onDragStart(e));
        document.addEventListener('mousemove', (e) => this._onDrag(e));
        document.addEventListener('mouseup', (e) => this._onDragEnd(e));
        
        this.slider.addEventListener('touchstart', (e) => this._onDragStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this._onDrag(e), { passive: false });
        document.addEventListener('touchend', (e) => this._onDragEnd(e));
        
        window.addEventListener('resize', () => {
            if (this.isActive) {
                this._updateSliderPosition();
                this._updateCompareCanvas();
            }
        });
    }

    _onDragStart(e) {
        e.preventDefault();
        this.isDragging = true;
    }

    _onDrag(e) {
        if (!this.isDragging || !this.isActive) return;
        e.preventDefault();
        
        const canvasRect = this.mainCanvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        
        const percent = ((clientX - canvasRect.left) / canvasRect.width) * 100;
        this.setPosition(percent);
    }

    _onDragEnd(e) {
        this.isDragging = false;
    }

    updateCanvasSize() {
        if (this.isActive) {
            this._updateCompareCanvas();
            this._updateSliderPosition();
        }
    }

    dispose() {
        this.deactivate();
        this.originalImage = null;
    }
}
