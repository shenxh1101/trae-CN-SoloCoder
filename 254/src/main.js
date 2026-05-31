import './styles/main.css';
import { CameraManager } from './core/camera.js';
import { Drawer, DRAW_COLORS, DRAW_COLOR_NAMES } from './core/drawer.js';
import { Recorder } from './core/recorder.js';
import { GESTURE_TYPES } from './core/gesture.js';
import { Toolbar } from './ui/toolbar.js';
import { StatusPanel } from './ui/status.js';
import { SettingsPanel } from './ui/settings.js';
import { exportJSON, loadImageToCanvas, formatTime } from './utils/storage.js';

class App {
  constructor() {
    this.camera = null;
    this.drawer = null;
    this.recorder = new Recorder();
    this.toolbar = null;
    this.statusPanel = null;
    this.settingsPanel = null;
    this.touchMode = false;
    this.cameraAvailable = false;
    this.modelAvailable = false;
    this._lastGesture = GESTURE_TYPES.NONE;
    this._wasDrawing = false;
    this._animLoopId = null;
    this._recordTimerId = null;
    this._playbackDrawing = false;
  }

  async init() {
    const loadingBar = document.getElementById('loadingBar');
    const loadingText = document.getElementById('loadingText');

    loadingBar.style.width = '10%';
    loadingText.textContent = '正在初始化界面...';

    this._initCanvas();
    this._initUI();

    loadingBar.style.width = '25%';
    loadingText.textContent = '正在请求摄像头权限...';

    this.camera = new CameraManager();
    let cameraOk = false;

    try {
      await this.camera.init(document.getElementById('video'));
      cameraOk = true;
      this.cameraAvailable = true;
      loadingBar.style.width = '40%';
    } catch (err) {
      console.warn('摄像头初始化失败:', err.message);
      this._handleCameraError(err.message, loadingText);
      this.touchMode = true;
    }

    if (cameraOk) {
      loadingText.textContent = '正在加载AI模型...';
      let progressVal = 40;
      try {
        await this.camera.loadModel((msg) => {
          loadingText.textContent = msg;
          progressVal = Math.min(90, progressVal + 10);
          loadingBar.style.width = `${progressVal}%`;
        });
        this.modelAvailable = true;
        loadingBar.style.width = '95%';
      } catch (err) {
        console.warn('模型加载失败:', err.message);
        loadingText.textContent = '模型加载失败，已启用触摸模式';
        this.touchMode = true;
        this.modelAvailable = false;
      }
    }

    loadingBar.style.width = '100%';
    loadingText.textContent = '准备就绪';

    setTimeout(() => {
      document.getElementById('loadingScreen').classList.add('hidden');
    }, 600);

    this._setupCallbacks();
    this._setupTouchEvents();
    this._startRenderLoop();

    if (this.touchMode) {
      this._enableTouchMode();
    } else if (this.cameraAvailable && this.modelAvailable) {
      this.camera.start();
    }
  }

  _handleCameraError(errorType, loadingText) {
    switch (errorType) {
      case 'PERMISSION_DENIED':
        loadingText.textContent = '摄像头权限被拒绝，请在浏览器设置中允许';
        break;
      case 'NO_CAMERA':
        loadingText.textContent = '未检测到摄像头设备';
        break;
      default:
        loadingText.textContent = '摄像头不可用，切换到触摸模式';
    }
  }

  _initCanvas() {
    const wrapper = document.getElementById('canvasWrapper');
    const area = document.querySelector('.app-canvas-area');
    const areaRect = area.getBoundingClientRect();

    const padding = 40;
    const w = Math.min(areaRect.width - padding * 2, 1100);
    const h = Math.min(areaRect.height - padding * 2, 750);

    wrapper.style.width = `${w}px`;
    wrapper.style.height = `${h}px`;

    this.drawer = new Drawer(
      document.getElementById('drawCanvas'),
      document.getElementById('overlayCanvas'),
    );
    this.drawer.resize(w, h);

    const touchCanvas = document.getElementById('touchCanvas');
    const dpr = window.devicePixelRatio || 1;
    touchCanvas.width = w * dpr;
    touchCanvas.height = h * dpr;
    touchCanvas.style.width = `${w}px`;
    touchCanvas.style.height = `${h}px`;

    this._canvasWidth = w;
    this._canvasHeight = h;
    this._canvasWrapper = wrapper;
  }

  _initUI() {
    this.toolbar = new Toolbar(
      document.getElementById('toolbar'),
      this.drawer,
      this.recorder,
    );

    this.statusPanel = new StatusPanel(
      document.getElementById('statusPanel'),
    );

    this.settingsPanel = new SettingsPanel(
      document.getElementById('settingsPanel'),
    );

    if (this.touchMode) {
      this.toolbar.touchMode = true;
      const touchBtn = document.querySelector('#btnTouch');
      if (touchBtn) touchBtn.classList.add('active');
    }
  }

  _setupCallbacks() {
    if (this.camera) {
      this.camera.onGesture = (gesture, landmarks) => {
        this._handleGesture(gesture, landmarks);
      };

      this.camera.onKeyPoints = (landmarks) => {
        this._drawKeypoints(landmarks);
      };
    }

    this.toolbar.onSettingsToggle = () => {
      this.settingsPanel.toggle();
    };

    this.toolbar.onTouchModeToggle = (enabled) => {
      if (enabled) {
        this._enableTouchMode();
      } else {
        this._disableTouchMode();
      }
    };

    this.toolbar.onRecordToggle = () => {
      this._toggleRecording();
    };

    this.toolbar.onPlayback = () => {
      this._startPlayback();
    };

    this.toolbar.onExportJSON = () => {
      const data = this.recorder.exportJSON(
        this.drawer.drawCanvas.width,
        this.drawer.drawCanvas.height,
      );
      exportJSON(data);
    };

    this.toolbar.onImportBackground = (file) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          this.drawer.setBackgroundImage(img);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    this.settingsPanel.onSensitivityChange = (val) => {
      if (this.camera) {
        this.camera.setSensitivity(val);
      }
    };
  }

  _enableTouchMode() {
    this.touchMode = true;
    this.toolbar.touchMode = true;
    const wrapper = document.getElementById('canvasWrapper');
    wrapper.classList.add('touch-mode');
    document.querySelector('.app-canvas-area').classList.add('touch-mode-active');

    const touchBtn = document.querySelector('#btnTouch');
    if (touchBtn) touchBtn.classList.add('active');

    if (this.camera) {
      this.camera.stop();
    }

    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
      videoContainer.style.opacity = '0.2';
    }
  }

  _disableTouchMode() {
    if (!this.cameraAvailable || !this.modelAvailable) {
      alert('摄像头或模型不可用，无法关闭触摸模式');
      this.toolbar.touchMode = true;
      const touchBtn = document.querySelector('#btnTouch');
      if (touchBtn) touchBtn.classList.add('active');
      return;
    }

    this.touchMode = false;
    this.toolbar.touchMode = false;
    const wrapper = document.getElementById('canvasWrapper');
    wrapper.classList.remove('touch-mode');
    document.querySelector('.app-canvas-area').classList.remove('touch-mode-active');

    const touchBtn = document.querySelector('#btnTouch');
    if (touchBtn) touchBtn.classList.remove('active');

    if (this.camera) {
      this.camera.start();
    }

    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
      videoContainer.style.opacity = '1';
    }
  }

  _setupTouchEvents() {
    const touchCanvas = document.getElementById('touchCanvas');
    const touchCursor = document.getElementById('touchCursor');

    const getTouchPos = (e) => {
      const rect = this._canvasWrapper.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
        clientX,
        clientY,
      };
    };

    const onDown = (e) => {
      if (!this.touchMode) return;
      e.preventDefault();
      const pos = getTouchPos(e);
      this.drawer.startStroke(pos.x, pos.y);
      this._wasDrawing = true;

      touchCursor.style.left = `${pos.clientX}px`;
      touchCursor.style.top = `${pos.clientY}px`;
      touchCursor.style.display = 'block';
    };

    const onMove = (e) => {
      const pos = getTouchPos(e);

      if (this.touchMode && this._wasDrawing) {
        e.preventDefault();
        this.drawer.continueStroke(pos.x, pos.y);

        if (this.recorder.isRecording) {
          this.recorder.recordFrame({
            type: 'draw',
            point: { x: pos.x, y: pos.y },
            brush: {
              color: this.drawer.color,
              size: this.drawer.lineWidth,
              opacity: this.drawer.opacity,
            },
          });
        }
      }

      if (this.touchMode) {
        touchCursor.style.left = `${pos.clientX}px`;
        touchCursor.style.top = `${pos.clientY}px`;
      }
    };

    const onUp = (e) => {
      if (!this.touchMode) return;
      this.drawer.endStroke();
      if (this._wasDrawing && this.recorder.isRecording) {
        this.recorder.recordFrame({ type: 'stroke_end' });
      }
      this._wasDrawing = false;
      touchCursor.style.display = 'none';
    };

    touchCanvas.addEventListener('mousedown', onDown);
    touchCanvas.addEventListener('mousemove', onMove);
    touchCanvas.addEventListener('mouseup', onUp);
    touchCanvas.addEventListener('mouseleave', onUp);

    touchCanvas.addEventListener('touchstart', onDown, { passive: false });
    touchCanvas.addEventListener('touchmove', onMove, { passive: false });
    touchCanvas.addEventListener('touchend', onUp);
    touchCanvas.addEventListener('touchcancel', onUp);

    touchCanvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen' && this.touchMode) {
        onDown(e);
      }
    });
  }

  _handleGesture(gesture, landmarks) {
    if (this.touchMode || this.recorder.isPlaybacking) return;

    this.statusPanel.updateGesture(gesture);

    const minConfidence = 0.3 + (1 - this.camera?.getSensitivity?.() || 0.5) * 0.3;

    if (gesture.type === GESTURE_TYPES.POINTING && landmarks && gesture.confidence > minConfidence) {
      const tip = landmarks[8];
      if (!tip) return;

      const canvasW = this._canvasWidth;
      const canvasH = this._canvasHeight;

      const x = (1 - tip.x) * canvasW;
      const y = tip.y * canvasH;

      const boundedX = Math.max(0, Math.min(canvasW, x));
      const boundedY = Math.max(0, Math.min(canvasH, y));

      if (!this._wasDrawing) {
        this.drawer.startStroke(boundedX, boundedY);
        this._wasDrawing = true;
      } else {
        this.drawer.continueStroke(boundedX, boundedY);
      }

      this.drawer.updateTipPosition(boundedX, boundedY);

      if (this.recorder.isRecording) {
        this.recorder.recordFrame({
          type: 'draw',
          point: { x: boundedX, y: boundedY },
          brush: {
            color: this.drawer.color,
            size: this.drawer.lineWidth,
            opacity: this.drawer.opacity,
          },
          gesture: { type: gesture.type, confidence: gesture.confidence },
        });
      }
    } else {
      if (this._wasDrawing) {
        this.drawer.endStroke();
        if (this.recorder.isRecording) {
          this.recorder.recordFrame({ type: 'stroke_end' });
        }
        this._wasDrawing = false;
        this.drawer.clearTrail();
      }

      if (gesture.type === GESTURE_TYPES.OPEN_PALM && gesture.confidence > minConfidence * 1.2) {
        if (this.camera && this.camera.gestureRecognizer.canSwitchColor()) {
          this.drawer.switchColor();
          this.toolbar.updateColorDot(this.drawer.colorIndex);
          this.statusPanel.updateBrushState(this.drawer.getState());
        }
      }

      if (gesture.type === GESTURE_TYPES.PEACE && gesture.confidence > minConfidence * 1.5) {
        if (this.camera && this.camera.gestureRecognizer.canClear()) {
          this.drawer.clear();
        }
      }
    }

    this._lastGesture = gesture.type;
    this.statusPanel.updateBrushState(this.drawer.getState());
  }

  _drawKeypoints(landmarks) {
    const kpCanvas = document.getElementById('keypointsCanvas');
    const video = document.getElementById('video');
    if (!kpCanvas || !video || !video.videoWidth) return;

    if (kpCanvas.width !== video.videoWidth) {
      kpCanvas.width = video.videoWidth;
      kpCanvas.height = video.videoHeight;
    }

    const ctx = kpCanvas.getContext('2d');
    ctx.clearRect(0, 0, kpCanvas.width, kpCanvas.height);

    if (!landmarks) return;

    const scaleX = kpCanvas.width;
    const scaleY = kpCanvas.height;

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ];

    ctx.strokeStyle = 'rgba(0, 245, 212, 0.5)';
    ctx.lineWidth = 2;
    for (const [a, b] of connections) {
      if (landmarks[a] && landmarks[b]) {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * scaleX, landmarks[a].y * scaleY);
        ctx.lineTo(landmarks[b].x * scaleX, landmarks[b].y * scaleY);
        ctx.stroke();
      }
    }

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = lm.x * scaleX;
      const y = lm.y * scaleY;

      ctx.beginPath();
      if (i === 8) {
        ctx.fillStyle = '#00f5d4';
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 8;
        ctx.arc(x, y, 6, 0, Math.PI * 2);
      } else if (i === 4) {
        ctx.fillStyle = '#f72585';
        ctx.shadowColor = '#f72585';
        ctx.shadowBlur = 6;
        ctx.arc(x, y, 5, 0, Math.PI * 2);
      } else if (i === 12) {
        ctx.fillStyle = '#3a86ff';
        ctx.shadowBlur = 4;
        ctx.arc(x, y, 4, 0, Math.PI * 2);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 0;
        ctx.arc(x, y, 3, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  _toggleRecording() {
    if (this.recorder.isRecording) {
      this.recorder.stopRecording();
      clearInterval(this._recordTimerId);
      this.toolbar.updateRecordButton(false);
      this.toolbar.updatePlaybackButton(this.recorder.frames.length > 0);
      this.statusPanel.updateRecording(false);
    } else {
      if (this.recorder.isPlaybacking) {
        this.recorder.stopPlayback();
        this._hidePlaybackBar();
      }
      this.recorder.startRecording();
      this.toolbar.updateRecordButton(true);
      this.statusPanel.updateRecording(true);

      this._recordTimerId = setInterval(() => {
        const dur = this.recorder.getRecordingDuration();
        const frames = this.recorder.getFrameCount();
        this.statusPanel.updateRecording(true, dur, frames);
      }, 100);
    }
  }

  _startPlayback() {
    if (this.recorder.frames.length === 0) return;
    if (this.recorder.isRecording) {
      this._toggleRecording();
    }

    this.drawer.clear();
    this._showPlaybackBar();

    this.recorder.setPlaybackSpeed(this.settingsPanel.getPlaybackSpeed());
    if (this.camera) {
      this.camera.gestureRecognizer.setBufferSize(this.settingsPanel.getBufferSize());
    }

    this.recorder.startPlayback(
      (frame) => {
        if (frame.type === 'draw' && frame.point) {
          if (frame.brush) {
            this.drawer.color = frame.brush.color;
            this.drawer.lineWidth = frame.brush.size;
            this.drawer.opacity = frame.brush.opacity;
          }
          if (!this._playbackDrawing) {
            this.drawer.startStroke(frame.point.x, frame.point.y);
            this._playbackDrawing = true;
          } else {
            this.drawer.continueStroke(frame.point.x, frame.point.y);
          }
        } else if (frame.type === 'stroke_end') {
          this.drawer.endStroke();
          this._playbackDrawing = false;
        }
      },
      () => {
        this.drawer.endStroke();
        this._playbackDrawing = false;
        this._hidePlaybackBar();
      },
      (progress) => {
        const bar = document.getElementById('playbackProgress');
        const time = document.getElementById('playbackTime');
        bar.style.width = `${progress * 100}%`;
        const dur = this.recorder.frames.length > 0
          ? this.recorder.frames[this.recorder.frames.length - 1].timestamp
          : 0;
        time.textContent = formatTime(dur * progress);
      },
    );
  }

  _showPlaybackBar() {
    document.getElementById('playbackBar').classList.add('visible');

    document.getElementById('playbackStopBtn').onclick = () => {
      this.recorder.stopPlayback();
      this.drawer.endStroke();
      this._playbackDrawing = false;
      this._hidePlaybackBar();
    };
  }

  _hidePlaybackBar() {
    document.getElementById('playbackBar').classList.remove('visible');
  }

  _startRenderLoop() {
    const loop = () => {
      this.drawer.renderOverlay();
      this._animLoopId = requestAnimationFrame(loop);
    };
    loop();
  }
}

const app = new App();
app.init();
