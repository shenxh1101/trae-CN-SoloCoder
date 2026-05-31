import { DRAW_COLORS, DRAW_COLOR_NAMES } from '../core/drawer.js';
import { canvasToPNG } from '../utils/storage.js';

export class Toolbar {
  constructor(container, drawer, recorder) {
    this.container = container;
    this.drawer = drawer;
    this.recorder = recorder;
    this.onSettingsToggle = null;
    this.onTouchModeToggle = null;
    this.onRecordToggle = null;
    this.onPlayback = null;
    this.onExportJSON = null;
    this.onBackgroundToggle = null;
    this.onImportBackground = null;
    this.touchMode = false;

    this._build();
    this._bindEvents();
  }

  _build() {
    this.container.innerHTML = `
      <div class="toolbar-section">
        <div class="toolbar-label">画笔颜色</div>
        <div class="color-dots">
          ${DRAW_COLORS.map((c, i) => `<button class="color-dot${i === 0 ? ' active' : ''}" data-color="${i}" style="background:${c};box-shadow:0 0 8px ${c}44"></button>`).join('')}
        </div>
      </div>
      <div class="toolbar-section">
        <div class="toolbar-label">粗细 <span class="val" id="sizeVal">${this.drawer.lineWidth}</span></div>
        <input type="range" id="brushSize" min="1" max="30" value="${this.drawer.lineWidth}" class="neon-slider">
      </div>
      <div class="toolbar-section">
        <div class="toolbar-label">透明度 <span class="val" id="opacityVal">${this.drawer.opacity.toFixed(1)}</span></div>
        <input type="range" id="brushOpacity" min="10" max="100" value="${Math.round(this.drawer.opacity * 100)}" class="neon-slider">
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-section">
        <button class="tool-btn" id="btnSave" title="保存图片">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="tool-btn" id="btnClear" title="清除画布">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-section">
        <button class="tool-btn" id="btnRecord" title="录制">
          <div class="record-dot"></div>
        </button>
        <button class="tool-btn" id="btnPlayback" title="回放" disabled>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <button class="tool-btn" id="btnExportJSON" title="导出JSON">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-section">
        <button class="tool-btn active" id="btnTrail" title="指尖轨迹" data-active="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
        <button class="tool-btn" id="btnGrid" title="背景网格">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </button>
        <button class="tool-btn" id="btnImportBg" title="导入底图">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
        <input type="file" id="bgFileInput" accept="image/*" style="display:none">
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-section">
        <button class="tool-btn" id="btnTouch" title="触摸模式">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 00-4 0v1"/><path d="M14 10V4a2 2 0 00-4 0v2"/><path d="M10 10.5V6a2 2 0 00-4 0v8"/><path d="M18 8a2 2 0 014 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 16"/></svg>
        </button>
        <button class="tool-btn" id="btnSettings" title="设置">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </button>
      </div>
    `;
  }

  _bindEvents() {
    const colorDots = this.container.querySelectorAll('.color-dot');
    colorDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        colorDots.forEach((d) => d.classList.remove('active'));
        dot.classList.add('active');
        const idx = parseInt(dot.dataset.color);
        this.drawer.setColorIndex(idx);
      });
    });

    this.container.querySelector('#brushSize').addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.drawer.setLineWidth(val);
      this.container.querySelector('#sizeVal').textContent = val;
    });

    this.container.querySelector('#brushOpacity').addEventListener('input', (e) => {
      const val = parseInt(e.target.value) / 100;
      this.drawer.setOpacity(val);
      this.container.querySelector('#opacityVal').textContent = val.toFixed(1);
    });

    this.container.querySelector('#btnSave').addEventListener('click', () => {
      canvasToPNG(this.drawer.drawCanvas);
    });

    this.container.querySelector('#btnClear').addEventListener('click', () => {
      this.drawer.clear();
    });

    this.container.querySelector('#btnRecord').addEventListener('click', () => {
      if (this.onRecordToggle) this.onRecordToggle();
    });

    this.container.querySelector('#btnPlayback').addEventListener('click', () => {
      if (this.onPlayback) this.onPlayback();
    });

    this.container.querySelector('#btnExportJSON').addEventListener('click', () => {
      if (this.onExportJSON) this.onExportJSON();
    });

    this.container.querySelector('#btnTrail').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const active = btn.dataset.active === 'true';
      btn.dataset.active = (!active).toString();
      this.drawer.showTrail = !active;
      if (!active) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
        this.drawer.clearTrail();
      }
    });

    this.container.querySelector('#btnGrid').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      this.drawer.showGrid = !this.drawer.showGrid;
      btn.classList.toggle('active', this.drawer.showGrid);
    });

    this.container.querySelector('#btnImportBg').addEventListener('click', () => {
      this.container.querySelector('#bgFileInput').click();
    });

    this.container.querySelector('#bgFileInput').addEventListener('change', (e) => {
      if (e.target.files[0] && this.onImportBackground) {
        this.onImportBackground(e.target.files[0]);
      }
    });

    this.container.querySelector('#btnTouch').addEventListener('click', (e) => {
      this.touchMode = !this.touchMode;
      e.currentTarget.classList.toggle('active', this.touchMode);
      if (this.onTouchModeToggle) this.onTouchModeToggle(this.touchMode);
    });

    this.container.querySelector('#btnSettings').addEventListener('click', () => {
      if (this.onSettingsToggle) this.onSettingsToggle();
    });
  }

  updateRecordButton(isRecording) {
    const btn = this.container.querySelector('#btnRecord');
    const dot = btn.querySelector('.record-dot');
    if (isRecording) {
      btn.classList.add('recording');
      dot.classList.add('active');
    } else {
      btn.classList.remove('recording');
      dot.classList.remove('active');
    }
  }

  updatePlaybackButton(hasFrames) {
    const btn = this.container.querySelector('#btnPlayback');
    btn.disabled = !hasFrames;
  }

  updateColorDot(index) {
    const dots = this.container.querySelectorAll('.color-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
  }
}
