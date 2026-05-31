import { lerp, smoothPoints, clamp } from '../utils/math.js';

export const DRAW_COLORS = ['#ff3366', '#00f5d4', '#3a86ff'];
export const DRAW_COLOR_NAMES = ['红色', '青色', '蓝色'];

export class Drawer {
  constructor(drawCanvas, overlayCanvas) {
    this.drawCanvas = drawCanvas;
    this.overlayCanvas = overlayCanvas;
    this.drawCtx = drawCanvas.getContext('2d');
    this.overlayCtx = overlayCanvas.getContext('2d');

    this.color = DRAW_COLORS[0];
    this.colorIndex = 0;
    this.lineWidth = 3;
    this.opacity = 0.9;
    this.isDrawing = false;
    this.showTrail = true;
    this.showGrid = false;
    this.backgroundImage = null;

    this._points = [];
    this._lastPoint = null;
    this._currentTipPos = null;
    this._trailPoints = [];
    this._maxTrailPoints = 30;
  }

  resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    for (const canvas of [this.drawCanvas, this.overlayCanvas]) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext('2d').scale(dpr, dpr);
    }
    this._redraw();
  }

  switchColor() {
    this.colorIndex = (this.colorIndex + 1) % DRAW_COLORS.length;
    this.color = DRAW_COLORS[this.colorIndex];
    return { color: this.color, name: DRAW_COLOR_NAMES[this.colorIndex] };
  }

  setColorIndex(idx) {
    this.colorIndex = clamp(idx, 0, DRAW_COLORS.length - 1);
    this.color = DRAW_COLORS[this.colorIndex];
    return { color: this.color, name: DRAW_COLOR_NAMES[this.colorIndex] };
  }

  setLineWidth(w) {
    this.lineWidth = clamp(w, 1, 30);
  }

  setOpacity(o) {
    this.opacity = clamp(o, 0.1, 1.0);
  }

  startStroke(x, y) {
    this.isDrawing = true;
    this._points = [{ x, y, color: this.color, size: this.lineWidth, opacity: this.opacity }];
    this._lastPoint = { x, y };
  }

  continueStroke(x, y) {
    if (!this.isDrawing) return;

    const point = { x, y, color: this.color, size: this.lineWidth, opacity: this.opacity };
    this._points.push(point);

    this._drawSegment(this._lastPoint, point);
    this._lastPoint = point;
  }

  endStroke() {
    this.isDrawing = false;
    this._lastPoint = null;
    this._points = [];
  }

  _drawSegment(from, to) {
    const ctx = this.drawCtx;
    ctx.save();
    ctx.globalAlpha = to.opacity;
    ctx.strokeStyle = to.color;
    ctx.lineWidth = to.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);

    if (this._points.length >= 3) {
      const prev = this._points[this._points.length - 3];
      const cp = { x: from.x, y: from.y };
      const next = to;
      const cp1 = { x: lerp(prev.x, next.x, 0.2), y: lerp(prev.y, next.y, 0.2) };
      ctx.quadraticCurveTo(cp.x, cp.y, next.x, next.y);
    } else {
      ctx.lineTo(to.x, to.y);
    }

    ctx.stroke();
    ctx.restore();
  }

  updateTipPosition(x, y) {
    this._currentTipPos = { x, y };
    if (this.showTrail) {
      this._trailPoints.push({ x, y, t: Date.now() });
      if (this._trailPoints.length > this._maxTrailPoints) {
        this._trailPoints.shift();
      }
    }
  }

  clearTrail() {
    this._trailPoints = [];
    this._currentTipPos = null;
  }

  renderOverlay() {
    const ctx = this.overlayCtx;
    const w = this.overlayCanvas.width / (window.devicePixelRatio || 1);
    const h = this.overlayCanvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    if (this.showGrid) {
      this._drawGrid(ctx, w, h);
    }

    if (this.showTrail && this._trailPoints.length > 0) {
      this._drawTrail(ctx);
    }

    if (this._currentTipPos) {
      this._drawCursor(ctx, this._currentTipPos);
    }
  }

  _drawGrid(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = gridSize; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = gridSize; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawTrail(ctx) {
    const now = Date.now();
    ctx.save();
    for (let i = 0; i < this._trailPoints.length; i++) {
      const p = this._trailPoints[i];
      const age = now - p.t;
      const alpha = Math.max(0, 1 - age / 1500) * 0.6;
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawCursor(ctx, pos) {
    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);

    ctx.globalAlpha = 0.3 + pulse * 0.2;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15 + pulse * 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  clear() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.drawCanvas.width / dpr;
    const h = this.drawCanvas.height / dpr;
    this.drawCtx.clearRect(0, 0, w, h);
    this._points = [];
    this._lastPoint = null;
    this._redraw();
  }

  _redraw() {
    if (this.backgroundImage) {
      const dpr = window.devicePixelRatio || 1;
      const w = this.drawCanvas.width / dpr;
      const h = this.drawCanvas.height / dpr;
      this.drawCtx.drawImage(this.backgroundImage, 0, 0, w, h);
    }
  }

  setBackgroundImage(img) {
    this.backgroundImage = img;
    this.clear();
  }

  clearBackground() {
    this.backgroundImage = null;
    this.clear();
  }

  getState() {
    return {
      color: this.color,
      colorIndex: this.colorIndex,
      lineWidth: this.lineWidth,
      opacity: this.opacity,
      isDrawing: this.isDrawing,
      showTrail: this.showTrail,
      showGrid: this.showGrid,
    };
  }
}
