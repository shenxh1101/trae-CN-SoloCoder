const Editor = {
    brushActive: false,
    brushSize: 20,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    brushCtx: null,
    onMaskReady: null,

    init() {
        const brushCanvas = document.getElementById('brushCanvas');
        this.brushCtx = brushCanvas.getContext('2d');

        document.getElementById('btnBrushToggle').addEventListener('click', () => this.toggleBrush());
        document.getElementById('brushSizeSlider').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('brushSizeValue').textContent = this.brushSize;
        });
        document.getElementById('btnClearMask').addEventListener('click', () => this.clearMask());
        document.getElementById('btnRecolorRegion').addEventListener('click', () => this._onRecolorRegion());

        brushCanvas.addEventListener('mousedown', (e) => this._startDraw(e));
        brushCanvas.addEventListener('mousemove', (e) => this._draw(e));
        brushCanvas.addEventListener('mouseup', () => this._stopDraw());
        brushCanvas.addEventListener('mouseleave', () => this._stopDraw());

        brushCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); this._startDraw(e.touches[0]); }, { passive: false });
        brushCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); this._draw(e.touches[0]); }, { passive: false });
        brushCanvas.addEventListener('touchend', () => this._stopDraw());

        const ro = new ResizeObserver(() => this._resizeBrushCanvas());
        ro.observe(document.getElementById('comparisonArea'));
    },

    toggleBrush() {
        this.brushActive = !this.brushActive;
        const overlay = document.getElementById('brushOverlay');
        const btn = document.getElementById('btnBrushToggle');
        const sizeGroup = document.getElementById('brushSizeGroup');
        const actions = document.getElementById('brushActions');

        if (this.brushActive) {
            overlay.style.display = 'block';
            overlay.classList.add('active');
            btn.classList.add('btn-primary');
            sizeGroup.style.display = 'flex';
            actions.style.display = 'flex';
            this._resizeBrushCanvas();
        } else {
            overlay.style.display = 'none';
            overlay.classList.remove('active');
            btn.classList.remove('btn-primary');
            sizeGroup.style.display = 'none';
            actions.style.display = 'none';
        }
    },

    clearMask() {
        if (this.brushCtx) {
            this.brushCtx.clearRect(0, 0, this.brushCtx.canvas.width, this.brushCtx.canvas.height);
        }
    },

    _resizeBrushCanvas() {
        const area = document.getElementById('comparisonArea');
        if (!area) return;
        const canvas = document.getElementById('brushCanvas');
        const oldData = this.brushCtx ? this.brushCtx.getImageData(0, 0, canvas.width, canvas.height) : null;
        canvas.width = area.clientWidth;
        canvas.height = area.clientHeight;
        if (oldData && this.brushCtx) {
            this.brushCtx.putImageData(oldData, 0, 0);
        }
    },

    _startDraw(e) {
        if (!this.brushActive) return;
        this.isDrawing = true;
        const pos = this._getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        this._drawDot(pos.x, pos.y);
    },

    _draw(e) {
        if (!this.isDrawing || !this.brushActive) return;
        const pos = this._getPos(e);
        this._drawLine(this.lastX, this.lastY, pos.x, pos.y);
        this.lastX = pos.x;
        this.lastY = pos.y;
    },

    _stopDraw() {
        this.isDrawing = false;
    },

    _getPos(e) {
        const canvas = document.getElementById('brushCanvas');
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    },

    _drawDot(x, y) {
        const ctx = this.brushCtx;
        ctx.fillStyle = 'rgba(80, 140, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
    },

    _drawLine(x1, y1, x2, y2) {
        const ctx = this.brushCtx;
        ctx.strokeStyle = 'rgba(80, 140, 255, 0.4)';
        ctx.lineWidth = this.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    },

    async _onRecolorRegion() {
        const canvas = document.getElementById('brushCanvas');
        if (!canvas.width || !canvas.height) return;

        const maskData = this.brushCtx.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = maskData.data.some((v, i) => i % 4 === 3 && v > 10);
        if (!hasContent) {
            App.showToast('请先用画笔标记需要重新着色的区域', 'warning');
            return;
        }

        if (this.onMaskReady) {
            await this.onMaskReady(maskData);
        }
    },

    getMaskAsFile: async function() {
        const canvas = document.getElementById('brushCanvas');
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const ctx = maskCanvas.getContext('2d');
        const data = this.brushCtx.getImageData(0, 0, canvas.width, canvas.height);

        const maskData = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < data.data.length; i += 4) {
            if (data.data[i + 3] > 10) {
                maskData.data[i] = 255;
                maskData.data[i + 1] = 255;
                maskData.data[i + 2] = 255;
                maskData.data[i + 3] = 255;
            }
        }
        ctx.putImageData(maskData, 0, 0);

        return new Promise(resolve => {
            maskCanvas.toBlob(blob => {
                resolve(new File([blob], 'mask.png', { type: 'image/png' }));
            }, 'image/png');
        });
    }
};
