import { GESTURE_TYPES, GESTURE_LABELS, GESTURE_ICONS } from '../core/gesture.js';
import { DRAW_COLORS, DRAW_COLOR_NAMES } from '../core/drawer.js';
import { formatTime } from '../utils/storage.js';

export class StatusPanel {
  constructor(container) {
    this.container = container;
    this._currentGesture = GESTURE_TYPES.NONE;
    this._confidence = 0;
    this._isRecording = false;
    this._recordDuration = 0;
    this._frameCount = 0;

    this._build();
  }

  _build() {
    this.container.innerHTML = `
      <div class="status-card gesture-card">
        <div class="status-card-header">
          <span class="status-card-title">手势识别</span>
          <span class="status-card-badge" id="gestureBadge">离线</span>
        </div>
        <div class="gesture-display">
          <div class="gesture-icon" id="gestureIcon">${GESTURE_ICONS[GESTURE_TYPES.NONE]}</div>
          <div class="gesture-info">
            <div class="gesture-name" id="gestureName">${GESTURE_LABELS[GESTURE_TYPES.NONE]}</div>
            <div class="confidence-bar-container">
              <div class="confidence-bar" id="confidenceBar"></div>
            </div>
            <div class="confidence-text" id="confidenceText">0%</div>
          </div>
        </div>
      </div>

      <div class="status-card brush-card">
        <div class="status-card-header">
          <span class="status-card-title">画笔状态</span>
        </div>
        <div class="brush-info">
          <div class="brush-color-preview" id="brushColorPreview" style="background:${DRAW_COLORS[0]};box-shadow:0 0 10px ${DRAW_COLORS[0]}44"></div>
          <div class="brush-details">
            <div class="brush-detail-row">
              <span>颜色</span>
              <span id="brushColorName">${DRAW_COLOR_NAMES[0]}</span>
            </div>
            <div class="brush-detail-row">
              <span>粗细</span>
              <span id="brushSizeDisplay">3px</span>
            </div>
            <div class="brush-detail-row">
              <span>透明度</span>
              <span id="brushOpacityDisplay">0.9</span>
            </div>
          </div>
        </div>
      </div>

      <div class="status-card record-card">
        <div class="status-card-header">
          <span class="status-card-title">录制信息</span>
          <span class="record-indicator" id="recordIndicator">
            <span class="record-dot-sm"></span>
            <span id="recordStatus">待命</span>
          </span>
        </div>
        <div class="record-info">
          <div class="record-detail-row">
            <span>时长</span>
            <span id="recordDuration">00:00.0</span>
          </div>
          <div class="record-detail-row">
            <span>帧数</span>
            <span id="recordFrames">0</span>
          </div>
        </div>
      </div>

      <div class="status-card help-card">
        <div class="status-card-header">
          <span class="status-card-title">手势指南</span>
        </div>
        <div class="help-list">
          <div class="help-item"><span class="help-icon">👆</span> 食指伸出 → 绘制</div>
          <div class="help-item"><span class="help-icon">✊</span> 握拳 → 暂停</div>
          <div class="help-item"><span class="help-icon">✋</span> 张开手掌 → 换色</div>
          <div class="help-item"><span class="help-icon">✌️</span> 比耶 → 清除</div>
        </div>
      </div>
    `;
  }

  updateGesture(gesture) {
    if (this._currentGesture === gesture.type && this._confidence === gesture.confidence) return;
    this._currentGesture = gesture.type;
    this._confidence = gesture.confidence;

    const icon = this.container.querySelector('#gestureIcon');
    const name = this.container.querySelector('#gestureName');
    const bar = this.container.querySelector('#confidenceBar');
    const text = this.container.querySelector('#confidenceText');
    const badge = this.container.querySelector('#gestureBadge');

    icon.textContent = GESTURE_ICONS[gesture.type] || '❓';
    name.textContent = GESTURE_LABELS[gesture.type] || '未知';
    const pct = Math.round(gesture.confidence * 100);
    bar.style.width = `${pct}%`;
    text.textContent = `${pct}%`;

    if (gesture.type !== GESTURE_TYPES.NONE) {
      badge.textContent = '在线';
      badge.classList.add('online');
    } else {
      badge.textContent = '离线';
      badge.classList.remove('online');
    }
  }

  updateBrushState(state) {
    const preview = this.container.querySelector('#brushColorPreview');
    const colorName = this.container.querySelector('#brushColorName');
    const size = this.container.querySelector('#brushSizeDisplay');
    const opacity = this.container.querySelector('#brushOpacityDisplay');

    preview.style.background = state.color;
    preview.style.boxShadow = `0 0 10px ${state.color}44`;
    colorName.textContent = DRAW_COLOR_NAMES[state.colorIndex];
    size.textContent = `${state.lineWidth}px`;
    opacity.textContent = state.opacity.toFixed(1);
  }

  updateRecording(isRecording, duration, frameCount) {
    this._isRecording = isRecording;
    const indicator = this.container.querySelector('#recordIndicator');
    const dot = indicator.querySelector('.record-dot-sm');
    const status = this.container.querySelector('#recordStatus');
    const durEl = this.container.querySelector('#recordDuration');
    const frameEl = this.container.querySelector('#recordFrames');

    if (isRecording) {
      dot.classList.add('active');
      status.textContent = '录制中';
      indicator.classList.add('recording');
    } else {
      dot.classList.remove('active');
      status.textContent = '待命';
      indicator.classList.remove('recording');
    }

    if (duration !== undefined) {
      durEl.textContent = formatTime(duration);
    }
    if (frameCount !== undefined) {
      frameEl.textContent = frameCount;
    }
  }

  updatePlaybackProgress(progress) {
    const bar = this.container.querySelector('#confidenceBar');
  }
}
