const ComparisonView = {
    originalImg: null,
    colorizedImg: null,
    sliderPosition: 0.5,
    isDragging: false,
    currentView: 'slider',
    canvasWidth: 0,
    canvasHeight: 0,

    init() {
        const sliderCanvas = document.getElementById('sliderCanvas');
        const handle = document.getElementById('sliderHandle');

        handle.addEventListener('mousedown', (e) => this._startDrag(e));
        document.addEventListener('mousemove', (e) => this._onDrag(e));
        document.addEventListener('mouseup', () => this._stopDrag());

        handle.addEventListener('touchstart', (e) => { e.preventDefault(); this._startDrag(e.touches[0]); }, { passive: false });
        document.addEventListener('touchmove', (e) => { if (this.isDragging) this._onDrag(e.touches[0]); }, { passive: false });
        document.addEventListener('touchend', () => this._stopDrag());

        const ro = new ResizeObserver(() => this._resize());
        ro.observe(document.getElementById('comparisonArea'));

        document.getElementById('btnSliderView').addEventListener('click', () => this.setView('slider'));
        document.getElementById('btnSideView').addEventListener('click', () => this.setView('side'));
    },

    setImages(originalImg, colorizedImg) {
        this.originalImg = originalImg;
        this.colorizedImg = colorizedImg;
        this.sliderPosition = 0.5;
        this._resize();
    },

    setColorized(img) {
        this.colorizedImg = img;
        this._draw();
    },

    setView(view) {
        this.currentView = view;
        document.getElementById('sliderView').style.display = view === 'slider' ? 'block' : 'none';
        document.getElementById('sideView').style.display = view === 'side' ? 'flex' : 'none';

        document.getElementById('btnSliderView').classList.toggle('active', view === 'slider');
        document.getElementById('btnSideView').classList.toggle('active', view === 'side');

        if (view === 'slider') {
            this._draw();
        } else {
            this._drawSide();
        }
    },

    _startDrag(e) {
        this.isDragging = true;
        this._updateSliderPos(e);
    },

    _onDrag(e) {
        if (!this.isDragging) return;
        this._updateSliderPos(e);
    },

    _stopDrag() {
        this.isDragging = false;
    },

    _updateSliderPos(e) {
        const area = document.getElementById('comparisonArea');
        const rect = area.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(rect.width, x));
        this.sliderPosition = x / rect.width;

        const handle = document.getElementById('sliderHandle');
        handle.style.left = (this.sliderPosition * 100) + '%';

        this._draw();
    },

    _resize() {
        const area = document.getElementById('comparisonArea');
        if (!area) return;
        const w = area.clientWidth;
        const h = area.clientHeight;
        this.canvasWidth = w;
        this.canvasHeight = h;

        const sliderCanvas = document.getElementById('sliderCanvas');
        sliderCanvas.width = w;
        sliderCanvas.height = h;

        this._draw();
    },

    _draw() {
        if (!this.originalImg || !this.colorizedImg) return;

        const canvas = document.getElementById('sliderCanvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const fit = this._fitImage(this.originalImg, w, h);
        const { dx, dy, dw, dh } = fit;

        ctx.drawImage(this.colorizedImg, dx, dy, dw, dh);

        const splitX = Math.round(w * this.sliderPosition);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, h);
        ctx.clip();
        ctx.drawImage(this.originalImg, dx, dy, dw, dh);
        ctx.restore();
    },

    _drawSide() {
        if (!this.originalImg || !this.colorizedImg) return;

        const origCanvas = document.getElementById('originalCanvas');
        const colorCanvas = document.getElementById('colorizedCanvas');

        const panels = document.querySelectorAll('.side-panel');
        const pw = panels[0].clientWidth;
        const ph = panels[0].clientHeight;

        origCanvas.width = pw;
        origCanvas.height = ph;
        colorCanvas.width = pw;
        colorCanvas.height = ph;

        const origCtx = origCanvas.getContext('2d');
        const colorCtx = colorCanvas.getContext('2d');

        const fitO = this._fitImage(this.originalImg, pw, ph);
        origCtx.clearRect(0, 0, pw, ph);
        origCtx.drawImage(this.originalImg, fitO.dx, fitO.dy, fitO.dw, fitO.dh);

        const fitC = this._fitImage(this.colorizedImg, pw, ph);
        colorCtx.clearRect(0, 0, pw, ph);
        colorCtx.drawImage(this.colorizedImg, fitC.dx, fitC.dy, fitC.dw, fitC.dh);
    },

    _fitImage(img, canvasW, canvasH) {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const scale = Math.min(canvasW / iw, canvasH / ih, 1);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (canvasW - dw) / 2;
        const dy = (canvasH - dh) / 2;
        return { dx, dy, dw, dh, scale };
    },

    getImageBounds() {
        if (!this.originalImg) return null;
        const fit = this._fitImage(this.originalImg, this.canvasWidth, this.canvasHeight);
        return fit;
    }
};
