export class SettingsPanel {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
    this.onSensitivityChange = null;
    this.onClose = null;

    this._sensitivity = 0.5;
    this._build();
    this._bindEvents();
  }

  _build() {
    this.container.innerHTML = `
      <div class="settings-overlay" id="settingsOverlay"></div>
      <div class="settings-drawer" id="settingsDrawer">
        <div class="settings-header">
          <h3>设置</h3>
          <button class="settings-close" id="settingsClose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="settings-body">
          <div class="settings-group">
            <div class="settings-group-title">手势识别</div>
            <div class="settings-item">
              <div class="settings-item-header">
                <span>灵敏度</span>
                <span class="settings-value" id="sensitivityVal">0.5</span>
              </div>
              <input type="range" id="sensitivitySlider" min="0" max="100" value="50" class="neon-slider">
              <div class="settings-item-desc">
                较高值更灵敏，但可能增加误识别率
              </div>
            </div>
            <div class="settings-item">
              <div class="settings-item-header">
                <span>缓冲帧数</span>
                <span class="settings-value" id="bufferVal">5</span>
              </div>
              <input type="range" id="bufferSlider" min="1" max="15" value="5" class="neon-slider">
              <div class="settings-item-desc">
                增大可稳定手势识别，但会增加响应延迟
              </div>
            </div>
          </div>
          <div class="settings-group">
            <div class="settings-group-title">画布</div>
            <div class="settings-item">
              <div class="settings-item-header">
                <span>平滑度</span>
                <span class="settings-value" id="smoothVal">3</span>
              </div>
              <input type="range" id="smoothSlider" min="1" max="10" value="3" class="neon-slider">
              <div class="settings-item-desc">
                增大可平滑线条抖动，但会降低绘制精度
              </div>
            </div>
          </div>
          <div class="settings-group">
            <div class="settings-group-title">回放</div>
            <div class="settings-item">
              <div class="settings-item-header">
                <span>播放速度</span>
                <span class="settings-value" id="speedVal">1.0x</span>
              </div>
              <input type="range" id="speedSlider" min="25" max="300" value="100" class="neon-slider">
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.style.display = 'none';
  }

  _bindEvents() {
    this.container.querySelector('#settingsOverlay').addEventListener('click', () => {
      this.close();
    });

    this.container.querySelector('#settingsClose').addEventListener('click', () => {
      this.close();
    });

    this.container.querySelector('#sensitivitySlider').addEventListener('input', (e) => {
      this._sensitivity = parseInt(e.target.value) / 100;
      this.container.querySelector('#sensitivityVal').textContent = this._sensitivity.toFixed(2);
      if (this.onSensitivityChange) this.onSensitivityChange(this._sensitivity);
    });

    this.container.querySelector('#bufferSlider').addEventListener('input', (e) => {
      this.container.querySelector('#bufferVal').textContent = e.target.value;
    });

    this.container.querySelector('#smoothSlider').addEventListener('input', (e) => {
      this.container.querySelector('#smoothVal').textContent = e.target.value;
    });

    this.container.querySelector('#speedSlider').addEventListener('input', (e) => {
      const speed = parseInt(e.target.value) / 100;
      this.container.querySelector('#speedVal').textContent = `${speed.toFixed(1)}x`;
    });
  }

  open() {
    this.isOpen = true;
    this.container.style.display = 'block';
    requestAnimationFrame(() => {
      this.container.querySelector('#settingsDrawer').classList.add('open');
      this.container.querySelector('#settingsOverlay').classList.add('open');
    });
  }

  close() {
    this.isOpen = false;
    this.container.querySelector('#settingsDrawer').classList.remove('open');
    this.container.querySelector('#settingsOverlay').classList.remove('open');
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 300);
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  getPlaybackSpeed() {
    return parseInt(this.container.querySelector('#speedSlider').value) / 100;
  }

  getBufferSize() {
    return parseInt(this.container.querySelector('#bufferSlider').value);
  }

  getSmoothness() {
    return parseInt(this.container.querySelector('#smoothSlider').value);
  }
}
